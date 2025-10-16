/**
 * Order Templates API
 * GET /api/portal/templates - Get saved order templates
 * POST /api/portal/templates - Create order template
 * DELETE /api/portal/templates - Delete template
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { successResponse, Errors } from '@/app/api/_utils/response';
import { requireTenant } from '@/app/api/_utils/tenant';
import { requireAuth } from '@/app/api/_utils/auth';
import { withTenant } from '@/lib/prisma';

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).default(1),
      })
    )
    .min(1),
  isPublic: z.boolean().optional().default(false),
});

async function fetchTemplates(tx: PrismaClient, tenantId: string, portalUserId: string) {
  const lists = await tx.list.findMany({
    where: {
      tenantId,
      isDefault: false,
      OR: [{ portalUserId }, { isShared: true }],
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
              status: true,
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
          createdAt: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return lists.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    isPublic: template.isShared,
    createdAt: template.createdAt.toISOString(),
    items: template.items.map((item) => {
      let quantity = 1;
      if (item.notes) {
        try {
          const parsed = JSON.parse(item.notes);
          if (typeof parsed?.quantity === 'number') {
            quantity = parsed.quantity;
          }
        } catch (error) {
          quantity = 1;
        }
      }

      return {
        id: item.id,
        productId: item.productId,
        productName: item.product?.name ?? 'Unknown Product',
        productDescription: item.product?.description ?? null,
        category: item.product?.category ?? null,
        price: item.product?.skus?.[0]
          ? Number(item.product.skus[0].basePrice)
          : null,
        imageUrl: item.product?.imageUrl ?? null,
        quantity,
      };
    }),
    totalItems: template.items.length,
    estimatedTotal: Number(
      template.items.reduce((sum, item) => {
        let quantity = 1;
        if (item.notes) {
          try {
            const parsed = JSON.parse(item.notes);
            if (typeof parsed?.quantity === 'number') {
            quantity = parsed.quantity;
          }
        } catch (error) {
          quantity = 1;
        }
        }

        const price = item.product?.skus?.[0]
          ? Number(item.product.skus[0].basePrice)
          : 0;
        return sum + price * quantity;
      }, 0).toFixed(2)
    ),
  }));
}

/**
 * Get order templates
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const tenant = await requireTenant(request);

    const templates = await withTenant(tenant.tenantId, (tx) =>
      fetchTemplates(tx, tenant.tenantId, user.id)
    );

    return successResponse({
      templates,
      total: templates.length,
    });
  } catch (error) {
    console.error('Error fetching templates:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
    }

    return Errors.serverError('Failed to fetch templates');
  }
}

/**
 * Create order template
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const tenant = await requireTenant(request);

    const body = await request.json();
    const validatedBody = createTemplateSchema.safeParse(body);

    if (!validatedBody.success) {
      return Errors.validationError(
        'Invalid template data',
        validatedBody.error.flatten()
      );
    }

    const { name, description, items, isPublic } = validatedBody.data;

    const createdTemplate = await withTenant(tenant.tenantId, async (tx) => {
      const products = await tx.product.findMany({
        where: {
          id: { in: items.map((item) => item.productId) },
          tenantId: tenant.tenantId,
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      if (products.length !== items.length) {
        throw new Error('One or more products could not be found');
      }

      const created = await tx.list.create({
        data: {
          tenantId: tenant.tenantId,
          portalUserId: user.id,
          name,
          description,
          isDefault: false,
          isShared: isPublic ?? false,
          items: {
            create: items.map((item, index) => ({
              productId: item.productId,
              sortOrder: index,
              notes: JSON.stringify({ quantity: item.quantity ?? 1 }),
            })),
          },
        },
      });

      return created.id;
    });

    const templates = await withTenant(tenant.tenantId, (tx) =>
      fetchTemplates(tx, tenant.tenantId, user.id)
    );

    const responseTemplate =
      templates.find((template) => template.id === createdTemplate) ?? templates[0];

    return successResponse(responseTemplate, 201);
  } catch (error) {
    console.error('Error creating template:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
    }

    if (error instanceof Error && error.message === 'One or more products could not be found') {
      return Errors.notFound(error.message);
    }

    return Errors.serverError('Failed to create template');
  }
}

/**
 * Delete template
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const tenant = await requireTenant(request);

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');

    if (!templateId) {
      return Errors.badRequest('Template ID is required');
    }

    await withTenant(tenant.tenantId, async (tx) => {
      const template = await tx.list.findFirst({
        where: {
          tenantId: tenant.tenantId,
          id: templateId,
          isDefault: false,
          OR: [{ portalUserId: user.id }, { isShared: true }],
        },
      });

      if (!template) {
        throw new Error('Template not found');
      }

      if (!template.isShared && template.portalUserId !== user.id) {
        throw new Error('Forbidden');
      }

      await tx.listItem.deleteMany({ where: { listId: template.id } });
      await tx.list.delete({ where: { id: template.id } });
    });

    return successResponse({
      deleted: true,
      templateId,
      deletedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error deleting template:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
    }

    if (error instanceof Error && error.message === 'Template not found') {
      return Errors.notFound(error.message);
    }

    if (error instanceof Error && error.message === 'Forbidden') {
      return Errors.forbidden('You do not have permission to delete this template');
    }

    return Errors.serverError('Failed to delete template');
  }
}
