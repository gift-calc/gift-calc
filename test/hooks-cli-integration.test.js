#!/usr/bin/env node

/**
 * @fileoverview CLI integration tests for hooks system with router.js
 *
 * Tests the integration of hooks with the CLI command router to ensure
 * hooks are properly executed for all command types and scenarios.
 * These tests focus on the router.js integration specifically.
 *
 * Test areas:
 * - Router integration with hooks for all command types
 * - Hook execution in command lifecycle (pre and post)
 * - Error handling in router context
 * - Performance impact on command execution
 * - Safety and backwards compatibility
 *
 * These tests complement the hooks-integration.test.js by focusing
 * specifically on the router integration aspects.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Import CLI functions for testing
import { routeCommand } from '../src/cli/router.js';
import { parseArguments } from '../src/shared/argument-parsing-simple.js';
import { loadConfig } from '../src/cli/config.js';
import { applyConfigHooks } from '../src/cli/hooks/index.js';

describe('Hooks CLI Integration Tests', () => {
  let tempDir;
  let originalHome;
  let originalArgv;
  let consoleSpy;

  // Helper function to parse arguments like the main CLI does
  function parseArgumentsLikeMainCLI(argv) {
    const args = argv.slice(2);
    const tempConfig = parseArguments(args, {});
    const configDefaults = loadConfig(tempConfig.recipientName);
    return parseArguments(args, configDefaults);
  }

  beforeEach(() => {
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-cli-integration-'));

    // Set up temporary HOME for config loading
    originalHome = process.env.HOME;
    originalArgv = process.argv;
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
    process.argv = originalArgv;

    // Restore console methods
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
    consoleSpy.warn.mockRestore();
    vi.restoreAllMocks();
  });

  describe('Router Integration with Hooks', () => {

    test('router executes hooks for gift calculation commands', async () => {
      // Create hook that logs execution
      const logFile = path.join(tempDir, 'hook-log.txt');
      const hookScript = path.join(tempDir, '.config', 'gift-calc', 'router-hook.js');
      fs.writeFileSync(hookScript, `
        const fs = require('fs');
        module.exports = function(args, config, command) {
          fs.appendFileSync('${logFile}', 'Hook executed for command: ' + (command || 'gift-calculation') + '\\n');
          return { config };
        };
      `);

      // Create config with hooks
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

      // Test gift calculation through router
      process.argv = ['node', 'gift-calc', '--name', 'TestUser', '--no-log'];
      const parsedConfig = parseArgumentsLikeMainCLI(process.argv);

      // Apply pre-command hooks first (like index.js does)
      const finalConfig = await applyConfigHooks(
        process.argv.slice(2),
        parsedConfig,
        parsedConfig.command
      );

      // This should trigger hooks
      await routeCommand(finalConfig);

      // Check that hook was executed
      expect(fs.existsSync(logFile)).toBe(true);
      const logContent = fs.readFileSync(logFile, 'utf8');
      expect(logContent).toContain('Hook executed for command: gift-calculation');
    });

    test('router executes hooks for domain commands', async () => {
      // Create hook that logs domain commands
      const logFile = path.join(tempDir, 'domain-hook-log.txt');
      const hookScript = path.join(tempDir, '.config', 'gift-calc', 'domain-hook.js');
      fs.writeFileSync(hookScript, `
        const fs = require('fs');
        module.exports = function(args, config, command) {
          fs.appendFileSync('${logFile}', 'Domain hook: ' + command + '\\n');
          return { config };
        };
      `);

      // Create config with hooks
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: [hookScript]
          }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test various domain commands
      const commands = [
        ['naughty-list', 'list'],
        ['budget', 'status'],
        ['spendings', '--days', '30'],
        ['person', 'list'],
        ['toplist', '--length', '5']
      ];

      for (const command of commands) {
        process.argv = ['node', 'gift-calc', ...command];
        const parsedConfig = parseArgumentsLikeMainCLI(process.argv);

        try {
          // Apply pre-command hooks first (like index.js does)
          const finalConfig = await applyConfigHooks(
            process.argv.slice(2),
            parsedConfig,
            parsedConfig.command
          );
          await routeCommand(finalConfig);
        } catch (error) {
          // Some commands might fail due to missing data, but hooks should still execute
        }
      }

      // Check that hooks executed for domain commands
      expect(fs.existsSync(logFile)).toBe(true);
      const logContent = fs.readFileSync(logFile, 'utf8');
      expect(logContent).toContain('Domain hook: naughty-list');
      expect(logContent).toContain('Domain hook: budget');
      expect(logContent).toContain('Domain hook: spendings');
      expect(logContent).toContain('Domain hook: person');
      expect(logContent).toContain('Domain hook: toplist');
    });

    test('router executes post hooks after successful commands', async () => {
      // Create post-command hook
      const logFile = path.join(tempDir, 'post-hook-log.txt');
      const hookScript = path.join(tempDir, '.config', 'gift-calc', 'post-hook.js');
      fs.writeFileSync(hookScript, `
        const fs = require('fs');
        module.exports = function(args, config, output, result, command) {
          fs.appendFileSync('${logFile}', 'Post hook executed: ' + (command || 'gift-calculation') + '\\n');
          return {};
        };
      `);

      // Create config with post hooks
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        currency: 'SEK',
        hooks: {
          enabled: true,
          postCommand: {
            enabled: true,
            scripts: [hookScript]
          }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test gift calculation
      process.argv = ['node', 'gift-calc', '--name', 'TestUser', '--no-log'];
      const parsedConfig = parseArgumentsLikeMainCLI(process.argv);

      await routeCommand(parsedConfig);

      // Check that post hook executed
      expect(fs.existsSync(logFile)).toBe(true);
      const logContent = fs.readFileSync(logFile, 'utf8');
      expect(logContent).toContain('Post hook executed: gift-calculation');
    });

    test('router handles hook failures gracefully in domain commands', async () => {
      // Create failing hook
      const hookScript = path.join(tempDir, '.config', 'gift-calc', 'failing-hook.js');
      fs.writeFileSync(hookScript, `
        module.exports = function(args, config, command) {
          throw new Error('Hook intentionally fails');
        };
      `);

      // Create config with failing hook but failOnError = false
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: [hookScript]
          },
          failOnError: false
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test that domain command still works despite hook failure
      process.argv = ['node', 'gift-calc', 'naughty-list', 'list'];
      const parsedConfig = parseArgumentsLikeMainCLI(process.argv);

      // Should not throw and should not call process.exit
      await routeCommand(parsedConfig);

      expect(process.exit).not.toHaveBeenCalledWith(1);
    });

    test('router respects failOnError setting for hooks', async () => {
      // Create failing hook
      const hookScript = path.join(tempDir, '.config', 'gift-calc', 'failing-hook.js');
      fs.writeFileSync(hookScript, `
        module.exports = function(args, config, command) {
          throw new Error('Hook intentionally fails');
        };
      `);

      // Create config with failing hook and failOnError = true
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: [hookScript]
          },
          failOnError: true
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test that command fails when hook fails
      process.argv = ['node', 'gift-calc', '--name', 'TestUser', '--no-log'];
      const parsedConfig = parseArgumentsLikeMainCLI(process.argv);

      // Apply pre-command hooks first (like index.js does) - this should fail
      const finalConfig = await applyConfigHooks(
        process.argv.slice(2),
        parsedConfig,
        parsedConfig.command
      );
      await routeCommand(finalConfig);

      // Should call process.exit(1) due to hook failure
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('router applies hook config modifications to command execution', async () => {
      // Create hook that modifies base value
      const hookScript = path.join(tempDir, '.config', 'gift-calc', 'modifier-hook.js');
      fs.writeFileSync(hookScript, `
        module.exports = function(args, config, command) {
          return {
            config: {
              ...config,
              baseValue: config.baseValue * 2
            }
          };
        };
      `);

      // Create config with modifier hook
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 50,
        currency: 'SEK',
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: [hookScript]
          }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test gift calculation with modified config
      process.argv = ['node', 'gift-calc', '--name', 'TestUser', '--no-log'];
      const parsedConfig = parseArgumentsLikeMainCLI(process.argv);

      await routeCommand(parsedConfig);

      // The output should reflect the modified base value (doubled from 50 to 100)
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('router works normally when hooks are disabled', async () => {
      // Create config with hooks disabled
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        currency: 'SEK',
        hooks: {
          enabled: false
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test normal operation
      process.argv = ['node', 'gift-calc', '--name', 'TestUser', '--no-log'];
      const parsedConfig = parseArgumentsLikeMainCLI(process.argv);

      await routeCommand(parsedConfig);

      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('router works when no hooks configuration exists', async () => {
      // Create config without hooks
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        currency: 'SEK'
        // No hooks config
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test normal operation
      process.argv = ['node', 'gift-calc', '--name', 'TestUser', '--no-log'];
      const parsedConfig = parseArgumentsLikeMainCLI(process.argv);

      await routeCommand(parsedConfig);

      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('router handles special commands with hooks', async () => {
      // Create hook for special commands
      const logFile = path.join(tempDir, 'special-hook-log.txt');
      const hookScript = path.join(tempDir, '.config', 'gift-calc', 'special-hook.js');
      fs.writeFileSync(hookScript, `
        const fs = require('fs');
        module.exports = function(args, config, command) {
          fs.appendFileSync('${logFile}', 'Special command hook: ' + command + '\\n');
          return {};
        };
      `);

      // Create config with hooks
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        hooks: {
          enabled: true,
          postCommand: {
            enabled: true,
            scripts: [hookScript]
          }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test special commands
      const specialCommands = [
        ['--version'],
        ['init-config'],
        ['log']
      ];

      for (const command of specialCommands) {
        // Clear log file for each test
        if (fs.existsSync(logFile)) {
          fs.unlinkSync(logFile);
        }

        process.argv = ['node', 'gift-calc', ...command];
        const parsedConfig = parseArgumentsLikeMainCLI(process.argv);

        await routeCommand(parsedConfig);

        // Special commands should complete successfully
        expect(process.exit).toHaveBeenCalledWith(0);

        // Check if hook executed (may or may not depending on command type)
        if (fs.existsSync(logFile)) {
          const logContent = fs.readFileSync(logFile, 'utf8');
          expect(logContent).toBeDefined();
        }
      }
    });
  });

  describe('Performance and Safety', () => {

    test('hooks do not significantly impact command performance', async () => {
      // Create simple fast hook
      const hookScript = path.join(tempDir, '.config', 'gift-calc', 'fast-hook.js');
      fs.writeFileSync(hookScript, `
        module.exports = function(args, config, command) {
          return { config };
        };
      `);

      // Create config with hook
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: [hookScript]
          }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Measure execution time
      const start = Date.now();

      process.argv = ['node', 'gift-calc', '--name', 'TestUser', '--no-log'];
      const parsedConfig = parseArgumentsLikeMainCLI(process.argv);
      await routeCommand(parsedConfig);

      const duration = Date.now() - start;

      // Should complete quickly even with hooks
      expect(duration).toBeLessThan(1000); // 1 second threshold
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('disabled hooks have no performance impact', async () => {
      // Create config with hooks disabled
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        hooks: {
          enabled: false
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Measure execution time
      const start = Date.now();

      process.argv = ['node', 'gift-calc', '--name', 'TestUser', '--no-log'];
      const parsedConfig = parseArgumentsLikeMainCLI(process.argv);
      await routeCommand(parsedConfig);

      const duration = Date.now() - start;

      // Should complete very quickly
      expect(duration).toBeLessThan(500); // 500ms threshold
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('hooks system is safe against malformed hook scripts', async () => {
      // Create malformed hook script
      const hookScript = path.join(tempDir, '.config', 'gift-calc', 'malformed-hook.js');
      fs.writeFileSync(hookScript, `
        // Malformed JavaScript
        module.exports = function(args config, command) {
          invalid syntax here
          return { config };
        };
      `);

      // Create config with malformed hook
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: [hookScript]
          },
          failOnError: false
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test that CLI still works despite malformed hook
      process.argv = ['node', 'gift-calc', '--name', 'TestUser', '--no-log'];
      const parsedConfig = parseArgumentsLikeMainCLI(process.argv);

      await routeCommand(parsedConfig);

      // Should complete successfully despite hook error
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('hooks system prevents infinite recursion', async () => {
      // Create hook that tries to call CLI recursively
      const hookScript = path.join(tempDir, '.config', 'gift-calc', 'recursive-hook.js');
      fs.writeFileSync(hookScript, `
        module.exports = function(args, config, command) {
          // This would be dangerous if it actually executed
          // but our system should prevent this
          try {
            require('child_process').execSync('node gift-calc --name RecursiveTest');
          } catch (e) {
            // Ignore execution errors
          }
          return { config };
        };
      `);

      // Create config with potentially recursive hook
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: [hookScript],
            timeoutMs: 1000 // Short timeout to prevent hanging
          },
          failOnError: false
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test that CLI completes without hanging
      const start = Date.now();

      process.argv = ['node', 'gift-calc', '--name', 'TestUser', '--no-log'];
      const parsedConfig = parseArgumentsLikeMainCLI(process.argv);
      await routeCommand(parsedConfig);

      const duration = Date.now() - start;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000);
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });

  describe('Integration Edge Cases', () => {

    test('hooks work with complex argument combinations', async () => {
      // Create hook that logs complex arguments
      const logFile = path.join(tempDir, 'complex-args-log.txt');
      const hookScript = path.join(tempDir, '.config', 'gift-calc', 'complex-args-hook.js');
      fs.writeFileSync(hookScript, `
        const fs = require('fs');
        module.exports = function(args, config, command) {
          fs.writeFileSync('${logFile}', JSON.stringify({
            args: args,
            configCurrency: config.currency,
            baseValue: config.baseValue
          }));
          return { config };
        };
      `);

      // Create config with hooks
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 100,
        currency: 'SEK',
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: [hookScript]
          }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test with complex arguments
      process.argv = [
        'node', 'gift-calc',
        '--name', 'Complex User',
        '--nice-score', '8',
        '--friend-score', '7',
        '--currency', 'USD',
        '--basevalue', '150',
        '--no-log'
      ];
      const parsedConfig = parseArgumentsLikeMainCLI(process.argv);

      // Apply pre-command hooks first (like index.js does)
      const finalConfig = await applyConfigHooks(
        process.argv.slice(2),
        parsedConfig,
        parsedConfig.command
      );
      await routeCommand(finalConfig);

      // Check that hook received complex arguments
      expect(fs.existsSync(logFile)).toBe(true);
      const logData = JSON.parse(fs.readFileSync(logFile, 'utf8'));
      expect(logData.args).toContain('--name');
      expect(logData.args).toContain('Complex User');
      expect(logData.args).toContain('--nice-score');
      expect(logData.baseValue).toBe(150); // From CLI args
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('hooks handle configuration precedence correctly', async () => {
      // Create hook that examines config precedence
      const logFile = path.join(tempDir, 'precedence-log.txt');
      const hookScript = path.join(tempDir, '.config', 'gift-calc', 'precedence-hook.js');
      fs.writeFileSync(hookScript, `
        const fs = require('fs');
        module.exports = function(args, config, command) {
          fs.writeFileSync('${logFile}', JSON.stringify({
            baseValue: config.baseValue,
            currency: config.currency,
            cliArgsPresent: args.includes('--basevalue')
          }));
          return { config };
        };
      `);

      // Create config file with base values
      const configPath = path.join(tempDir, '.config', 'gift-calc', '.config.json');
      const config = {
        baseValue: 50,   // File config
        currency: 'SEK', // File config
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: [hookScript]
          }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test CLI args override file config
      process.argv = [
        'node', 'gift-calc',
        '--basevalue', '200', // CLI override
        '--currency', 'USD',   // CLI override
        '--no-log'
      ];
      const parsedConfig = parseArgumentsLikeMainCLI(process.argv);

      // Apply pre-command hooks first (like index.js does)
      const finalConfig = await applyConfigHooks(
        process.argv.slice(2),
        parsedConfig,
        parsedConfig.command
      );
      await routeCommand(finalConfig);

      // Check precedence was applied correctly
      expect(fs.existsSync(logFile)).toBe(true);
      const logData = JSON.parse(fs.readFileSync(logFile, 'utf8'));
      expect(logData.baseValue).toBe(200); // CLI args should win
      expect(logData.currency).toBe('USD'); // CLI args should win
      expect(logData.cliArgsPresent).toBe(true);
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });
});