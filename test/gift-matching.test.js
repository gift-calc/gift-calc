#!/usr/bin/env node

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  findLastGiftFromLog,
  findLastGiftForRecipientFromLog,
  formatMatchedGift,
  parseArguments
} from '../src/core.js';

const CLI_PATH = path.join(process.cwd(), 'index.js');
const CONFIG_DIR = path.join(os.homedir(), '.config', 'gift-calc');
const LOG_PATH = path.join(CONFIG_DIR, 'gift-calc.log');

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

// Helper to clean up test files
function cleanup() {
  try {
    if (fs.existsSync(LOG_PATH)) fs.unlinkSync(LOG_PATH);
  } catch (e) {
    // Ignore cleanup errors
  }
}

// Helper to create test log entries
function createTestLogFile(entries) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  const logContent = entries.join('\n') + '\n';
  fs.writeFileSync(LOG_PATH, logContent);
}

describe('Log-Based Gift Matching Core Functions', () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  describe('findLastGiftFromLog', () => {
    test('should return null when log file does not exist', () => {
      const lastGift = findLastGiftFromLog(LOG_PATH, fs);
      expect(lastGift).toBe(null);
    });

    test('should return null when log file is empty', () => {
      createTestLogFile([]);
      const lastGift = findLastGiftFromLog(LOG_PATH, fs);
      expect(lastGift).toBe(null);
    });

    test('should find the last gift from log file', () => {
      const testEntries = [
        '2023-12-01T10:00:00.000Z 100.50 SEK for Alice',
        '2023-12-02T11:00:00.000Z 75.25 USD',
        '2023-12-03T12:00:00.000Z 95.75 EUR for Bob'
      ];
      createTestLogFile(testEntries);

      const lastGift = findLastGiftFromLog(LOG_PATH, fs);
      expect(lastGift).not.toBe(null);
      expect(lastGift.amount).toBe(95.75);
      expect(lastGift.currency).toBe('EUR');
      expect(lastGift.recipient).toBe('Bob');
      expect(lastGift.timestamp).toEqual(new Date('2023-12-03T12:00:00.000Z'));
    });

    test('should find last gift without recipient', () => {
      const testEntries = [
        '2023-12-01T10:00:00.000Z 100.50 SEK for Alice',
        '2023-12-02T11:00:00.000Z 75.25 USD'
      ];
      createTestLogFile(testEntries);

      const lastGift = findLastGiftFromLog(LOG_PATH, fs);
      expect(lastGift).not.toBe(null);
      expect(lastGift.amount).toBe(75.25);
      expect(lastGift.currency).toBe('USD');
      expect(lastGift.recipient).toBe(null);
    });

    test('should ignore malformed log entries', () => {
      const testEntries = [
        '2023-12-01T10:00:00.000Z 100.50 SEK for Alice',
        'invalid log entry',
        '2023-12-03T12:00:00.000Z 95.75 EUR for Bob'
      ];
      createTestLogFile(testEntries);

      const lastGift = findLastGiftFromLog(LOG_PATH, fs);
      expect(lastGift).not.toBe(null);
      expect(lastGift.amount).toBe(95.75);
      expect(lastGift.recipient).toBe('Bob');
    });

    test('should handle naughty list entries', () => {
      const testEntries = [
        '2023-12-01T10:00:00.000Z 100.50 SEK for Alice',
        '2023-12-02T11:00:00.000Z 0 SEK for Charlie (on naughty list!)'
      ];
      createTestLogFile(testEntries);

      const lastGift = findLastGiftFromLog(LOG_PATH, fs);
      expect(lastGift).not.toBe(null);
      expect(lastGift.amount).toBe(0);
      expect(lastGift.recipient).toBe('Charlie');
    });
  });

  describe('findLastGiftForRecipientFromLog', () => {
    beforeEach(() => {
      const testEntries = [
        '2023-12-01T10:00:00.000Z 80.00 SEK for Alice',
        '2023-12-02T11:00:00.000Z 120.00 USD for Bob',
        '2023-12-03T12:00:00.000Z 95.50 EUR for Alice',
        '2023-12-04T13:00:00.000Z 200.00 SEK'
      ];
      createTestLogFile(testEntries);
    });

    test('should find last gift for specific recipient', () => {
      const aliceGift = findLastGiftForRecipientFromLog('Alice', LOG_PATH, fs);
      expect(aliceGift).not.toBe(null);
      expect(aliceGift.amount).toBe(95.50);
      expect(aliceGift.currency).toBe('EUR');
      expect(aliceGift.recipient).toBe('Alice');
    });

    test('should find gift case insensitive', () => {
      const bobGift = findLastGiftForRecipientFromLog('bob', LOG_PATH, fs);
      expect(bobGift).not.toBe(null);
      expect(bobGift.recipient).toBe('Bob');
      expect(bobGift.amount).toBe(120.00);
    });

    test('should return null when no gift found for recipient', () => {
      const charlieGift = findLastGiftForRecipientFromLog('Charlie', LOG_PATH, fs);
      expect(charlieGift).toBe(null);
    });

    test('should return null when recipient name is empty', () => {
      const emptyGift = findLastGiftForRecipientFromLog('', LOG_PATH, fs);
      expect(emptyGift).toBe(null);
    });

    test('should return null when log file does not exist', () => {
      cleanup();
      const gift = findLastGiftForRecipientFromLog('Alice', LOG_PATH, fs);
      expect(gift).toBe(null);
    });
  });

  describe('formatMatchedGift', () => {
    test('should format matched gift with recipient', () => {
      const gift = {
        amount: 125.50,
        currency: 'USD',
        recipient: 'Alice',
        timestamp: new Date('2023-12-01T10:00:00.000Z')
      };

      const formatted = formatMatchedGift(gift);
      expect(formatted).toContain('Matched previous gift: 125.5 USD for Alice');
      expect(formatted).toContain('(12/1/2023)');
    });

    test('should format matched gift without recipient', () => {
      const gift = {
        amount: 88.00,
        currency: 'SEK',
        recipient: null,
        timestamp: new Date('2023-12-02T15:30:00.000Z')
      };

      const formatted = formatMatchedGift(gift);
      expect(formatted).toContain('Matched previous gift: 88 SEK');
      expect(formatted).not.toContain(' for ');
      expect(formatted).toContain('(12/2/2023)');
    });
  });
});

