#!/usr/bin/env node

import { calculateGiftAmount, calculateFinalAmount } from '../src/core/calculation.js';

// Helper to get multiple calculations for statistical tests  
function getStats(baseValue, variation, friendScore = 5, niceScore = 5, iterations = 50) {
  const amounts = [];
  for (let i = 0; i < iterations; i++) {
    amounts.push(calculateGiftAmount(baseValue, variation, friendScore, niceScore, 2));
  }
  
  amounts.sort((a, b) => a - b);
  return {
    min: amounts[0],
    max: amounts[amounts.length - 1],
    median: amounts[Math.floor(amounts.length / 2)],
    avg: amounts.reduce((sum, val) => sum + val, 0) / amounts.length,
    values: amounts
  };
}

describe('Algorithm and Calculation Tests', () => {
  
  describe('Deterministic Calculations', () => {
    test('fixed amounts should be consistent', () => {
      // Test --max multiple times
      for (let i = 0; i < 10; i++) {
        const amount = calculateFinalAmount(100, 20, 5, 5, 2, true, false);
        expect(amount).toBe(120);
      }
    });

    test('special nice scores should be consistent', () => {
      // Test nice score special cases multiple times
      for (let i = 0; i < 10; i++) {
        expect(calculateFinalAmount(100, 20, 5, 0, 2)).toBe(0);
        expect(calculateFinalAmount(100, 20, 5, 1, 2)).toBe(10);
        expect(calculateFinalAmount(100, 20, 5, 2, 2)).toBe(20);
        expect(calculateFinalAmount(100, 20, 5, 3, 2)).toBe(30);
      }
    });

    test('convenience parameters should be consistent', () => {
      for (let i = 0; i < 10; i++) {
        expect(calculateFinalAmount(100, 20, 5, 0, 2)).toBe(0);
        expect(calculateFinalAmount(200, 20, 5, 0, 2)).toBe(0);
      }
    });
  });

  describe('Randomness and Variation', () => {
    test('should produce different values with randomness', () => {
      const amounts = [];
      for (let i = 0; i < 30; i++) {
        amounts.push(calculateGiftAmount(100, 30, 5, 5, 2));
      }
      
      // Check that we get different values
      const uniqueValues = new Set(amounts);
      expect(uniqueValues.size).toBeGreaterThan(10);
    });

    test('should respect variation bounds', () => {
      const stats = getStats(100, 20, 5, 5, 100);
      
      // With 20% variation, values should be roughly 80-120
      // Allow for some bias effects but check general bounds
      expect(stats.min).toBeGreaterThanOrEqual(60);
      expect(stats.max).toBeLessThanOrEqual(140);
    });

    test('zero variation should produce consistent results', () => {
      const stats = getStats(100, 0, 5, 5, 30);
      
      // With zero variation, all values should be very close to base
      const range = stats.max - stats.min;
      expect(range).toBeLessThan(5);
    });
  });

  describe('Bias Effects', () => {
    test('friend score should affect distribution', () => {
      // Compare low vs high friend scores
      const lowStats = getStats(100, 20, 1, 5, 100);  // Low friend score
      const highStats = getStats(100, 20, 10, 5, 100); // High friend score
      
      // High friend score should generally produce higher amounts
      expect(highStats.avg > lowStats.avg).toBeTruthy();
    });

    test('nice score should affect distribution', () => {
      // Compare different nice scores (avoiding special cases 0-3)
      const lowStats = getStats(100, 20, 5, 4, 100);   // Low nice score
      const highStats = getStats(100, 20, 5, 10, 100); // High nice score
      
      // High nice score should generally produce higher amounts
      expect(highStats.avg > lowStats.avg).toBeTruthy();
    });

    test('combined scores should have cumulative effect', () => {
      // Test combination effects
      const bothLowStats = getStats(100, 20, 1, 4, 75);   // Both low
      const bothHighStats = getStats(100, 20, 10, 10, 75); // Both high
      
      // Combined high scores should produce notably higher amounts than combined low
      const difference = bothHighStats.avg - bothLowStats.avg;
      expect(difference).toBeGreaterThan(5);
    });
  });

  describe('Mathematical Properties', () => {
    test('should maintain proper scaling with base value', () => {
      const base50Stats = getStats(50, 20, 5, 5, 50);
      const base100Stats = getStats(100, 20, 5, 5, 50);
      
      // Results should scale roughly proportionally
      const ratio = base100Stats.avg / base50Stats.avg;
      expect(ratio).toBeGreaterThanOrEqual(1.8);
      expect(ratio).toBeLessThanOrEqual(2.2);
    });

    test('should handle decimal precision correctly', () => {
      // Test different decimal settings
      const amount0 = calculateFinalAmount(100, 20, 5, 5, 0, true);
      const amount2 = calculateFinalAmount(100, 20, 5, 5, 2, true);
      const amount5 = calculateFinalAmount(100, 20, 5, 5, 5, true);
      
      // All should represent the same value (120) but with different precision
      expect(amount0).toBe(120);
      expect(amount2).toBe(120);
      expect(amount5).toBe(120);
    });

    test('should handle edge case base values', () => {
      // Very small base values
      const smallAmount = calculateFinalAmount(0.01, 20, 5, 5, 2, true);
      expect(smallAmount).toBeGreaterThanOrEqual(0.01);
      
      // Very large base values  
      const largeAmount = calculateFinalAmount(1000000, 20, 5, 5, 2, true);
      expect(largeAmount).toBeGreaterThanOrEqual(1000000);
    });
  });

  describe('Priority and Override Logic', () => {
    test('special nice scores should override everything', () => {
      // Test that nice score 0-3 overrides all other parameters
      expect(calculateFinalAmount(100, 100, 10, 0, 2, true)).toBe(0);
      expect(calculateFinalAmount(200, 50, 10, 1, 2, false, true)).toBe(20);
      expect(calculateFinalAmount(150, 0, 1, 2, 2, true)).toBe(30);
      expect(calculateFinalAmount(50, 100, 10, 3, 2, false, true)).toBe(15);
    });

    test('max/min should work when nice score allows', () => {
      // With nice scores >= 4, max/min should work
      expect(calculateFinalAmount(100, 20, 5, 5, 2, true)).toBe(120);
      expect(calculateFinalAmount(100, 20, 5, 7, 2, false, true)).toBe(80);
    });
  });

  describe('Statistical Distribution', () => {
    test('neutral scores should center around base value', () => {
      const stats = getStats(100, 20, 5, 5, 150);
      
      // With neutral scores (5), average should be close to base value
      const deviation = Math.abs(stats.avg - 100);
      expect(deviation).toBeLessThan(10);
    });

    test('should produce reasonable spread with variation', () => {
      const stats = getStats(100, 30, 5, 5, 100);
      
      // With 30% variation, we should see good spread
      const range = stats.max - stats.min;
      expect(range).toBeGreaterThan(30);
      
      // But not too extreme
      expect(range).toBeLessThan(100);
    });
  });

  describe('Consistency Across Runs', () => {
    test('deterministic operations should be identical', () => {
      const tests = [
        { baseValue: 100, variation: 20, friendScore: 5, niceScore: 5, decimals: 2, useMax: true, useMin: false },
        { baseValue: 50, variation: 20, friendScore: 5, niceScore: 5, decimals: 2, useMax: false, useMin: true },
        { baseValue: 200, variation: 20, friendScore: 5, niceScore: 0, decimals: 2, useMax: false, useMin: false },
        { baseValue: 150, variation: 20, friendScore: 5, niceScore: 1, decimals: 2, useMax: false, useMin: false },
        { baseValue: 300, variation: 20, friendScore: 5, niceScore: 0, decimals: 2, useMax: false, useMin: false }
      ];
      
      for (const testParams of tests) {
        const values = [];
        for (let i = 0; i < 10; i++) {
          values.push(calculateFinalAmount(
            testParams.baseValue, 
            testParams.variation,
            testParams.friendScore,
            testParams.niceScore,
            testParams.decimals,
            testParams.useMax,
            testParams.useMin
          ));
        }
        
        // All values should be identical for deterministic cases
        const unique = new Set(values);
        expect(unique.size).toBe(1, 
          `All values should be identical for: base=${testParams.baseValue}, nice=${testParams.niceScore}, max=${testParams.useMax}, min=${testParams.useMin}`);
      }
    });
  });
});