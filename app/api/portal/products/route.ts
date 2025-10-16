/**
 * Catalog API - Product Listing
 * GET /api/portal/products
 */

import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/app/api/_utils/response';
import { requireTenant } from '@/app/api/_utils/tenant';
import { requirePermission } from '@/app/api/_utils/auth';
import { withTenant } from '@/lib/prisma';
import { productFilterSchema } from '@/lib/validations/portal';

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'portal.catalog.view');
    const tenant = await requireTenant(request);

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validatedParams = productFilterSchema.safeParse(queryParams);

    if (!validatedParams.success) {
      return Errors.validationError(
        'Invalid query parameters',
        validatedParams.error.flatten()
      );
    }

    const {
      search,
      category,
      supplier,
      minPrice,
      maxPrice,
      inStock,
      page,
      limit,
      sortBy = 'name',
      sortOrder,
    } = validatedParams.data;

    const result = await withTenant(tenant.tenantId, async (tx) => {
      // Build where clause
      const where: any = {
        active: true,
      };

      // Search filter
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Category filter
      if (category) {
        where.category = category;
      }

      // Supplier filter
      if (supplier) {
        where.supplier = {
          is: {
            name: { contains: supplier, mode: 'insensitive' },
          },
        };
      }

      // Price filter (via SKUs)
      if (minPrice !== undefined || maxPrice !== undefined) {
        where.skus = {
          some: {
            ...(minPrice !== undefined && { basePrice: { gte: minPrice } }),
            ...(maxPrice !== undefined && { basePrice: { lte: maxPrice } }),
          },
        };
      }

      // Inventory filter
      if (inStock !== undefined) {
        where.inventoryRecords = {
          some: {
            quantityAvailable: inStock ? { gt: 0 } : { lte: 0 },
          },
        };
      }

      // Execute query with pagination
      const [products, total] = await Promise.all([
        tx.product.findMany({
          where,
          include: {
            skus: {
              take: 1, // Primary SKU only
              orderBy: { createdAt: 'asc' },
            },
            supplier: {
              select: {
                id: true,
                name: true,
              },
            },
            inventoryRecords: {
              take: 1,
            },
          },
          take: limit,
          skip: (page - 1) * limit,
          orderBy: { [sortBy]: sortOrder },
        }),
        tx.product.count({ where }),
      ]);

      return {
        products: products.map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          category: product.category,
          sku: product.sku,
          supplier: product.supplier?.name,
          price: Number(product.skus[0]?.basePrice || 0),
          inStock: (product.inventoryRecords[0]?.quantityAvailable || 0) > 0,
          inventory: product.inventoryRecords[0]?.quantityAvailable || 0,
          imageUrl: product.imageUrl,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    });

    return successResponse(result);
  } catch (error) {
    console.error('Error fetching products:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
    }

    if (error instanceof Error && error.message.startsWith('Permission denied')) {
      return Errors.forbidden();
    }

    return Errors.serverError('Failed to fetch products');
  }
}
