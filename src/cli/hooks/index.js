/**
 * @fileoverview Main hooks interface for gift-calc CLI hooks system
 *
 * Provides the primary interface for integrating hooks into the gift-calc CLI.
 * This module orchestrates hook configuration, loading, and execution while
 * maintaining the CLI's reliability and performance characteristics.
 *
 * Key features:
 * - Simple, clean API for CLI integration
 * - Configuration transformation approach (modify config objects)
 * - Graceful error handling that never crashes the CLI
 * - Support for both pre-command and post-command hooks
 * - Automatic hook discovery and loading
 * - Comprehensive logging and debugging support
 *
 * The hooks system follows gift-calc's principles:
 * - Keep it simple (KISS) - minimal, focused functionality
 * - Ensure safety - hooks should never crash the CLI
 * - Use async/await for future extensibility
 * - Follow existing code patterns
 *
 * @module cli/hooks
 * @version 1.0.0
 * @requires node:path
 * @requires node:os
 * @see {@link module:cli/hooks/config} Hook configuration management
 * @see {@link module:cli/hooks/loader} Hook script loading
 * @see {@link module:cli/hooks/executor} Hook execution engine
 * @example
 * // Apply pre-command hooks
 * const modifiedConfig = await applyConfigHooks(args, config, 'gift-calculation');
 *
 * // Execute post-command hooks
 * await executePostCommandHooks(args, config, output, result, 'gift-calculation');
 */

import path from 'node:path';
import os from 'node:os';
import {
  getDefaultHookConfig,
  extractHooksConfig,
  areHooksEnabled,
  validateHookConfig
} from './config.js';
import {
  loadHookScripts,
  getHookScriptPaths,
  createHookWrapper
} from './loader.js';
import {
  executeHooks,
  createHookContext,
  formatHookResults
} from './executor.js';

/**
 * Apply pre-command hooks to configuration
 *
 * Executes pre-command hooks that can modify the configuration before
 * the main command runs. This allows hooks to adjust parameters,
 * add new configuration values, or validate inputs.
 *
 * Pre-command hooks receive: (args, config, command)
 * Pre-command hooks return: { config?, error? }
 *
 * Configuration changes are applied cumulatively - each hook receives
 * the configuration as modified by previous hooks. If any hook fails
 * and failOnError is true, the process will exit with an error code.
 *
 * @param {string[]} args - Command line arguments
 * @param {Object} config - Current configuration object
 * @param {string|null} command - Command being executed
 * @returns {Promise<Object>} Modified configuration object
 * @throws {Error} Only if failOnError is true and a hook fails
 * @example
 * // Apply pre-command hooks before gift calculation
 * const originalConfig = { baseValue: 100, currency: 'SEK' };
 * const modifiedConfig = await applyConfigHooks(
 *   ['--base-value', '100'],
 *   originalConfig,
 *   'gift-calculation'
 * );
 * // modifiedConfig may have been modified by hooks
 */
export async function applyConfigHooks(args, config, command) {
  try {
    // Extract hooks configuration
    const hooksConfig = extractHooksConfig(config);

    // Check if pre-command hooks are enabled
    if (!areHooksEnabled(hooksConfig, 'preCommand')) {
      return config; // Return unmodified config
    }

    if (hooksConfig.verbose) {
      console.log('Applying pre-command hooks...');
    }

    // Get hook script paths
    const configDir = getConfigDirectory();
    const scriptPaths = getHookScriptPaths(hooksConfig, 'preCommand', configDir);

    if (scriptPaths.length === 0) {
      if (hooksConfig.verbose) {
        console.log('No pre-command hook scripts configured');
      }
      return config;
    }

    // Load hook scripts
    const loadResults = await loadHookScripts(scriptPaths, {
      verbose: hooksConfig.verbose,
      validateSignature: true
    });

    if (loadResults.errors.length > 0 && hooksConfig.failOnError) {
      const errorMessage = `Failed to load pre-command hooks: ${loadResults.errors.map(e => e.message).join(', ')}`;
      console.error(errorMessage);
      process.exit(1);
    }

    if (loadResults.hookFunctions.length === 0) {
      if (hooksConfig.verbose) {
        console.log('No pre-command hooks loaded successfully');
      }
      return config;
    }

    // Create execution context
    const context = createHookContext(args, config, command);

    // Wrap hook functions for better error isolation
    const wrappedHooks = loadResults.hookFunctions.map((hookFn, index) => {
      const hookName = loadResults.successfulPaths[index] || `hook-${index}`;
      return createHookWrapper(hookFn, path.basename(hookName));
    });

    // Execute hooks
    const execResults = await executeHooks(wrappedHooks, context, {
      timeoutMs: hooksConfig.preCommand.timeoutMs,
      verbose: hooksConfig.verbose,
      failOnError: hooksConfig.failOnError,
      hookNames: loadResults.successfulPaths.map(p => path.basename(p))
    });

    // Handle execution results
    if (execResults.errors.length > 0) {
      if (hooksConfig.verbose || hooksConfig.failOnError) {
        console.error('Pre-command hook errors:', execResults.errors.map(e => e.message).join(', '));
      }

      if (hooksConfig.failOnError) {
        process.exit(1);
      }
    }

    if (hooksConfig.verbose) {
      const summary = formatHookResults(execResults, true);
      console.log(summary);
    }

    // Return the final modified configuration
    return execResults.finalConfig || config;

  } catch (error) {
    console.error('Error in pre-command hooks system:', error.message);

    // Extract hooks config to check failOnError setting
    const hooksConfig = extractHooksConfig(config);
    if (hooksConfig.failOnError) {
      process.exit(1);
    }

    // Return original config if hooks system fails
    return config;
  }
}

