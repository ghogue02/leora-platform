/**
 * Account API
 * GET /api/portal/account - Retrieve current portal user account details
 * PATCH /api/portal/account - Update profile information
 */

import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/app/api/_utils/response';
import { requireTenant } from '@/app/api/_utils/tenant';
import { requirePermission, requireAuth } from '@/app/api/_utils/auth';
import { withTenant } from '@/lib/prisma';
import { accountUpdateSchema } from '@/lib/validations/portal';

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'portal.account.view');
    const tenant = await requireTenant(request);

    const result = await withTenant(tenant.tenantId, async (tx) => {
      const portalUser = await tx.portalUser.findFirst({
        where: {
          id: user.id,
          tenantId: tenant.tenantId,
        },
      });

      if (!portalUser) {
        return null;
      }

      let customer: { id: string; company: { name: string } | null } | null = null;
      if (portalUser.customerId) {
        customer = await tx.customer.findFirst({
          where: {
            id: portalUser.customerId,
            tenantId: tenant.tenantId,
          },
          select: {
            id: true,
            company: {
              select: {
                name: true,
              },
            },
          },
        });
      }

      const [ordersCount, invoicesCount, outstandingInvoices, lastOrder] = await Promise.all([
        tx.order.count({
          where: {
            tenantId: tenant.tenantId,
            customerId: portalUser.customerId ?? undefined,
          },
        }),
        tx.invoice.count({
          where: {
            tenantId: tenant.tenantId,
            customerId: portalUser.customerId ?? undefined,
          },
        }),
        tx.invoice.aggregate({
          _sum: { balanceDue: true },
          where: {
            tenantId: tenant.tenantId,
            customerId: portalUser.customerId ?? undefined,
            status: { not: 'PAID' },
          },
        }),
        tx.order.findFirst({
          where: {
            tenantId: tenant.tenantId,
            customerId: portalUser.customerId ?? undefined,
          },
          select: { orderDate: true },
          orderBy: { orderDate: 'desc' },
        }),
      ]);

      const tenantSettings = await tx.tenantSettings.findUnique({
        where: { tenantId: tenant.tenantId },
      });

      return {
        profile: {
          id: portalUser.id,
          email: portalUser.email,
          firstName: portalUser.firstName,
          lastName: portalUser.lastName,
          fullName: portalUser.fullName,
          phone: portalUser.phone,
          customerId: portalUser.customerId,
          companyName: customer?.company?.name ?? null,
        },
        stats: {
          ordersCount,
          invoicesCount,
          outstandingBalance: Number(outstandingInvoices._sum.balanceDue || 0),
          lastOrderDate: lastOrder?.orderDate ? lastOrder.orderDate.toISOString() : null,
        },
        settings: tenantSettings
          ? {
              defaultCurrency: tenantSettings.defaultCurrency,
              timezone: tenantSettings.timezone,
              dateFormat: tenantSettings.dateFormat,
            }
          : null,
      };
    });

    if (!result) {
      return Errors.notFound('Account not found');
    }

    return successResponse(result);
  } catch (error) {
    console.error('Error fetching account:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
    }

    if (error instanceof Error && error.message.startsWith('Permission denied')) {
      return Errors.forbidden();
    }

    return Errors.serverError('Failed to fetch account');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    const tenant = await requireTenant(request);

    const body = await request.json();
    const validatedBody = accountUpdateSchema.safeParse(body);

    if (!validatedBody.success) {
      return Errors.validationError(
        'Invalid account update payload',
        validatedBody.error.flatten()
      );
    }

    const { firstName, lastName, phone, companyName } = validatedBody.data;

    const updated = await withTenant(tenant.tenantId, async (tx) => {
      const portalUser = await tx.portalUser.findFirst({
        where: {
          id: authUser.id,
          tenantId: tenant.tenantId,
        },
      });

      if (!portalUser) {
        return null;
      }

      const updates: Record<string, unknown> = {};
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (phone !== undefined) updates.phone = phone;

      if (firstName !== undefined || lastName !== undefined) {
        const newFullName = `${firstName ?? portalUser.firstName ?? ''} ${lastName ?? portalUser.lastName ?? ''}`.trim();
        updates.fullName = newFullName || portalUser.email;
      }

      await tx.portalUser.update({
        where: { id: portalUser.id },
        data: updates,
      });

      if (companyName !== undefined && portalUser.customerId) {
        const customer = await tx.customer.findFirst({
          where: {
            id: portalUser.customerId,
            tenantId: tenant.tenantId,
          },
          select: {
            companyId: true,
          },
        });

        if (customer?.companyId) {
          await tx.company.update({
            where: { id: customer.companyId },
            data: {
              name: companyName || '',
            },
          });
        }
      }

      const refreshed = await tx.portalUser.findFirst({
        where: {
          id: portalUser.id,
          tenantId: tenant.tenantId,
        },
      });

      return refreshed;
    });

    if (!updated) {
      return Errors.notFound('Account not found');
    }

    return successResponse({
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      fullName: updated.fullName,
      phone: updated.phone,
      customerId: updated.customerId,
    });
  } catch (error) {
    console.error('Error updating account:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
    }

    return Errors.serverError('Failed to update account');
  }
}
