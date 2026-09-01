export type UserRole = 'customer' | 'merchant' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Product {
  id: string;
  merchantId: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  pricePaise: number;
  stock: number;
  active: boolean;
  attributes?: Record<string, unknown>;
  imageUrl?: string;
  rating?: number;
  merchantScore?: number;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPricePaise: number;
}

export interface Cart {
  id: string;
  customerId: string;
  merchantId: string;
  status: 'active' | 'checkout_pending' | 'converted' | 'abandoned';
  currency: string;
  items: CartItem[];
  subtotalPaise: number;
  totalPaise: number;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  recommendations?: {
    productId: string;
    product: Product;
    score: number;
    reasons: string[];
    tradeOffs?: string[];
  }[];
  suggestedUpsell?: {
    productId: string;
    product: Product;
    reason: string;
    discountBps?: number;
  } | null;
  policyStatus?: {
    approved: boolean;
    reason?: string;
  };
}

export interface MerchantPolicy {
  maxOrderValuePaise: number;
  maxUpsellDiscountBps: number;
  upsellEnabled: boolean;
  paymentConfirmationRequired: boolean;
  allowedAgentActions: string[];
}

export interface MerchantAnalyticsSummary {
  sessions: number;
  aiAssistedOrders: number;
  paidOrders: number;
  conversionRate: number;
  aovPaise: number;
  upsellShown: number;
  upsellAccepted: number;
  policyBlocks: number;
  totalRevenuePaise: number;
}
