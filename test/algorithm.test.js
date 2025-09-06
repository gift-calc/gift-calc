#!/usr/bin/env node

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { calculateGiftAmount, calculateFinalAmount } from '../src/core.js';

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
        assert.strictEqual(amount, 120);
      }
    });

    test('special nice scores should be consistent', () => {
      // Test nice score special cases multiple times
      for (let i = 0; i < 10; i++) {
        assert.strictEqual(calculateFinalAmount(100, 20, 5, 0, 2), 0);
        assert.strictEqual(calculateFinalAmount(100, 20, 5, 1, 2), 10);
        assert.strictEqual(calculateFinalAmount(100, 20, 5, 2, 2), 20);
        assert.strictEqual(calculateFinalAmount(100, 20, 5, 3, 2), 30);
      }
    });

    test('convenience parameters should be consistent', () => {
      for (let i = 0; i < 10; i++) {
        assert.strictEqual(calculateFinalAmount(100, 20, 5, 0, 2), 0);
        assert.strictEqual(calculateFinalAmount(200, 20, 5, 0, 2), 0);
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
      assert.ok(uniqueValues.size > 10, 'Should produce varied results');
    });

    test('should respect variation bounds', () => {
      const stats = getStats(100, 20, 5, 5, 100);
      
      // With 20% variation, values should be roughly 80-120
      // Allow for some bias effects but check general bounds
      assert.ok(stats.min >= 60, `Min too low: ${stats.min}`);
      assert.ok(stats.max <= 140, `Max too high: ${stats.max}`);
    });

    test('zero variation should produce consistent results', () => {
      const stats = getStats(100, 0, 5, 5, 30);
      
      // With zero variation, all values should be very close to base
      const range = stats.max - stats.min;
      assert.ok(range < 5, `Range too large with zero variation: ${range}`);
    });
  });

  describe('Bias Effects', () => {
    test('friend score should affect distribution', () => {
      // Compare low vs high friend scores
      const lowStats = getStats(100, 20, 1, 5, 100);  // Low friend score
      const highStats = getStats(100, 20, 10, 5, 100); // High friend score
      
      // High friend score should generally produce higher amounts
      assert.ok(highStats.avg > lowStats.avg, 
        `High friend score avg (${highStats.avg}) should be > low friend score avg (${lowStats.avg})`);
    });

    test('nice score should affect distribution', () => {
      // Compare different nice scores (avoiding special cases 0-3)
      const lowStats = getStats(100, 20, 5, 4, 100);   // Low nice score
      const highStats = getStats(100, 20, 5, 10, 100); // High nice score
      
      // High nice score should generally produce higher amounts
      assert.ok(highStats.avg > lowStats.avg,
        `High nice score avg (${highStats.avg}) should be > low nice score avg (${lowStats.avg})`);
    });

    test('combined scores should have cumulative effect', () => {
      // Test combination effects
      const bothLowStats = getStats(100, 20, 1, 4, 75);   // Both low
      const bothHighStats = getStats(100, 20, 10, 10, 75); // Both high
      
      // Combined high scores should produce notably higher amounts than combined low
      const difference = bothHighStats.avg - bothLowStats.avg;
      assert.ok(difference > 5, `Combined effect should be significant: ${difference}`);
    });
  });

  describe('Mathematical Properties', () => {
    test('should maintain proper scaling with base value', () => {
      const base50Stats = getStats(50, 20, 5, 5, 50);
      const base100Stats = getStats(100, 20, 5, 5, 50);
      
      // Results should scale roughly proportionally
      const ratio = base100Stats.avg / base50Stats.avg;
      assert.ok(ratio >= 1.8 && ratio <= 2.2, `Scaling ratio should be ~2.0, got ${ratio}`);
    });

    test('should handle decimal precision correctly', () => {
      // Test different decimal settings
      const amount0 = calculateFinalAmount(100, 20, 5, 5, 0, true);
      const amount2 = calculateFinalAmount(100, 20, 5, 5, 2, true);
      const amount5 = calculateFinalAmount(100, 20, 5, 5, 5, true);
      
      // All should represent the same value (120) but with different precision
      assert.strictEqual(amount0, 120);
      assert.strictEqual(amount2, 120);
      assert.strictEqual(amount5, 120);
    });

    test('should handle edge case base values', () => {
      // Very small base values
      const smallAmount = calculateFinalAmount(0.01, 20, 5, 5, 2, true);
      assert.ok(smallAmount >= 0.01, 'Should handle small base values');
      
      // Very large base values  
      const largeAmount = calculateFinalAmount(1000000, 20, 5, 5, 2, true);
      assert.ok(largeAmount >= 1000000, 'Should handle large base values');
    });
  });

  describe('Priority and Override Logic', () => {
    test('special nice scores should override everything', () => {
      // Test that nice score 0-3 overrides all other parameters
      assert.strictEqual(calculateFinalAmount(100, 100, 10, 0, 2, true), 0);
      assert.strictEqual(calculateFinalAmount(200, 50, 10, 1, 2, false, true), 20);
      assert.strictEqual(calculateFinalAmount(150, 0, 1, 2, 2, true), 30);
      assert.strictEqual(calculateFinalAmount(50, 100, 10, 3, 2, false, true), 15);
    });

    test('max/min should work when nice score allows', () => {
      // With nice scores >= 4, max/min should work
      assert.strictEqual(calculateFinalAmount(100, 20, 5, 5, 2, true), 120);
      assert.strictEqual(calculateFinalAmount(100, 20, 5, 7, 2, false, true), 80);
    });
  });

  describe('Statistical Distribution', () => {
    test('neutral scores should center around base value', () => {
      const stats = getStats(100, 20, 5, 5, 150);
      
      // With neutral scores (5), average should be close to base value
      const deviation = Math.abs(stats.avg - 100);
      assert.ok(deviation < 10, `Average should be close to base value, deviation: ${deviation}`);
    });

    test('should produce reasonable spread with variation', () => {
      const stats = getStats(100, 30, 5, 5, 100);
      
      // With 30% variation, we should see good spread
      const range = stats.max - stats.min;
      assert.ok(range > 30, `Should have reasonable spread: ${range}`);
      
      // But not too extreme
      assert.ok(range < 100, `Spread should not be excessive: ${range}`);
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
        assert.strictEqual(unique.size, 1, 
          `All values should be identical for: base=${testParams.baseValue}, nice=${testParams.niceScore}, max=${testParams.useMax}, min=${testParams.useMin}`);
      }
    });
  });
});