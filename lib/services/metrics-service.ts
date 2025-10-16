/**
 * Metrics Service
 *
 * Unified service for calculating and caching business intelligence metrics.
 * Orchestrates pace tracking, health scoring, sample management, and opportunity detection.
 *
 * Blueprint Reference: Section 7.1
 */

import { PrismaClient } from '@prisma/client';
import {
  calculateAccountPace,
  calculateTenantPace,
  PaceMetrics,
  PaceConfig,
  getTenantPaceConfig,
} from '../intelligence/pace-tracker';
import {
  calculateAccountHealth,
  calculateTenantHealth,
  HealthScore,
  HealthConfig,
  getTenantHealthConfig,
  saveHealthSnapshot,
} from '../intelligence/health-scorer';
import {
  getRepSampleAllowance,
  getPendingFeedback,
  SampleAllowance,
  SampleTransfer,
  SampleConfig,
  getTenantSampleConfig,
} from '../intelligence/sample-manager';
import {
  detectCustomerOpportunities,
  detectTenantOpportunities,
  getOpportunitySummary,
  Opportunity,
  OpportunityConfig,
  getTenantOpportunityConfig,
} from '../intelligence/opportunity-detector';

export interface DashboardMetrics {
  pace: {
    atRiskCount: number;
    criticalCount: number;
    warningCount: number;
    accounts: PaceMetrics[];
  };
  health: {
    atRiskCount: number;
    criticalCount: number;
    warningCount: number;
    accounts: HealthScore[];
  };
  samples: {
    totalPullsThisMonth: number;
    repsOverAllowance: number;
    pendingFeedbackCount: number;
    allowances: SampleAllowance[];
  };
  opportunities: {
    totalCustomersAnalyzed: number;
    averageOpportunitiesPerCustomer: number;
    topOpportunities: Opportunity[];
  };
  calculatedAt: Date;
}

export interface AccountInsights {
  accountId: string;
  accountName: string;
  pace: PaceMetrics;
  health: HealthScore;
  opportunities: Opportunity[];
  opportunitySummary: {
    totalOpportunities: number;
    byCategory: Map<string, number>;
    bySupplier: Map<string, number>;
    topOpportunity: Opportunity | null;
  };
  calculatedAt: Date;
}

/**
 * Calculate comprehensive dashboard metrics for a tenant
 */
export async function calculateDashboardMetrics(
  prisma: PrismaClient,
  tenantId: string,
  options?: {
    includeAllAccounts?: boolean;
    salesRepId?: string; // Filter to specific rep's accounts
  }
): Promise<DashboardMetrics> {
  // Load tenant configurations
  const [paceConfig, healthConfig, sampleConfig] = await Promise.all([
    getTenantPaceConfig(prisma, tenantId),
    getTenantHealthConfig(prisma, tenantId),
    getTenantSampleConfig(prisma, tenantId),
  ]);

  // Calculate pace metrics (parallel)
  const paceResults = await calculateTenantPace(prisma, tenantId, paceConfig, {
    onlyAtRisk: !options?.includeAllAccounts,
  });

  const paceCritical = paceResults.filter((p) => p.riskLevel === 'critical');
  const paceWarning = paceResults.filter((p) => p.riskLevel === 'warning');

  // Calculate health metrics (parallel)
  const healthResults = await calculateTenantHealth(prisma, tenantId, healthConfig, {
    onlyAtRisk: !options?.includeAllAccounts,
  });

  const healthCritical = healthResults.filter((h) => h.riskLevel === 'critical');
  const healthWarning = healthResults.filter((h) => h.riskLevel === 'warning');

  // Calculate sample metrics
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Get all sales reps
  const reps = await prisma.user.findMany({
    where: {
      tenantId,
      ...(options?.salesRepId && { id: options.salesRepId }),
      roleAssignments: {
        some: {
          role: {
            name: {
              in: ['sales_rep', 'sales_manager'],
            },
          },
        },
      },
    },
    select: {
      id: true,
    },
  });

  const allowancePromises = reps.map((rep) =>
    getRepSampleAllowance(prisma, tenantId, rep.id, currentYear, currentMonth, sampleConfig)
  );

  const allowances = await Promise.all(allowancePromises);
  const totalPulls = allowances.reduce((sum, a) => sum + a.pullsThisMonth, 0);
  const repsOverAllowance = allowances.filter((a) => a.isOverAllowance).length;

  const pendingFeedback = await getPendingFeedback(
    prisma,
    tenantId,
    options?.salesRepId || undefined
  );

  // Calculate opportunity metrics (top opportunities across all customers)
  const opportunityMap = await detectTenantOpportunities(prisma, tenantId, 'revenue', {
    topN: 5, // Top 5 per customer
  });

  const allOpportunities: Opportunity[] = [];
  opportunityMap.forEach((opps) => {
    allOpportunities.push(...opps);
  });

  // Get top opportunities overall (by revenue)
  const topOpportunities = allOpportunities
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 20);

  const avgOpportunitiesPerCustomer =
    opportunityMap.size > 0
      ? allOpportunities.length / opportunityMap.size
      : 0;

  return {
    pace: {
      atRiskCount: paceResults.filter((p) => p.isPastDue).length,
      criticalCount: paceCritical.length,
      warningCount: paceWarning.length,
      accounts: paceResults,
    },
    health: {
      atRiskCount: healthResults.filter((h) => h.isAtRisk).length,
      criticalCount: healthCritical.length,
      warningCount: healthWarning.length,
      accounts: healthResults,
    },
    samples: {
      totalPullsThisMonth: totalPulls,
      repsOverAllowance,
      pendingFeedbackCount: pendingFeedback.length,
      allowances,
    },
    opportunities: {
      totalCustomersAnalyzed: opportunityMap.size,
      averageOpportunitiesPerCustomer: Math.round(avgOpportunitiesPerCustomer * 10) / 10,
      topOpportunities,
    },
    calculatedAt: new Date(),
  };
}

