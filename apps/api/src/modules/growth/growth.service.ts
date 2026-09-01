import { prisma } from '../../config/db.js';
import { FormattedProduct } from '../products/products.service.js';
import { StructuredIntent, RankedProduct, UpsellProposal } from '../../integrations/ai/ai.types.js';

export class GrowthService {
  /**
   * Deterministic Multi-Signal Ranking Algorithm
   */
  static rankCandidates(intent: StructuredIntent, candidates: FormattedProduct[]): RankedProduct[] {
    return candidates
      .map((product) => {
        let intentMatch = 0.5;
        const reasons: string[] = [];
        const tradeOffs: string[] = [];

        // 1. Intent & Use Case Match (Weight: 40%)
        if (intent.category && product.category.toLowerCase() === intent.category.toLowerCase()) {
          intentMatch += 0.3;
          reasons.push(`Direct match for category ${product.category}`);
        }

        const productAttrs = (product.attributes as Record<string, any>) || {};
        const productUseCases = Array.isArray(productAttrs.useCase) ? productAttrs.useCase : [];

        const matchedUseCases = intent.useCases.filter((uc) =>
          productUseCases.some((puc: string) => puc.toLowerCase().includes(uc.toLowerCase()))
        );

        if (matchedUseCases.length > 0) {
          intentMatch += 0.2;
          reasons.push(`Optimized for ${matchedUseCases.join(', ')}`);
        }

        // 2. Budget Fit Score (Weight: 25%)
        let budgetFit = 1.0;
        if (intent.budgetMax) {
          if (product.priceInr <= intent.budgetMax) {
            budgetFit = 1.0;
            reasons.push(`Within specified budget of ₹${intent.budgetMax.toLocaleString('en-IN')}`);
          } else {
            const overageRatio = (product.priceInr - intent.budgetMax) / intent.budgetMax;
            budgetFit = Math.max(0.1, 1.0 - overageRatio * 1.5);
            tradeOffs.push(`Priced ₹${(product.priceInr - intent.budgetMax).toLocaleString('en-IN')} above requested budget`);
          }
        }

        // 3. Inventory Stock Score (Weight: 15%)
        const stockScore = product.stock > 10 ? 1.0 : product.stock > 0 ? 0.7 : 0.0;
        if (product.stock <= 5 && product.stock > 0) {
          tradeOffs.push(`Limited stock remaining (${product.stock} units)`);
        }

        // 4. Popularity & Merchant Growth Score (Weight: 20%)
        const merchantGrowthScore = product.merchantScore || 0.8;

        // Composite weighted score (0.0 to 1.0)
        const finalScore =
          0.40 * Math.min(1.0, intentMatch) +
          0.25 * budgetFit +
          0.15 * stockScore +
          0.20 * merchantGrowthScore;

        return {
          product,
          score: Math.round(finalScore * 100) / 100,
          reasons: reasons.length > 0 ? reasons : ['Verified catalog match'],
          tradeOffs,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Propose 1 Bounded Complementary Growth Upsell/Cross-sell
   */
  static async proposeUpsell(
    primaryProduct: FormattedProduct,
    merchantId: string
  ): Promise<UpsellProposal | null> {
    // 1. Check merchant growth policy
    const policy = await prisma.merchantPolicy.findUnique({
      where: { merchantId },
    });

    if (!policy || !policy.upsellEnabled) {
      return null;
    }

    // 2. Determine complementary category based on primary product
    let targetCategory = 'accessories';
    let upsellReason = 'Frequently bought together to complete setup';

    if (primaryProduct.category === 'laptops') {
      targetCategory = 'keyboards_mice'; // suggest ergonomic wireless mouse
      upsellReason = 'Perfect companion for coding & productivity on your laptop';
    } else if (primaryProduct.category === 'monitors') {
      targetCategory = 'accessories'; // suggest USB-C 8-in-1 hub
      upsellReason = 'Complete your desktop workstation with multiport docking';
    } else if (primaryProduct.category === 'keyboards_mice') {
      targetCategory = 'accessories'; // suggest fast charger or stand
      upsellReason = 'Recommended ergonomic desk setup addition';
    }

    // 3. Find complementary in-stock candidate
    const candidate = await prisma.product.findFirst({
      where: {
        merchantId,
        category: targetCategory,
        active: true,
        stock: { gt: 0 },
        id: { not: primaryProduct.id },
      },
      orderBy: { merchantScore: 'desc' },
    });

    if (!candidate) return null;

    const discountBps = Math.min(policy.maxUpsellDiscountBps, 1000); // 10% max bundle discount
    const discountMultiplier = 1.0 - discountBps / 10000;

    const origPaise = Number(candidate.pricePaise);
    const discPaise = Math.round(origPaise * discountMultiplier);

    const formattedCandidate: FormattedProduct = {
      id: candidate.id,
      merchantId: candidate.merchantId,
      sku: candidate.sku,
      name: candidate.name,
      description: candidate.description,
      category: candidate.category,
      pricePaise: origPaise,
      priceInr: origPaise / 100,
      stock: candidate.stock,
      active: candidate.active,
      attributes: candidate.attributes,
      imageUrl: candidate.imageUrl,
      merchantScore: candidate.merchantScore,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
    };

    return {
      product: formattedCandidate,
      reason: upsellReason,
      discountBps,
      originalPricePaise: origPaise,
      originalPriceInr: origPaise / 100,
      discountedPricePaise: discPaise,
      discountedPriceInr: discPaise / 100,
    };
  }
}
