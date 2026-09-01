import { AgentMessageRole, AgentEventStatus, AgentSessionStatus } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { AppError } from '../../middleware/errorHandler.js';
import { ProductsService } from '../products/products.service.js';
import { GrowthService } from '../growth/growth.service.js';
import { AIProvider } from '../../integrations/ai/ai.provider.js';
import { AgentDecisionResponse } from '../../integrations/ai/ai.types.js';

export class AgentService {
  /**
   * Initialize or retrieve active agent session for a customer
   */
  static async createOrGetSession(customerId: string, merchantId?: string) {
    let session = await prisma.agentSession.findFirst({
      where: {
        customerId,
        status: AgentSessionStatus.ACTIVE,
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!session) {
      let resolvedMerchantId = merchantId;
      if (!resolvedMerchantId) {
        const primaryMerchant = await prisma.merchant.findFirst();
        if (!primaryMerchant) {
          throw new AppError('No merchant found.', 500, 'MERCHANT_NOT_CONFIGURED');
        }
        resolvedMerchantId = primaryMerchant.id;
      }

      session = await prisma.agentSession.create({
        data: {
          customerId,
          merchantId: resolvedMerchantId,
          status: AgentSessionStatus.ACTIVE,
        },
        include: {
          messages: true,
        },
      });
    }

    return session;
  }

  /**
   * Process customer conversational intent through grounded tool pipeline
   */
  static async processMessage(
    sessionId: string,
    customerId: string,
    userMessage: string,
    requestId = 'req_agent'
  ): Promise<AgentDecisionResponse> {
    const session = await prisma.agentSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: { orderBy: { createdAt: 'asc' }, take: 10 },
      },
    });

    if (!session || session.customerId !== customerId) {
      throw new AppError('Agent session not found or unauthorized.', 404, 'SESSION_NOT_FOUND');
    }

    const history = session.messages.map((m) => ({ role: m.role, content: m.content }));
    const startTime = Date.now();

    // 1. Record customer user message
    await prisma.agentMessage.create({
      data: {
        sessionId: session.id,
        role: AgentMessageRole.USER,
        content: userMessage,
      },
    });

    // 2. Intent Parsing with context history
    const intent = await AIProvider.parseIntent(userMessage, history);

    await prisma.agentEvent.create({
      data: {
        sessionId: session.id,
        eventType: 'INTENT_STRUCTURED',
        actor: 'AI_INTENT_PARSER',
        input: { message: userMessage },
        output: intent as any,
        status: AgentEventStatus.SUCCESS,
        latencyMs: Date.now() - startTime,
      },
    });

    // 3. Only query verified catalog if intent is explicitly purchase_search
    const isShopping = intent.intent === 'purchase_search';

    let rankedProducts: any[] = [];
    let suggestedUpsell: any = null;

    if (isShopping) {
      // Invoke Verified Catalog Tool (PostgreSQL DB Query)
      const toolStart = Date.now();
      const catalogResults = await ProductsService.listProducts({
        category: intent.category || undefined,
        maxPrice: intent.budgetMax || undefined,
        search: intent.searchTerm || undefined,
        limit: 10,
        page: 1,
        sortBy: 'score_desc',
      });

      // If initial category filter yields 0 items, broaden search to all in-stock products
      let candidateItems = catalogResults.items;
      if (candidateItems.length === 0 && intent.category) {
        const fallbackSearch = await ProductsService.listProducts({
          maxPrice: intent.budgetMax || undefined,
          limit: 10,
          page: 1,
          sortBy: 'score_desc',
        });
        candidateItems = fallbackSearch.items;
      }

      await prisma.agentEvent.create({
        data: {
          sessionId: session.id,
          eventType: 'TOOL_CATALOG_SEARCH',
          actor: 'CATALOG_TOOL',
          toolName: 'searchCatalog',
          input: { category: intent.category, maxPrice: intent.budgetMax, search: intent.searchTerm },
          output: { resultCount: candidateItems.length, candidates: candidateItems.map((p) => p.sku) },
          status: AgentEventStatus.SUCCESS,
          latencyMs: Date.now() - toolStart,
        },
      });

      // Deterministic Multi-Signal Ranking
      rankedProducts = GrowthService.rankCandidates(intent, candidateItems);

      // Bounded Growth / Upsell Candidate Generation
      if (rankedProducts.length > 0) {
        suggestedUpsell = await GrowthService.proposeUpsell(
          rankedProducts[0].product,
          session.merchantId
        );

        if (suggestedUpsell) {
          await prisma.agentEvent.create({
            data: {
              sessionId: session.id,
              eventType: 'UPSELL_PROPOSED',
              actor: 'GROWTH_ENGINE',
              toolName: 'proposeUpsell',
              input: { primaryProductId: rankedProducts[0].product.id },
              output: {
                upsellSku: suggestedUpsell.product.sku,
                discountBps: suggestedUpsell.discountBps,
                reason: suggestedUpsell.reason,
              },
              status: AgentEventStatus.SUCCESS,
              latencyMs: 15,
            },
          });
        }
      }
    }

    // 4. Grounded or Conversational Natural-Language Explanation with History
    const explanation = await AIProvider.generateExplanation(userMessage, intent, rankedProducts, history);

    // 5. Record Assistant Message in DB
    await prisma.agentMessage.create({
      data: {
        sessionId: session.id,
        role: AgentMessageRole.ASSISTANT,
        content: explanation,
        structuredData: {
          intent,
          topRecommendations: rankedProducts.slice(0, 3).map((r) => ({
            productId: r.product.id,
            sku: r.product.sku,
            score: r.score,
            reasons: r.reasons,
          })),
          suggestedUpsell: suggestedUpsell ? { sku: suggestedUpsell.product.sku } : null,
        } as any,
      },
    });

    // 8. Record audit event
    await prisma.auditEvent.create({
      data: {
        merchantId: session.merchantId,
        customerId,
        sessionId: session.id,
        eventType: 'RECOMMENDATIONS_GENERATED',
        actorType: 'AI_AGENT',
        requestId,
        data: {
          userMessage,
          intent,
          topProductSku: rankedProducts[0]?.product?.sku || null,
          upsellSku: suggestedUpsell?.product?.sku || null,
        } as any,
      },
    });

    return {
      sessionId: session.id,
      intent,
      recommendations: rankedProducts.slice(0, 4), // top 4 recommendations
      suggestedUpsell,
      explanation,
      nextAction: rankedProducts.length > 0 ? 'REVIEW_RECOMMENDATIONS' : 'REVIEW_RECOMMENDATIONS',
    };
  }

  /**
   * Get full session trace with message history and event log
   */
  static async getSession(sessionId: string, customerId: string) {
    const session = await prisma.agentSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!session || session.customerId !== customerId) {
      throw new AppError('Agent session not found.', 404, 'SESSION_NOT_FOUND');
    }

    return session;
  }
}
