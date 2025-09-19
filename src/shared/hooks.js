/**
 * @fileoverview Hooks system for gift-calc CLI
 *
 * Provides a flexible hook system that allows configuration-driven extensions
 * to the CLI flow. Supports both pre-command and post-command hooks with
 * safe execution and error handling.
 *
 * Key features:
 * - Pre-command hooks: modify configuration before command execution
 * - Post-command hooks: execute actions after command completion
 * - Safe execution: hook failures don't crash the CLI
 * - Configuration-driven: hooks defined in config files
 * - Backwards compatibility: optional hooks system
 *
 * Hook types:
 * - config: Pre-command hooks that can modify the configuration
 * - post: Post-command hooks for logging, notifications, etc.
 *
 * @module shared/hooks
 * @version 1.0.0
 * @requires node:child_process
 * @see {@link module:cli/config} Configuration management
 * @example
 * // Apply config hooks before command execution
 * const modifiedConfig = await applyConfigHooks(args, config, command);
 *
 * // Apply post-command hooks after execution
 * await applyPostHooks(context, result);
 */

import { spawn } from 'node:child_process';

/**
 * Execute a hook command safely with timeout and error handling
 *
 * @param {string} command - Command to execute
 * @param {Object} context - Hook execution context
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 * @returns {Promise<{success: boolean, output?: string, error?: string}>}
 */
async function executeHook(command, context, timeout = 5000) {
  return new Promise((resolve) => {
    try {
      const child = spawn('sh', ['-c', command], {
        timeout,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          GIFT_CALC_HOOK_CONTEXT: JSON.stringify(context)
        }
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output: stdout.trim() });
        } else {
          resolve({ success: false, error: stderr.trim() || `Process exited with code ${code}` });
        }
      });

      child.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });

      // Send context as stdin
      if (child.stdin) {
        child.stdin.write(JSON.stringify(context));
        child.stdin.end();
      }

    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
}

/**
 * Apply configuration hooks before command execution
 *
 * Configuration hooks can modify the CLI configuration before the command
 * is executed. This allows for dynamic configuration adjustment based on
 * runtime conditions, environment, or user-specific rules.
 *
 * @param {string[]} args - Original command line arguments
 * @param {Object} config - Current configuration object
 * @param {string|null} command - Command to be executed
 * @returns {Promise<Object>} Modified configuration object
 * @example
 * // Apply config hooks with fallback to original config
 * const modifiedConfig = await applyConfigHooks(args, config, 'naughty-list');
 */
export async function applyConfigHooks(args, config, command) {
  // Return original config if no hooks are configured
  if (!config.hooks?.config || !Array.isArray(config.hooks.config)) {
    return config;
  }

  let modifiedConfig = { ...config };

  for (const hook of config.hooks.config) {
    if (typeof hook !== 'string') continue;

    try {
      const context = {
        args,
        config: modifiedConfig,
        command,
        type: 'config',
        timestamp: new Date().toISOString()
      };

      const result = await executeHook(hook, context);

      if (result.success && result.output) {
        try {
          // Try to parse hook output as JSON for config modifications
          const hookResult = JSON.parse(result.output);
          if (hookResult && typeof hookResult === 'object') {
            // Merge hook result into config, preserving existing values
            modifiedConfig = { ...modifiedConfig, ...hookResult };
          }
        } catch (parseError) {
          // Hook output isn't JSON, ignore silently
        }
      }

      if (!result.success) {
        // Log hook failure but don't break the CLI
        console.warn(`Warning: Config hook failed: ${result.error}`);
      }

    } catch (error) {
      console.warn(`Warning: Config hook execution failed: ${error.message}`);
    }
  }

  return modifiedConfig;
}

/**
 * Apply post-command hooks after command execution
 *
 * Post-command hooks are executed after the main command completes.
 * They're useful for logging, notifications, cleanup, or other side effects
 * that should happen after command execution.
 *
 * @param {Object} context - Hook execution context
 * @param {string[]} context.args - Original command line arguments
 * @param {Object} context.config - Configuration used for command
 * @param {string|null} context.command - Command that was executed
 * @param {Object} result - Command execution result
 * @param {boolean} result.success - Whether command succeeded
 * @param {string} result.output - Command output (if any)
 * @param {Error} result.error - Error object (if command failed)
 * @returns {Promise<void>}
 * @example
 * // Apply post hooks after gift calculation
 * await applyPostHooks({
 *   args: ['--name', 'John'],
 *   config: parsedConfig,
 *   command: null
 * }, {
 *   success: true,
 *   output: 'Gift calculated: $50.00'
 * });
 */
export async function applyPostHooks(context, result) {
  // Return early if no hooks are configured
  if (!context.config?.hooks?.post || !Array.isArray(context.config.hooks.post)) {
    return;
  }

  const hookContext = {
    ...context,
    result,
    type: 'post',
    timestamp: new Date().toISOString()
  };

  for (const hook of context.config.hooks.post) {
    if (typeof hook !== 'string') continue;

    try {
      const hookResult = await executeHook(hook, hookContext);

      if (!hookResult.success) {
        // Log hook failure but don't break the CLI
        console.warn(`Warning: Post hook failed: ${hookResult.error}`);
      }

    } catch (error) {
      console.warn(`Warning: Post hook execution failed: ${error.message}`);
    }
  }
}

/**
 * Validate hooks configuration
 *
 * @param {Object} hooks - Hooks configuration object
 * @returns {boolean} True if configuration is valid
 */
export function validateHooksConfig(hooks) {
  if (!hooks || typeof hooks !== 'object') {
    return false;
  }

  // Check config hooks
  if (hooks.config && !Array.isArray(hooks.config)) {
    return false;
  }

  if (hooks.config) {
    for (const hook of hooks.config) {
      if (typeof hook !== 'string') {
        return false;
      }
    }
  }

  // Check post hooks
  if (hooks.post && !Array.isArray(hooks.post)) {
    return false;
  }

  if (hooks.post) {
    for (const hook of hooks.post) {
      if (typeof hook !== 'string') {
        return false;
      }
    }
  }

  return true;
}