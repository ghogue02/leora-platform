/**
 * Account health scoring unit tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock health scoring engine
class HealthScoringEngine {
  /**
   * Calculate account health score (0-100)
   * Based on ordering pace, revenue trends, and engagement
   */
  calculateHealthScore(params: {
    ordersLast30Days: number;
    ordersLast90Days: number;
    revenueCurrentMonth: number;
    revenueAverage: number;
    daysSinceLastOrder: number;
    averageOrderInterval: number;
    engagementScore?: number;
  }): number {
    let score = 100;

    // Penalize for no recent orders
    if (params.ordersLast30Days === 0) {
      score -= 40;
    } else if (params.ordersLast30Days < 2) {
      score -= 20;
    }

    // Penalize for revenue drop
    if (params.revenueAverage > 0) {
      const revenueRatio = params.revenueCurrentMonth / params.revenueAverage;
      if (revenueRatio < 0.85) {
        score -= 25;
      } else if (revenueRatio < 1.0) {
        score -= 10;
      }
    }

    // Penalize for slipped ordering pace
    if (params.averageOrderInterval > 0) {
      const paceRatio = params.daysSinceLastOrder / params.averageOrderInterval;
      if (paceRatio > 1.5) {
        score -= 20;
      } else if (paceRatio > 1.2) {
        score -= 10;
      }
    }

    // Bonus for engagement
    if (params.engagementScore) {
      score += Math.min(params.engagementScore * 0.1, 10);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Classify health status
   */
  classifyHealth(score: number): 'excellent' | 'good' | 'fair' | 'at-risk' | 'critical' {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    if (score >= 30) return 'at-risk';
    return 'critical';
  }

  /**
   * Get health insights
   */
  getInsights(params: {
    score: number;
    ordersLast30Days: number;
    revenueCurrentMonth: number;
    revenueAverage: number;
    daysSinceLastOrder: number;
    averageOrderInterval: number;
  }): string[] {
    const insights: string[] = [];

    if (params.ordersLast30Days === 0) {
      insights.push('No orders in the last 30 days - immediate follow-up recommended');
    }

    if (params.revenueAverage > 0 && params.revenueCurrentMonth < params.revenueAverage * 0.85) {
      const drop = Math.round((1 - params.revenueCurrentMonth / params.revenueAverage) * 100);
      insights.push(`Revenue down ${drop}% from average - investigate cause`);
    }

    if (params.averageOrderInterval > 0 && params.daysSinceLastOrder > params.averageOrderInterval * 1.2) {
      insights.push('Customer has slipped their normal ordering pace');
    }

    if (params.score >= 85) {
      insights.push('Account is healthy and performing well');
    }

    return insights;
  }
}

describe('Health Scoring Engine', () => {
  let engine: HealthScoringEngine;

  beforeEach(() => {
    engine = new HealthScoringEngine();
  });

  describe('calculateHealthScore', () => {
    it('should return perfect score for healthy account', () => {
      const score = engine.calculateHealthScore({
        ordersLast30Days: 4,
        ordersLast90Days: 12,
        revenueCurrentMonth: 10000,
        revenueAverage: 9500,
        daysSinceLastOrder: 7,
        averageOrderInterval: 10,
        engagementScore: 80,
      });

      expect(score).toBeGreaterThan(85);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should penalize accounts with no recent orders', () => {
      const score = engine.calculateHealthScore({
        ordersLast30Days: 0,
        ordersLast90Days: 2,
        revenueCurrentMonth: 0,
        revenueAverage: 5000,
        daysSinceLastOrder: 60,
        averageOrderInterval: 14,
      });

      expect(score).toBeLessThan(60);
    });

    it('should penalize accounts with revenue drop >= 15%', () => {
      const score = engine.calculateHealthScore({
        ordersLast30Days: 2,
        ordersLast90Days: 8,
        revenueCurrentMonth: 4000,
        revenueAverage: 5000,
        daysSinceLastOrder: 10,
        averageOrderInterval: 12,
      });

      expect(score).toBeLessThan(75);
    });

    it('should penalize accounts that slip ordering pace', () => {
      const score = engine.calculateHealthScore({
        ordersLast30Days: 1,
        ordersLast90Days: 4,
        revenueCurrentMonth: 5000,
        revenueAverage: 5000,
        daysSinceLastOrder: 21,
        averageOrderInterval: 14,
      });

      expect(score).toBeLessThan(85);
    });

    it('should give bonus for high engagement', () => {
      const baseParams = {
        ordersLast30Days: 3,
        ordersLast90Days: 9,
        revenueCurrentMonth: 8000,
        revenueAverage: 8000,
        daysSinceLastOrder: 8,
        averageOrderInterval: 10,
      };

      const scoreWithoutEngagement = engine.calculateHealthScore(baseParams);
      const scoreWithEngagement = engine.calculateHealthScore({
        ...baseParams,
        engagementScore: 90,
      });

      expect(scoreWithEngagement).toBeGreaterThan(scoreWithoutEngagement);
    });

    it('should never return score below 0', () => {
      const score = engine.calculateHealthScore({
        ordersLast30Days: 0,
        ordersLast90Days: 0,
        revenueCurrentMonth: 0,
        revenueAverage: 10000,
        daysSinceLastOrder: 180,
        averageOrderInterval: 14,
      });

      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should never return score above 100', () => {
      const score = engine.calculateHealthScore({
        ordersLast30Days: 10,
        ordersLast90Days: 30,
        revenueCurrentMonth: 50000,
        revenueAverage: 20000,
        daysSinceLastOrder: 1,
        averageOrderInterval: 7,
        engagementScore: 100,
      });

      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('classifyHealth', () => {
    it('should classify excellent health', () => {
      expect(engine.classifyHealth(95)).toBe('excellent');
      expect(engine.classifyHealth(85)).toBe('excellent');
    });

    it('should classify good health', () => {
      expect(engine.classifyHealth(80)).toBe('good');
      expect(engine.classifyHealth(70)).toBe('good');
    });

    it('should classify fair health', () => {
      expect(engine.classifyHealth(60)).toBe('fair');
      expect(engine.classifyHealth(50)).toBe('fair');
    });

    it('should classify at-risk health', () => {
      expect(engine.classifyHealth(40)).toBe('at-risk');
      expect(engine.classifyHealth(30)).toBe('at-risk');
    });

    it('should classify critical health', () => {
      expect(engine.classifyHealth(20)).toBe('critical');
      expect(engine.classifyHealth(0)).toBe('critical');
    });
  });

  describe('getInsights', () => {
    it('should provide insight for no recent orders', () => {
      const insights = engine.getInsights({
        score: 50,
        ordersLast30Days: 0,
        revenueCurrentMonth: 0,
        revenueAverage: 5000,
        daysSinceLastOrder: 45,
        averageOrderInterval: 14,
      });

      expect(insights).toContain(
        expect.stringContaining('No orders in the last 30 days')
      );
    });

    it('should provide insight for revenue drop', () => {
      const insights = engine.getInsights({
        score: 60,
        ordersLast30Days: 2,
        revenueCurrentMonth: 3000,
        revenueAverage: 5000,
        daysSinceLastOrder: 10,
        averageOrderInterval: 12,
      });

      expect(insights).toContain(expect.stringContaining('Revenue down'));
    });

    it('should provide insight for slipped pace', () => {
      const insights = engine.getInsights({
        score: 70,
        ordersLast30Days: 1,
        revenueCurrentMonth: 5000,
        revenueAverage: 5000,
        daysSinceLastOrder: 18,
        averageOrderInterval: 14,
      });

      expect(insights).toContain(
        expect.stringContaining('slipped their normal ordering pace')
      );
    });

    it('should provide positive insight for healthy accounts', () => {
      const insights = engine.getInsights({
        score: 90,
        ordersLast30Days: 4,
        revenueCurrentMonth: 10000,
        revenueAverage: 9500,
        daysSinceLastOrder: 7,
        averageOrderInterval: 10,
      });

      expect(insights).toContain(
        expect.stringContaining('Account is healthy')
      );
    });

    it('should provide multiple insights when multiple issues exist', () => {
      const insights = engine.getInsights({
        score: 30,
        ordersLast30Days: 0,
        revenueCurrentMonth: 1000,
        revenueAverage: 5000,
        daysSinceLastOrder: 60,
        averageOrderInterval: 14,
      });

      expect(insights.length).toBeGreaterThan(1);
    });
  });
});
