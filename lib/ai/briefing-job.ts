/**
 * Leora AI Copilot - Briefing Job
 *
 * Scheduled job that generates proactive dashboard briefings.
 * Can be triggered daily, on-demand, or on user login.
 */

import { getInsightsComposer } from './insights-composer';
import { InsightContext, ProactiveBriefing } from './types';

// ============================================================================
// Briefing Cache Interface (implement with Redis or similar)
// ============================================================================

interface BriefingCache {
  get(key: string): Promise<ProactiveBriefing | null>;
  set(key: string, briefing: ProactiveBriefing, ttl?: number): Promise<void>;
  invalidate(key: string): Promise<void>;
}

// Simple in-memory cache for demo (replace with Redis in production)
class InMemoryBriefingCache implements BriefingCache {
  private cache = new Map<string, { briefing: ProactiveBriefing; expires: number }>();

  async get(key: string): Promise<ProactiveBriefing | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.briefing;
  }

  async set(key: string, briefing: ProactiveBriefing, ttl: number = 3600000): Promise<void> {
    this.cache.set(key, {
      briefing,
      expires: Date.now() + ttl,
    });
  }

  async invalidate(key: string): Promise<void> {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

const briefingCache = new InMemoryBriefingCache();

// ============================================================================
// Metric Gathering (Prisma Queries)
// ============================================================================

/**
 * Gathers metrics from Supabase using Prisma
 * TODO: Implement actual Prisma queries once schema is available
 */
async function gatherMetrics(tenantId: string, userId: string) {
  // This is a placeholder - implement actual Prisma queries
  // based on the Leora schema when Prisma is set up

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // TODO: Replace with actual Prisma queries:
  /*
  const prisma = getPrismaClient();

  const [customers, orders, samples, activities] = await Promise.all([
    prisma.customer.findMany({
      where: { tenantId },
      include: { accountHealthSnapshots: { take: 1, orderBy: { snapshotDate: 'desc' } } }
    }),
    prisma.order.findMany({
      where: { tenantId, orderDate: { gte: thirtyDaysAgo } }
    }),
    prisma.order.findMany({
      where: { tenantId, isSampleOrder: true, orderDate: { gte: startOfMonth } }
    }),
    prisma.activity.findMany({
      where: { tenantId, status: { in: ['open', 'overdue'] } }
    })
  ]);
  */

  // Mock data for demonstration
  return {
    customer: {
      totalCustomers: 150,
      activeCustomers: 120,
      customersWithPaceDeviation: [
        { id: '1', name: 'Harborview Cellars', deviationDays: 12 },
        { id: '2', name: 'Mountain View Spirits', deviationDays: 8 },
      ],
      customersWithRevenueDrop: [
        { id: '3', name: 'Coastal Wines', revenueChangePercent: -18 },
        { id: '4', name: 'Valley Distributors', revenueChangePercent: -22 },
      ],
    },
    sales: {
      totalRevenue: 245000,
      orderCount: 89,
      avgOrderValue: 2752,
      revenueChange: -5.2,
      topProducts: [
        { id: 'p1', name: 'Premium Cabernet', revenue: 45000 },
        { id: 'p2', name: 'Craft IPA 6-Pack', revenue: 38000 },
      ],
    },
    samples: {
      totalSamples: 156,
      samplesThisMonth: 52,
      monthlyAllowance: 60,
      repsSampleUsage: [
        { repId: 'r1', repName: 'John Smith', sampleCount: 18 },
        { repId: 'r2', repName: 'Sarah Johnson', sampleCount: 15 },
      ],
    },
    pipeline: {
      openTasks: 12,
      overdueActivities: 3,
      upcomingCalls: 8,
    },
  };
}

// ============================================================================
// Briefing Job Class
// ============================================================================

export class BriefingJob {
  private composer = getInsightsComposer();

  /**
   * Generate briefing for a user (called on login or daily)
   */
  async generateUserBriefing(
    tenantId: string,
    userId: string,
    options: {
      forceRefresh?: boolean;
      cacheTTL?: number;
    } = {}
  ): Promise<ProactiveBriefing> {
    const cacheKey = `briefing:${tenantId}:${userId}`;

    // Check cache unless force refresh
    if (!options.forceRefresh) {
      const cached = await briefingCache.get(cacheKey);
      if (cached) {
        console.log(`[Leora AI] Returning cached briefing for ${userId}`);
        return cached;
      }
    }

    console.log(`[Leora AI] Generating new briefing for ${userId}`);

    try {
      // Gather metrics from Supabase
      const metrics = await gatherMetrics(tenantId, userId);

      // Check if we have sufficient data
      if (this.hasInsufficientData(metrics)) {
        return this.generateNoDataBriefing(tenantId, userId);
      }

      // Build context
      const context: InsightContext = {
        tenantId,
        userId,
        userRole: 'sales_rep', // TODO: Get from session
        timeframe: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
      };

      // Generate briefing using AI
      const briefing = await this.composer.generateBriefing(context, metrics);

      // Cache result
      await briefingCache.set(cacheKey, briefing, options.cacheTTL || 3600000); // 1 hour default

      return briefing;
    } catch (error) {
      console.error('[Leora AI] Briefing generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate briefings for all active users in a tenant (batch job)
   */
  async generateTenantBriefings(tenantId: string): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    console.log(`[Leora AI] Starting batch briefing generation for tenant ${tenantId}`);

    // TODO: Get active users from Prisma
    // const users = await prisma.user.findMany({ where: { tenantId, isActive: true } });

    const mockUsers = [
      { id: 'user1', email: 'john@example.com' },
      { id: 'user2', email: 'sarah@example.com' },
    ];

    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const user of mockUsers) {
      try {
        await this.generateUserBriefing(tenantId, user.id, { forceRefresh: true });
        successful++;
      } catch (error: any) {
        failed++;
        errors.push(`${user.email}: ${error.message}`);
      }
    }

    console.log(
      `[Leora AI] Batch complete: ${successful} successful, ${failed} failed`
    );

    return { successful, failed, errors };
  }

  /**
   * Invalidate cached briefing (call when data changes)
   */
  async invalidateBriefing(tenantId: string, userId: string): Promise<void> {
    const cacheKey = `briefing:${tenantId}:${userId}`;
    await briefingCache.invalidate(cacheKey);
    console.log(`[Leora AI] Invalidated briefing cache for ${userId}`);
  }

  /**
   * Clear all briefing caches (maintenance)
   */
  async clearAllCaches(): Promise<void> {
    if (briefingCache instanceof InMemoryBriefingCache) {
      briefingCache.clear();
    }
    console.log('[Leora AI] Cleared all briefing caches');
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private hasInsufficientData(metrics: any): boolean {
    return (
      metrics.sales.orderCount === 0 ||
      metrics.customer.totalCustomers === 0
    );
  }

  private generateNoDataBriefing(
    tenantId: string,
    userId: string
  ): ProactiveBriefing {
    return {
      tenantId,
      userId,
      generatedAt: new Date(),
      summary:
        'No data yet. Connect your distributor feeds to light up Leora\'s insights.',
      keyMetrics: [],
      alerts: [],
      recommendedActions: [
        {
          title: 'Connect Data Sources',
          description: 'Import order history and customer data to enable AI insights',
          priority: 'high',
          actionUrl: '/portal/settings/integrations',
        },
      ],
      confidence: 1.0,
      dataFreshness: new Date(),
    };
  }
}

// ============================================================================
// Cron Handler (for scheduled execution)
// ============================================================================

/**
 * Entry point for scheduled cron job
 * Can be triggered by Vercel Cron, Supabase scheduler, or external worker
 */
export async function runScheduledBriefingJob() {
  console.log('[Leora AI] Starting scheduled briefing job');

  const job = new BriefingJob();

  // TODO: Get all active tenants from Prisma
  // const tenants = await prisma.tenant.findMany({ where: { isActive: true } });

  const mockTenants = [{ id: 'well-crafted', name: 'Well Crafted' }];

  for (const tenant of mockTenants) {
    try {
      const result = await job.generateTenantBriefings(tenant.id);
      console.log(
        `[Leora AI] Tenant ${tenant.name}: ${result.successful} briefings generated, ${result.failed} failed`
      );

      if (result.errors.length > 0) {
        console.error(`[Leora AI] Errors for ${tenant.name}:`, result.errors);
      }
    } catch (error) {
      console.error(`[Leora AI] Failed to process tenant ${tenant.name}:`, error);
    }
  }

  console.log('[Leora AI] Scheduled briefing job complete');
}

// ============================================================================
// Export Singleton
// ============================================================================

let jobInstance: BriefingJob | null = null;

export function getBriefingJob(): BriefingJob {
  if (!jobInstance) {
    jobInstance = new BriefingJob();
  }
  return jobInstance;
}
