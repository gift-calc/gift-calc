#!/usr/bin/env node

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  getGiftHistoryPath,
  loadGiftHistory,
  saveGiftHistory,
  addGiftToHistory,
  findLastGift,
  findLastGiftForRecipient,
  formatMatchedGift,
  parseArguments
} from '../src/core.js';

const CLI_PATH = path.join(process.cwd(), 'index.js');
const CONFIG_DIR = path.join(os.homedir(), '.config', 'gift-calc');
const GIFT_HISTORY_PATH = path.join(CONFIG_DIR, 'gift-history.json');

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
    if (fs.existsSync(GIFT_HISTORY_PATH)) fs.unlinkSync(GIFT_HISTORY_PATH);
  } catch (e) {
    // Ignore cleanup errors
  }
}

// Helper to create test gift history
function createTestGiftHistory(gifts) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  const data = { giftHistory: gifts };
  fs.writeFileSync(GIFT_HISTORY_PATH, JSON.stringify(data, null, 2));
}

describe('Gift History Core Functions', () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Gift History Path and Loading', () => {
    test('should get correct gift history path', () => {
      const giftHistoryPath = getGiftHistoryPath(path, os);
      expect(giftHistoryPath).toBe(GIFT_HISTORY_PATH);
    });

    test('should load empty history when file does not exist', () => {
      const { giftHistory, loaded } = loadGiftHistory(GIFT_HISTORY_PATH, fs);
      expect(giftHistory).toEqual([]);
      expect(loaded).toBe(false);
    });

    test('should load existing gift history', () => {
      const testGifts = [
        { amount: 100, currency: 'SEK', recipient: 'Alice', timestamp: '2023-12-01T10:00:00.000Z' },
        { amount: 75, currency: 'USD', recipient: null, timestamp: '2023-12-02T11:00:00.000Z' }
      ];
      createTestGiftHistory(testGifts);

      const { giftHistory, loaded } = loadGiftHistory(GIFT_HISTORY_PATH, fs);
      expect(giftHistory).toEqual(testGifts);
      expect(loaded).toBe(true);
    });

    test('should handle corrupted gift history file', () => {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(GIFT_HISTORY_PATH, 'invalid json');

      const { giftHistory, loaded } = loadGiftHistory(GIFT_HISTORY_PATH, fs);
      expect(giftHistory).toEqual([]);
      expect(loaded).toBe(false);
    });
  });

  describe('Gift History Saving and Adding', () => {
    test('should save gift history successfully', () => {
      const testGifts = [
        { amount: 123, currency: 'EUR', recipient: 'Bob', timestamp: '2023-12-03T12:00:00.000Z' }
      ];
      
      const result = saveGiftHistory(testGifts, GIFT_HISTORY_PATH, fs, path);
      expect(result).toBe(true);
      
      const saved = JSON.parse(fs.readFileSync(GIFT_HISTORY_PATH, 'utf8'));
      expect(saved.giftHistory).toEqual(testGifts);
    });

    test('should add gift to history', () => {
      const result = addGiftToHistory(150, 'USD', 'Charlie', GIFT_HISTORY_PATH, fs, path);
      expect(result.success).toBe(true);
      expect(result.gift.amount).toBe(150);
      expect(result.gift.currency).toBe('USD');
      expect(result.gift.recipient).toBe('Charlie');
      expect(result.gift.timestamp).toBeDefined();

      const { giftHistory } = loadGiftHistory(GIFT_HISTORY_PATH, fs);
      expect(giftHistory).toHaveLength(1);
      expect(giftHistory[0].amount).toBe(150);
    });

    test('should add gift without recipient', () => {
      const result = addGiftToHistory(90, 'SEK', null, GIFT_HISTORY_PATH, fs, path);
      expect(result.success).toBe(true);
      expect(result.gift.recipient).toBe(null);
    });
  });

  describe('Gift Finding Functions', () => {
    beforeEach(() => {
      const testGifts = [
        { amount: 80, currency: 'SEK', recipient: 'Alice', timestamp: '2023-12-01T10:00:00.000Z' },
        { amount: 120, currency: 'USD', recipient: 'Bob', timestamp: '2023-12-02T11:00:00.000Z' },
        { amount: 95, currency: 'EUR', recipient: 'Alice', timestamp: '2023-12-03T12:00:00.000Z' },
        { amount: 200, currency: 'SEK', recipient: null, timestamp: '2023-12-04T13:00:00.000Z' }
      ];
      createTestGiftHistory(testGifts);
    });

    test('should find last gift overall', () => {
      const lastGift = findLastGift(GIFT_HISTORY_PATH, fs);
      expect(lastGift).not.toBe(null);
      expect(lastGift.amount).toBe(200);
      expect(lastGift.currency).toBe('SEK');
      expect(lastGift.recipient).toBe(null);
    });

    test('should find last gift for specific recipient', () => {
      const aliceGift = findLastGiftForRecipient('Alice', GIFT_HISTORY_PATH, fs);
      expect(aliceGift).not.toBe(null);
      expect(aliceGift.amount).toBe(95);
      expect(aliceGift.currency).toBe('EUR');
      expect(aliceGift.recipient).toBe('Alice');
    });

    test('should find last gift case insensitive', () => {
      const bobGift = findLastGiftForRecipient('bob', GIFT_HISTORY_PATH, fs);
      expect(bobGift).not.toBe(null);
      expect(bobGift.recipient).toBe('Bob');
    });

    test('should return null when no gift found for recipient', () => {
      const charlieGift = findLastGiftForRecipient('Charlie', GIFT_HISTORY_PATH, fs);
      expect(charlieGift).toBe(null);
    });

    test('should return null when history is empty', () => {
      cleanup();
      const lastGift = findLastGift(GIFT_HISTORY_PATH, fs);
      expect(lastGift).toBe(null);
    });
  });

  describe('Gift Formatting', () => {
    test('should format matched gift with recipient', () => {
      const gift = {
        amount: 125,
        currency: 'USD',
        recipient: 'Alice',
        timestamp: '2023-12-01T10:00:00.000Z'
      };

      const formatted = formatMatchedGift(gift);
      expect(formatted).toContain('Matched previous gift: 125 USD for Alice');
      expect(formatted).toContain('(12/1/2023)');
    });

    test('should format matched gift without recipient', () => {
      const gift = {
        amount: 88,
        currency: 'SEK',
        recipient: null,
        timestamp: '2023-12-02T15:30:00.000Z'
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

  test('should generate and save gift to history', () => {
    const result = runCLI('-b 100 --name Alice');
    expect(result.success).toBe(true);
    expect(result.stdout).toMatch(/\d+(\.\d+)? SEK for Alice/);

    // Check history was created
    expect(fs.existsSync(GIFT_HISTORY_PATH)).toBe(true);
    const { giftHistory } = loadGiftHistory(GIFT_HISTORY_PATH, fs);
    expect(giftHistory).toHaveLength(1);
    expect(giftHistory[0].recipient).toBe('Alice');
  });

  test('should match previous gift without recipient name', () => {
    // First, generate a gift to create history (use --max for deterministic result)
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

  test('should show help text with matching options', () => {
    const result = runCLI('--help');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('-m, --match [name]');
    expect(result.stdout).toContain('GIFT MATCHING EXAMPLES');
  });
});