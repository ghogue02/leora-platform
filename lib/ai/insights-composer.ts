/**
 * Leora AI Copilot - Proactive Insights Composer
 *
 * Gathers structured metrics from Supabase/Prisma and uses GPT-5
 * to craft narrative insight cards for the dashboard.
 */

import { getOpenAIClient } from './openai-client';
import { AIResponse, ProactiveBriefing, BriefingMetric, InsightContext, AIError } from './types';
import { BRIEFING_PROMPT_TEMPLATE, INSIGHT_COMPOSER_TEMPLATE, buildPrompt } from './prompts/system-prompts';

// ============================================================================
// Metric Gathering Interfaces
// ============================================================================

interface CustomerMetrics {
  totalCustomers: number;
  activeCustomers: number;
  customersWithPaceDeviation: Array<{
    id: string;
    name: string;
    deviationDays: number;
  }>;
  customersWithRevenueDrop: Array<{
    id: string;
    name: string;
    revenueChangePercent: number;
  }>;
}

interface SalesMetrics {
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  revenueChange: number;
  topProducts: Array<{
    id: string;
    name: string;
    revenue: number;
  }>;
}

interface SampleMetrics {
  totalSamples: number;
  samplesThisMonth: number;
  monthlyAllowance: number;
  repsSampleUsage: Array<{
    repId: string;
    repName: string;
    sampleCount: number;
  }>;
}

interface PipelineMetrics {
  openTasks: number;
  overdueActivities: number;
  upcomingCalls: number;
}

// ============================================================================
// Insights Composer Class
// ============================================================================

export class InsightsComposer {
  private client = getOpenAIClient();

  // ==========================================================================
  // Main Briefing Generation
  // ==========================================================================

