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
    requestId = 'req_agent',
    language = 'en'
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
      const cleanSearchTerm = (intent.searchTerm && intent.searchTerm !== intent.category && !['keyboards_mice', 'laptops', 'monitors', 'audio_video', 'accessories', 'apparel', 'electricals', 'gadgets'].includes(intent.searchTerm))
        ? intent.searchTerm
        : undefined;

      const catalogResults = await ProductsService.listProducts({
        category: intent.category || undefined,
        maxPrice: intent.budgetMax || undefined,
        search: cleanSearchTerm,
        limit: 10,
        page: 1,
        sortBy: 'score_desc',
      });

      // If initial query yields 0 items (e.g. budget too low or specific search string), fallback to category/all items
      let candidateItems = catalogResults.items;
      if (candidateItems.length === 0) {
        const fallbackSearch = await ProductsService.listProducts({
          category: intent.category || undefined,
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

    // 3b. Setup Bundle Generation (e.g. Laptop + Keyboard + Mouse)
    let suggestedBundle: any = null;
    const isBundleRequest = intent.isBundleRequest || (isShopping && (userMessage.includes('bundle') || userMessage.includes('bna') || userMessage.includes('bana') || (userMessage.includes('laptop') && userMessage.includes('keyboard'))));

    if (isBundleRequest) {
      const maxB = intent.budgetMax || 80000;
      const laptops = await ProductsService.listProducts({ category: 'laptops', maxPrice: maxB, page: 1, limit: 5, sortBy: 'score_desc' });
      const keyboards = await ProductsService.listProducts({ category: 'keyboards_mice', search: 'keyboard', page: 1, limit: 5, sortBy: 'score_desc' });
      const mice = await ProductsService.listProducts({ category: 'keyboards_mice', search: 'mouse', page: 1, limit: 5, sortBy: 'score_desc' });

      const laptop = laptops.items.find((l) => l.priceInr < maxB - 4000) || laptops.items[0];
      const keyboard = keyboards.items.find((k) => k.sku.includes('KEY') || k.name.toLowerCase().includes('keyboard')) || keyboards.items[0];
      const mouse = mice.items.find((m) => m.sku.includes('MOU') || m.name.toLowerCase().includes('mouse')) || mice.items[0];

      if (laptop && keyboard && mouse) {
        const totalPriceInr = laptop.priceInr + keyboard.priceInr + mouse.priceInr;
        const savingsInr = Math.round(totalPriceInr * 0.07);
        const discountedPriceInr = totalPriceInr - savingsInr;

        suggestedBundle = {
          title: "Complete Verified Setup Bundle",
          products: [laptop, keyboard, mouse],
          totalPriceInr,
          discountedPriceInr,
          savingsInr,
          discountBps: 700,
        };
      }
    }

    // 4. Grounded or Conversational Natural-Language Explanation with History
    const explanation = await AIProvider.generateExplanation(userMessage, intent, rankedProducts, history, suggestedBundle, language);

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
          suggestedBundle: suggestedBundle ? { title: suggestedBundle.title, total: suggestedBundle.discountedPriceInr } : null,
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
          hasBundle: !!suggestedBundle,
        } as any,
      },
    });

    return {
      sessionId: session.id,
      intent,
      recommendations: rankedProducts.slice(0, 4), // top 4 recommendations
      suggestedUpsell,
      suggestedBundle,
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
