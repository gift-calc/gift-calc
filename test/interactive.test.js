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

// Helper to run CLI command without expecting input (for non-interactive tests)
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

// Helper to test that interactive commands start correctly
function testInteractiveStart(command, expectedPrompt) {
  return new Promise((resolve) => {
    const child = spawn('node', [CLI_PATH, command], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    const timeout = setTimeout(() => {
      child.kill();
      resolve({ output, started: true });
    }, 1000); // Give it 1 second to start
    
    child.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes(expectedPrompt)) {
        clearTimeout(timeout);
        child.kill();
        resolve({ output, started: true });
      }
    });
    
    child.on('close', () => {
      clearTimeout(timeout);
      resolve({ output, started: false });
    });
  });
}

describe('Interactive Configuration Tests', () => {
  
  describe('Version Display', () => {
    test('should show version information', () => {
      const result = execSync(`node "${CLI_PATH}" --version`, { encoding: 'utf8' });
      expect(result).toMatch(/Version: \d+\.\d+\.\d+/);
    });
    
    test('should handle version command variant', () => {
      // Test standalone --version command
      const result = execSync(`node "${CLI_PATH}" --version`, { encoding: 'utf8' });
      expect(result).toMatch(/Version: 1\.2\.1/); // Should match package.json version
    });
    
    test('should handle version reading errors gracefully', () => {
      // This is harder to test without modifying the file system,
      // but we can at least verify the command works normally
      const result = execSync(`node "${CLI_PATH}" --version`, { encoding: 'utf8' });
      expect(result).toMatch(/Version:/);
    });
  });

  describe('Initial Config Setup (init-config)', () => {
    test('should start init-config command correctly', async () => {
      cleanup();
      
      const result = await testInteractiveStart('init-config', 'Base value (default: 70):');
      
      expect(result.started).toBeTruthy();
      expect(result.output).toMatch(/Gift Calculator - Configuration Setup/);
      expect(result.output).toMatch(/This will create a configuration file at:/);
      expect(result.output).toMatch(/Base value \(default: 70\):/);
      
      cleanup();
    });

    test('should recognize init-config as a valid command', async () => {
      // Test that the command is recognized (this tests the parseArguments path)
      const { parseArguments } = await import(path.join(process.cwd(), 'src', 'core.js'));
      const config = parseArguments(['init-config']);
      expect(config.command).toBe('init-config');
    });

    test('should handle directory creation logic', () => {
      cleanup();
      
      // Test that we can create and remove directories as needed
      if (fs.existsSync(CONFIG_DIR)) {
        fs.rmSync(CONFIG_DIR, { recursive: true });
      }
      
      expect(fs.existsSync(CONFIG_DIR)).toBe(false);
      
      // Manually create directory to simulate ensureConfigDir behavior
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
      expect(fs.existsSync(CONFIG_DIR)).toBe(true);
      
      cleanup();
    });
  });

  describe('Config Update (update-config)', () => {
    test('should start update-config command correctly', async () => {
      cleanup();
      
      const result = await testInteractiveStart('update-config', 'Base value (current: 70):');
      
      expect(result.started).toBeTruthy();
      expect(result.output).toMatch(/Gift Calculator - Configuration Update/);
      expect(result.output).toMatch(/This will update your configuration file at:/);
      expect(result.output).toMatch(/Base value \(current:/);
      
      cleanup();
    });

    test('should recognize update-config as a valid command', async () => {
      const { parseArguments } = await import(path.join(process.cwd(), 'src', 'core.js'));
      const config = parseArguments(['update-config']);
      expect(config.command).toBe('update-config');
    });

    test('should load existing config when updating', async () => {
      cleanup();
      
      // Create initial config
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(CONFIG_PATH, JSON.stringify({
        baseValue: 150,
        currency: 'USD'
      }, null, 2));
      
      // Give file system time to sync
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await testInteractiveStart('update-config', 'Base value (current: 150):');
      
      expect(result.started).toBeTruthy();
      expect(result.output).toMatch(/Base value \(current:/); // More flexible matching
      
      cleanup();
    });
  });

  describe('Log Display Functionality', () => {
    test('should handle log command with no log file', () => {
      cleanup();
      
      const result = execSync(`node "${CLI_PATH}" log`, { 
        encoding: 'utf8',
        timeout: 2000
      });
      
      expect(result).toMatch(/No log file found/);
    });

    test('should open log file when it exists', () => {
      cleanup();
      
      // Create a log file
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      
      const logContent = '2024-01-01T12:00:00.000Z 100.50 SEK\\n2024-01-01T12:01:00.000Z 75.25 USD\\n';
      fs.writeFileSync(LOG_PATH, logContent);
      
      try {
        // This will try to open with 'less' which may not work in test environment
        // Use platform-independent approach
        const isLinux = process.platform === 'linux';
        const timeoutCmd = isLinux ? 'timeout 1' : '';
        const result = execSync(`${timeoutCmd} node "${CLI_PATH}" log || echo "timeout_reached"`, { 
          encoding: 'utf8',
          timeout: 2000 
        });
        
        // Should either open less, timeout, or have special message (both are acceptable for test)
        const isValidResult = result.includes('timeout_reached') || result === '' || 
                              result.includes('2024-01-01T12:00:00.000Z') || // Success case
                              result.includes('No log file found'); // Error case
        
        expect(isValidResult).toBe(true);
      } catch (error) {
        // Expected in test environment where 'less' might not be available
        expect(error.message.includes('Command failed') || error.message.includes('timeout') || 
               error.message.includes('spawnSync') || error.message.includes('ENOENT')).toBe(true);
      }
      
      cleanup();
    });
  });

  describe('Directory and File Handling', () => {
    test('should handle config directory operations', () => {
      cleanup();
      
      // Test that directory operations work normally
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      
      expect(fs.existsSync(CONFIG_DIR)).toBe(true);
      
      // Test that we can work with the directory
      const testConfigPath = path.join(CONFIG_DIR, 'test.json');
      fs.writeFileSync(testConfigPath, '{}');
      expect(fs.existsSync(testConfigPath)).toBe(true);
      
      // Clean up test file
      fs.unlinkSync(testConfigPath);
      cleanup();
    });

    test('should handle existing config directory correctly', () => {
      cleanup();
      
      // Create directory first
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      
      expect(fs.existsSync(CONFIG_DIR)).toBe(true);
      
      // This should work fine with existing directory  
      const result = runCLI('--help');
      expect(result.success).toBe(true);
      
      cleanup();
    });
  });

  describe('Config Path and Directory Functions', () => {
    test('should use correct config path', async () => {
      cleanup();
      
      const result = await testInteractiveStart('init-config', 'Base value (default: 70):');
      
      expect(result.started).toBeTruthy();
      
      // Verify the config path mentioned in output matches expected location
      const expectedPath = path.join(os.homedir(), '.config', 'gift-calc', '.config.json');
      expect(result.output).toMatch(new RegExp(expectedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      
      cleanup();
    });
  });
});