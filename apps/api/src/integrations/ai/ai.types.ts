import { FormattedProduct } from '../../modules/products/products.service.js';

export interface StructuredIntent {
  intent: 'purchase_search' | 'recommendation' | 'product_inquiry' | 'comparison';
  category: string | null;
  budgetMax: number | null; // Max price in INR
  budgetMin: number | null;
  useCases: string[];       // e.g. ['coding', 'gaming', 'wfh']
  preferences: string[];    // e.g. ['long battery', 'wireless', 'mechanical']
  constraints: string[];    // e.g. ['under 70k', 'in stock only']
  searchTerm: string | null;
}

export interface RankedProduct {
  product: FormattedProduct;
  score: number; // 0.0 to 1.0
  reasons: string[];
  tradeOffs: string[];
}

export interface UpsellProposal {
  product: FormattedProduct;
  reason: string;
  discountBps: number;
  originalPricePaise: number;
  originalPriceInr: number;
  discountedPricePaise: number;
  discountedPriceInr: number;
}

export interface AgentDecisionResponse {
  sessionId: string;
  intent: StructuredIntent;
  recommendations: RankedProduct[];
  suggestedUpsell: UpsellProposal | null;
  explanation: string;
  nextAction: 'REVIEW_RECOMMENDATIONS' | 'ADD_TO_CART' | 'PROCEED_CHECKOUT';
}