describe('Gift Matching Argument Parsing', () => {
  test('should parse -m flag without recipient', () => {
    const config = parseArguments(['-m']);
    expect(config.matchPreviousGift).toBe(true);
    expect(config.matchRecipientName).toBe(null);
  });

  test('should parse --match flag without recipient', () => {
    const config = parseArguments(['--match']);
    expect(config.matchPreviousGift).toBe(true);
    expect(config.matchRecipientName).toBe(null);
  });

  test('should parse -m flag with recipient name', () => {
    const config = parseArguments(['-m', 'Alice']);
    expect(config.matchPreviousGift).toBe(true);
    expect(config.matchRecipientName).toBe('Alice');
  });

  test('should parse --match flag with recipient name', () => {
    const config = parseArguments(['--match', 'Bob']);
    expect(config.matchPreviousGift).toBe(true);
    expect(config.matchRecipientName).toBe('Bob');
  });

  test('should not treat flag-like argument as recipient', () => {
    const config = parseArguments(['-m', '--copy']);
    expect(config.matchPreviousGift).toBe(true);
    expect(config.matchRecipientName).toBe(null);
    expect(config.copyToClipboard).toBe(true);
  });

  test('should combine matching with other options', () => {
    const config = parseArguments(['-m', 'Alice', '-c', 'USD', '--copy']);
    expect(config.matchPreviousGift).toBe(true);
    expect(config.matchRecipientName).toBe('Alice');
    expect(config.currency).toBe('USD');
    expect(config.copyToClipboard).toBe(true);
  });
});

describe('CLI Integration Tests', () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  test('should generate and log gift', () => {
    const result = runCLI('-b 100 --name Alice');
    expect(result.success).toBe(true);
    expect(result.stdout).toMatch(/\d+(\.\d+)? SEK for Alice/);

    // Check that log file was created and has entry
    expect(fs.existsSync(LOG_PATH)).toBe(true);
    const logContent = fs.readFileSync(LOG_PATH, 'utf8');
    expect(logContent).toContain('SEK for Alice');
  });

  test('should match previous gift without recipient name', () => {
    // First, generate a gift to create log entry (use --max for deterministic result)
    const firstResult = runCLI('-b 150 --max -d 0');
    expect(firstResult.success).toBe(true);
    const expectedAmount = '180'; // 150 * 1.2 = 180
    expect(firstResult.stdout).toContain(expectedAmount);
    
    // Then match it
    const result = runCLI('-m');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain(expectedAmount + ' SEK');
    expect(result.stdout).toContain('Matched previous gift: ' + expectedAmount + ' SEK');
  });

  test('should match previous gift for specific recipient', () => {
    // Generate gifts for different recipients (use --max for deterministic results)
    const aliceResult = runCLI('-b 100 --max --name Alice -d 0');
    const bobResult = runCLI('-b 200 --max --name Bob -d 0');
    
    expect(aliceResult.success).toBe(true);
    expect(bobResult.success).toBe(true);
    
    const expectedAliceAmount = '120'; // 100 * 1.2 = 120
    
    // Match Alice's gift
    const result = runCLI('-m Alice');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain(expectedAliceAmount);
    expect(result.stdout).toContain('for Alice');
    expect(result.stdout).toContain('Matched previous gift: ' + expectedAliceAmount);
  });

  test('should fall back to normal calculation when no match found', () => {
    // Try to match when no log exists - need to specify --name separately since -m Alice consumes the Alice as recipient name
    const result = runCLI('-m Alice --name Alice -b 100 --max -d 0');
    expect(result.success).toBe(true);
    expect(result.stdout).toBe('120 SEK for Alice'); // Normal calculation
    expect(result.stdout).not.toContain('Matched previous gift');
  });

  test('should show help text with matching options', () => {
    const result = runCLI('--help');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('-m, --match [name]');
    expect(result.stdout).toContain('GIFT MATCHING EXAMPLES');
  });
});