/**
 * Execute post-command hooks after command completion
 *
 * Executes post-command hooks that can process command results,
 * perform logging, send notifications, or trigger follow-up actions.
 * These hooks run after the main command has completed successfully.
 *
 * Post-command hooks receive: (args, config, output, result, command)
 * Post-command hooks return: { error? }
 *
 * Post-command hooks cannot modify the command result but can perform
 * side effects like logging, notifications, or cleanup tasks.
 *
 * @param {string[]} args - Command line arguments
 * @param {Object} config - Configuration object used for command
 * @param {string|null} output - Command output (stdout/formatted result)
 * @param {*} result - Command result data
 * @param {string|null} command - Command that was executed
 * @returns {Promise<void>} Resolves when all hooks complete
 * @example
 * // Execute post-command hooks after gift calculation
 * await executePostCommandHooks(
 *   ['--base-value', '100'],
 *   config,
 *   '150 SEK for John',
 *   { amount: 150, currency: 'SEK', recipient: 'John' },
 *   'gift-calculation'
 * );
 */
export async function executePostCommandHooks(args, config, output, result, command) {
  try {
    // Extract hooks configuration
    const hooksConfig = extractHooksConfig(config);

    // Check if post-command hooks are enabled
    if (!areHooksEnabled(hooksConfig, 'postCommand')) {
      return; // Nothing to do
    }

    if (hooksConfig.verbose) {
      console.log('Executing post-command hooks...');
    }

    // Get hook script paths
    const configDir = getConfigDirectory();
    const scriptPaths = getHookScriptPaths(hooksConfig, 'postCommand', configDir);

    if (scriptPaths.length === 0) {
      if (hooksConfig.verbose) {
        console.log('No post-command hook scripts configured');
      }
      return;
    }

    // Load hook scripts
    const loadResults = await loadHookScripts(scriptPaths, {
      verbose: hooksConfig.verbose,
      validateSignature: true
    });

    if (loadResults.errors.length > 0 && hooksConfig.failOnError) {
      const errorMessage = `Failed to load post-command hooks: ${loadResults.errors.map(e => e.message).join(', ')}`;
      console.error(errorMessage);
      process.exit(1);
    }

    if (loadResults.hookFunctions.length === 0) {
      if (hooksConfig.verbose) {
        console.log('No post-command hooks loaded successfully');
      }
      return;
    }

    // Create execution context
    const context = createHookContext(args, config, command, output, result);

    // Wrap hook functions for better error isolation
    const wrappedHooks = loadResults.hookFunctions.map((hookFn, index) => {
      const hookName = loadResults.successfulPaths[index] || `hook-${index}`;
      return createHookWrapper(hookFn, path.basename(hookName));
    });

    // Execute hooks
    const execResults = await executeHooks(wrappedHooks, context, {
      timeoutMs: hooksConfig.postCommand.timeoutMs,
      verbose: hooksConfig.verbose,
      failOnError: hooksConfig.failOnError,
      hookNames: loadResults.successfulPaths.map(p => path.basename(p))
    });

    // Handle execution results
    if (execResults.errors.length > 0) {
      if (hooksConfig.verbose || hooksConfig.failOnError) {
        console.error('Post-command hook errors:', execResults.errors.map(e => e.message).join(', '));
      }

      if (hooksConfig.failOnError) {
        process.exit(1);
      }
    }

    if (hooksConfig.verbose) {
      const summary = formatHookResults(execResults, true);
      console.log(summary);
    }

  } catch (error) {
    console.error('Error in post-command hooks system:', error.message);

    // Extract hooks config to check failOnError setting
    const hooksConfig = extractHooksConfig(config);
    if (hooksConfig.failOnError) {
      process.exit(1);
    }

    // Continue execution - post-command hooks are non-critical
  }
}

