#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { 
  parseSpendingsArguments, 
  calculateRelativeDate,
  getSpendingsBetweenDates,
  formatSpendingsOutput,
  validateDate
} from '../src/core.js';

const CLI_PATH = path.join(process.cwd(), 'index.js');

// Helper function to run CLI commands
function runCLI(args = '', options = {}) {
  try {
    const result = execSync(`node "${CLI_PATH}" ${args}`, {
      encoding: 'utf8',
      timeout: 5000,
      ...options
    });
    return { stdout: result.trim(), stderr: '', success: true };
  } catch (error) {
    return { 
      stdout: error.stdout?.trim() || '', 
      stderr: error.stderr?.trim() || error.message, 
      success: false,
      code: error.status
    };
  }
}

// Helper to create test log content
function createTestLogContent() {
  return `2024-12-01T10:00:00.000Z 85.00 SEK for Alice
2024-12-02T11:30:00.000Z 120.75 SEK for Bob
2024-12-05T14:20:00.000Z 67.25 SEK for Charlie
2024-11-20T09:15:00.000Z 89.99 USD for David
2024-11-25T16:45:00.000Z 45.00 EUR for Eva
2024-10-15T12:30:00.000Z 200.00 SEK
2024-09-10T14:00:00.000Z 150.00 SEK for Frank (on naughty list!)`;
}

// Setup test environment
function setupTestLog(logContent) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gift-calc-spendings-test-'));
  const logPath = path.join(tempDir, 'gift-calc.log');
  fs.writeFileSync(logPath, logContent);
  return { tempDir, logPath };
}

function cleanup(tempDir) {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {
    // Ignore cleanup errors
  }
}

