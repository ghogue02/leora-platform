/**
 * Sample Management System
 *
 * Tracks sample inventory transfers, enforces monthly allowances, and captures
 * tasting feedback on follow-up activities.
 *
 * NOTE: This module requires additional Prisma models (inventoryMovement, sampleTransfer)
 * that are not yet implemented. Functions are stubbed for future implementation.
 *
 * Blueprint Reference: Section 1.2 "Samples lack accountability"
 */

import { PrismaClient } from '@prisma/client';

export interface SampleTransfer {
  id: string;
  tenantId: string;
  salesRepId: string;
  salesRepName: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  skuId: string;
  quantity: number;
  transferDate: Date;
  purposeNotes?: string;
  followUpActivityId?: string;
  approvedByManagerId?: string;
  metadata?: Record<string, any>;
}

export interface SampleAllowance {
  tenantId: string;
  salesRepId: string;
  salesRepName: string;
  year: number;
  month: number;
  allowance: number;
  pullsThisMonth: number;
  remainingAllowance: number;
  isOverAllowance: boolean;
  transfersThisMonth: SampleTransfer[];
}

export interface TastingFeedback {
  activityId: string;
  sampleTransferId: string;
  customerId: string;
  productId: string;
  feedbackDate: Date;
  rating?: number;
  customerInterest: 'high' | 'medium' | 'low' | 'none';
  orderPlaced: boolean;
  orderAmount?: number;
  notes?: string;
  followUpRequired: boolean;
}

export interface SampleConfig {
  defaultMonthlyAllowance: number;
  requireManagerApprovalOver: number;
  trackTastingFeedback: boolean;
  minimumFeedbackDays: number;
}

const DEFAULT_CONFIG: SampleConfig = {
  defaultMonthlyAllowance: 60,
  requireManagerApprovalOver: 60,
  trackTastingFeedback: true,
  minimumFeedbackDays: 14,
};

/**
 * Record a sample transfer
 * TODO: Implement when inventoryMovement and sampleTransfer models are added to schema
 */
export async function recordSampleTransfer(
  prisma: PrismaClient,
  transfer: Omit<SampleTransfer, 'id' | 'salesRepName' | 'customerName' | 'productName'>
): Promise<SampleTransfer> {
  console.log('[Sample Manager] Sample transfer requested but schema models not yet implemented');

  throw new Error('Sample management requires additional schema models. Coming soon.');
}

/**
 * Get sample allowance for a sales rep for a specific month
 * TODO: Implement when sampleTransfer model is added to schema
 */
export async function getRepSampleAllowance(
  prisma: PrismaClient,
  tenantId: string,
  salesRepId: string,
  year: number,
  month: number,
  config?: SampleConfig
): Promise<SampleAllowance> {
  const finalConfig = config || (await getTenantSampleConfig(prisma, tenantId));

  const salesRep = await prisma.user.findUnique({
    where: { id: salesRepId },
    select: { fullName: true },
  });

  return {
    tenantId,
    salesRepId,
    salesRepName: salesRep?.fullName || 'Unknown',
    year,
    month,
    allowance: finalConfig.defaultMonthlyAllowance,
    pullsThisMonth: 0,
    remainingAllowance: finalConfig.defaultMonthlyAllowance,
    isOverAllowance: false,
    transfersThisMonth: [],
  };
}

/**
 * Record tasting feedback
 * TODO: Implement when sampleTransfer model is added to schema
 */
export async function recordTastingFeedback(
  prisma: PrismaClient,
  tenantId: string,
  feedback: Omit<TastingFeedback, 'activityId'>
): Promise<TastingFeedback> {
  console.log('[Sample Manager] Tasting feedback requested but schema models not yet implemented');

  throw new Error('Tasting feedback requires additional schema models. Coming soon.');
}

/**
 * Get pending feedback for samples
 * TODO: Implement when sampleTransfer model is added to schema
 */
export async function getPendingFeedback(
  prisma: PrismaClient,
  tenantId: string,
  salesRepId?: string
): Promise<SampleTransfer[]> {
  console.log('[Sample Manager] getPendingFeedback called but model not yet implemented');
  return [];
}

/**
 * Get tenant sample configuration
 */
export async function getTenantSampleConfig(
  prisma: PrismaClient,
  tenantId: string
): Promise<SampleConfig> {
  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: {
      defaultSampleAllowancePerRep: true,
      requireManagerApprovalAbove: true,
    },
  });

  if (settings) {
    return {
      defaultMonthlyAllowance: settings.defaultSampleAllowancePerRep,
      requireManagerApprovalOver: settings.requireManagerApprovalAbove,
      trackTastingFeedback: true,
      minimumFeedbackDays: 14,
    };
  }

  return DEFAULT_CONFIG;
}

/**
 * Update tenant sample configuration
 */
export async function updateTenantSampleConfig(
  prisma: PrismaClient,
  tenantId: string,
  config: Partial<SampleConfig>
): Promise<void> {
  await prisma.tenantSettings.update({
    where: { tenantId },
    data: {
      defaultSampleAllowancePerRep: config.defaultMonthlyAllowance,
      requireManagerApprovalAbove: config.requireManagerApprovalOver,
    },
  });
}
