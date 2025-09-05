#!/usr/bin/env node

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CLI_PATH = path.join(process.cwd(), 'index.js');
const CONFIG_DIR = path.join(os.homedir(), '.config', 'gift-calc');
const CONFIG_PATH = path.join(CONFIG_DIR, '.config.json');
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
    if (fs.existsSync(CONFIG_PATH)) fs.unlinkSync(CONFIG_PATH);
    if (fs.existsSync(LOG_PATH)) fs.unlinkSync(LOG_PATH);
  } catch (e) {
    // Ignore cleanup errors
  }
}

// Helper to create test config
function createTestConfig(config = {}) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

describe('Gift Calculator Core Tests', () => {

  describe('Basic Functionality', () => {
    test('should run with default values', () => {
      cleanup();
      const result = runCLI('--no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^\d+(\.\d+)?\s+\w+$/);
    });

    test('should accept base value parameter', () => {
      const result = runCLI('-b 100 --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^\d+(\.\d+)?\s+\w+$/);
    });

    test('should accept currency parameter', () => {
      const result = runCLI('-c USD --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /USD$/);
    });

    test('should accept decimals parameter', () => {
      const result = runCLI('-d 0 --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^\d+\s+\w+$/); // No decimal places
    });

    test('should accept name parameter', () => {
      const result = runCLI('--name "Alice" --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /for Alice$/);
    });
  });

  describe('Score Parameters', () => {
    test('should accept friend score parameter', () => {
      const result = runCLI('-f 8 -b 100 --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^\d+(\.\d+)?\s+\w+$/);
    });

    test('should accept nice score parameter', () => {
      const result = runCLI('-n 7 -b 100 --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^\d+(\.\d+)?\s+\w+$/);
    });

    test('should validate friend score range', () => {
      const result = runCLI('-f 11');
      assert.strictEqual(result.success, false);
      assert.match(result.stderr, /friend-score must be between 1 and 10/);
    });

    test('should validate nice score range', () => {
      const result = runCLI('-n 11');
      assert.strictEqual(result.success, false);
      assert.match(result.stderr, /nice-score must be between 0 and 10/);
    });
  });

  describe('Special Cases - Nice Score', () => {
    test('nice score 0 should return 0', () => {
      const result = runCLI('-n 0 -b 100 --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^0(\.\d+)?\s+\w+$/);
    });

    test('nice score 1 should return 10% of base', () => {
      const result = runCLI('-n 1 -b 100 --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^10(\.\d+)?\s+\w+$/);
    });

    test('nice score 2 should return 20% of base', () => {
      const result = runCLI('-n 2 -b 100 --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^20(\.\d+)?\s+\w+$/);
    });

    test('nice score 3 should return 30% of base', () => {
      const result = runCLI('-n 3 -b 100 --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^30(\.\d+)?\s+\w+$/);
    });

    test('nice score 0 should override --max', () => {
      const result = runCLI('-n 0 --max -b 100 --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^0(\.\d+)?\s+\w+$/);
    });

    test('nice score 2 should override --min', () => {
      const result = runCLI('-n 2 --min -b 100 --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^20(\.\d+)?\s+\w+$/);
    });
  });

  describe('Fixed Amount Parameters', () => {
    test('--max should return base + 20%', () => {
      const result = runCLI('--max -b 100 --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^120(\.\d+)?\s+\w+$/);
    });

    test('--min should return base - 20%', () => {
      const result = runCLI('--min -b 100 --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^80(\.\d+)?\s+\w+$/);
    });
  });

  describe('Convenience Parameters', () => {
    test('--asshole should return 0', () => {
      const result = runCLI('--asshole -b 100 --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^0(\.\d+)?\s+\w+$/);
    });

    test('--dickhead should return 0', () => {
      const result = runCLI('--dickhead -b 100 --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^0(\.\d+)?\s+\w+$/);
    });

    test('--asshole should override explicit nice score', () => {
      const result = runCLI('-n 8 --asshole -b 100 --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^0(\.\d+)?\s+\w+$/);
    });
  });

  describe('Parameter Validation', () => {
    test('should validate variation range', () => {
      const result = runCLI('-v 101');
      assert.strictEqual(result.success, false);
      assert.match(result.stderr, /variation must be between 0 and 100/);
    });

    test('should validate decimals range', () => {
      const result = runCLI('-d 11');
      assert.strictEqual(result.success, false);
      assert.match(result.stderr, /decimals must be between 0 and 10/);
    });

    test('should require numeric values for base value', () => {
      const result = runCLI('-b abc');
      assert.strictEqual(result.success, false);
      assert.match(result.stderr, /basevalue requires a numeric value/);
    });
  });

  describe('Configuration Loading', () => {
    test('should use default values without config', () => {
      cleanup(); // Ensure no config exists
      const result = runCLI('--no-log');
      assert.strictEqual(result.success, true);
      // Should use default currency (SEK)
      assert.match(result.stdout, /SEK$/);
    });

    test('should load values from config file', () => {
      createTestConfig({
        baseValue: 85,
        currency: 'USD',
        decimals: 1
      });
      
      const result = runCLI('--no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /USD$/);
      assert.match(result.stdout, /^\d+\.\d\s+USD$/); // 1 decimal place
    });

    test('should override config with command line args', () => {
      createTestConfig({
        currency: 'USD'
      });
      
      const result = runCLI('-c EUR --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /EUR$/);
    });
  });

  describe('Logging Functionality', () => {
    test('should log by default', () => {
      cleanup();
      const result = runCLI('-b 100');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /Entry logged to/);
      assert.strictEqual(fs.existsSync(LOG_PATH), true);
    });

    test('should not log with --no-log', () => {
      cleanup();
      const result = runCLI('-b 100 --no-log');
      assert.strictEqual(result.success, true);
      assert.doesNotMatch(result.stdout, /Entry logged to/);
    });

    test('should log with recipient name', () => {
      cleanup();
      const result = runCLI('-b 100 --name "Test User"');
      assert.strictEqual(result.success, true);
      
      const logContent = fs.readFileSync(LOG_PATH, 'utf8');
      assert.match(logContent, /for Test User$/m);
    });

    test('should append to existing log', () => {
      cleanup();
      runCLI('-b 50 --name "First"');
      runCLI('-b 75 --name "Second"');
      
      const logContent = fs.readFileSync(LOG_PATH, 'utf8');
      const lines = logContent.trim().split('\n');
      assert.strictEqual(lines.length, 2);
      assert.match(lines[0], /for First$/);
      assert.match(lines[1], /for Second$/);
    });
  });

  describe('Commands', () => {
    test('should show help', () => {
      const result = runCLI('--help');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /Gift Calculator - CLI Tool/);
      assert.match(result.stdout, /USAGE:/);
      assert.match(result.stdout, /OPTIONS:/);
    });

    test('should handle log command with no log file', () => {
      cleanup();
      const result = runCLI('log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /No log file found/);
    });

    test('should handle log command with existing log file', () => {
      cleanup();
      // Create log entry first
      runCLI('-b 100');
      
      // Then test log command (will open less, so we expect it to complete)
      const result = runCLI('log', { timeout: 2000 });
      // The command should run successfully (less opens and closes)
      assert.strictEqual(result.success, true);
    });
  });

  describe('Output Format', () => {
    test('should format output correctly without name', () => {
      const result = runCLI('-b 100 -c USD --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^\d+(\.\d+)?\s+USD$/);
    });

    test('should format output correctly with name', () => {
      const result = runCLI('-b 100 --name "Alice" --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^\d+(\.\d+)?\s+\w+\s+for Alice$/);
    });

    test('should respect decimal places', () => {
      const result = runCLI('-b 100 -d 0 --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^\d+\s+\w+$/); // No decimals
    });

    test('should respect decimal places with fixed amounts', () => {
      const result = runCLI('--max -b 100 -d 1 --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^120(\.\d)?\s+\w+$/); // May or may not show .0
    });
  });

  describe('Edge Cases', () => {
    test('should handle very small base values', () => {
      const result = runCLI('-b 0.01 --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^\d+(\.\d+)?\s+\w+$/);
    });

    test('should handle very large base values', () => {
      const result = runCLI('-b 1000000 --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^\d+(\.\d+)?\s+\w+$/);
    });

    test('should handle zero variation', () => {
      const result = runCLI('-v 0 -b 100 --no-log');
      assert.strictEqual(result.success, true);
      // With 0 variation, result should be close to base value
      const amount = parseFloat(result.stdout.split(' ')[0]);
      assert.ok(Math.abs(amount - 100) < 10); // Allow for bias effects
    });

    test('should handle maximum variation', () => {
      const result = runCLI('-v 100 -b 100 --no-log');
      assert.strictEqual(result.success, true);
      const amount = parseFloat(result.stdout.split(' ')[0]);
      assert.ok(amount >= 0 && amount <= 200); // 100 ± 100%
    });
  });
});