describe('Spendings Tracking Tests', () => {

  describe('parseSpendingsArguments', () => {
    test('should require time period specification', () => {
      const config = parseSpendingsArguments([]);
      expect(config.success).toBe(false);
      expect(config.error).toContain('No time period specified');
    });

    test('should parse absolute date range', () => {
      const config = parseSpendingsArguments(['--from', '2024-01-01', '--to', '2024-12-31']);
      expect(config.success).toBe(true);
      expect(config.fromDate).toBe('2024-01-01');
      expect(config.toDate).toBe('2024-12-31');
    });

    test('should parse short form absolute dates', () => {
      const config = parseSpendingsArguments(['-f', '2024-06-01', '-t', '2024-06-30']);
      expect(config.success).toBe(true);
      expect(config.fromDate).toBe('2024-06-01');
      expect(config.toDate).toBe('2024-06-30');
    });

    test('should parse days relative period', () => {
      const config = parseSpendingsArguments(['--days', '30']);
      expect(config.success).toBe(true);
      expect(config.days).toBe(30);
    });

    test('should parse weeks relative period', () => {
      const config = parseSpendingsArguments(['--weeks', '4']);
      expect(config.success).toBe(true);
      expect(config.weeks).toBe(4);
    });

    test('should parse months relative period', () => {
      const config = parseSpendingsArguments(['--months', '3']);
      expect(config.success).toBe(true);
      expect(config.months).toBe(3);
    });

    test('should parse years relative period', () => {
      const config = parseSpendingsArguments(['--years', '1']);
      expect(config.success).toBe(true);
      expect(config.years).toBe(1);
    });

    test('should reject mixing absolute and relative periods', () => {
      const config = parseSpendingsArguments(['--from', '2024-01-01', '--days', '30']);
      expect(config.success).toBe(false);
      expect(config.error).toContain('Cannot combine absolute dates');
    });

    test('should reject multiple relative periods', () => {
      const config = parseSpendingsArguments(['--days', '30', '--weeks', '4']);
      expect(config.success).toBe(false);
      expect(config.error).toContain('Can only specify one relative period');
    });

    test('should require both from and to for absolute dates', () => {
      const config1 = parseSpendingsArguments(['--from', '2024-01-01']);
      expect(config1.success).toBe(false);
      expect(config1.error).toContain('Both --from and --to dates are required');

      const config2 = parseSpendingsArguments(['--to', '2024-12-31']);
      expect(config2.success).toBe(false);
      expect(config2.error).toContain('Both --from and --to dates are required');
    });

    test('should validate numeric values for relative periods', () => {
      const config1 = parseSpendingsArguments(['--days', 'invalid']);
      expect(config1.success).toBe(false);
      expect(config1.error).toContain('--days requires a numeric value');

      const config2 = parseSpendingsArguments(['--weeks', '0']);
      expect(config2.success).toBe(false);
      expect(config2.error).toContain('--weeks must be a positive number');
    });

    test('should reject unknown arguments', () => {
      const config = parseSpendingsArguments(['--invalid', 'value']);
      expect(config.success).toBe(false);
      expect(config.error).toContain('Unknown argument: --invalid');
    });
  });

  describe('calculateRelativeDate', () => {
    test('should calculate days correctly', () => {
      const result = calculateRelativeDate('days', 30);
      const expected = new Date();
      expected.setDate(expected.getDate() - 30);
      expect(result).toBe(expected.toISOString().split('T')[0]);
    });

    test('should calculate weeks correctly', () => {
      const result = calculateRelativeDate('weeks', 4);
      const expected = new Date();
      expected.setDate(expected.getDate() - (4 * 7));
      expect(result).toBe(expected.toISOString().split('T')[0]);
    });

    test('should calculate months correctly', () => {
      const result = calculateRelativeDate('months', 3);
      const expected = new Date();
      expected.setMonth(expected.getMonth() - 3);
      expect(result).toBe(expected.toISOString().split('T')[0]);
    });

    test('should calculate years correctly', () => {
      const result = calculateRelativeDate('years', 1);
      const expected = new Date();
      expected.setFullYear(expected.getFullYear() - 1);
      expect(result).toBe(expected.toISOString().split('T')[0]);
    });

    test('should handle invalid time units', () => {
      expect(() => calculateRelativeDate('invalid', 1)).toThrow('Unknown time unit: invalid');
    });
  });

  describe('getSpendingsBetweenDates', () => {
    test('should handle non-existent log file', () => {
      const result = getSpendingsBetweenDates('/non/existent/path', '2024-01-01', '2024-12-31', fs);
      expect(result.errorMessage).toContain('No spending data found');
      expect(result.hasData).toBe(false);
    });

    test('should parse and filter log entries correctly', () => {
      const { tempDir, logPath } = setupTestLog(createTestLogContent());
      
      const result = getSpendingsBetweenDates(logPath, '2024-12-01', '2024-12-31', fs);
      
      expect(result.hasData).toBe(true);
      expect(result.entries).toHaveLength(3);
      expect(result.currencyTotals.SEK).toBe(273);
      
      cleanup(tempDir);
    });

    test('should handle multi-currency data', () => {
      const { tempDir, logPath } = setupTestLog(createTestLogContent());
      
      const result = getSpendingsBetweenDates(logPath, '2024-11-01', '2024-12-31', fs);
      
      expect(result.hasData).toBe(true);
      expect(result.currencyTotals.SEK).toBe(273);
      expect(result.currencyTotals.USD).toBe(89.99);
      expect(result.currencyTotals.EUR).toBe(45);
      
      cleanup(tempDir);
    });

    test('should sort entries chronologically', () => {
      const { tempDir, logPath } = setupTestLog(createTestLogContent());
      
      const result = getSpendingsBetweenDates(logPath, '2024-11-01', '2024-12-31', fs);
      
      expect(result.entries[0].timestamp.toISOString()).toContain('2024-11-20');
      expect(result.entries[1].timestamp.toISOString()).toContain('2024-11-25');
      expect(result.entries[2].timestamp.toISOString()).toContain('2024-12-01');
      
      cleanup(tempDir);
    });

    test('should handle no data in range', () => {
      const { tempDir, logPath } = setupTestLog(createTestLogContent());
      
      const result = getSpendingsBetweenDates(logPath, '2025-01-01', '2025-01-31', fs);
      
      expect(result.hasData).toBe(false);
      expect(result.errorMessage).toContain('No spending found');
      
      cleanup(tempDir);
    });
  });

  describe('formatSpendingsOutput', () => {
    test('should format single currency output', () => {
      const testData = {
        entries: [
          { timestamp: new Date('2024-12-01T10:00:00.000Z'), amount: 85, currency: 'SEK', recipient: 'Alice' },
          { timestamp: new Date('2024-12-02T11:30:00.000Z'), amount: 120.75, currency: 'SEK', recipient: 'Bob' }
        ],
        currencyTotals: { SEK: 205.75 },
        hasData: true
      };
      
      const output = formatSpendingsOutput(testData, '2024-12-01', '2024-12-31');
      
      expect(output).toContain('Total Spending (2024-12-01 to 2024-12-31): 205.75 SEK');
      expect(output).toContain('2024-12-01  85 SEK for Alice');
      expect(output).toContain('2024-12-02  120.75 SEK for Bob');
    });

    test('should format multi-currency output with headers', () => {
      const testData = {
        entries: [
          { timestamp: new Date('2024-12-01T10:00:00.000Z'), amount: 85, currency: 'SEK', recipient: 'Alice' },
          { timestamp: new Date('2024-11-20T09:15:00.000Z'), amount: 89.99, currency: 'USD', recipient: 'David' }
        ],
        currencyTotals: { SEK: 85, USD: 89.99 },
        hasData: true
      };
      
      const output = formatSpendingsOutput(testData, '2024-11-01', '2024-12-31');
      
      expect(output).toContain('Total Spending (2024-11-01 to 2024-12-31):');
      expect(output).toContain('85 SEK');
      expect(output).toContain('89.99 USD');
      expect(output).toContain('SEK:');
      expect(output).toContain('USD:');
    });

    test('should handle entries without recipients', () => {
      const testData = {
        entries: [
          { timestamp: new Date('2024-12-01T10:00:00.000Z'), amount: 85, currency: 'SEK', recipient: null }
        ],
        currencyTotals: { SEK: 85 },
        hasData: true
      };
      
      const output = formatSpendingsOutput(testData, '2024-12-01', '2024-12-31');
      
      expect(output).toContain('2024-12-01  85 SEK');
      expect(output).not.toContain('for');
    });

    test('should return error message when present', () => {
      const testData = {
        errorMessage: 'No spending data found',
        entries: [],
        currencyTotals: {},
        hasData: false
      };
      
      const output = formatSpendingsOutput(testData, '2024-12-01', '2024-12-31');
      
      expect(output).toBe('No spending data found');
    });
  });

  describe('CLI Integration Tests', () => {
    let originalHome;
    let tempConfigDir;

    beforeEach(() => {
      // Setup temporary config directory
      originalHome = process.env.HOME;
      tempConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gift-calc-cli-test-'));
      process.env.HOME = tempConfigDir;
      
      // Create config directory and sample log
      const configDir = path.join(tempConfigDir, '.config', 'gift-calc');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(path.join(configDir, 'gift-calc.log'), createTestLogContent());
    });

    afterEach(() => {
      process.env.HOME = originalHome;
      cleanup(tempConfigDir);
    });

    test('should handle no arguments error', () => {
      const result = runCLI('spendings');
      expect(result.success).toBe(false);
      expect(result.stderr).toContain('No time period specified');
    });

    test('should work with absolute dates', () => {
      const result = runCLI('spendings --from 2024-12-01 --to 2024-12-31');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Total Spending (2024-12-01 to 2024-12-31): 273 SEK');
      expect(result.stdout).toContain('for Alice');
    });

    test('should work with short form absolute dates', () => {
      const result = runCLI('spendings -f 2024-12-01 -t 2024-12-31');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Total Spending (2024-12-01 to 2024-12-31): 273 SEK');
    });

    test('should work with multi-currency range', () => {
      const result = runCLI('spendings --from 2024-11-01 --to 2024-12-31');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('45 EUR');
      expect(result.stdout).toContain('273 SEK');
      expect(result.stdout).toContain('89.99 USD');
      expect(result.stdout).toContain('EUR:');
      expect(result.stdout).toContain('SEK:');
      expect(result.stdout).toContain('USD:');
    });

    test('should work with relative periods', () => {
      // This will likely show "No spending found" since our test data is from 2024
      // but that's expected behavior
      const result = runCLI('spendings --days 30');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('No spending found');
    });

    test('should work with short alias', () => {
      const result = runCLI('s --from 2024-12-01 --to 2024-12-31');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Total Spending (2024-12-01 to 2024-12-31): 273 SEK');
    });

    test('should validate date formats', () => {
      const result = runCLI('spendings --from invalid-date --to 2024-12-31');
      expect(result.success).toBe(false);
      expect(result.stderr).toContain('Date must be in YYYY-MM-DD format');
    });

    test('should validate date order', () => {
      const result = runCLI('spendings --from 2024-12-31 --to 2024-01-01');
      expect(result.success).toBe(false);
      expect(result.stderr).toContain('From date must be before or equal to to date');
    });

    test('should handle no log file gracefully', () => {
      // Remove the log file
      const logPath = path.join(tempConfigDir, '.config', 'gift-calc', 'gift-calc.log');
      fs.unlinkSync(logPath);
      
      const result = runCLI('spendings --from 2024-01-01 --to 2024-12-31');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('No spending data found');
    });

    test('should show usage help on argument errors', () => {
      const result = runCLI('spendings --invalid-arg');
      expect(result.success).toBe(false);
      expect(result.stderr).toContain('Usage:');
      expect(result.stderr).toContain('gift-calc spendings -f');
      expect(result.stderr).toContain('gcalc s --weeks');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty log file', () => {
      const { tempDir, logPath } = setupTestLog('');
      
      const result = getSpendingsBetweenDates(logPath, '2024-01-01', '2024-12-31', fs);
      
      expect(result.hasData).toBe(false);
      expect(result.errorMessage).toContain('No spending found');
      
      cleanup(tempDir);
    });

    test('should handle malformed log entries', () => {
      const malformedLog = `2024-12-01T10:00:00.000Z 85.00 SEK for Alice
invalid log line
2024-12-02T11:30:00.000Z 120.75 SEK for Bob`;
      
      const { tempDir, logPath } = setupTestLog(malformedLog);
      
      const result = getSpendingsBetweenDates(logPath, '2024-12-01', '2024-12-31', fs);
      
      expect(result.hasData).toBe(true);
      expect(result.entries).toHaveLength(2); // Should skip malformed line
      
      cleanup(tempDir);
    });

    test('should handle same-day date ranges', () => {
      const { tempDir, logPath } = setupTestLog(createTestLogContent());
      
      const result = getSpendingsBetweenDates(logPath, '2024-12-01', '2024-12-01', fs);
      
      expect(result.hasData).toBe(true);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].recipient).toBe('Alice');
      
      cleanup(tempDir);
    });

    test('should handle zero amounts', () => {
      const zeroAmountLog = `2024-12-01T10:00:00.000Z 0 SEK for Alice`;
      
      const { tempDir, logPath } = setupTestLog(zeroAmountLog);
      
      const result = getSpendingsBetweenDates(logPath, '2024-12-01', '2024-12-31', fs);
      
      expect(result.hasData).toBe(true);
      expect(result.currencyTotals.SEK).toBe(0);
      
      cleanup(tempDir);
    });

    test('should handle very large amounts', () => {
      const largeAmountLog = `2024-12-01T10:00:00.000Z 999999.99 SEK for Alice`;
      
      const { tempDir, logPath } = setupTestLog(largeAmountLog);
      
      const result = getSpendingsBetweenDates(logPath, '2024-12-01', '2024-12-31', fs);
      
      expect(result.hasData).toBe(true);
      expect(result.currencyTotals.SEK).toBe(999999.99);
      
      cleanup(tempDir);
    });
  });
});