/**
 * Favorites API
 * GET /api/portal/favorites - List user favorites
 * POST /api/portal/favorites - Add to favorites
 * DELETE /api/portal/favorites - Remove from favorites
 */

import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/app/api/_utils/response';
import { requireTenant } from '@/app/api/_utils/tenant';
import { requireAuth } from '@/app/api/_utils/auth';
import { addFavoriteSchema } from '@/lib/validations/portal';

/**
 * List user favorites
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const tenant = await requireTenant(request);

    // TODO: Implement with Prisma
    // SELECT products WHERE id IN (SELECT productId FROM favorites WHERE userId = user.id)

    const favorites = [
      {
        id: 'fav-1',
        productId: 'prod-1',
        product: {
          id: 'prod-1',
          name: 'Favorite Product',
          price: 29.99,
          imageUrl: null,
        },
        addedAt: new Date().toISOString(),
      },
    ];

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

    // TODO: Implement with Prisma
    // 1. Verify product exists
    // 2. Check if already favorited
    // 3. Create favorite record

    const favorite = {
      id: 'fav-new',
      userId: user.id,
      productId,
      addedAt: new Date().toISOString(),
    };

    return successResponse(favorite, 201);
  } catch (error) {
    console.error('Error adding favorite:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
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

    // TODO: Implement with Prisma
    // DELETE FROM favorites WHERE userId = user.id AND productId = productId

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
