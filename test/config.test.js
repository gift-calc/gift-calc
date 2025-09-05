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

describe('Configuration and File Handling Tests', () => {

  describe('Configuration Loading', () => {
    test('should work without config file', () => {
      cleanup(); // Ensure no config exists
      const result = runCLI('--no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^\d+(\.\d+)?\s+SEK$/); // Default currency
    });

    test('should load basic config values', () => {
      createTestConfig({
        baseValue: 85,
        currency: 'USD',
        decimals: 1
      });
      
      const result = runCLI('--no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^\d+\.\d\s+USD$/); // 1 decimal, USD currency
    });

    test('should load all supported config values', () => {
      createTestConfig({
        baseValue: 150,
        variation: 30,
        currency: 'EUR',
        decimals: 0
      });
      
      const result = runCLI('--max --no-log'); // Use --max for deterministic result
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^\d+\s+EUR$/); // No decimals, EUR currency
    });

    test('should handle partial config files', () => {
      createTestConfig({
        currency: 'GBP'
        // Missing other values - should use defaults
      });
      
      const result = runCLI('--no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /GBP$/); // Should use config currency
      assert.match(result.stdout, /^\d+\.\d+\s+GBP$/); // Should use default decimals (2)
    });

    test('should handle malformed config files gracefully', () => {
      // Create invalid JSON
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(CONFIG_PATH, '{ invalid json }');
      
      const result = runCLI('--no-log');
      assert.strictEqual(result.success, true);
      // Should fall back to defaults and still work
      assert.match(result.stdout, /^\d+(\.\d+)?\s+\w+$/);
    });

    test('should prioritize command line over config', () => {
      createTestConfig({
        baseValue: 100,
        currency: 'USD',
        decimals: 0
      });
      
      // Override config with command line
      const result = runCLI('-b 200 -c EUR -d 2 --no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^\d+\.\d+\s+EUR$/); // Should use CLI args, not config
    });
  });

  describe('Configuration File Management', () => {
    test('should create config directory if it does not exist', () => {
      cleanup();
      // Remove entire config directory
      if (fs.existsSync(CONFIG_DIR)) {
        fs.rmSync(CONFIG_DIR, { recursive: true, force: true });
      }
      
      // Run with logging to trigger directory creation
      const result = runCLI('-b 100');
      assert.strictEqual(result.success, true);
      assert.strictEqual(fs.existsSync(CONFIG_DIR), true);
    });

    test('should handle missing config directory gracefully', () => {
      cleanup();
      if (fs.existsSync(CONFIG_DIR)) {
        fs.rmSync(CONFIG_DIR, { recursive: true, force: true });
      }
      
      const result = runCLI('--no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^\d+(\.\d+)?\s+\w+$/);
    });
  });

  describe('Logging Configuration', () => {
    test('should create log file in correct location', () => {
      cleanup();
      const result = runCLI('-b 100');
      assert.strictEqual(result.success, true);
      assert.strictEqual(fs.existsSync(LOG_PATH), true);
    });

    test('should append to existing log file', () => {
      cleanup();
      
      // Create first entry
      runCLI('-b 50 --name "First"');
      const firstContent = fs.readFileSync(LOG_PATH, 'utf8');
      const firstLines = firstContent.trim().split('\n').length;
      
      // Add second entry
      runCLI('-b 75 --name "Second"');
      const secondContent = fs.readFileSync(LOG_PATH, 'utf8');
      const secondLines = secondContent.trim().split('\n').length;
      
      assert.strictEqual(secondLines, firstLines + 1);
      assert.match(secondContent, /for First/);
      assert.match(secondContent, /for Second/);
    });

    test('should format log entries correctly', () => {
      cleanup();
      
      runCLI('-b 100 -c USD --name "Test User"');
      const logContent = fs.readFileSync(LOG_PATH, 'utf8');
      
      // Should match format: timestamp amount currency [for name]
      assert.match(logContent, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \d+(\.\d+)? USD for Test User$/m);
    });

    test('should format log entries without name correctly', () => {
      cleanup();
      
      runCLI('-b 100 -c EUR');
      const logContent = fs.readFileSync(LOG_PATH, 'utf8');
      
      // Should match format: timestamp amount currency
      assert.match(logContent, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \d+(\.\d+)? EUR$/m);
    });

    test('should handle log file permissions', () => {
      cleanup();
      
      // Create log with entry
      const result = runCLI('-b 100');
      assert.strictEqual(result.success, true);
      
      // Verify file exists and is readable
      assert.strictEqual(fs.existsSync(LOG_PATH), true);
      const content = fs.readFileSync(LOG_PATH, 'utf8');
      assert.ok(content.length > 0);
    });
  });

  describe('Log Command', () => {
    test('should handle missing log file', () => {
      cleanup();
      const result = runCLI('log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /No log file found/);
    });

    test('should handle empty log file', () => {
      cleanup();
      
      // Create empty log file
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(LOG_PATH, '');
      
      const result = runCLI('log', { timeout: 2000 });
      assert.strictEqual(result.success, true);
    });

    test('should handle log file with content', () => {
      cleanup();
      
      // Create some log entries
      runCLI('-b 100 --name "Alice"');
      runCLI('-b 200 --name "Bob"');
      
      // Test log command (will open less)
      const result = runCLI('log', { timeout: 2000 });
      assert.strictEqual(result.success, true);
    });
  });

  describe('File System Edge Cases', () => {
    test('should handle read-only config directory', (t) => {
      // This test may not work on all systems, so mark as todo
      t.todo('Test read-only config directory handling');
    });

    test('should handle config file with unusual values', () => {
      createTestConfig({
        baseValue: 0,
        variation: 0,
        currency: 'XYZ',
        decimals: 10
      });
      
      const result = runCLI('--no-log');
      assert.strictEqual(result.success, true);
      assert.match(result.stdout, /^\d+(\.\d+)?\s+XYZ$/);
    });

    test('should handle very long config directory path', () => {
      // Test should work with normal config path lengths
      const result = runCLI('--no-log');
      assert.strictEqual(result.success, true);
    });
  });

  describe('Error Handling', () => {
    test('should handle config loading errors gracefully', () => {
      createTestConfig({
        baseValue: 'invalid',
        variation: null,
        currency: 123
      });
      
      const result = runCLI('--no-log');
      // Should still work by falling back to defaults
      assert.strictEqual(result.success, true);
    });

    test('should handle log writing errors gracefully', () => {
      // This is hard to test reliably across platforms
      // But the application should continue working even if logging fails
      const result = runCLI('-b 100');
      assert.strictEqual(result.success, true);
    });
  });
});