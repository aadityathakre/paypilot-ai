import { CartStatus } from '@prisma/client';
import { prisma, withDbRetry } from '../../config/db.js';
import { AppError } from '../../middleware/errorHandler.js';
import { AddItemInput, UpdateItemQuantityInput } from './cart.schema.js';

export interface FormattedCartItem {
  id: string;
  cartId: string;
  productId: string;
  product: {
    id: string;
    sku: string;
    name: string;
    category: string;
    imageUrl: string | null;
    stock: number;
    active: boolean;
  };
  quantity: number;
  unitPricePaise: number;
  unitPriceInr: number;
  totalPricePaise: number;
  totalPriceInr: number;
}

export interface FormattedCart {
  id: string;
  customerId: string;
  merchantId: string;
  currency: string;
  status: CartStatus;
  subtotalPaise: number;
  subtotalInr: number;
  totalPaise: number;
  totalInr: number;
  items: FormattedCartItem[];
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class CartService {
  /**
   * Helper to format Cart entity and authoritatively calculate totals from DB prices
   */
  private static formatCart(cart: any): FormattedCart {
    let subtotalPaise = 0;
    let itemCount = 0;

    const formattedItems: FormattedCartItem[] = (cart.items || []).map((item: any) => {
      const unitPricePaiseNum = Number(item.product?.pricePaise ?? item.unitPricePaise ?? 0);
      const itemTotalPaise = unitPricePaiseNum * item.quantity;

      subtotalPaise += itemTotalPaise;
      itemCount += item.quantity;

      return {
        id: item.id,
        cartId: item.cartId,
        productId: item.productId,
        product: item.product
          ? {
              id: item.product.id,
              sku: item.product.sku,
              name: item.product.name,
              category: item.product.category,
              imageUrl: item.product.imageUrl,
              stock: item.product.stock,
              active: item.product.active,
            }
          : {
              id: item.productId,
              sku: '',
              name: 'Product',
              category: '',
              imageUrl: null,
              stock: 0,
              active: true,
            },
        quantity: item.quantity,
        unitPricePaise: unitPricePaiseNum,
        unitPriceInr: unitPricePaiseNum / 100,
        totalPricePaise: itemTotalPaise,
        totalPriceInr: itemTotalPaise / 100,
      };
    });

    return {
      id: cart.id,
      customerId: cart.customerId,
      merchantId: cart.merchantId,
      currency: cart.currency,
      status: cart.status,
      subtotalPaise,
      subtotalInr: subtotalPaise / 100,
      totalPaise: subtotalPaise,
      totalInr: subtotalPaise / 100,
      items: formattedItems,
      itemCount,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  /**
   * Retrieve active cart for customer or initialize one
   */
  static async getActiveCart(customerId: string): Promise<FormattedCart> {
    let cart = await withDbRetry(async () =>
      prisma.cart.findFirst({
        where: {
          customerId,
          status: CartStatus.ACTIVE,
        },
        include: {
          items: {
            include: {
              product: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      })
    , 'getActiveCart');

    if (!cart) {
      // Get primary merchant to associate
      const primaryMerchant = await prisma.merchant.findFirst();
      if (!primaryMerchant) {
        throw new AppError('No active merchant found.', 500, 'MERCHANT_NOT_CONFIGURED');
      }

      cart = await prisma.cart.create({
        data: {
          customerId,
          merchantId: primaryMerchant.id,
          status: CartStatus.ACTIVE,
          currency: 'INR',
        },
        include: {
          items: {
            include: { product: true },
          },
        },
      });
    }

    return this.formatCart(cart);
  }

  /**
   * Add a product to the active cart with stock and price validation
   */
  static async addItem(customerId: string, input: AddItemInput): Promise<FormattedCart> {
    // 1. Verify product exists and has stock
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
    });

    if (!product || !product.active) {
      throw new AppError('Product not found or inactive.', 404, 'PRODUCT_NOT_FOUND');
    }

    // 2. Load active cart
    const activeCart = await this.getActiveCart(customerId);

    // 3. Check existing item in cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: activeCart.id,
          productId: product.id,
        },
      },
    });

    const targetQuantity = (existingItem?.quantity || 0) + input.quantity;

    if (product.stock < targetQuantity) {
      throw new AppError(
        `Insufficient inventory. Requested ${targetQuantity}, but only ${product.stock} in stock.`,
        400,
        'OUT_OF_STOCK'
      );
    }

    // 4. Save item with server-calculated price
    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: targetQuantity,
          unitPricePaise: product.pricePaise,
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: activeCart.id,
          productId: product.id,
          quantity: input.quantity,
          unitPricePaise: product.pricePaise,
        },
      });
    }

    return this.getActiveCart(customerId);
  }

  /**
   * Update item quantity in active cart
   */
  static async updateQuantity(customerId: string, cartItemId: string, input: UpdateItemQuantityInput): Promise<FormattedCart> {
    const activeCart = await this.getActiveCart(customerId);

    const item = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { product: true },
    });

    if (!item || item.cartId !== activeCart.id) {
      throw new AppError('Cart item not found.', 404, 'CART_ITEM_NOT_FOUND');
    }

    if (item.product.stock < input.quantity) {
      throw new AppError(
        `Insufficient inventory. Available stock: ${item.product.stock}`,
        400,
        'OUT_OF_STOCK'
      );
    }

    await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity: input.quantity },
    });

    return this.getActiveCart(customerId);
  }

  /**
   * Remove an item from the cart
   */
  static async removeItem(customerId: string, cartItemId: string): Promise<FormattedCart> {
    const activeCart = await this.getActiveCart(customerId);

    const item = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });

    if (!item || item.cartId !== activeCart.id) {
      throw new AppError('Cart item not found.', 404, 'CART_ITEM_NOT_FOUND');
    }

    await prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    return this.getActiveCart(customerId);
  }

  /**
   * Clear all items in active cart
   */
  static async clearCart(customerId: string): Promise<FormattedCart> {
    const activeCart = await this.getActiveCart(customerId);

    await prisma.cartItem.deleteMany({
      where: { cartId: activeCart.id },
    });

    return this.getActiveCart(customerId);
  }
}
