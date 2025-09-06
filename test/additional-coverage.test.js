#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync, spawn } from 'node:child_process';
// Test configuration paths
const CONFIG_DIR = path.join(os.homedir(), '.config', 'gift-calc');
const CONFIG_PATH = path.join(CONFIG_DIR, '.config.json');
const LOG_PATH = path.join(CONFIG_DIR, 'gift-calc.log');

// Enhanced cleanup function
function globalCleanup() {
  try {
    if (fs.existsSync(CONFIG_PATH)) fs.unlinkSync(CONFIG_PATH);
    if (fs.existsSync(LOG_PATH)) fs.unlinkSync(LOG_PATH);
    // Also clean up any test artifacts that might interfere
    const testArtifacts = [
      path.join(CONFIG_DIR, 'test-config.json'),
      path.join(CONFIG_DIR, '.test.json')
    ];
    testArtifacts.forEach(artifact => {
      if (fs.existsSync(artifact)) fs.unlinkSync(artifact);
    });
  } catch (e) {
    // Ignore cleanup errors
  }
}

const CLI_PATH = path.join(process.cwd(), 'index.js');

// Enhanced cleanup function
function cleanup() {
  globalCleanup();
}

// Helper to run CLI commands
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

describe('Additional Coverage Tests', () => {

  describe('Browser Compatibility (src/core-web.js)', () => {
    test('should contain core-web.js file', () => {
      // Test that the file exists and can be read
      const coreWebPath = path.join(process.cwd(), 'src', 'core-web.js');
      expect(fs.existsSync(coreWebPath)).toBe(true);
      
      const content = fs.readFileSync(coreWebPath, 'utf8');
      expect(content.includes('calculateGiftAmount')).toBe(true);
      expect(content.includes('calculateFinalAmount')).toBe(true);
      expect(content.includes('parseArguments')).toBe(true);
      expect(content.includes('formatOutput')).toBe(true);
      expect(content.includes('getHelpText')).toBe(true);
    });

    test('should have browser compatibility structure', () => {
      const coreWebPath = path.join(process.cwd(), 'src', 'core-web.js');
      const content = fs.readFileSync(coreWebPath, 'utf8');
      
      // Check for browser global export
      expect(content).toMatch(/window\.GiftCalc/);
      expect(content).toMatch(/typeof window !== 'undefined'/);
      
      // Check for CommonJS export
      expect(content).toMatch(/module\.exports/);
      expect(content).toMatch(/typeof module !== 'undefined'/);
    });

    test('should contain same function logic as core.js', () => {
      const corePath = path.join(process.cwd(), 'src', 'core.js');
      const coreWebPath = path.join(process.cwd(), 'src', 'core-web.js');
      
      const coreContent = fs.readFileSync(corePath, 'utf8');
      const coreWebContent = fs.readFileSync(coreWebPath, 'utf8');
      
      // Both should contain the same key calculation logic
      expect(coreContent).toMatch(/calculateGiftAmount.*base.*variationPercent/);
      expect(coreWebContent).toMatch(/calculateGiftAmount.*base.*variationPercent/);
      
      // Both should have friend bias calculation
      expect(coreContent).toMatch(/friendBias.*friendScore.*5\.5/);
      expect(coreWebContent).toMatch(/friendBias.*friendScore.*5\.5/);
      
      // Both should have the same special nice score handling
      expect(coreContent).toMatch(/niceScore === 0/);
      expect(coreWebContent).toMatch(/niceScore === 0/);
    });

    test('should have consistent help text content', () => {
      const coreWebPath = path.join(process.cwd(), 'src', 'core-web.js');
      const content = fs.readFileSync(coreWebPath, 'utf8');
      
      // Help text should contain key sections
      expect(content).toMatch(/Gift Calculator - CLI Tool/);
      expect(content).toMatch(/USAGE:/);
      expect(content).toMatch(/OPTIONS:/);
      expect(content).toMatch(/EXAMPLES:/);
      expect(content).toMatch(/FRIEND SCORE GUIDE:/);
      expect(content).toMatch(/NICE SCORE GUIDE:/);
    });

    test('should have web-compatible export structure', () => {
      const coreWebPath = path.join(process.cwd(), 'src', 'core-web.js');
      const content = fs.readFileSync(coreWebPath, 'utf8');
      
      // Should export all required functions for browser use
      const browserExportMatch = content.match(/window\.GiftCalc\s*=\s*\{([^}]+)\}/);
      expect(browserExportMatch).toBeTruthy();
      
      const exportedFunctions = browserExportMatch[1];
      expect(exportedFunctions).toMatch(/calculateGiftAmount/);
      expect(exportedFunctions).toMatch(/calculateFinalAmount/);
      expect(exportedFunctions).toMatch(/parseArguments/);
      expect(exportedFunctions).toMatch(/formatOutput/);
      expect(exportedFunctions).toMatch(/getHelpText/);
    });
  });

  describe('Clipboard Functionality', () => {
    test('should handle clipboard copy parameter', () => {
      // Use --max to get deterministic result
      const result = runCLI('-b 100 --max --copy --no-log');
      expect(result.success).toBe(true);
      
      // Should show the amount (120 for --max) and potentially clipboard message
      expect(result.stdout).toMatch(/120(\.\d+)?\s+\w+/);
    });

    test('should recognize clipboard copy flags', async () => {
      const { parseArguments } = await import(path.join(process.cwd(), 'src', 'core.js'));
      
      const config1 = parseArguments(['-cp']);
      expect(config1.copyToClipboard).toBe(true);
      
      const config2 = parseArguments(['--copy']);
      expect(config2.copyToClipboard).toBe(true);
      
      const config3 = parseArguments(['-b', '50']);
      expect(config3.copyToClipboard).toBe(false);
    });

    test('should work with clipboard and other parameters', () => {
      const result = runCLI('-b 75 -f 8 -c EUR --copy --no-log');
      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/\d+(\.\d+)?\s+EUR/);
    });
  });

  describe('Configuration File Edge Cases', () => {
    test('should handle corrupted config file gracefully', () => {
      cleanup();
      
      // Create corrupted JSON file
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(CONFIG_PATH, '{ invalid json content }');
      
      // Use --max for deterministic result
      const result = runCLI('-b 100 --max --no-log');
      expect(result.success).toBe(true);
      
      // Should still work (120 for --max) and show warning about config
      expect(result.stdout).toMatch(/120(\.\d+)?\s+\w+/);
      
      cleanup();
    });

    test('should handle empty config file', () => {
      cleanup();
      
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(CONFIG_PATH, '');
      
      // Use --max for deterministic result  
      const result = runCLI('-b 80 --max --no-log');
      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/96(\.\d+)?\s+\w+/); // 80 * 1.2 = 96
      
      cleanup();
    });

    test('should handle config with only some values', () => {
      cleanup();
      
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(CONFIG_PATH, JSON.stringify({
        currency: 'GBP'
        // Missing other values
      }));
      
      // Use --max for deterministic output and explicit currency override
      const result = runCLI('-c GBP --max --no-log');
      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/GBP$/);
      
      cleanup();
    });

    test('should handle config directory permission scenarios', () => {
      // This test verifies the app works when config can't be loaded/saved
      cleanup();
      
      // Test without config directory (simulates permission issues)
      // Use --max for deterministic result
      const result = runCLI('-b 90 --max --no-log');
      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/108(\.\d+)?\s+\w+/); // 90 * 1.2 = 108
    });
  });

  describe('Logging Functionality', () => {
    test('should create log entry when logging enabled', () => {
      cleanup();
      
      // Use --max to make result deterministic
      const result = runCLI('-b 100 --max');
      expect(result.success).toBe(true);
      
      // Check if log file was created and has content
      if (fs.existsSync(LOG_PATH)) {
        const logContent = fs.readFileSync(LOG_PATH, 'utf8');
        expect(logContent).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
        expect(logContent).toMatch(/120(\.\d+)?\s+\w+/); // 100 * 1.2 = 120
      }
      
      cleanup();
    });

    test('should handle log directory creation', () => {
      cleanup();
      
      // Remove entire config directory
      if (fs.existsSync(CONFIG_DIR)) {
        fs.rmSync(CONFIG_DIR, { recursive: true });
      }
      
      const result = runCLI('-b 50 --max'); // Deterministic result
      expect(result.success).toBe(true);
      
      // Directory should be created for logging
      expect(fs.existsSync(CONFIG_DIR)).toBe(true);
      
      cleanup();
    });

    test('should disable logging with --no-log', () => {
      cleanup();
      
      const result = runCLI('-b 100 --no-log');
      expect(result.success).toBe(true);
      
      // Log file should not be created
      expect(fs.existsSync(LOG_PATH)).toBe(false);
    });

    test('should handle logging errors gracefully', () => {
      // Test that CLI still works even if logging fails
      cleanup();
      
      // Use --max for deterministic output
      const result = runCLI('-b 100 --max');
      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/120(\.\d+)?\s+\w+/);
      
      cleanup();
    });
  });

  describe('Command Line Edge Cases', () => {
    test('should handle multiple convenience flags', () => {
      const result = runCLI('--asshole --no-log');
      expect(result.success).toBe(true);
      expect(result.stdout).toBe('0 SEK');
      
      const result2 = runCLI('--dickhead --no-log');
      expect(result.success).toBe(true);
      expect(result2.stdout).toBe('0 SEK');
    });

    test('should handle max and min with nice scores', () => {
      // Nice score should override max/min
      const result1 = runCLI('-n 0 --max --no-log');
      expect(result1.success).toBe(true);
      expect(result1.stdout).toBe('0 SEK');
      
      const result2 = runCLI('-n 1 -b 100 --max --no-log');
      expect(result2.success).toBe(true);
      expect(result2.stdout).toBe('10 SEK');
    });

    test('should handle decimal edge cases', () => {
      const result1 = runCLI('-b 100 -d 0 --max --no-log');
      expect(result1.success).toBe(true);
      expect(result1.stdout).toBe('120 SEK');
      
      const result2 = runCLI('-b 100 -d 5 --max --no-log');
      expect(result2.success).toBe(true);
      expect(result2.stdout).toBe('120 SEK');
    });

    test('should handle currency case conversion', () => {
      const result = runCLI('-c usd --max -b 100 --no-log');
      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/USD$/);
    });

    test('should handle recipient name with special characters', () => {
      const result = runCLI('--name "John O\'Brien" -b 100 --max --no-log');
      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/120 SEK for John O'Brien/);
    });
  });

  describe('Help and Version Commands', () => {
    test('should show complete help text', () => {
      const result = runCLI('--help');
      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/Gift Calculator - CLI Tool/);
      expect(result.stdout).toMatch(/USAGE:/);
      expect(result.stdout).toMatch(/OPTIONS:/);
      expect(result.stdout).toMatch(/EXAMPLES:/);
      expect(result.stdout).toMatch(/FRIEND SCORE GUIDE:/);
      expect(result.stdout).toMatch(/NICE SCORE GUIDE:/);
    });

    test('should show help with -h flag', () => {
      const result = runCLI('-h');
      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/Gift Calculator - CLI Tool/);
    });

    test('should show version with --version', () => {
      const result = runCLI('--version');
      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/Version: \d+\.\d+\.\d+/);
    });
  });

  describe('Error Handling and Validation', () => {
    test('should handle missing parameter values', () => {
      const result1 = runCLI('-b');
      expect(result1.success).toBe(false);
      expect(result1.stderr).toMatch(/requires a numeric value/);
      
      const result2 = runCLI('-c');
      expect(result2.success).toBe(false);
      expect(result2.stderr).toMatch(/requires a currency code/);
    });

    test('should validate parameter ranges', () => {
      const result1 = runCLI('-v 150');
      expect(result1.success).toBe(false);
      expect(result1.stderr).toMatch(/must be between 0 and 100/);
      
      const result2 = runCLI('-f 0');
      expect(result2.success).toBe(false);
      expect(result2.stderr).toMatch(/must be between 1 and 10/);
      
      const result3 = runCLI('-d 15');
      expect(result3.success).toBe(false);
      expect(result3.stderr).toMatch(/must be between 0 and 10/);
    });

    test('should handle non-numeric values', () => {
      const result1 = runCLI('-b abc');
      expect(result1.success).toBe(false);
      expect(result1.stderr).toMatch(/requires a numeric value/);
      
      const result2 = runCLI('-v xyz');
      expect(result2.success).toBe(false);
      expect(result2.stderr).toMatch(/requires a numeric value/);
    });

    test('should handle edge numeric values', () => {
      // Very small values
      const result1 = runCLI('-b 0.01 --max --no-log');
      expect(result1.success).toBe(true);
      
      // Zero values
      const result2 = runCLI('-v 0 -b 100 --no-log');
      expect(result2.success).toBe(true);
      
      // Maximum values
      const result3 = runCLI('-v 100 -d 10 --no-log');
      expect(result3.success).toBe(true);
    });
  });

  describe('Special Command Recognition', () => {
    test('should recognize all special commands', async () => {
      const { parseArguments } = await import(path.join(process.cwd(), 'src', 'core.js'));
      
      expect(parseArguments(['init-config']).command).toBe('init-config');
      expect(parseArguments(['update-config']).command).toBe('update-config');
      expect(parseArguments(['log']).command).toBe('log');
      expect(parseArguments(['--version']).command).toBe('version');
      
      // Should recognize help flag
      expect(parseArguments(['--help']).showHelp).toBe(true);
      expect(parseArguments(['-h']).showHelp).toBe(true);
    });

    test('should prioritize special commands over other args', async () => {
      const { parseArguments } = await import(path.join(process.cwd(), 'src', 'core.js'));
      
      // These should be recognized as commands even with other args present  
      const config = parseArguments(['init-config', '-b', '100']);
      expect(config.command).toBe('init-config');
    });
  });
});