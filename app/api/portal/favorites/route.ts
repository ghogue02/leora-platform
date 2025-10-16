/**
 * Favorites API
 * GET /api/portal/favorites - List user favorites
 * POST /api/portal/favorites - Add to favorites
 * DELETE /api/portal/favorites - Remove from favorites
 */

import { NextRequest } from 'next/server';
import type { Prisma, PrismaClient } from '@prisma/client';
import { successResponse, Errors } from '@/app/api/_utils/response';
import { requireTenant } from '@/app/api/_utils/tenant';
import { requireAuth } from '@/app/api/_utils/auth';
import { addFavoriteSchema } from '@/lib/validations/portal';
import { withTenant } from '@/lib/prisma';

type FavoritesList = Prisma.ListGetPayload<{
  include: {
    items: {
      include: {
        product: {
          select: {
            id: true;
            name: true;
            description: true;
            category: true;
            imageUrl: true;
            active: true;
            skus: {
              select: {
                basePrice: true;
              };
              take: 1;
            };
          };
        };
      };
    };
  };
}>;

async function getOrCreateFavoritesListTx(
  tx: PrismaClient,
  tenantId: string,
  portalUserId: string
): Promise<FavoritesList> {
  const existing = await tx.list.findFirst({
    where: {
      tenantId,
      portalUserId,
      isDefault: true,
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              category: true,
              imageUrl: true,
              active: true,
              skus: {
                select: {
                  basePrice: true,
                },
                take: 1,
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (existing) {
    return existing;
  }

  return tx.list.create({
    data: {
      tenantId,
      portalUserId,
      name: 'Favorites',
      description: 'Saved favorite products',
      isDefault: true,
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              category: true,
              imageUrl: true,
              active: true,
              skus: {
                select: {
                  basePrice: true,
                },
                take: 1,
              },
            },
          },
        },
      },
    },
  });
}

/**
 * List user favorites
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const tenant = await requireTenant(request);

    const list = await withTenant(tenant.tenantId, (tx) =>
      getOrCreateFavoritesListTx(tx, tenant.tenantId, user.id)
    );

    const favorites = list.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product?.name ?? 'Unknown Product',
      productDescription: item.product?.description ?? null,
      category: item.product?.category ?? null,
      price: item.product?.skus?.[0]
        ? Number(item.product.skus[0].basePrice)
        : null,
      imageUrl: item.product?.imageUrl ?? null,
      status: item.product ? (item.product.active ? 'ACTIVE' : 'INACTIVE') : null,
      addedAt: item.createdAt.toISOString(),
    }));

    return successResponse({
      favorites,
      total: favorites.length,
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
    }

    return Errors.serverError('Failed to fetch favorites');
  }
}

/**
 * Add to favorites
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const tenant = await requireTenant(request);

    const body = await request.json();
    const validatedBody = addFavoriteSchema.safeParse(body);

    if (!validatedBody.success) {
      return Errors.validationError(
        'Invalid favorite data',
        validatedBody.error.flatten()
      );
    }

    const { productId } = validatedBody.data;

    const favorite = await withTenant(tenant.tenantId, async (tx) => {
      const product = await tx.product.findFirst({
        where: {
          id: productId,
          tenantId: tenant.tenantId,
          active: true,
        },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          imageUrl: true,
          active: true,
          skus: {
            select: {
              basePrice: true,
            },
            take: 1,
          },
        },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      const list = await getOrCreateFavoritesListTx(tx, tenant.tenantId, user.id);

      const existingItem = await tx.listItem.findFirst({
        where: {
          listId: list.id,
          productId,
        },
      });

      if (existingItem) {
        return {
          id: existingItem.id,
          product,
          createdAt: existingItem.createdAt,
        };
      }

      const createdItem = await tx.listItem.create({
        data: {
          listId: list.id,
          productId,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              category: true,
              imageUrl: true,
              active: true,
              skus: {
                select: {
                  basePrice: true,
                },
                take: 1,
              },
            },
          },
        },
      });

      return {
        id: createdItem.id,
        product: createdItem.product,
        createdAt: createdItem.createdAt,
      };
    });

    return successResponse(
      {
        id: favorite.id,
        productId,
        productName: favorite.product?.name ?? 'Unknown Product',
        productDescription: favorite.product?.description ?? null,
        category: favorite.product?.category ?? null,
        price: favorite.product?.skus?.[0]
          ? Number(favorite.product.skus[0].basePrice)
          : null,
        imageUrl: favorite.product?.imageUrl ?? null,
        status: favorite.product ? (favorite.product.active ? 'ACTIVE' : 'INACTIVE') : null,
        addedAt: favorite.createdAt.toISOString(),
      },
      201
    );
  } catch (error) {
    console.error('Error adding favorite:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
    }

    if (error instanceof Error && error.message === 'Product not found') {
      return Errors.notFound('Product not found');
    }

    return Errors.serverError('Failed to add favorite');
  }
}

/**
 * Remove from favorites
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const tenant = await requireTenant(request);

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return Errors.badRequest('Product ID is required');
    }

    await withTenant(tenant.tenantId, async (tx) => {
      const list = await getOrCreateFavoritesListTx(tx, tenant.tenantId, user.id);

      const existingItem = await tx.listItem.findFirst({
        where: {
          listId: list.id,
          productId,
        },
      });

      if (!existingItem) {
        return;
      }

      await tx.listItem.delete({
        where: { id: existingItem.id },
      });
    });

    return successResponse({
      removed: true,
      productId,
      removedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error removing favorite:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
    }

    return Errors.serverError('Failed to remove favorite');
  }
}