/**
 * Check if hooks are configured and enabled
 *
 * Quick check to determine if the hooks system is enabled without
 * loading or validating hook scripts. Useful for performance
 * optimization when hooks are disabled.
 *
 * @param {Object} config - Configuration object to check
 * @returns {boolean} Whether hooks are enabled and configured
 * @example
 * if (areHooksConfigured(config)) {
 *   // Only run hook-related code if hooks are enabled
 *   await applyConfigHooks(args, config, command);
 * }
 */
export function areHooksConfigured(config) {
  try {
    const hooksConfig = extractHooksConfig(config);
    return hooksConfig.enabled && (
      areHooksEnabled(hooksConfig, 'preCommand') ||
      areHooksEnabled(hooksConfig, 'postCommand')
    );
  } catch (error) {
    return false;
  }
}

/**
 * Get configuration directory for resolving relative hook paths
 *
 * Returns the standard gift-calc configuration directory where
 * hook scripts are typically stored. This provides a consistent
 * base directory for relative hook script paths.
 *
 * @returns {string} Absolute path to configuration directory
 * @private
 */
function getConfigDirectory() {
  // Use process.env.HOME if available (important for tests), otherwise fall back to os.homedir()
  const homeDir = process.env.HOME || os.homedir();
  return path.join(homeDir, '.config', 'gift-calc');
}

/**
 * Initialize hooks system with default configuration
 *
 * Creates a default hooks configuration that can be used as a starting
 * point for users who want to enable the hooks system. This function
 * provides a convenient way to get a properly structured hooks config.
 *
 * @returns {Object} Default hooks configuration object
 * @example
 * const hooksConfig = initializeHooksSystem();
 * // Modify hooksConfig as needed
 * const fullConfig = { ...giftConfig, hooks: hooksConfig };
 */
export function initializeHooksSystem() {
  return getDefaultHookConfig();
}

/**
 * Validate hooks configuration in main config
 *
 * Validates the hooks portion of a gift-calc configuration object
 * and returns detailed validation results. Useful for configuration
 * tools and debugging.
 *
 * @param {Object} config - Main gift-calc configuration object
 * @returns {Object} Validation result with detailed error information
 * @returns {boolean} returns.isValid - Whether hooks config is valid
 * @returns {Object} returns.hooksConfig - Validated/sanitized hooks config
 * @returns {string[]} returns.errors - Array of validation errors
 * @example
 * const validation = validateHooksConfiguration(giftConfig);
 * if (!validation.isValid) {
 *   console.error('Hooks configuration errors:', validation.errors);
 * }
 */
export function validateHooksConfiguration(config) {
  try {
    if (!config || typeof config !== 'object') {
      return {
        isValid: false,
        hooksConfig: getDefaultHookConfig(),
        errors: ['Configuration must be an object']
      };
    }

    const hooksConfig = config.hooks;
    if (!hooksConfig) {
      return {
        isValid: true,
        hooksConfig: getDefaultHookConfig(),
        errors: []
      };
    }

    // Use validateHookConfig directly
    const validation = validateHookConfig(hooksConfig);

    return {
      isValid: validation.isValid,
      hooksConfig: validation.config,
      errors: validation.errors
    };
  } catch (error) {
    return {
      isValid: false,
      hooksConfig: getDefaultHookConfig(),
      errors: [error.message]
    };
  }
}

// Export configuration and utility functions for advanced usage
export {
  getDefaultHookConfig,
  extractHooksConfig,
  areHooksEnabled
} from './config.js';

export {
  loadHookScript,
  loadHookScripts,
  getHookScriptPaths
} from './loader.js';

export {
  executeHook,
  executeHooks,
  createHookContext,
  formatHookResults
} from './executor.js';