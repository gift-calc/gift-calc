import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { parseLogEntry, calculateBudgetUsage, formatBudgetSummary } from '../src/core.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Test configuration paths
const CONFIG_DIR = path.join(os.homedir(), '.config', 'gift-calc');
const TEST_LOG_PATH = path.join(CONFIG_DIR, 'test-budget-integration.log');

// Mock fs module for testing
const mockFs = {
  existsSync: (filePath) => filePath === TEST_LOG_PATH,
  readFileSync: (filePath, encoding) => {
    if (filePath === TEST_LOG_PATH) {
      return mockFs._testLogContent || '';
    }
    throw new Error('File not found');
  },
  _testLogContent: ''
};

describe('Budget Integration Functions', () => {
  beforeEach(() => {
    // Reset mock log content
    mockFs._testLogContent = '';
  });

  afterEach(() => {
    // Clean up any test files
    try {
      if (fs.existsSync(TEST_LOG_PATH)) {
        fs.unlinkSync(TEST_LOG_PATH);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('parseLogEntry', () => {
    test('should parse basic log entry without recipient', () => {
      const logLine = '2025-09-07T18:42:08.399Z 99.34 SEK';
      const result = parseLogEntry(logLine);
      
      expect(result).toEqual({
        timestamp: new Date('2025-09-07T18:42:08.399Z'),
        amount: 99.34,
        currency: 'SEK',
        recipient: null,
        rawOutput: '99.34 SEK'
      });
    });

    test('should parse log entry with recipient', () => {
      const logLine = '2025-09-07T18:42:08.399Z 150.25 USD for Alice';
      const result = parseLogEntry(logLine);
      
      expect(result).toEqual({
        timestamp: new Date('2025-09-07T18:42:08.399Z'),
        amount: 150.25,
        currency: 'USD',
        recipient: 'Alice',
        rawOutput: '150.25 USD for Alice'
      });
    });

    test('should parse log entry with naughty list note', () => {
      const logLine = '2025-09-07T18:42:08.399Z 0 SEK for Bob (on naughty list!)';
      const result = parseLogEntry(logLine);
      
      expect(result).toEqual({
        timestamp: new Date('2025-09-07T18:42:08.399Z'),
        amount: 0,
        currency: 'SEK',
        recipient: 'Bob',
        rawOutput: '0 SEK for Bob (on naughty list!)'
      });
    });

    test('should handle different currencies', () => {
      const logLines = [
        '2025-09-07T18:42:08.399Z 99.34 EUR',
        '2025-09-07T18:42:08.399Z 75.50 GBP for Charlie',
        '2025-09-07T18:42:08.399Z 1250 JPY'
      ];
      
      const results = logLines.map(parseLogEntry);
      
      expect(results[0].currency).toBe('EUR');
      expect(results[1].currency).toBe('GBP');
      expect(results[2].currency).toBe('JPY');
    });

    test('should return null for invalid log entries', () => {
      const invalidLines = [
        '',
        '   ',
        'invalid log line',
        '2025-09-07T18:42:08.399Z invalid amount SEK',
        '2025-09-07T18:42:08.399Z 99.34',  // missing currency
        'not a timestamp 99.34 SEK'
      ];
      
      invalidLines.forEach(line => {
        expect(parseLogEntry(line)).toBeNull();
      });
    });

    test('should handle decimal amounts correctly', () => {
      const logLines = [
        '2025-09-07T18:42:08.399Z 99 SEK',      // whole number
        '2025-09-07T18:42:08.399Z 99.0 SEK',    // one decimal
        '2025-09-07T18:42:08.399Z 99.34 SEK',   // two decimals
        '2025-09-07T18:42:08.399Z 99.999 SEK'   // three decimals
      ];
      
      const results = logLines.map(parseLogEntry);
      
      expect(results[0].amount).toBe(99);
      expect(results[1].amount).toBe(99.0);
      expect(results[2].amount).toBe(99.34);
      expect(results[3].amount).toBe(99.999);
    });
  });

  describe('calculateBudgetUsage', () => {
    const mockBudget = {
      fromDate: '2025-09-01',
      toDate: '2025-09-30',
      totalAmount: 1000
    };

    test('should return empty result when log file does not exist', () => {
      const mockFsNoFile = {
        existsSync: () => false,
        readFileSync: () => { throw new Error('File not found'); }
      };
      
      const result = calculateBudgetUsage('/nonexistent/path', mockBudget, 'SEK', mockFsNoFile);
      
      expect(result).toEqual({
        totalSpent: 0,
        skippedEntries: [],
        hasSkippedCurrencies: false,
        errorMessage: null
      });
    });

    test('should calculate spending for matching currency within budget period', () => {
      mockFs._testLogContent = [
        '2025-09-05T10:00:00.000Z 100.00 SEK for Alice',
        '2025-09-10T15:30:00.000Z 150.50 SEK',
        '2025-09-20T09:15:00.000Z 75.25 SEK for Bob'
      ].join('\n');
      
      const result = calculateBudgetUsage(TEST_LOG_PATH, mockBudget, 'SEK', mockFs);
      
      expect(result.totalSpent).toBe(325.75);
      expect(result.hasSkippedCurrencies).toBe(false);
      expect(result.skippedEntries).toHaveLength(0);
      expect(result.errorMessage).toBeNull();
    });

    test('should skip entries with different currencies', () => {
      mockFs._testLogContent = [
        '2025-09-05T10:00:00.000Z 100.00 SEK for Alice',
        '2025-09-10T15:30:00.000Z 150.50 USD for Charlie',
        '2025-09-15T12:00:00.000Z 200.00 EUR',
        '2025-09-20T09:15:00.000Z 75.25 SEK for Bob'
      ].join('\n');
      
      const result = calculateBudgetUsage(TEST_LOG_PATH, mockBudget, 'SEK', mockFs);
      
      expect(result.totalSpent).toBe(175.25); // Only SEK amounts
      expect(result.hasSkippedCurrencies).toBe(true);
      expect(result.skippedEntries).toHaveLength(2);
      
      // Check skipped entries
      expect(result.skippedEntries[0]).toEqual({
        amount: 150.50,
        currency: 'USD',
        date: '2025-09-10',
        recipient: 'Charlie'
      });
      expect(result.skippedEntries[1]).toEqual({
        amount: 200.00,
        currency: 'EUR',
        date: '2025-09-15',
        recipient: null
      });
    });

    test('should exclude entries outside budget period', () => {
      mockFs._testLogContent = [
        '2025-08-25T10:00:00.000Z 50.00 SEK for Alice',   // Before budget
        '2025-09-05T10:00:00.000Z 100.00 SEK for Bob',    // Within budget
        '2025-09-20T09:15:00.000Z 75.25 SEK for Charlie', // Within budget
        '2025-10-05T15:30:00.000Z 200.00 SEK for Dave'    // After budget
      ].join('\n');
      
      const result = calculateBudgetUsage(TEST_LOG_PATH, mockBudget, 'SEK', mockFs);
      
      expect(result.totalSpent).toBe(175.25); // Only amounts within budget period
      expect(result.hasSkippedCurrencies).toBe(false);
      expect(result.skippedEntries).toHaveLength(0);
    });

    test('should handle mixed scenarios with date filtering and currency filtering', () => {
      mockFs._testLogContent = [
        '2025-08-25T10:00:00.000Z 50.00 SEK for Alice',   // Before budget (excluded)
        '2025-09-05T10:00:00.000Z 100.00 SEK for Bob',    // Within budget, matching currency
        '2025-09-10T15:30:00.000Z 150.50 USD for Charlie', // Within budget, different currency
        '2025-09-20T09:15:00.000Z 75.25 SEK for Dave',    // Within budget, matching currency
        '2025-10-05T15:30:00.000Z 200.00 SEK for Eve'     // After budget (excluded)
      ].join('\n');
      
      const result = calculateBudgetUsage(TEST_LOG_PATH, mockBudget, 'SEK', mockFs);
      
      expect(result.totalSpent).toBe(175.25); // Only SEK within budget period
      expect(result.hasSkippedCurrencies).toBe(true);
      expect(result.skippedEntries).toHaveLength(1); // Only the USD entry within period
      expect(result.skippedEntries[0].currency).toBe('USD');
    });

    test('should skip malformed log entries silently', () => {
      mockFs._testLogContent = [
        '2025-09-05T10:00:00.000Z 100.00 SEK for Alice',
        'invalid log line',
        '2025-09-10T15:30:00.000Z invalid amount SEK',
        '2025-09-20T09:15:00.000Z 75.25 SEK for Bob'
      ].join('\n');
      
      const result = calculateBudgetUsage(TEST_LOG_PATH, mockBudget, 'SEK', mockFs);
      
      expect(result.totalSpent).toBe(175.25); // Only valid entries
      expect(result.hasSkippedCurrencies).toBe(false);
      expect(result.errorMessage).toBeNull();
    });

    test('should handle file read errors gracefully', () => {
      const mockFsError = {
        existsSync: () => true,
        readFileSync: () => { throw new Error('Permission denied'); }
      };
      
      const result = calculateBudgetUsage(TEST_LOG_PATH, mockBudget, 'SEK', mockFsError);
      
      expect(result.totalSpent).toBe(0);
      expect(result.hasSkippedCurrencies).toBe(false);
      expect(result.skippedEntries).toHaveLength(0);
      expect(result.errorMessage).toBe('Could not read log file: Permission denied');
    });
  });

  describe('formatBudgetSummary', () => {
    test('should format normal budget summary without mixed currencies', () => {
      const result = formatBudgetSummary(500, 150, 1000, 15, '2025-09-30', 'SEK', false);
      
      expect(result).toBe('Budget: 1000 SEK | Used: 650 SEK | Remaining: 350 SEK | Ends: 2025-09-30 (15 days)');
    });

    test('should format budget exceeded summary', () => {
      const result = formatBudgetSummary(800, 300, 1000, 10, '2025-09-30', 'SEK', false);
      
      expect(result).toBe('⚠️  BUDGET EXCEEDED! Budget: 1000 SEK | Used: 1100 SEK | Over by: 100 SEK | Ends: 2025-09-30 (10 days)');
    });

    test('should include mixed currencies indicator', () => {
      const result = formatBudgetSummary(500, 150, 1000, 15, '2025-09-30', 'SEK', true);
      
      expect(result).toBe('Budget: 1000 SEK | Used: 650 SEK | Remaining: 350 SEK | Ends: 2025-09-30 (15 days) [*mixed currencies]');
    });

    test('should format budget exceeded with mixed currencies', () => {
      const result = formatBudgetSummary(800, 300, 1000, 10, '2025-09-30', 'SEK', true);
      
      expect(result).toBe('⚠️  BUDGET EXCEEDED! Budget: 1000 SEK | Used: 1100 SEK | Over by: 100 SEK | Ends: 2025-09-30 (10 days) [*mixed currencies]');
    });

    test('should handle singular day correctly', () => {
      const result = formatBudgetSummary(500, 150, 1000, 1, '2025-09-30', 'SEK', false);
      
      expect(result).toBe('Budget: 1000 SEK | Used: 650 SEK | Remaining: 350 SEK | Ends: 2025-09-30 (1 day)');
    });

    test('should handle zero days remaining', () => {
      const result = formatBudgetSummary(500, 150, 1000, 0, '2025-09-30', 'SEK', false);
      
      expect(result).toBe('Budget: 1000 SEK | Used: 650 SEK | Remaining: 350 SEK | Ends: 2025-09-30 (0 days)');
    });

    test('should handle different currencies', () => {
      const currencies = ['USD', 'EUR', 'GBP', 'JPY'];
      
      currencies.forEach(currency => {
        const result = formatBudgetSummary(500, 150, 1000, 15, '2025-09-30', currency, false);
        expect(result).toContain(`1000 ${currency}`);
        expect(result).toContain(`650 ${currency}`);
        expect(result).toContain(`350 ${currency}`);
      });
    });

    test('should handle decimal amounts correctly', () => {
      const result = formatBudgetSummary(500.75, 150.25, 1000.50, 15, '2025-09-30', 'SEK', false);
      
      expect(result).toBe('Budget: 1000.5 SEK | Used: 651 SEK | Remaining: 349.5 SEK | Ends: 2025-09-30 (15 days)');
    });

    test('should handle edge case where budget exactly matches spending', () => {
      const result = formatBudgetSummary(800, 200, 1000, 15, '2025-09-30', 'SEK', false);
      
      expect(result).toBe('Budget: 1000 SEK | Used: 1000 SEK | Remaining: 0 SEK | Ends: 2025-09-30 (15 days)');
    });
  });

  describe('Integration scenarios', () => {
    test('should handle complete workflow with mixed currencies', () => {
      mockFs._testLogContent = [
        '2025-09-05T10:00:00.000Z 100.00 SEK for Alice',
        '2025-09-10T15:30:00.000Z 150.50 USD for Charlie',
        '2025-09-15T12:00:00.000Z 200.00 EUR',
        '2025-09-20T09:15:00.000Z 75.25 SEK for Bob'
      ].join('\n');
      
      const mockBudget = {
        fromDate: '2025-09-01',
        toDate: '2025-09-30',
        totalAmount: 1000
      };
      
      // Step 1: Calculate usage
      const usage = calculateBudgetUsage(TEST_LOG_PATH, mockBudget, 'SEK', mockFs);
      expect(usage.totalSpent).toBe(175.25);
      expect(usage.hasSkippedCurrencies).toBe(true);
      expect(usage.skippedEntries).toHaveLength(2);
      
      // Step 2: Format summary
      const newAmount = 124.75;
      const summary = formatBudgetSummary(
        usage.totalSpent,
        newAmount,
        mockBudget.totalAmount,
        10,
        mockBudget.toDate,
        'SEK',
        usage.hasSkippedCurrencies
      );
      
      expect(summary).toBe('Budget: 1000 SEK | Used: 300 SEK | Remaining: 700 SEK | Ends: 2025-09-30 (10 days) [*mixed currencies]');
      
      // Step 3: Verify skipped entries format
      const skippedDetails = usage.skippedEntries
        .map(entry => {
          const recipientPart = entry.recipient ? ` (${entry.recipient})` : '';
          return `${entry.amount} ${entry.currency} (${entry.date})${recipientPart}`;
        })
        .join(', ');
      
      expect(skippedDetails).toBe('150.5 USD (2025-09-10) (Charlie), 200 EUR (2025-09-15)');
    });

    test('should handle budget exceeded scenario with skipped currencies', () => {
      mockFs._testLogContent = [
        '2025-09-05T10:00:00.000Z 400.00 SEK for Alice',
        '2025-09-10T15:30:00.000Z 300.50 USD for Charlie',  // Skipped
        '2025-09-20T09:15:00.000Z 500.25 SEK for Bob'
      ].join('\n');
      
      const mockBudget = {
        fromDate: '2025-09-01',
        toDate: '2025-09-30',
        totalAmount: 1000
      };
      
      const usage = calculateBudgetUsage(TEST_LOG_PATH, mockBudget, 'SEK', mockFs);
      const newAmount = 200;
      
      const summary = formatBudgetSummary(
        usage.totalSpent,
        newAmount,
        mockBudget.totalAmount,
        5,
        mockBudget.toDate,
        'SEK',
        usage.hasSkippedCurrencies
      );
      
      expect(summary).toBe('⚠️  BUDGET EXCEEDED! Budget: 1000 SEK | Used: 1100.25 SEK | Over by: 100.25 SEK | Ends: 2025-09-30 (5 days) [*mixed currencies]');
    });
  });
});