/**
 * Calculate comprehensive insights for a specific account
 */
export async function calculateAccountInsights(
  prisma: PrismaClient,
  accountId: string,
  tenantId: string
): Promise<AccountInsights> {
  // Load configurations
  const [paceConfig, healthConfig, opportunityConfig] = await Promise.all([
    getTenantPaceConfig(prisma, tenantId),
    getTenantHealthConfig(prisma, tenantId),
    getTenantOpportunityConfig(prisma, tenantId),
  ]);

  // Calculate metrics in parallel
  const [pace, health, opportunities, opportunitySummary] = await Promise.all([
    calculateAccountPace(prisma, accountId, tenantId, paceConfig),
    calculateAccountHealth(prisma, accountId, tenantId, healthConfig),
    detectCustomerOpportunities(prisma, accountId, tenantId, 'revenue', opportunityConfig),
    getOpportunitySummary(prisma, accountId, tenantId),
  ]);

  return {
    accountId,
    accountName: pace.accountName,
    pace,
    health,
    opportunities,
    opportunitySummary,
    calculatedAt: new Date(),
  };
}

/**
 * Scheduled job to calculate and cache health snapshots
 */
export async function scheduleHealthSnapshots(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  const healthConfig = await getTenantHealthConfig(prisma, tenantId);
  const healthResults = await calculateTenantHealth(prisma, tenantId, healthConfig);

  // Save snapshots in parallel
  const snapshotPromises = healthResults.map((health) =>
    saveHealthSnapshot(prisma, tenantId, health.accountId, health)
  );

  await Promise.all(snapshotPromises);
}

/**
 * Get alerts and action items for a tenant
 */
export async function getActionableAlerts(
  prisma: PrismaClient,
  tenantId: string,
  salesRepId?: string
): Promise<{
  criticalAlerts: Array<{ type: string; message: string; accountId: string; priority: number }>;
  warningAlerts: Array<{ type: string; message: string; accountId: string; priority: number }>;
  actionItems: Array<{ type: string; message: string; accountId?: string; dueDate?: Date }>;
}> {
  const metrics = await calculateDashboardMetrics(prisma, tenantId, { salesRepId });

  const criticalAlerts: any[] = [];
  const warningAlerts: any[] = [];
  const actionItems: any[] = [];

  // Critical pace alerts
  metrics.pace.accounts
    .filter((p) => p.riskLevel === 'critical')
    .forEach((p) => {
      criticalAlerts.push({
        type: 'pace_critical',
        message: `${p.accountName} is ${p.daysSinceLastOrder} days past their expected order (ARPDD: ${p.arpdd} days)`,
        accountId: p.accountId,
        priority: 1,
      });
      actionItems.push({
        type: 'pace_follow_up',
        message: `Schedule visit with ${p.accountName} - ${p.daysSinceLastOrder} days late`,
        accountId: p.accountId,
      });
    });

  // Warning pace alerts
  metrics.pace.accounts
    .filter((p) => p.riskLevel === 'warning')
    .forEach((p) => {
      warningAlerts.push({
        type: 'pace_warning',
        message: `${p.accountName} approaching order cycle (${p.daysSinceLastOrder}/${p.arpdd} days)`,
        accountId: p.accountId,
        priority: 2,
      });
    });

  // Critical health alerts
  metrics.health.accounts
    .filter((h) => h.riskLevel === 'critical')
    .forEach((h) => {
      criticalAlerts.push({
        type: 'health_critical',
        message: `${h.accountName} revenue down ${Math.abs(h.percentageChange).toFixed(1)}% (${h.currentMonthRevenue.toFixed(0)} vs avg ${h.baselineAverage.toFixed(0)})`,
        accountId: h.accountId,
        priority: 1,
      });
      actionItems.push({
        type: 'health_review',
        message: `Review account health for ${h.accountName} - investigate revenue drop`,
        accountId: h.accountId,
      });
    });

  // Sample feedback action items
  if (metrics.samples.pendingFeedbackCount > 0) {
    actionItems.push({
      type: 'sample_feedback',
      message: `${metrics.samples.pendingFeedbackCount} sample tastings need follow-up feedback`,
    });
  }

  // Reps over allowance
  metrics.samples.allowances
    .filter((a) => a.isOverAllowance)
    .forEach((a) => {
      warningAlerts.push({
        type: 'sample_allowance',
        message: `${a.salesRepName} has exceeded sample allowance (${a.pullsThisMonth}/${a.allowance})`,
        accountId: '',
        priority: 3,
      });
    });

  return {
    criticalAlerts: criticalAlerts.sort((a, b) => a.priority - b.priority),
    warningAlerts: warningAlerts.sort((a, b) => a.priority - b.priority),
    actionItems,
  };
}
