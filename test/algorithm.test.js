#!/usr/bin/env node

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import path from 'node:path';

const CLI_PATH = path.join(process.cwd(), 'index.js');

// Helper function to run CLI commands and get numeric result
function getAmount(args = '') {
  try {
    const result = execSync(`node "${CLI_PATH}" ${args} --no-log`, {
      encoding: 'utf8',
      timeout: 5000
    });
    return parseFloat(result.trim().split(' ')[0]);
  } catch (error) {
    throw new Error(`CLI failed: ${error.message}`);
  }
}

// Helper to run multiple times and get statistics
function getStats(args, iterations = 100) {
  const amounts = [];
  for (let i = 0; i < iterations; i++) {
    amounts.push(getAmount(args));
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
        const amount = getAmount('--max -b 100');
        assert.strictEqual(amount, 120);
      }
    });

    test('special nice scores should be consistent', () => {
      // Test nice score special cases multiple times
      for (let i = 0; i < 10; i++) {
        assert.strictEqual(getAmount('-n 0 -b 100'), 0);
        assert.strictEqual(getAmount('-n 1 -b 100'), 10);
        assert.strictEqual(getAmount('-n 2 -b 100'), 20);
        assert.strictEqual(getAmount('-n 3 -b 100'), 30);
      }
    });

    test('convenience parameters should be consistent', () => {
      for (let i = 0; i < 10; i++) {
        assert.strictEqual(getAmount('--asshole -b 100'), 0);
        assert.strictEqual(getAmount('--dickhead -b 200'), 0);
      }
    });
  });

  describe('Randomness and Variation', () => {
    test('should produce different values with randomness', () => {
      const amounts = [];
      for (let i = 0; i < 50; i++) {
        amounts.push(getAmount('-b 100 -v 30'));
      }
      
      // Check that we get different values
      const uniqueValues = new Set(amounts);
      assert.ok(uniqueValues.size > 10, 'Should produce varied results');
    });

    test('should respect variation bounds', () => {
      const stats = getStats('-b 100 -v 20', 200);
      
      // With 20% variation, values should be roughly 80-120
      // Allow for some bias effects but check general bounds
      assert.ok(stats.min >= 60, `Min too low: ${stats.min}`);
      assert.ok(stats.max <= 140, `Max too high: ${stats.max}`);
    });

    test('zero variation should produce consistent results', () => {
      const stats = getStats('-b 100 -v 0', 50);
      
      // With zero variation, all values should be very close to base
      const range = stats.max - stats.min;
      assert.ok(range < 5, `Range too large with zero variation: ${range}`);
    });
  });

  describe('Bias Effects', () => {
    test('friend score should affect distribution', () => {
      // Compare low vs high friend scores
      const lowStats = getStats('-b 100 -f 1', 200);  // Low friend score
      const highStats = getStats('-b 100 -f 10', 200); // High friend score
      
      // High friend score should generally produce higher amounts
      assert.ok(highStats.avg > lowStats.avg, 
        `High friend score avg (${highStats.avg}) should be > low friend score avg (${lowStats.avg})`);
    });

    test('nice score should affect distribution', () => {
      // Compare different nice scores (avoiding special cases 0-3)
      const lowStats = getStats('-b 100 -n 4', 200);   // Low nice score
      const highStats = getStats('-b 100 -n 10', 200); // High nice score
      
      // High nice score should generally produce higher amounts
      assert.ok(highStats.avg > lowStats.avg,
        `High nice score avg (${highStats.avg}) should be > low nice score avg (${lowStats.avg})`);
    });

    test('combined scores should have cumulative effect', () => {
      // Test combination effects
      const bothLowStats = getStats('-b 100 -f 1 -n 4', 150);   // Both low
      const bothHighStats = getStats('-b 100 -f 10 -n 10', 150); // Both high
      
      // Combined high scores should produce notably higher amounts than combined low
      const difference = bothHighStats.avg - bothLowStats.avg;
      assert.ok(difference > 5, `Combined effect should be significant: ${difference}`);
    });
  });

  describe('Mathematical Properties', () => {
    test('should maintain proper scaling with base value', () => {
      const base50Stats = getStats('-b 50 -v 20', 100);
      const base100Stats = getStats('-b 100 -v 20', 100);
      
      // Results should scale roughly proportionally
      const ratio = base100Stats.avg / base50Stats.avg;
      assert.ok(ratio >= 1.8 && ratio <= 2.2, `Scaling ratio should be ~2.0, got ${ratio}`);
    });

    test('should handle decimal precision correctly', () => {
      // Test different decimal settings
      const amount0 = getAmount('-b 100 --max -d 0');
      const amount2 = getAmount('-b 100 --max -d 2');
      const amount5 = getAmount('-b 100 --max -d 5');
      
      // All should represent the same value (120) but with different precision
      assert.strictEqual(amount0, 120);
      assert.strictEqual(amount2, 120);
      assert.strictEqual(amount5, 120);
    });

    test('should handle edge case base values', () => {
      // Very small base values
      const smallAmount = getAmount('-b 0.01 --max');
      assert.ok(smallAmount >= 0.01, 'Should handle small base values');
      
      // Very large base values  
      const largeAmount = getAmount('-b 1000000 --max');
      assert.ok(largeAmount >= 1000000, 'Should handle large base values');
    });
  });

  describe('Priority and Override Logic', () => {
    test('special nice scores should override everything', () => {
      // Test that nice score 0-3 overrides all other parameters
      assert.strictEqual(getAmount('-n 0 --max -f 10 -v 100 -b 100'), 0);
      assert.strictEqual(getAmount('-n 1 --min -f 10 -v 50 -b 200'), 20);
      assert.strictEqual(getAmount('-n 2 --max -f 1 -v 0 -b 150'), 30);
      assert.strictEqual(getAmount('-n 3 --min -f 10 -v 100 -b 50'), 15);
    });

    test('convenience parameters should override nice score', () => {
      // --asshole and --dickhead should override explicit nice scores
      assert.strictEqual(getAmount('-n 9 --asshole -b 100'), 0);
      assert.strictEqual(getAmount('-n 8 --dickhead -b 200'), 0);
    });

    test('max/min should work when nice score allows', () => {
      // With nice scores >= 4, max/min should work
      assert.strictEqual(getAmount('-n 5 --max -b 100'), 120);
      assert.strictEqual(getAmount('-n 7 --min -b 100'), 80);
    });
  });

  describe('Statistical Distribution', () => {
    test('neutral scores should center around base value', () => {
      const stats = getStats('-b 100 -f 5 -n 5 -v 20', 300);
      
      // With neutral scores (5), average should be close to base value
      const deviation = Math.abs(stats.avg - 100);
      assert.ok(deviation < 10, `Average should be close to base value, deviation: ${deviation}`);
    });

    test('should produce reasonable spread with variation', () => {
      const stats = getStats('-b 100 -v 30', 200);
      
      // With 30% variation, we should see good spread
      const range = stats.max - stats.min;
      assert.ok(range > 30, `Should have reasonable spread: ${range}`);
      
      // But not too extreme
      assert.ok(range < 100, `Spread should not be excessive: ${range}`);
    });
  });

  describe('Consistency Across Runs', () => {
    test('deterministic operations should be identical', () => {
      const results = [];
      
      // Test various deterministic operations multiple times
      const tests = [
        '--max -b 100',
        '--min -b 50',
        '-n 0 -b 200',
        '-n 1 -b 150', 
        '--asshole -b 300'
      ];
      
      for (const test of tests) {
        const values = [];
        for (let i = 0; i < 10; i++) {
          values.push(getAmount(test));
        }
        
        // All values should be identical
        const unique = new Set(values);
        assert.strictEqual(unique.size, 1, `All values should be identical for: ${test}`);
      }
    });
  });
});