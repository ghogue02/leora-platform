/**
 * Notifications API
 * GET /api/portal/notifications - Get user notifications
 * PATCH /api/portal/notifications - Mark as read/unread
 * DELETE /api/portal/notifications - Delete notification
 */

import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/app/api/_utils/response';
import { requireTenant } from '@/app/api/_utils/tenant';
import { requireAuth } from '@/app/api/_utils/auth';
import { notificationFilterSchema, markNotificationReadSchema } from '@/lib/validations/portal';
import { withTenant } from '@/lib/prisma';

/**
 * Get user notifications
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const tenant = await requireTenant(request);

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validatedParams = notificationFilterSchema.safeParse(queryParams);

    if (!validatedParams.success) {
      return Errors.validationError(
        'Invalid query parameters',
        validatedParams.error.flatten()
      );
    }

    const { read, type, page, limit } = validatedParams.data;

    const { notifications, total, unreadCount } = await withTenant(
      tenant.tenantId,
      async (tx) => {
        const where = {
          tenantId: tenant.tenantId,
          portalUserId: user.id,
          ...(typeof read === 'boolean' ? { isRead: read } : {}),
          ...(type ? { type } : {}),
        };

        const [records, totalCount, unreadTotal] = await Promise.all([
          tx.notification.findMany({
            where,
            orderBy: {
              createdAt: 'desc',
            },
            take: limit,
            skip: (page - 1) * limit,
          }),
          tx.notification.count({ where }),
          tx.notification.count({
            where: {
              tenantId: tenant.tenantId,
              portalUserId: user.id,
              isRead: false,
            },
          }),
        ]);

        return {
          notifications: records,
          total: totalCount,
          unreadCount: unreadTotal,
        };
      }
    );

    return successResponse({
      notifications: notifications.map((notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        read: notification.isRead,
        actionUrl: notification.actionUrl,
        createdAt: notification.createdAt.toISOString(),
        readAt: notification.readAt ? notification.readAt.toISOString() : null,
        metadata: notification.metadata,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
    }

    return Errors.serverError('Failed to fetch notifications');
  }
}

/**
 * Mark notification as read/unread
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const tenant = await requireTenant(request);

    const body = await request.json();
    const validatedBody = markNotificationReadSchema.safeParse(body);

    if (!validatedBody.success) {
      return Errors.validationError(
        'Invalid notification data',
        validatedBody.error.flatten()
      );
    }

    const { notificationId, read } = validatedBody.data;

    const updateResult = await withTenant(tenant.tenantId, async (tx) => {
      const notification = await tx.notification.findFirst({
        where: {
          tenantId: tenant.tenantId,
          portalUserId: user.id,
          id: notificationId,
        },
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      const timestamp = read ? new Date() : null;

      const updated = await tx.notification.update({
        where: { id: notificationId },
        data: {
          isRead: read,
          readAt: timestamp,
        },
      });

      return {
        isRead: updated.isRead,
        readAt: timestamp,
      };
    });

    return successResponse({
      notificationId,
      read: updateResult.isRead,
      readAt: updateResult.readAt ? updateResult.readAt.toISOString() : null,
    });
  } catch (error) {
    console.error('Error updating notification:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
    }

    if (error instanceof Error && error.message === 'Notification not found') {
      return Errors.notFound(error.message);
    }

    return Errors.serverError('Failed to update notification');
  }
}

/**
 * Delete notification
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const tenant = await requireTenant(request);

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('notificationId');

    if (!notificationId) {
      return Errors.badRequest('Notification ID is required');
    }

    await withTenant(tenant.tenantId, async (tx) => {
      const notification = await tx.notification.findFirst({
        where: {
          tenantId: tenant.tenantId,
          portalUserId: user.id,
          id: notificationId,
        },
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      await tx.notification.delete({
        where: { id: notificationId },
      });
    });

    return successResponse({
      deleted: true,
      notificationId,
      deletedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error deleting notification:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return Errors.unauthorized();
    }

    if (error instanceof Error && error.message === 'Notification not found') {
      return Errors.notFound(error.message);
    }

    return Errors.serverError('Failed to delete notification');
  }
}
