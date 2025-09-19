#!/usr/bin/env node

/**
 * @fileoverview Unit tests for hooks infrastructure modules
 *
 * Tests all infrastructure modules in /src/cli/hooks/:
 * - config.js: Hook configuration validation and defaults
 * - loader.js: Script loading and validation
 * - executor.js: Safe execution with timeouts
 * - index.js: Main hooks interface
 *
 * These tests focus on unit-level functionality with mocked dependencies.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Import hook infrastructure modules
import {
  getDefaultHookConfig,
  validateHookConfig,
  mergeWithDefaults,
  areHooksEnabled,
  extractHooksConfig
} from '../src/cli/hooks/config.js';

import {
  loadHookScript,
  loadHookScripts,
  getHookScriptPaths,
  createHookWrapper
} from '../src/cli/hooks/loader.js';

import {
  executeHook,
  executeHooks,
  createHookContext,
  formatHookResults
} from '../src/cli/hooks/executor.js';

import {
  applyConfigHooks,
  executePostCommandHooks,
  areHooksConfigured,
  validateHooksConfiguration,
  initializeHooksSystem
} from '../src/cli/hooks/index.js';

describe('Hooks Infrastructure Unit Tests', () => {

  describe('Hook Configuration (config.js)', () => {

    test('getDefaultHookConfig returns valid default configuration', () => {
      const config = getDefaultHookConfig();

      expect(config).toEqual({
        enabled: false,
        preCommand: {
          enabled: false,
          scripts: [],
          timeoutMs: 5000
        },
        postCommand: {
          enabled: false,
          scripts: [],
          timeoutMs: 5000
        },
        failOnError: false,
        verbose: false
      });
    });

    test('getDefaultHookConfig returns deep copy', () => {
      const config1 = getDefaultHookConfig();
      const config2 = getDefaultHookConfig();

      config1.enabled = true;
      config1.preCommand.enabled = true;
      config1.preCommand.scripts.push('test.js');

      expect(config2.enabled).toBe(false);
      expect(config2.preCommand.enabled).toBe(false);
      expect(config2.preCommand.scripts).toEqual([]);
    });

    test('validateHookConfig validates valid configuration', () => {
      const validConfig = {
        enabled: true,
        preCommand: {
          enabled: true,
          scripts: ['hook1.js', 'hook2.js'],
          timeoutMs: 3000
        },
        postCommand: {
          enabled: false,
          scripts: [],
          timeoutMs: 5000
        },
        failOnError: true,
        verbose: true
      };

      const result = validateHookConfig(validConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.config).toEqual(validConfig);
    });

    test('validateHookConfig handles invalid configuration', () => {
      const invalidConfig = {
        enabled: 'true', // Should be boolean
        preCommand: {
          enabled: 1, // Should be boolean
          scripts: 'hook.js', // Should be array
          timeoutMs: -1 // Should be positive
        },
        failOnError: null, // Should be boolean
        verbose: 'yes' // Should be boolean
      };

      const result = validateHookConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('hooks.enabled must be a boolean');
      expect(result.errors).toContain('hooks.preCommand.enabled must be a boolean');
      expect(result.errors).toContain('hooks.preCommand.scripts must be an array');
      expect(result.errors).toContain('hooks.preCommand.timeoutMs must be a positive integer ≤ 60000ms');
      expect(result.errors).toContain('hooks.failOnError must be a boolean');
      expect(result.errors).toContain('hooks.verbose must be a boolean');
    });

    test('validateHookConfig handles null/undefined input', () => {
      const nullResult = validateHookConfig(null);
      const undefinedResult = validateHookConfig(undefined);

      expect(nullResult.isValid).toBe(false);
      expect(nullResult.errors).toContain('Hook configuration must be an object');

      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.errors).toContain('Hook configuration must be an object');
    });

    test('validateHookConfig handles empty scripts array', () => {
      const config = {
        enabled: true,
        preCommand: {
          enabled: true,
          scripts: ['', '  ', 'valid.js', null, undefined],
          timeoutMs: 5000
        }
      };

      const result = validateHookConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.config.preCommand.scripts).toEqual(['valid.js']);
      expect(result.errors.some(e => e.includes('must be a non-empty string'))).toBe(true);
    });

    test('validateHookConfig enforces timeout limits', () => {
      const configOverLimit = {
        preCommand: {
          timeoutMs: 70000 // Over 60 second limit
        }
      };
      const configUnderLimit = {
        preCommand: {
          timeoutMs: 0 // Zero timeout
        }
      };

      const overResult = validateHookConfig(configOverLimit);
      const underResult = validateHookConfig(configUnderLimit);

      expect(overResult.isValid).toBe(false);
      expect(underResult.isValid).toBe(false);
      expect(overResult.errors.some(e => e.includes('≤ 60000ms'))).toBe(true);
      expect(underResult.errors.some(e => e.includes('positive integer'))).toBe(true);
    });

    test('mergeWithDefaults applies defaults to partial config', () => {
      const partialConfig = {
        enabled: true,
        preCommand: {
          enabled: true,
          scripts: ['hook.js']
        }
      };

      const result = mergeWithDefaults(partialConfig);

      expect(result.enabled).toBe(true);
      expect(result.preCommand.enabled).toBe(true);
      expect(result.preCommand.scripts).toEqual(['hook.js']);
      expect(result.preCommand.timeoutMs).toBe(5000); // Default applied
      expect(result.postCommand).toEqual(getDefaultHookConfig().postCommand); // Default applied
      expect(result.failOnError).toBe(false); // Default applied
      expect(result.verbose).toBe(false); // Default applied
    });

    test('areHooksEnabled checks global and phase flags', () => {
      const config = getDefaultHookConfig();

      // Disabled globally
      expect(areHooksEnabled(config, 'preCommand')).toBe(false);
      expect(areHooksEnabled(config, 'postCommand')).toBe(false);

      // Enabled globally but phase disabled
      config.enabled = true;
      expect(areHooksEnabled(config, 'preCommand')).toBe(false);
      expect(areHooksEnabled(config, 'postCommand')).toBe(false);

      // Enabled globally and phase enabled but no scripts
      config.preCommand.enabled = true;
      expect(areHooksEnabled(config, 'preCommand')).toBe(false);

      // Enabled globally, phase enabled, and has scripts
      config.preCommand.scripts = ['hook.js'];
      expect(areHooksEnabled(config, 'preCommand')).toBe(true);
      expect(areHooksEnabled(config, 'postCommand')).toBe(false);
    });

    test('areHooksEnabled handles null/invalid configs', () => {
      expect(areHooksEnabled(null, 'preCommand')).toBe(false);
      expect(areHooksEnabled({}, 'preCommand')).toBe(false);
      expect(areHooksEnabled({ enabled: false }, 'preCommand')).toBe(false);
      expect(areHooksEnabled({ enabled: true }, 'invalidPhase')).toBe(false);
    });

    test('extractHooksConfig extracts from main config', () => {
      const mainConfig = {
        baseValue: 100,
        currency: 'USD',
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: ['hook.js']
          }
        }
      };

      const hooksConfig = extractHooksConfig(mainConfig);

      expect(hooksConfig.enabled).toBe(true);
      expect(hooksConfig.preCommand.enabled).toBe(true);
      expect(hooksConfig.preCommand.scripts).toEqual(['hook.js']);
    });

    test('extractHooksConfig handles missing hooks config', () => {
      const mainConfig = { baseValue: 100 };
      const hooksConfig = extractHooksConfig(mainConfig);

      expect(hooksConfig).toEqual(getDefaultHookConfig());
    });

    test('extractHooksConfig handles invalid main config', () => {
      const hooksConfig = extractHooksConfig(null);
      expect(hooksConfig).toEqual(getDefaultHookConfig());

      const hooksConfig2 = extractHooksConfig('invalid');
      expect(hooksConfig2).toEqual(getDefaultHookConfig());
    });
  });

  describe('Hook Script Loader (loader.js)', () => {

    let tempDir;
    let testHookPath;
    let consoleSpy;

    beforeEach(() => {
      // Create temporary directory for test scripts
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-tests-'));
      testHookPath = path.join(tempDir, 'test-hook.js');

      // Mock console methods
      consoleSpy = {
        log: vi.spyOn(console, 'log').mockImplementation(() => {}),
        error: vi.spyOn(console, 'error').mockImplementation(() => {})
      };
    });

    afterEach(() => {
      // Clean up temp directory
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      // Restore console methods
      consoleSpy.log.mockRestore();
      consoleSpy.error.mockRestore();
    });

    test('loadHookScript loads valid CommonJS hook', async () => {
      // Create a simple CommonJS hook
      const hookContent = `
        module.exports = function(args, config, command) {
          return { config: { modified: true } };
        };
      `;
      fs.writeFileSync(testHookPath, hookContent);

      const result = await loadHookScript(testHookPath, { verbose: true });

      expect(result.success).toBe(true);
      expect(typeof result.hookFunction).toBe('function');
      expect(result.moduleType).toBe('cjs');
      expect(result.error).toBe(null);
      expect(result.scriptPath).toBe(testHookPath);
    });

    test('loadHookScript loads valid ES module hook', async () => {
      // Create a simple ES module hook
      const hookPath = path.join(tempDir, 'test-hook.mjs');
      const hookContent = `
        export default function(args, config, command) {
          return { config: { modified: true } };
        }
      `;
      fs.writeFileSync(hookPath, hookContent);

      const result = await loadHookScript(hookPath, { verbose: true });

      expect(result.success).toBe(true);
      expect(typeof result.hookFunction).toBe('function');
      expect(result.moduleType).toBe('esm');
      expect(result.error).toBe(null);
    });

    test('loadHookScript handles missing file', async () => {
      const nonExistentPath = path.join(tempDir, 'missing.js');

      const result = await loadHookScript(nonExistentPath, { verbose: true });

      expect(result.success).toBe(false);
      expect(result.hookFunction).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toContain('does not exist');
    });

    test('loadHookScript validates script path security', async () => {
      // Test relative path (security issue)
      const result1 = await loadHookScript('./hook.js');
      expect(result1.success).toBe(false);
      expect(result1.error.message).toContain('absolute for security');

      // Test empty path
      const result2 = await loadHookScript('');
      expect(result2.success).toBe(false);
      expect(result2.error.message).toContain('cannot be empty');

      // Test non-string path
      const result3 = await loadHookScript(null);
      expect(result3.success).toBe(false);
      expect(result3.error.message).toContain('non-empty string');
    });

    test('loadHookScript validates file extension', async () => {
      const txtPath = path.join(tempDir, 'hook.txt');
      fs.writeFileSync(txtPath, 'content');

      const result = await loadHookScript(txtPath);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Unsupported script extension');
    });

    test('loadHookScript handles directory instead of file', async () => {
      const dirPath = path.join(tempDir, 'subdir');
      fs.mkdirSync(dirPath);

      const result = await loadHookScript(dirPath);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('not a file');
    });

    test('loadHookScript handles invalid JavaScript', async () => {
      const invalidContent = 'invalid JavaScript syntax {{{';
      fs.writeFileSync(testHookPath, invalidContent);

      const result = await loadHookScript(testHookPath);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });

    test('loadHookScript handles modules without hook function', async () => {
      const noFunctionContent = 'module.exports = { data: "no function" };';
      fs.writeFileSync(testHookPath, noFunctionContent);

      const result = await loadHookScript(testHookPath);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('No valid hook function found');
    });

    test('loadHookScript validates hook function signature', async () => {
      // Hook with wrong number of parameters
      const wrongSignatureContent = `
        module.exports = function(onlyOneParam) {
          return { config: {} };
        };
      `;
      fs.writeFileSync(testHookPath, wrongSignatureContent);

      const result = await loadHookScript(testHookPath, { validateSignature: true });

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('invalid signature');
    });

    test('loadHookScript can skip signature validation', async () => {
      // Hook with wrong number of parameters
      const wrongSignatureContent = `
        module.exports = function(onlyOneParam) {
          return { config: {} };
        };
      `;
      fs.writeFileSync(testHookPath, wrongSignatureContent);

      const result = await loadHookScript(testHookPath, { validateSignature: false });

      expect(result.success).toBe(true);
      expect(typeof result.hookFunction).toBe('function');
    });

    test('loadHookScripts loads multiple scripts in parallel', async () => {
      // Create multiple hook scripts
      const hook1Path = path.join(tempDir, 'hook1.js');
      const hook2Path = path.join(tempDir, 'hook2.js');
      const hook3Path = path.join(tempDir, 'missing.js'); // This one doesn't exist

      fs.writeFileSync(hook1Path, 'module.exports = function(a,b,c) { return {}; };');
      fs.writeFileSync(hook2Path, 'module.exports = function(a,b,c) { return {}; };');

      const result = await loadHookScripts([hook1Path, hook2Path, hook3Path], { verbose: true });

      expect(result.allSucceeded).toBe(false);
      expect(result.results.length).toBe(3);
      expect(result.hookFunctions.length).toBe(2); // Only 2 successful
      expect(result.errors.length).toBe(1); // 1 failed
      expect(result.successfulPaths).toEqual([hook1Path, hook2Path]);
    });

    test('loadHookScripts handles empty script array', async () => {
      const result = await loadHookScripts([], { verbose: true });

      expect(result.allSucceeded).toBe(true);
      expect(result.results).toEqual([]);
      expect(result.hookFunctions).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    test('getHookScriptPaths resolves relative and absolute paths', () => {
      const hookConfig = {
        preCommand: {
          scripts: [
            '/absolute/path/hook.js',
            'relative/hook.js',
            './another/hook.js'
          ]
        }
      };
      const configDir = '/base/config/dir';

      const paths = getHookScriptPaths(hookConfig, 'preCommand', configDir);

      expect(paths).toEqual([
        '/absolute/path/hook.js',
        '/base/config/dir/relative/hook.js',
        '/base/config/dir/another/hook.js'
      ]);
    });

    test('getHookScriptPaths filters invalid entries', () => {
      const hookConfig = {
        postCommand: {
          scripts: [
            'valid.js',
            '', // Empty string
            null, // Null value
            undefined, // Undefined value
            123, // Number
            'another-valid.js'
          ]
        }
      };

      const paths = getHookScriptPaths(hookConfig, 'postCommand', '/base');

      expect(paths).toEqual([
        '/base/valid.js',
        '/base/another-valid.js'
      ]);
    });

    test('getHookScriptPaths handles missing config', () => {
      expect(getHookScriptPaths(null, 'preCommand')).toEqual([]);
      expect(getHookScriptPaths({}, 'preCommand')).toEqual([]);
      expect(getHookScriptPaths({ preCommand: {} }, 'preCommand')).toEqual([]);
      expect(getHookScriptPaths({ preCommand: { scripts: null } }, 'preCommand')).toEqual([]);
    });

    test('createHookWrapper provides error isolation', async () => {
      const throwingHook = function(args, config, command) {
        throw new Error('Hook internal error');
      };

      const wrappedHook = createHookWrapper(throwingHook, 'test-hook');

      try {
        await wrappedHook(['arg1'], { config: true }, 'command');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).toContain('Hook test-hook failed');
        expect(error.message).toContain('Hook internal error');
        expect(error.hookName).toBe('test-hook');
        expect(error.originalError).toBeInstanceOf(Error);
      }
    });

    test('createHookWrapper validates argument count', async () => {
      const normalHook = function(args, config, command) {
        return { config: {} };
      };

      const wrappedHook = createHookWrapper(normalHook, 'test-hook');

      try {
        await wrappedHook(['arg1']); // Only 1 argument, needs at least 3
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).toContain('insufficient arguments');
      }
    });

    test('createHookWrapper passes through successful results', async () => {
      const successfulHook = function(args, config, command) {
        return { config: { modified: true } };
      };

      const wrappedHook = createHookWrapper(successfulHook, 'test-hook');
      const result = await wrappedHook(['arg1'], { original: true }, 'command');

      expect(result).toEqual({ config: { modified: true } });
    });
  });

  describe('Hook Executor (executor.js)', () => {

    let consoleSpy;

    beforeEach(() => {
      consoleSpy = {
        log: vi.spyOn(console, 'log').mockImplementation(() => {}),
        error: vi.spyOn(console, 'error').mockImplementation(() => {})
      };
    });

    afterEach(() => {
      consoleSpy.log.mockRestore();
      consoleSpy.error.mockRestore();
    });

    test('executeHook executes pre-command hook successfully', async () => {
      const hookFunction = vi.fn().mockResolvedValue({
        config: { baseValue: 200 }
      });

      const context = createHookContext(
        ['--base-value', '100'],
        { baseValue: 100 },
        'gift-calculation'
      );

      const result = await executeHook(hookFunction, context, {
        timeoutMs: 1000,
        verbose: true,
        hookName: 'test-hook'
      });

      expect(result.success).toBe(true);
      expect(result.config).toEqual({ baseValue: 200 });
      expect(result.error).toBe(null);
      expect(result.hookName).toBe('test-hook');
      expect(typeof result.executionTimeMs).toBe('number');

      expect(hookFunction).toHaveBeenCalledWith(
        ['--base-value', '100'],
        { baseValue: 100 },
        'gift-calculation'
      );
    });

    test('executeHook executes post-command hook successfully', async () => {
      const hookFunction = vi.fn().mockResolvedValue({});

      const context = createHookContext(
        ['--base-value', '100'],
        { baseValue: 100 },
        'gift-calculation',
        '150 SEK for John',
        { amount: 150, currency: 'SEK' }
      );

      const result = await executeHook(hookFunction, context, {
        timeoutMs: 1000,
        hookName: 'post-hook'
      });

      expect(result.success).toBe(true);
      expect(hookFunction).toHaveBeenCalledWith(
        ['--base-value', '100'],
        { baseValue: 100 },
        '150 SEK for John',
        { amount: 150, currency: 'SEK' },
        'gift-calculation'
      );
    });

    test('executeHook handles hook timeout', async () => {
      const slowHook = vi.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve({ config: {} }), 2000); // 2 second delay
        });
      });

      const context = createHookContext([], {}, null);

      const result = await executeHook(slowHook, context, {
        timeoutMs: 100, // 100ms timeout
        hookName: 'slow-hook'
      });

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('timed out after 100ms');
      expect(result.hookName).toBe('slow-hook');
    });

    test('executeHook handles hook errors', async () => {
      const errorHook = vi.fn().mockRejectedValue(new Error('Hook failed'));

      const context = createHookContext([], {}, null);

      const result = await executeHook(errorHook, context, {
        timeoutMs: 1000,
        verbose: true,
        hookName: 'error-hook'
      });

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('Hook failed');
      expect(result.config).toBe(null);
    });

    test('executeHook validates hook function type', async () => {
      const notAFunction = 'not a function';

      const context = createHookContext([], {}, null);

      const result = await executeHook(notAFunction, context, {
        timeoutMs: 1000,
        hookName: 'invalid-hook'
      });

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('not a function');
    });

    test('executeHook validates hook result', async () => {
      const invalidResultHook = vi.fn().mockResolvedValue('invalid result');

      const context = createHookContext([], {}, null);

      const result = await executeHook(invalidResultHook, context, {
        timeoutMs: 1000,
        hookName: 'invalid-result-hook'
      });

      expect(result.success).toBe(true); // Execution succeeded
      expect(result.error.message).toContain('invalid result type');
      expect(result.config).toBe(null);
    });

    test('executeHook handles Error object results', async () => {
      const errorResultHook = vi.fn().mockResolvedValue(new Error('Hook error result'));

      const context = createHookContext([], {}, null);

      const result = await executeHook(errorResultHook, context, {
        timeoutMs: 1000,
        hookName: 'error-result-hook'
      });

      expect(result.success).toBe(true); // Execution succeeded
      expect(result.error.message).toBe('Hook error result');
      expect(result.config).toBe(null);
    });

    test('executeHooks executes multiple hooks in sequence', async () => {
      const hook1 = vi.fn().mockResolvedValue({ config: { step1: true } });
      const hook2 = vi.fn().mockResolvedValue({ config: { step2: true } });
      const hook3 = vi.fn().mockResolvedValue({ config: { step3: true } });

      const context = createHookContext(
        ['--name', 'John'],
        { original: true },
        'command'
      );

      const result = await executeHooks([hook1, hook2, hook3], context, {
        timeoutMs: 1000,
        verbose: true,
        hookNames: ['hook1', 'hook2', 'hook3']
      });

      expect(result.allSucceeded).toBe(true);
      expect(result.results.length).toBe(3);
      expect(result.errors).toEqual([]);

      // Config should be accumulated across hooks
      expect(result.finalConfig).toEqual({
        original: true,
        step1: true,
        step2: true,
        step3: true
      });

      // Each hook should receive the config modified by previous hooks
      expect(hook1).toHaveBeenCalledWith(['--name', 'John'], { original: true }, 'command');
      expect(hook2).toHaveBeenCalledWith(['--name', 'John'], { original: true, step1: true }, 'command');
      expect(hook3).toHaveBeenCalledWith(['--name', 'John'], { original: true, step1: true, step2: true }, 'command');
    });

    test('executeHooks handles mixed success and failure', async () => {
      const successHook = vi.fn().mockResolvedValue({ config: { success: true } });
      const failHook = vi.fn().mockRejectedValue(new Error('Hook failed'));
      const anotherSuccessHook = vi.fn().mockResolvedValue({ config: { another: true } });

      const context = createHookContext([], { original: true }, null);

      const result = await executeHooks([successHook, failHook, anotherSuccessHook], context, {
        timeoutMs: 1000,
        failOnError: false,
        hookNames: ['success', 'fail', 'another-success']
      });

      expect(result.allSucceeded).toBe(false);
      expect(result.results.length).toBe(3);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toBe('Hook failed');

      // Config should accumulate from successful hooks only
      expect(result.finalConfig).toEqual({
        original: true,
        success: true,
        another: true
      });
    });

    test('executeHooks stops on first error when failOnError is true', async () => {
      const successHook = vi.fn().mockResolvedValue({ config: { success: true } });
      const failHook = vi.fn().mockRejectedValue(new Error('Hook failed'));
      const neverCalledHook = vi.fn().mockResolvedValue({ config: { never: true } });

      const context = createHookContext([], { original: true }, null);

      const result = await executeHooks([successHook, failHook, neverCalledHook], context, {
        timeoutMs: 1000,
        failOnError: true,
        verbose: true
      });

      expect(result.allSucceeded).toBe(false);
      expect(result.results.length).toBe(2); // Only first two hooks executed
      expect(successHook).toHaveBeenCalled();
      expect(failHook).toHaveBeenCalled();
      expect(neverCalledHook).not.toHaveBeenCalled();
    });

    test('executeHooks handles empty hook array', async () => {
      const context = createHookContext([], {}, null);

      const result = await executeHooks([], context, {
        timeoutMs: 1000,
        verbose: true
      });

      expect(result.allSucceeded).toBe(true);
      expect(result.results).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.finalConfig).toEqual({});
    });

    test('createHookContext creates proper context structure', () => {
      const context = createHookContext(
        ['--name', 'John', '--base-value', '100'],
        { baseValue: 100, currency: 'SEK' },
        'gift-calculation',
        '150 SEK for John',
        { amount: 150, currency: 'SEK' }
      );

      expect(context).toEqual({
        args: ['--name', 'John', '--base-value', '100'],
        config: { baseValue: 100, currency: 'SEK' },
        command: 'gift-calculation',
        output: '150 SEK for John',
        result: { amount: 150, currency: 'SEK' }
      });
    });

    test('createHookContext handles invalid inputs safely', () => {
      const context = createHookContext(null, 'invalid', undefined);

      expect(context).toEqual({
        args: [],
        config: {},
        command: null,
        output: undefined,
        result: undefined
      });
    });

    test('formatHookResults formats results without details', () => {
      const results = {
        allSucceeded: false,
        results: [
          { success: true, hookName: 'hook1', executionTimeMs: 10 },
          { success: false, hookName: 'hook2', executionTimeMs: 5, error: new Error('Failed') },
          { success: true, hookName: 'hook3', executionTimeMs: 8 }
        ],
        errors: [new Error('Failed')],
        totalExecutionTimeMs: 23
      };

      const formatted = formatHookResults(results, false);

      expect(formatted).toContain('2/3 succeeded');
      expect(formatted).toContain('(23ms total)');
      expect(formatted).toContain('Errors: 1');
      expect(formatted).not.toContain('✓'); // No individual details
    });

    test('formatHookResults formats results with details', () => {
      const results = {
        allSucceeded: false,
        results: [
          { success: true, hookName: 'hook1', executionTimeMs: 10 },
          { success: false, hookName: 'hook2', executionTimeMs: 5, error: new Error('Failed') }
        ],
        errors: [new Error('Failed')],
        totalExecutionTimeMs: 15
      };

      const formatted = formatHookResults(results, true);

      expect(formatted).toContain('1/2 succeeded');
      expect(formatted).toContain('✓ hook1 (10ms)');
      expect(formatted).toContain('✗ hook2 (5ms) - Failed');
      expect(formatted).toContain('1. Failed');
    });
  });

  describe('Main Hooks Interface (index.js)', () => {

    let tempDir;
    let consoleSpy;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-tests-'));
      consoleSpy = {
        log: vi.spyOn(console, 'log').mockImplementation(() => {}),
        error: vi.spyOn(console, 'error').mockImplementation(() => {}),
        warn: vi.spyOn(console, 'warn').mockImplementation(() => {})
      };

      // Mock process.exit
      vi.spyOn(process, 'exit').mockImplementation(() => {});
    });

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      consoleSpy.log.mockRestore();
      consoleSpy.error.mockRestore();
      consoleSpy.warn.mockRestore();
      vi.restoreAllMocks();
    });

    test('applyConfigHooks returns original config when hooks disabled', async () => {
      const config = {
        baseValue: 100,
        hooks: {
          enabled: false
        }
      };

      const result = await applyConfigHooks(['--name', 'John'], config, 'command');

      expect(result).toBe(config); // Same reference
    });

    test('applyConfigHooks executes hooks when enabled', async () => {
      // Create a test hook script
      const hookPath = path.join(tempDir, 'config-hook.js');
      const hookContent = `
        module.exports = function(args, config, command) {
          return { config: { baseValue: config.baseValue + 50 } };
        };
      `;
      fs.writeFileSync(hookPath, hookContent);

      const config = {
        baseValue: 100,
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: [hookPath],
            timeoutMs: 5000
          },
          verbose: true
        }
      };

      // Mock HOME environment for config directory resolution
      const originalHome = process.env.HOME;
      process.env.HOME = tempDir;

      try {
        const result = await applyConfigHooks(['--name', 'John'], config, 'command');

        expect(result.baseValue).toBe(150); // 100 + 50 from hook
        expect(result.hooks).toBeDefined(); // Original hooks config preserved
      } finally {
        process.env.HOME = originalHome;
      }
    });

    test('applyConfigHooks handles hook loading failures gracefully', async () => {
      const config = {
        baseValue: 100,
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: ['/nonexistent/hook.js'],
            timeoutMs: 5000
          },
          failOnError: false,
          verbose: true
        }
      };

      const result = await applyConfigHooks(['--name', 'John'], config, 'command');

      expect(result).toBe(config); // Should return original config
      expect(process.exit).not.toHaveBeenCalled();
    });

    test('applyConfigHooks exits on error when failOnError is true', async () => {
      const config = {
        baseValue: 100,
        hooks: {
          enabled: true,
          preCommand: {
            enabled: true,
            scripts: ['/nonexistent/hook.js'],
            timeoutMs: 5000
          },
          failOnError: true
        }
      };

      await applyConfigHooks(['--name', 'John'], config, 'command');

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('executePostCommandHooks executes post-command hooks', async () => {
      // Create a test post-command hook
      const hookPath = path.join(tempDir, 'post-hook.js');
      const hookContent = `
        module.exports = function(args, config, output, result, command) {
          // This would normally do logging, notifications, etc.
          return {};
        };
      `;
      fs.writeFileSync(hookPath, hookContent);

      const config = {
        baseValue: 100,
        hooks: {
          enabled: true,
          postCommand: {
            enabled: true,
            scripts: [hookPath],
            timeoutMs: 5000
          },
          verbose: true
        }
      };

      const originalHome = process.env.HOME;
      process.env.HOME = tempDir;

      try {
        // Should not throw
        await executePostCommandHooks(
          ['--name', 'John'],
          config,
          '150 SEK for John',
          { amount: 150, currency: 'SEK' },
          'gift-calculation'
        );

        expect(consoleSpy.log).toHaveBeenCalledWith('Executing post-command hooks...');
      } finally {
        process.env.HOME = originalHome;
      }
    });

    test('executePostCommandHooks returns early when hooks disabled', async () => {
      const config = {
        hooks: {
          enabled: false
        }
      };

      await executePostCommandHooks([], config, '', {}, null);

      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    test('areHooksConfigured checks if hooks are enabled and configured', () => {
      const disabledConfig = { hooks: { enabled: false } };
      const enabledButNoScriptsConfig = {
        hooks: {
          enabled: true,
          preCommand: { enabled: true, scripts: [] }
        }
      };
      const enabledWithScriptsConfig = {
        hooks: {
          enabled: true,
          preCommand: { enabled: true, scripts: ['hook.js'] }
        }
      };

      expect(areHooksConfigured(disabledConfig)).toBe(false);
      expect(areHooksConfigured(enabledButNoScriptsConfig)).toBe(false);
      expect(areHooksConfigured(enabledWithScriptsConfig)).toBe(true);
    });

    test('areHooksConfigured handles invalid configs', () => {
      expect(areHooksConfigured(null)).toBe(false);
      expect(areHooksConfigured({})).toBe(false);
      expect(areHooksConfigured('invalid')).toBe(false);
    });

    test('validateHooksConfiguration validates complete config', () => {
      const validConfig = {
        baseValue: 100,
        hooks: {
          enabled: true,
          preCommand: { enabled: true, scripts: ['hook.js'] }
        }
      };

      const result = validateHooksConfiguration(validConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.hooksConfig.enabled).toBe(true);
    });

    test('validateHooksConfiguration handles invalid hooks config', () => {
      const invalidConfig = {
        baseValue: 100,
        hooks: {
          enabled: 'invalid'
        }
      };

      const result = validateHooksConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.hooksConfig).toEqual(getDefaultHookConfig());
    });

    test('initializeHooksSystem returns default config', () => {
      const hooksConfig = initializeHooksSystem();

      expect(hooksConfig).toEqual(getDefaultHookConfig());
    });
  });
});