  async generateBriefing(
    context: InsightContext,
    metrics: {
      customer: CustomerMetrics;
      sales: SalesMetrics;
      samples: SampleMetrics;
      pipeline: PipelineMetrics;
    }
  ): Promise<ProactiveBriefing> {
    try {
      // Structure metrics for prompt
      const structuredMetrics = this.formatMetricsForPrompt(metrics);
      const recentActivity = this.summarizeRecentActivity(metrics);
      const contextualSummary = this.buildContextSummary(metrics);

      // Build prompt from template
      const userPrompt = buildPrompt(BRIEFING_PROMPT_TEMPLATE, {
        tenantName: 'Well Crafted', // TODO: Get from tenant context
        userName: context.userId,
        userRole: context.userRole || 'Sales Rep',
        dataPeriod: this.formatDateRange(context.timeframe),
        structuredMetrics,
        recentActivity,
        contextualSummary,
      });

      // Call OpenAI
      const response = await this.client.chat(
        [
          { role: 'system', content: BRIEFING_PROMPT_TEMPLATE.systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          model: BRIEFING_PROMPT_TEMPLATE.model,
          temperature: BRIEFING_PROMPT_TEMPLATE.temperature,
          maxTokens: BRIEFING_PROMPT_TEMPLATE.maxTokens,
          tenantId: context.tenantId,
          userId: context.userId,
          operation: 'briefing',
        }
      );

      // Parse response into structured briefing
      const briefing = this.parseBriefingResponse(response.content, context, metrics);

      return briefing;
    } catch (error) {
      console.error('[Leora AI] Briefing generation failed:', error);

      // Return fallback briefing
      return this.generateFallbackBriefing(context, metrics);
    }
  }

  // ==========================================================================
  // Individual Insight Generation
  // ==========================================================================

  async composeInsight(
    insightType: 'pace_deviation' | 'revenue_drop' | 'sample_budget' | 'pipeline_gap',
    metricData: Record<string, unknown>,
    businessContext: string
  ): Promise<AIResponse> {
    try {
      const userPrompt = buildPrompt(INSIGHT_COMPOSER_TEMPLATE, {
        metricData: JSON.stringify(metricData, null, 2),
        insightType,
        businessContext,
      });

      const response = await this.client.chat(
        [
          { role: 'system', content: INSIGHT_COMPOSER_TEMPLATE.systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          model: INSIGHT_COMPOSER_TEMPLATE.model,
          temperature: INSIGHT_COMPOSER_TEMPLATE.temperature,
          maxTokens: INSIGHT_COMPOSER_TEMPLATE.maxTokens,
          operation: 'insight',
        }
      );

      // Parse into AIResponse structure
      return {
        summary: response.content,
        confidence: 0.85,
        dataSourceIds: [insightType],
      };
    } catch (error) {
      throw new AIError(
        'Failed to compose insight',
        'API_ERROR',
        500,
        error
      );
    }
  }

  // ==========================================================================
  // Metric Formatting Helpers
  // ==========================================================================

  private formatMetricsForPrompt(metrics: {
    customer: CustomerMetrics;
    sales: SalesMetrics;
    samples: SampleMetrics;
    pipeline: PipelineMetrics;
  }): string {
    return `
## Customer Health
- Total Customers: ${metrics.customer.totalCustomers.toLocaleString()}
- Active Customers: ${metrics.customer.activeCustomers.toLocaleString()}
- Customers with Pace Deviation: ${metrics.customer.customersWithPaceDeviation.length}
- Customers with Revenue Drop: ${metrics.customer.customersWithRevenueDrop.length}

## Sales Performance
- Total Revenue: $${metrics.sales.totalRevenue.toLocaleString()}
- Order Count: ${metrics.sales.orderCount.toLocaleString()}
- Average Order Value: $${metrics.sales.avgOrderValue.toLocaleString()}
- Revenue Change: ${metrics.sales.revenueChange > 0 ? '+' : ''}${metrics.sales.revenueChange.toFixed(1)}%

## Sample Management
- Samples This Month: ${metrics.samples.samplesThisMonth}
- Monthly Allowance: ${metrics.samples.monthlyAllowance}
- Utilization: ${((metrics.samples.samplesThisMonth / metrics.samples.monthlyAllowance) * 100).toFixed(1)}%

## Pipeline
- Open Tasks: ${metrics.pipeline.openTasks}
- Overdue Activities: ${metrics.pipeline.overdueActivities}
- Upcoming Calls: ${metrics.pipeline.upcomingCalls}
`;
  }

  private summarizeRecentActivity(metrics: any): string {
    const highlights: string[] = [];

    if (metrics.customer.customersWithPaceDeviation.length > 0) {
      highlights.push(
        `${metrics.customer.customersWithPaceDeviation.length} customers have slipped their ordering pace`
      );
    }

    if (metrics.customer.customersWithRevenueDrop.length > 0) {
      highlights.push(
        `${metrics.customer.customersWithRevenueDrop.length} customers showing revenue decline`
      );
    }

    if (metrics.sales.revenueChange < 0) {
      highlights.push(`Revenue is down ${Math.abs(metrics.sales.revenueChange).toFixed(1)}% from last period`);
    }

    if (metrics.pipeline.overdueActivities > 0) {
      highlights.push(`${metrics.pipeline.overdueActivities} activities are overdue`);
    }

    return highlights.length > 0 ? highlights.join('\n- ') : 'No critical alerts at this time.';
  }

  private buildContextSummary(metrics: any): string {
    const context: string[] = [];

    if (metrics.sales.orderCount > 0) {
      context.push(`Processing ${metrics.sales.orderCount} orders this period.`);
    }

    if (metrics.sales.topProducts.length > 0) {
      const topProduct = metrics.sales.topProducts[0];
      context.push(
        `Top performer: ${topProduct.name} ($${topProduct.revenue.toLocaleString()})`
      );
    }

    return context.join(' ');
  }

  private formatDateRange(timeframe?: { start: Date; end: Date }): string {
    if (!timeframe) {
      return 'Last 30 days';
    }

    const formatDate = (date: Date) =>
      date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return `${formatDate(timeframe.start)} - ${formatDate(timeframe.end)}`;
  }

  // ==========================================================================
  // Response Parsing
  // ==========================================================================

  private parseBriefingResponse(
    content: string,
    context: InsightContext,
    metrics: any
  ): ProactiveBriefing {
    // Extract key sections from AI response
    const alerts = this.extractAlerts(metrics);
    const keyMetrics = this.extractKeyMetrics(metrics);
    const recommendedActions = this.extractRecommendedActions(metrics);

    return {
      tenantId: context.tenantId,
      userId: context.userId,
      generatedAt: new Date(),
      summary: content.substring(0, 500), // Truncate for summary
      keyMetrics,
      alerts,
      recommendedActions,
      confidence: 0.85,
      dataFreshness: new Date(),
    };
  }

  private extractAlerts(metrics: any): ProactiveBriefing['alerts'] {
    const alerts: ProactiveBriefing['alerts'] = [];

    // Pace deviation alerts
    for (const customer of metrics.customer.customersWithPaceDeviation.slice(0, 5)) {
      alerts.push({
        type: 'pace_deviation',
        title: `${customer.name} is ${customer.deviationDays} days late`,
        description: `Customer has exceeded their normal ordering pace by ${customer.deviationDays} days`,
        severity: customer.deviationDays > 14 ? 'critical' : 'warning',
        affectedEntity: {
          id: customer.id,
          type: 'customer',
          name: customer.name,
        },
      });
    }

    // Revenue drop alerts
    for (const customer of metrics.customer.customersWithRevenueDrop.slice(0, 5)) {
      alerts.push({
        type: 'revenue_drop',
        title: `${customer.name} revenue down ${Math.abs(customer.revenueChangePercent)}%`,
        description: `Monthly revenue has dropped ${Math.abs(customer.revenueChangePercent)}% below average`,
        severity: Math.abs(customer.revenueChangePercent) > 30 ? 'critical' : 'warning',
        affectedEntity: {
          id: customer.id,
          type: 'customer',
          name: customer.name,
        },
      });
    }

    // Sample budget alert
    const sampleUtilization = (metrics.samples.samplesThisMonth / metrics.samples.monthlyAllowance) * 100;
    if (sampleUtilization > 80) {
      alerts.push({
        type: 'sample_budget',
        title: 'Sample budget nearly exhausted',
        description: `${sampleUtilization.toFixed(0)}% of monthly sample allowance used`,
        severity: sampleUtilization > 95 ? 'critical' : 'warning',
      });
    }

    // Pipeline gap alert
    if (metrics.pipeline.overdueActivities > 0) {
      alerts.push({
        type: 'pipeline_gap',
        title: `${metrics.pipeline.overdueActivities} overdue activities`,
        description: 'Follow-up activities require attention',
        severity: metrics.pipeline.overdueActivities > 5 ? 'warning' : 'info',
      });
    }

    return alerts;
  }

  private extractKeyMetrics(metrics: any): BriefingMetric[] {
    return [
      {
        metric: 'Revenue',
        value: `$${metrics.sales.totalRevenue.toLocaleString()}`,
        change: metrics.sales.revenueChange,
        trend: metrics.sales.revenueChange > 0 ? 'up' : metrics.sales.revenueChange < 0 ? 'down' : 'stable',
      },
      {
        metric: 'Orders',
        value: metrics.sales.orderCount,
        trend: 'stable',
      },
      {
        metric: 'Avg Order Value',
        value: `$${metrics.sales.avgOrderValue.toLocaleString()}`,
        trend: 'stable',
      },
      {
        metric: 'Active Customers',
        value: metrics.customer.activeCustomers,
        trend: 'stable',
      },
    ];
  }

  private extractRecommendedActions(metrics: any): ProactiveBriefing['recommendedActions'] {
    const actions: ProactiveBriefing['recommendedActions'] = [];

    // Top pace deviation
    if (metrics.customer.customersWithPaceDeviation.length > 0) {
      const customer = metrics.customer.customersWithPaceDeviation[0];
      actions.push({
        title: `Contact ${customer.name}`,
        description: `Schedule follow-up call - ${customer.deviationDays} days past normal ordering pace`,
        priority: 'high',
        actionUrl: `/portal/customers/${customer.id}`,
      });
    }

    // Top revenue drop
    if (metrics.customer.customersWithRevenueDrop.length > 0) {
      const customer = metrics.customer.customersWithRevenueDrop[0];
      actions.push({
        title: `Review ${customer.name} account`,
        description: `Investigate ${Math.abs(customer.revenueChangePercent).toFixed(0)}% revenue decline`,
        priority: 'high',
        actionUrl: `/portal/customers/${customer.id}`,
      });
    }

    // Overdue activities
    if (metrics.pipeline.overdueActivities > 0) {
      actions.push({
        title: 'Clear overdue activities',
        description: `${metrics.pipeline.overdueActivities} activities need follow-up`,
        priority: 'medium',
        actionUrl: '/portal/activities',
      });
    }

    return actions;
  }

  // ==========================================================================
  // Fallback Briefing
  // ==========================================================================

  private generateFallbackBriefing(
    context: InsightContext,
    metrics: any
  ): ProactiveBriefing {
    return {
      tenantId: context.tenantId,
      userId: context.userId,
      generatedAt: new Date(),
      summary: 'AI briefing temporarily unavailable. Showing key metrics from your data.',
      keyMetrics: this.extractKeyMetrics(metrics),
      alerts: this.extractAlerts(metrics),
      recommendedActions: this.extractRecommendedActions(metrics),
      confidence: 0.5,
      dataFreshness: new Date(),
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let composerInstance: InsightsComposer | null = null;

export function getInsightsComposer(): InsightsComposer {
  if (!composerInstance) {
    composerInstance = new InsightsComposer();
  }
  return composerInstance;
}
