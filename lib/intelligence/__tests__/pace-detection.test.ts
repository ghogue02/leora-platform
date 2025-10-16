/**
 * Ordering pace detection unit tests
 */

import { describe, it, expect } from '@jest/globals';

// Mock pace detection engine
class PaceDetectionEngine {
  /**
   * Calculate average order interval from order history
   */
  calculateAverageInterval(orderDates: Date[]): number {
    if (orderDates.length < 2) return 0;

    const sortedDates = orderDates.sort((a, b) => a.getTime() - b.getTime());
    const intervals: number[] = [];

    for (let i = 1; i < sortedDates.length; i++) {
      const daysDiff = Math.floor(
        (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
      );
      intervals.push(daysDiff);
    }

    const sum = intervals.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / intervals.length);
  }

  /**
   * Detect if customer has slipped their pace
   */
  isPaceSlipped(daysSinceLastOrder: number, averageInterval: number): boolean {
    if (averageInterval === 0) return false;
    return daysSinceLastOrder > averageInterval * 1.2;
  }

  /**
   * Calculate pace variance
   */
  calculateVariance(orderDates: Date[]): number {
    if (orderDates.length < 3) return 0;

    const sortedDates = orderDates.sort((a, b) => a.getTime() - b.getTime());
    const intervals: number[] = [];

    for (let i = 1; i < sortedDates.length; i++) {
      const daysDiff = Math.floor(
        (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
      );
      intervals.push(daysDiff);
    }

    const mean = intervals.reduce((acc, val) => acc + val, 0) / intervals.length;
    const squaredDiffs = intervals.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / intervals.length;

    return Math.round(variance);
  }

  /**
   * Classify ordering pattern
   */
  classifyPattern(variance: number, averageInterval: number): 'regular' | 'irregular' | 'sporadic' {
    if (averageInterval === 0) return 'sporadic';

    const coefficientOfVariation = Math.sqrt(variance) / averageInterval;

    if (coefficientOfVariation < 0.3) return 'regular';
    if (coefficientOfVariation < 0.7) return 'irregular';
    return 'sporadic';
  }

  /**
   * Get next expected order date
   */
  getNextExpectedOrder(lastOrderDate: Date, averageInterval: number): Date {
    const nextDate = new Date(lastOrderDate);
    nextDate.setDate(nextDate.getDate() + averageInterval);
    return nextDate;
  }

  /**
   * Calculate days until next expected order
   */
  getDaysUntilNextOrder(lastOrderDate: Date, averageInterval: number, today: Date = new Date()): number {
    const nextExpected = this.getNextExpectedOrder(lastOrderDate, averageInterval);
    const daysDiff = Math.floor((nextExpected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff;
  }
}

describe('Pace Detection Engine', () => {
  let engine: PaceDetectionEngine;

  beforeEach(() => {
    engine = new PaceDetectionEngine();
  });

  describe('calculateAverageInterval', () => {
    it('should return 0 for single order', () => {
      const orders = [new Date('2025-01-01')];
      const interval = engine.calculateAverageInterval(orders);

      expect(interval).toBe(0);
    });

    it('should calculate interval for two orders', () => {
      const orders = [
        new Date('2025-01-01'),
        new Date('2025-01-15'),
      ];
      const interval = engine.calculateAverageInterval(orders);

      expect(interval).toBe(14);
    });

    it('should calculate average for multiple orders', () => {
      const orders = [
        new Date('2025-01-01'),
        new Date('2025-01-15'),
        new Date('2025-01-29'),
        new Date('2025-02-12'),
      ];
      const interval = engine.calculateAverageInterval(orders);

      expect(interval).toBe(14);
    });

    it('should handle unsorted order dates', () => {
      const orders = [
        new Date('2025-01-29'),
        new Date('2025-01-01'),
        new Date('2025-02-12'),
        new Date('2025-01-15'),
      ];
      const interval = engine.calculateAverageInterval(orders);

      expect(interval).toBe(14);
    });

    it('should round to nearest day', () => {
      const orders = [
        new Date('2025-01-01'),
        new Date('2025-01-14'),
        new Date('2025-01-29'),
      ];
      const interval = engine.calculateAverageInterval(orders);

      expect(Number.isInteger(interval)).toBe(true);
    });
  });

  describe('isPaceSlipped', () => {
    it('should detect slipped pace when 20% over average', () => {
      const result = engine.isPaceSlipped(17, 14);
      expect(result).toBe(true);
    });

    it('should not detect slip when within normal range', () => {
      const result = engine.isPaceSlipped(15, 14);
      expect(result).toBe(false);
    });

    it('should handle zero average interval', () => {
      const result = engine.isPaceSlipped(30, 0);
      expect(result).toBe(false);
    });

    it('should detect significant delays', () => {
      const result = engine.isPaceSlipped(30, 14);
      expect(result).toBe(true);
    });
  });

  describe('calculateVariance', () => {
    it('should return 0 for less than 3 orders', () => {
      const orders = [
        new Date('2025-01-01'),
        new Date('2025-01-15'),
      ];
      const variance = engine.calculateVariance(orders);

      expect(variance).toBe(0);
    });

    it('should calculate low variance for regular pattern', () => {
      const orders = [
        new Date('2025-01-01'),
        new Date('2025-01-15'),
        new Date('2025-01-29'),
        new Date('2025-02-12'),
      ];
      const variance = engine.calculateVariance(orders);

      expect(variance).toBe(0);
    });

    it('should calculate high variance for irregular pattern', () => {
      const orders = [
        new Date('2025-01-01'),
        new Date('2025-01-08'),
        new Date('2025-01-30'),
        new Date('2025-02-05'),
      ];
      const variance = engine.calculateVariance(orders);

      expect(variance).toBeGreaterThan(0);
    });
  });

  describe('classifyPattern', () => {
    it('should classify regular ordering pattern', () => {
      const pattern = engine.classifyPattern(4, 14);
      expect(pattern).toBe('regular');
    });

    it('should classify irregular ordering pattern', () => {
      const pattern = engine.classifyPattern(25, 14);
      expect(pattern).toBe('irregular');
    });

    it('should classify sporadic ordering pattern', () => {
      const pattern = engine.classifyPattern(100, 14);
      expect(pattern).toBe('sporadic');
    });

    it('should handle zero average interval', () => {
      const pattern = engine.classifyPattern(0, 0);
      expect(pattern).toBe('sporadic');
    });
  });

  describe('getNextExpectedOrder', () => {
    it('should calculate next expected order date', () => {
      const lastOrder = new Date('2025-01-01');
      const nextExpected = engine.getNextExpectedOrder(lastOrder, 14);

      expect(nextExpected.getDate()).toBe(15);
      expect(nextExpected.getMonth()).toBe(0);
    });

    it('should handle month boundaries', () => {
      const lastOrder = new Date('2025-01-25');
      const nextExpected = engine.getNextExpectedOrder(lastOrder, 14);

      expect(nextExpected.getMonth()).toBe(1); // February
    });

    it('should handle year boundaries', () => {
      const lastOrder = new Date('2024-12-25');
      const nextExpected = engine.getNextExpectedOrder(lastOrder, 14);

      expect(nextExpected.getFullYear()).toBe(2025);
    });
  });

  describe('getDaysUntilNextOrder', () => {
    it('should calculate days until next order', () => {
      const lastOrder = new Date('2025-01-01');
      const today = new Date('2025-01-08');
      const daysUntil = engine.getDaysUntilNextOrder(lastOrder, 14, today);

      expect(daysUntil).toBe(7);
    });

    it('should return negative for overdue orders', () => {
      const lastOrder = new Date('2025-01-01');
      const today = new Date('2025-01-20');
      const daysUntil = engine.getDaysUntilNextOrder(lastOrder, 14, today);

      expect(daysUntil).toBeLessThan(0);
    });

    it('should use current date when today not provided', () => {
      const lastOrder = new Date();
      lastOrder.setDate(lastOrder.getDate() - 7);

      const daysUntil = engine.getDaysUntilNextOrder(lastOrder, 14);

      expect(daysUntil).toBeGreaterThan(0);
      expect(daysUntil).toBeLessThan(14);
    });
  });
});
