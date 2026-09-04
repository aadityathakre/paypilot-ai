import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { AppError } from '../../middleware/errorHandler.js';
import { ListProductsQuery, CreateProductInput, UpdateProductInput } from './products.schema.js';

export interface FormattedProduct {
  id: string;
  merchantId: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  pricePaise: number;
  priceInr: number;
  stock: number;
  active: boolean;
  attributes: unknown;
  imageUrl: string | null;
  merchantScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ProductsService {
  /**
   * Helper to format Prisma Product model into JSON-serializable representation
   */
  private static formatProduct(product: any): FormattedProduct {
    const pricePaiseNum = Number(product.pricePaise);
    return {
      id: product.id,
      merchantId: product.merchantId,
      sku: product.sku,
      name: product.name,
      description: product.description,
      category: product.category,
      pricePaise: pricePaiseNum,
      priceInr: pricePaiseNum / 100,
      stock: product.stock,
      active: product.active,
      attributes: product.attributes,
      imageUrl: product.imageUrl,
      merchantScore: product.merchantScore,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  /**
   * List products with multi-faceted search, filters, and pagination
   */
  static async listProducts(query: ListProductsQuery) {
    const { merchantId, category, minPrice, maxPrice, inStock, search, page, limit, sortBy } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      active: true,
    };

    if (merchantId) {
      where.merchantId = merchantId;
    }

    if (category) {
      where.category = { equals: category.toLowerCase(), mode: 'insensitive' };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.pricePaise = {};
      if (minPrice !== undefined) {
        where.pricePaise.gte = BigInt(Math.round(minPrice * 100)); // convert INR to paise if decimal passed
      }
      if (maxPrice !== undefined) {
        where.pricePaise.lte = BigInt(Math.round(maxPrice * 100));
      }
    }

    if (inStock) {
      where.stock = { gt: 0 };
    }

    if (search && search.trim() !== '') {
      const rawTerm = search.trim();
      
      // Stopwords to filter out for NLP intent extraction
      const stopWords = new Set([
        'i', 'want', 'need', 'show', 'me', 'the', 'a', 'an', 'with', 'for', 'to', 'in', 'of',
        'is', 'are', 'buy', 'looking', 'get', 'good', 'best', 'some', 'any', 'which', 'what',
        'aur', 'kya', 'kharedna', 'chahiye', 'bhai', 'dikhao', 'hai', 'hu', 'ho', 'wala', 'wali'
      ]);

      // Tokenize and clean search terms
      const tokens = rawTerm
        .toLowerCase()
        .replace(/[^\w\s]/gi, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 1 && !stopWords.has(t));

      const searchTerms = tokens.length > 0 ? tokens : [rawTerm];

      // Build OR conditions across all NLP extracted keywords
      const searchConditions: Prisma.ProductWhereInput[] = [];

      for (const term of searchTerms) {
        searchConditions.push(
          { name: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { category: { contains: term, mode: 'insensitive' } },
          { sku: { contains: term, mode: 'insensitive' } }
        );
      }

      // Also include full raw string fallback
      searchConditions.push(
        { name: { contains: rawTerm, mode: 'insensitive' } },
        { description: { contains: rawTerm, mode: 'insensitive' } }
      );

      where.OR = searchConditions;
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { merchantScore: 'desc' };
    if (sortBy === 'price_asc') orderBy = { pricePaise: 'asc' };
    if (sortBy === 'price_desc') orderBy = { pricePaise: 'desc' };
    if (sortBy === 'newest') orderBy = { createdAt: 'desc' };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return {
      items: products.map(this.formatProduct),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieve a single product by ID or SKU
   */
  static async getProductById(idOrSku: string): Promise<FormattedProduct> {
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSku }, { sku: idOrSku }],
      },
    });

    if (!product) {
      throw new AppError(`Product '${idOrSku}' was not found.`, 404, 'PRODUCT_NOT_FOUND');
    }

    return this.formatProduct(product);
  }

  /**
   * Get all active categories with product counts
   */
  static async listCategories() {
    const categories = await prisma.product.groupBy({
      by: ['category'],
      where: { active: true },
      _count: { id: true },
      orderBy: { category: 'asc' },
    });

    return categories.map((c) => ({
      name: c.category,
      productCount: c._count.id,
    }));
  }

  /**
   * Merchant: Create a new product in the catalog
   */
  static async createProduct(merchantId: string, input: CreateProductInput): Promise<FormattedProduct> {
    const existingSku = await prisma.product.findUnique({
      where: { sku: input.sku },
    });

    if (existingSku) {
      throw new AppError(`A product with SKU '${input.sku}' already exists.`, 409, 'DUPLICATE_SKU');
    }

    const product = await prisma.product.create({
      data: {
        merchantId,
        sku: input.sku,
        name: input.name,
        description: input.description,
        category: input.category.toLowerCase(),
        pricePaise: input.pricePaise,
        stock: input.stock,
        active: input.active,
        attributes: (input.attributes as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        imageUrl: input.imageUrl,
        merchantScore: input.merchantScore,
      },
    });

    return this.formatProduct(product);
  }

  /**
   * Merchant: Update existing product details
   */
  static async updateProduct(merchantId: string, productId: string, input: UpdateProductInput): Promise<FormattedProduct> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.merchantId !== merchantId) {
      throw new AppError('Product not found or unauthorized to edit.', 404, 'PRODUCT_NOT_FOUND');
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        name: input.name,
        description: input.description,
        category: input.category ? input.category.toLowerCase() : undefined,
        pricePaise: input.pricePaise,
        stock: input.stock,
        active: input.active,
        attributes: input.attributes !== undefined ? (input.attributes as Prisma.InputJsonValue) : undefined,
        imageUrl: input.imageUrl,
        merchantScore: input.merchantScore,
      },
    });

    return this.formatProduct(updated);
  }

  /**
   * Merchant: Soft-delete product
   */
  static async deleteProduct(merchantId: string, productId: string): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.merchantId !== merchantId) {
      throw new AppError('Product not found or unauthorized to delete.', 404, 'PRODUCT_NOT_FOUND');
    }

    await prisma.product.update({
      where: { id: productId },
      data: { active: false },
    });
  }
}
