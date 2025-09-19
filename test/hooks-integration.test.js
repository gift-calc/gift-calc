#!/usr/bin/env node

/**
 * @fileoverview Integration tests for CLI hooks system
 *
 * Tests the complete hooks flow from CLI command execution through
 * hook loading, configuration, and execution. These tests focus on
 * end-to-end scenarios rather than individual component testing.
 *
 * Integration test areas:
 * - CLI command execution with hooks enabled
 * - Hook configuration loading from .config.json
 * - Pre-command and post-command hook execution
 * - Error handling and graceful degradation
 * - Backwards compatibility (CLI works without hooks)
 * - Hook script creation and execution
 * - Real file system operations with hooks
 *
 * These tests complement the unit tests in hooks-infrastructure.test.js
 * by testing the complete integration rather than isolated components.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Import the core functions to test integration
import { parseArguments } from '../src/core.js';
import { loadConfig } from '../src/cli/config.js';
import { routeCommand } from '../src/cli/router.js';
import { applyConfigHooks, executePostCommandHooks } from '../src/cli/hooks/index.js';

describe('Hooks Integration Tests', () => {
  let tempDir;
  let originalHome;
  let originalCwd;
  let consoleSpy;

  beforeEach(() => {
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-integration-'));

    // Set up temporary HOME for config loading
    originalHome = process.env.HOME;
    originalCwd = process.cwd();
    process.env.HOME = tempDir;

    // Create config directory structure
    const configDir = path.join(tempDir, '.config', 'gift-calc');
    fs.mkdirSync(configDir, { recursive: true });

    // Mock console methods
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {})
    };

    // Mock process.exit
    vi.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    // Restore environment
    process.env.HOME = originalHome;
    process.chdir(originalCwd);

    // Restore console methods
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
    consoleSpy.warn.mockRestore();
    vi.restoreAllMocks();
  });

  describe('Complete Hook Flow Integration', () => {

    test('should execute pre-command hooks during gift calculation', async () => {
      // Create a pre-command hook that modifies base value
      const hookScript = path.join(tempDir, '.config', 'gift-calc', 'pre-hook.js');
      const hookContent = `
        module.exports = function(args, config, command) {
          // Increase base value by 50
          return {
            config: {
              ...config,
              baseValue: config.baseValue + 50
            }
          };
        };
      `;
      fs.writeFileSync(hookScript, hookContent);

      // Create config with hooks enabled
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        currency: 'SEK',
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: [hookScript],
            timeoutMs: 5000
          },
          verbose: true
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test hook execution
      const loadedConfig = loadConfig();
      const modifiedConfig = await applyConfigHooks(['--name', 'TestUser'], loadedConfig, null);

      expect(modifiedConfig.baseValue).toBe(150); // 100 + 50 from hook
      expect(consoleSpy.log).toHaveBeenCalledWith('Applying pre-command hooks...');
    });

    test('should execute post-command hooks after command completion', async () => {
      // Create a post-command hook that logs execution
      const hookScript = path.join(tempDir, '.config', 'gift-calc', 'post-hook.js');
      const hookContent = `
        module.exports = function(args, config, output, result, command) {
          // This would normally log or send notifications
          console.log('Post-hook executed with output:', output);
          return {};
        };
      `;
      fs.writeFileSync(hookScript, hookContent);

      // Create config with post-command hooks enabled
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        currency: 'SEK',
        hooks: {
          enabled: true,
          postCommand: {
            enabled: true,
            scripts: [hookScript],
            timeoutMs: 5000
          },
          verbose: true
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Execute post-command hooks
      const loadedConfig = loadConfig();
      await executePostCommandHooks(
        ['--name', 'TestUser'],
        loadedConfig,
        '150 SEK for TestUser',
        { amount: 150, currency: 'SEK' },
        'gift-calculation'
      );

      expect(consoleSpy.log).toHaveBeenCalledWith('Executing post-command hooks...');
      expect(consoleSpy.log).toHaveBeenCalledWith('Post-hook executed with output:', '150 SEK for TestUser');
    });

    test('should handle hook loading failures gracefully', async () => {
      // Create config with non-existent hook script
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        currency: 'SEK',
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: ['/nonexistent/hook.js'],
            timeoutMs: 5000
          },
          failOnError: false, // Should not exit on error
          verbose: true
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test graceful handling of missing hook
      const loadedConfig = loadConfig();
      const result = await applyConfigHooks(['--name', 'TestUser'], loadedConfig, null);

      // Should return original config when hooks fail to load
      expect(result.baseValue).toBe(100);
      expect(process.exit).not.toHaveBeenCalled();
    });

    test('should exit on hook errors when failOnError is true', async () => {
      // Create config with non-existent hook and failOnError enabled
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        currency: 'SEK',
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: ['/nonexistent/hook.js'],
            timeoutMs: 5000
          },
          failOnError: true // Should exit on error
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test error handling with failOnError
      const loadedConfig = loadConfig();
      await applyConfigHooks(['--name', 'TestUser'], loadedConfig, null);

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('should work with relative hook script paths', async () => {
      // Create a hook script with relative path
      const hooksDir = path.join(tempDir, '.config', 'gift-calc', 'hooks');
      fs.mkdirSync(hooksDir, { recursive: true });

      const hookScript = path.join(hooksDir, 'relative-hook.js');
      const hookContent = `
        module.exports = function(args, config, command) {
          return { config: { ...config, modified: true } };
        };
      `;
      fs.writeFileSync(hookScript, hookContent);

      // Create config with relative path
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: ['hooks/relative-hook.js'], // Relative path
            timeoutMs: 5000
          }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test relative path resolution
      const loadedConfig = loadConfig();
      const result = await applyConfigHooks(['--test'], loadedConfig, null);

      expect(result.modified).toBe(true);
    });

    test('should handle multiple hooks in sequence', async () => {
      // Create multiple hook scripts
      const configDir = path.join(tempDir, '.config', 'gift-calc');

      const hook1 = path.join(configDir, 'hook1.js');
      fs.writeFileSync(hook1, `
        module.exports = function(args, config, command) {
          return { config: { ...config, step1: true } };
        };
      `);

      const hook2 = path.join(configDir, 'hook2.js');
      fs.writeFileSync(hook2, `
        module.exports = function(args, config, command) {
          return { config: { ...config, step2: config.step1 ? 'after-step1' : 'no-step1' } };
        };
      `);

      // Create config with multiple hooks
      const configPath = path.join(configDir, '.config.json');
      const config = {
        baseValue: 100,
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: [hook1, hook2],
            timeoutMs: 5000
          }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test sequential execution
      const loadedConfig = loadConfig();
      const result = await applyConfigHooks(['--test'], loadedConfig, null);

      expect(result.step1).toBe(true);
      expect(result.step2).toBe('after-step1'); // Confirms hooks run in sequence
    });
  });

  describe('Backwards Compatibility', () => {

    test('should work normally when no hooks are configured', async () => {
      // Create config without hooks
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        currency: 'SEK'
        // No hooks configuration
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test normal operation without hooks
      const loadedConfig = loadConfig();
      const result = await applyConfigHooks(['--name', 'TestUser'], loadedConfig, null);

      expect(result).toBe(loadedConfig); // Should return same reference
      expect(result.baseValue).toBe(100);
    });

    test('should work when hooks are disabled', async () => {
      // Create config with hooks disabled
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        currency: 'SEK',
        hooks: {
          enabled: false,
          preCommand: {
            enabled: false,
            scripts: []
          }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test disabled hooks
      const loadedConfig = loadConfig();
      const result = await applyConfigHooks(['--name', 'TestUser'], loadedConfig, null);

      expect(result).toBe(loadedConfig); // Should return same reference
      expect(result.baseValue).toBe(100);
    });

    test('should handle corrupted hooks configuration gracefully', async () => {
      // Create config with invalid hooks configuration
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        currency: 'SEK',
        hooks: 'invalid-hooks-config' // Invalid type
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test graceful handling of invalid config
      const loadedConfig = loadConfig();
      const result = await applyConfigHooks(['--name', 'TestUser'], loadedConfig, null);

      expect(result.baseValue).toBe(100);
      // Should show warning about invalid hooks config
      expect(consoleSpy.warn).toHaveBeenCalled();
      const warnCalls = consoleSpy.warn.mock.calls;
      const hasHookConfigWarning = warnCalls.some(call =>
        call.some(arg => typeof arg === 'string' &&
          (arg.includes('Hook configuration validation errors') ||
           arg.includes('Invalid hooks configuration')))
      );
      expect(hasHookConfigWarning).toBe(true);
    });
  });

  describe('Configuration Loading Integration', () => {

    test('should load hooks configuration from .config.json', async () => {
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        currency: 'SEK',
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: ['test-hook.js'],
            timeoutMs: 3000
          },
          postCommand: {
            enabled: false,
            scripts: [],
            timeoutMs: 5000
          },
          failOnError: false,
          verbose: true
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const loadedConfig = loadConfig();

      expect(loadedConfig.hooks.enabled).toBe(true);
      expect(loadedConfig.hooks.preCommand.enabled).toBe(true);
      expect(loadedConfig.hooks.preCommand.scripts).toEqual(['test-hook.js']);
      expect(loadedConfig.hooks.preCommand.timeoutMs).toBe(3000);
      expect(loadedConfig.hooks.verbose).toBe(true);
    });

    test('should merge hooks config with defaults for missing properties', async () => {
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: ['test-hook.js']
            // timeoutMs missing - should get default
          }
          // postCommand missing - should get default
          // failOnError missing - should get default
          // verbose missing - should get default
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const loadedConfig = loadConfig();

      expect(loadedConfig.hooks.enabled).toBe(true);
      expect(loadedConfig.hooks.preCommand.timeoutMs).toBe(5000); // Default
      expect(loadedConfig.hooks.postCommand.enabled).toBe(false); // Default
      expect(loadedConfig.hooks.failOnError).toBe(false); // Default
      expect(loadedConfig.hooks.verbose).toBe(false); // Default
    });
  });

  describe('Error Handling Integration', () => {

    test('should handle hook execution timeout', async () => {
      // Create a slow hook that times out
      const hookScript = path.join(tempDir, '.config', 'gift-calc', 'slow-hook.js');
      const hookContent = `
        module.exports = function(args, config, command) {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({ config });
            }, 2000); // 2 second delay
          });
        };
      `;
      fs.writeFileSync(hookScript, hookContent);

      // Create config with short timeout
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: [hookScript],
            timeoutMs: 100 // Very short timeout
          },
          failOnError: false
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test timeout handling
      const loadedConfig = loadConfig();
      const result = await applyConfigHooks(['--test'], loadedConfig, null);

      // Should return original config when hook times out
      expect(result.baseValue).toBe(100);
      expect(process.exit).not.toHaveBeenCalled();
    });

    test('should handle hooks with JavaScript errors', async () => {
      // Create a hook with syntax/runtime errors
      const hookScript = path.join(tempDir, '.config', 'gift-calc', 'error-hook.js');
      const hookContent = `
        module.exports = function(args, config, command) {
          // This will cause a runtime error
          return config.nonexistent.property;
        };
      `;
      fs.writeFileSync(hookScript, hookContent);

      // Create config
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: [hookScript],
            timeoutMs: 5000
          },
          failOnError: false
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test error handling
      const loadedConfig = loadConfig();
      const result = await applyConfigHooks(['--test'], loadedConfig, null);

      // Should return original config when hook errors
      expect(result.baseValue).toBe(100);
      expect(process.exit).not.toHaveBeenCalled();
    });

    test('should validate hook function signatures', async () => {
      // Create a hook with wrong signature
      const hookScript = path.join(tempDir, '.config', 'gift-calc', 'wrong-signature.js');
      const hookContent = `
        module.exports = function(onlyOneParam) {
          return { config: {} };
        };
      `;
      fs.writeFileSync(hookScript, hookContent);

      // Create config
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: [hookScript],
            timeoutMs: 5000
          },
          failOnError: false
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test signature validation
      const loadedConfig = loadConfig();
      const result = await applyConfigHooks(['--test'], loadedConfig, null);

      // Should return original config when hook has wrong signature
      expect(result.baseValue).toBe(100);
      expect(process.exit).not.toHaveBeenCalled();
    });
  });

  describe('Hook Context and Arguments', () => {

    test('should pass correct arguments to pre-command hooks', async () => {
      let capturedArgs;

      // Create a hook that captures its arguments
      const hookScript = path.join(tempDir, '.config', 'gift-calc', 'arg-capture.js');
      const hookContent = `
        const fs = require('fs');
        module.exports = function(args, config, command) {
          fs.writeFileSync('${path.join(tempDir, 'captured-args.json')}', JSON.stringify({
            args: args,
            config: config,
            command: command
          }));
          return { config };
        };
      `;
      fs.writeFileSync(hookScript, hookContent);

      // Create config
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: [hookScript],
            timeoutMs: 5000
          }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Execute hook
      const loadedConfig = loadConfig();
      await applyConfigHooks(['--name', 'TestUser', '--base-value', '150'], loadedConfig, 'test-command');

      // Verify captured arguments
      const capturedPath = path.join(tempDir, 'captured-args.json');
      expect(fs.existsSync(capturedPath)).toBe(true);

      const captured = JSON.parse(fs.readFileSync(capturedPath, 'utf8'));
      expect(captured.args).toEqual(['--name', 'TestUser', '--base-value', '150']);
      expect(captured.config.baseValue).toBe(100);
      expect(captured.command).toBe('test-command');
    });

    test('should pass correct arguments to post-command hooks', async () => {
      // Create a hook that captures its arguments
      const hookScript = path.join(tempDir, '.config', 'gift-calc', 'post-arg-capture.js');
      const hookContent = `
        const fs = require('fs');
        module.exports = function(args, config, output, result, command) {
          fs.writeFileSync('${path.join(tempDir, 'post-captured-args.json')}', JSON.stringify({
            args: args,
            config: config,
            output: output,
            result: result,
            command: command
          }));
          return {};
        };
      `;
      fs.writeFileSync(hookScript, hookContent);

      // Create config
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        hooks: {
          enabled: true,
          postCommand: {
            enabled: true,
            scripts: [hookScript],
            timeoutMs: 5000
          }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Execute post-command hook
      const loadedConfig = loadConfig();
      await executePostCommandHooks(
        ['--name', 'TestUser'],
        loadedConfig,
        '150 SEK for TestUser',
        { amount: 150, currency: 'SEK' },
        'gift-calculation'
      );

      // Verify captured arguments
      const capturedPath = path.join(tempDir, 'post-captured-args.json');
      expect(fs.existsSync(capturedPath)).toBe(true);

      const captured = JSON.parse(fs.readFileSync(capturedPath, 'utf8'));
      expect(captured.args).toEqual(['--name', 'TestUser']);
      expect(captured.config.baseValue).toBe(100);
      expect(captured.output).toBe('150 SEK for TestUser');
      expect(captured.result).toEqual({ amount: 150, currency: 'SEK' });
      expect(captured.command).toBe('gift-calculation');
    });
  });

  describe('Mixed Hook Configuration Tests', () => {

    test('should handle hooks with both valid and invalid scripts', async () => {
      // Create one valid hook
      const validHook = path.join(tempDir, '.config', 'gift-calc', 'valid-hook.js');
      fs.writeFileSync(validHook, `
        module.exports = function(args, config, command) {
          return { config: { ...config, validHookRan: true } };
        };
      `);

      // Create config with mix of valid and invalid hooks
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: [
              '/nonexistent/hook.js', // Invalid
              validHook,              // Valid
              '/another/missing.js'   // Invalid
            ],
            timeoutMs: 5000
          },
          failOnError: false,
          verbose: true
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test mixed scenario
      const loadedConfig = loadConfig();
      const result = await applyConfigHooks(['--test'], loadedConfig, null);

      // Valid hook should have executed
      expect(result.validHookRan).toBe(true);
      expect(result.baseValue).toBe(100);
      expect(process.exit).not.toHaveBeenCalled();
    });

    test('should handle empty and whitespace-only script paths', async () => {
      // Create config with empty/whitespace script paths
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: ['', '   ', '\t', null, undefined],
            timeoutMs: 5000
          },
          failOnError: false
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test handling of invalid script paths
      const loadedConfig = loadConfig();
      const result = await applyConfigHooks(['--test'], loadedConfig, null);

      // Should not crash and return original config
      expect(result.baseValue).toBe(100);
      expect(process.exit).not.toHaveBeenCalled();
    });

    test('should handle hooks configuration with missing required properties', async () => {
      // Create config with incomplete hooks configuration
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        hooks: {
          enabled: true
          // Missing preCommand and postCommand entirely
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test handling of incomplete config
      const loadedConfig = loadConfig();
      const result = await applyConfigHooks(['--test'], loadedConfig, null);

      // Should return original config and not crash
      expect(result).toBe(loadedConfig);
      expect(result.baseValue).toBe(100);
    });
  });
});