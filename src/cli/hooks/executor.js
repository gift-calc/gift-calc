/**
 * @fileoverview Hook execution engine with comprehensive error handling
 *
 * Provides safe execution of hook scripts with proper error handling,
 * timeout management, and result reporting. Ensures that hook failures
 * never crash the main CLI application and provides clear feedback
 * about execution status.
 *
 * Key features:
 * - Safe execution with timeout protection
 * - Comprehensive error handling and logging
 * - Support for both sync and async hook functions
 * - Context passing to hooks (args, config, output, result)
 * - Configurable failure behavior (fail fast vs continue)
 * - Detailed execution results for debugging
 *
 * The executor follows the gift-calc principle of graceful error handling
 * where hook failures should not prevent the main CLI functionality from
 * working. This ensures backward compatibility and reliability.
 *
 * @module cli/hooks/executor
 * @version 1.0.0
 * @requires node:util
 * @see {@link module:cli/hooks/config} Hook configuration management
 * @see {@link module:cli/hooks/loader} Hook script loading
 * @example
 * // Execute a single hook
 * const result = await executeHook(hookFunction, context, options);
 * if (result.success) {
 *   // Hook executed successfully
 * }
 *
 * // Execute multiple hooks
 * const results = await executeHooks(hookFunctions, context, options);
 */

import { promisify } from 'node:util';

/**
 * Execute a single hook function with comprehensive error handling
 *
 * Safely executes a hook function with timeout protection and proper
 * error handling. The hook receives a context object with command
 * arguments, configuration, output, and result data.
 *
 * Hook function signature:
 * - Pre-command: async function(args, config, command) -> { config?, error? }
 * - Post-command: async function(args, config, output, result, command) -> { error? }
 *
 * @param {Function} hookFunction - Hook function to execute
 * @param {Object} context - Execution context for the hook
 * @param {string[]} context.args - Command line arguments
 * @param {Object} context.config - Current configuration object
 * @param {string|null} context.output - Command output (post-command only)
 * @param {*} context.result - Command result (post-command only)
 * @param {string|null} context.command - Command name being executed
 * @param {Object} options - Execution options
 * @param {number} options.timeoutMs - Maximum execution time in milliseconds
 * @param {boolean} options.verbose - Whether to log verbose execution info
 * @param {string} options.hookName - Name/path of hook for logging
 * @returns {Promise<Object>} Execution result with success status and data
 * @returns {boolean} returns.success - Whether hook executed successfully
 * @returns {Object|null} returns.config - Modified config (pre-command only)
 * @returns {Error|null} returns.error - Error object if execution failed
 * @returns {number} returns.executionTimeMs - Time taken to execute
 * @returns {string} returns.hookName - Name of the executed hook
 * @example
 * const result = await executeHook(myHook, {
 *   args: ['--base-value', '100'],
 *   config: { baseValue: 100 },
 *   command: 'gift-calculation'
 * }, {
 *   timeoutMs: 5000,
 *   verbose: true,
 *   hookName: 'pre-calculation-hook'
 * });
 */
export async function executeHook(hookFunction, context, options) {
  const startTime = Date.now();
  const { timeoutMs = 5000, verbose = false, hookName = 'unknown' } = options;

  if (verbose) {
    console.log(`Executing hook: ${hookName}`);
  }

  try {
    // Validate hook function
    if (typeof hookFunction !== 'function') {
      throw new Error(`Hook is not a function: ${typeof hookFunction}`);
    }

    // Create execution promise
    const executionPromise = executeHookWithContext(hookFunction, context);

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Hook execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    // Race between execution and timeout
    const result = await Promise.race([executionPromise, timeoutPromise]);
    const executionTime = Date.now() - startTime;

    if (verbose) {
      console.log(`Hook ${hookName} completed in ${executionTime}ms`);
    }

    // Validate hook result structure
    const validatedResult = validateHookResult(result, hookName);

    return {
      success: true,
      config: validatedResult.config,
      error: validatedResult.error,
      executionTimeMs: executionTime,
      hookName
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;

    if (verbose) {
      console.error(`Hook ${hookName} failed after ${executionTime}ms:`, error.message);
    }

    return {
      success: false,
      config: null,
      error: error,
      executionTimeMs: executionTime,
      hookName
    };
  }
}

/**
 * Execute hook function with appropriate context
 *
 * Determines the hook type (pre-command or post-command) based on
 * context properties and calls the hook with the correct arguments.
 *
 * @param {Function} hookFunction - Hook function to execute
 * @param {Object} context - Execution context
 * @returns {Promise<*>} Result from hook function
 * @private
 */
async function executeHookWithContext(hookFunction, context) {
  const { args, config, output, result, command } = context;

  // Determine hook type based on context
  if (output !== undefined || result !== undefined) {
    // Post-command hook
    return await hookFunction(args, config, output, result, command);
  } else {
    // Pre-command hook
    return await hookFunction(args, config, command);
  }
}

/**
 * Validate hook execution result
 *
 * Ensures hook results conform to expected structure and provides
 * sensible defaults for missing or invalid properties.
 *
 * @param {*} result - Result from hook function
 * @param {string} hookName - Name of hook for error messages
 * @returns {Object} Validated result object
 * @private
 */
function validateHookResult(result, hookName) {
  // Handle undefined/null results
  if (result === undefined || result === null) {
    return { config: null, error: null };
  }

  // Handle primitive results (treat as error)
  if (typeof result !== 'object') {
    return {
      config: null,
      error: new Error(`Hook ${hookName} returned invalid result type: ${typeof result}`)
    };
  }

  // Handle Error objects
  if (result instanceof Error) {
    return { config: null, error: result };
  }

  // Handle object results
  const validated = {
    config: result.config || null,
    error: result.error || null
  };

  // Validate config is an object if provided
  if (validated.config && typeof validated.config !== 'object') {
    validated.error = new Error(`Hook ${hookName} returned invalid config type: ${typeof validated.config}`);
    validated.config = null;
  }

  return validated;
}

/**
 * Execute multiple hooks in sequence with proper error handling
 *
 * Executes an array of hook functions in order, with configurable
 * error handling behavior. Can either fail fast on first error or
 * continue executing remaining hooks.
 *
 * For pre-command hooks, configuration changes are applied cumulatively.
 * Each hook receives the modified configuration from previous hooks.
 *
 * @param {Function[]} hookFunctions - Array of hook functions to execute
 * @param {Object} context - Execution context (see executeHook)
 * @param {Object} options - Execution options
 * @param {number} options.timeoutMs - Maximum execution time per hook
 * @param {boolean} options.verbose - Whether to log verbose execution info
 * @param {boolean} options.failOnError - Whether to stop on first error
 * @param {string[]} options.hookNames - Names of hooks for logging
 * @returns {Promise<Object>} Combined execution results
 * @returns {boolean} returns.allSucceeded - Whether all hooks succeeded
 * @returns {Object[]} returns.results - Individual hook results
 * @returns {Object|null} returns.finalConfig - Final configuration (pre-command)
 * @returns {Error[]} returns.errors - Array of errors encountered
 * @returns {number} returns.totalExecutionTimeMs - Total execution time
 * @example
 * const results = await executeHooks(hooks, context, {
 *   timeoutMs: 5000,
 *   verbose: true,
 *   failOnError: false,
 *   hookNames: ['hook1', 'hook2', 'hook3']
 * });
 */
export async function executeHooks(hookFunctions, context, options) {
  const startTime = Date.now();
  const {
    timeoutMs = 5000,
    verbose = false,
    failOnError = false,
    hookNames = []
  } = options;

  const results = [];
  const errors = [];
  let currentConfig = context.config;
  let allSucceeded = true;

  if (verbose && hookFunctions.length > 0) {
    console.log(`Executing ${hookFunctions.length} hook(s)`);
  }

  for (let i = 0; i < hookFunctions.length; i++) {
    const hookFunction = hookFunctions[i];
    const hookName = hookNames[i] || `hook-${i}`;

    // Update context with current config for pre-command hooks
    const hookContext = {
      ...context,
      config: currentConfig
    };

    const result = await executeHook(hookFunction, hookContext, {
      timeoutMs,
      verbose,
      hookName
    });

    results.push(result);

    if (!result.success) {
      allSucceeded = false;
      errors.push(result.error);

      if (failOnError) {
        if (verbose) {
          console.error(`Stopping hook execution due to error in ${hookName}`);
        }
        break;
      }
    } else if (result.config) {
      // Apply config changes for pre-command hooks
      currentConfig = { ...currentConfig, ...result.config };
    }
  }

  const totalExecutionTime = Date.now() - startTime;

  if (verbose) {
    const successCount = results.filter(r => r.success).length;
    console.log(`Hook execution completed: ${successCount}/${results.length} succeeded in ${totalExecutionTime}ms`);
  }

  return {
    allSucceeded,
    results,
    finalConfig: currentConfig,
    errors,
    totalExecutionTimeMs: totalExecutionTime
  };
}

/**
 * Create execution context for hooks
 *
 * Creates a standardized context object that hooks receive during
 * execution. This ensures consistent data format across all hooks.
 *
 * @param {string[]} args - Command line arguments
 * @param {Object} config - Current configuration
 * @param {string|null} command - Command being executed
 * @param {string|null} [output] - Command output (post-command only)
 * @param {*} [result] - Command result (post-command only)
 * @returns {Object} Hook execution context
 * @example
 * const context = createHookContext(
 *   ['--base-value', '100'],
 *   { baseValue: 100 },
 *   'gift-calculation'
 * );
 */
export function createHookContext(args, config, command, output = undefined, result = undefined) {
  return {
    args: Array.isArray(args) ? [...args] : [],
    config: config && typeof config === 'object' ? { ...config } : {},
    command: command || null,
    output,
    result
  };
}

/**
 * Format hook execution results for display
 *
 * Creates a formatted summary of hook execution results suitable
 * for console output or logging. Includes timing information,
 * success rates, and error details.
 *
 * @param {Object} results - Results from executeHooks
 * @param {boolean} includeDetails - Whether to include individual hook details
 * @returns {string} Formatted results summary
 * @example
 * const summary = formatHookResults(results, true);
 * console.log(summary);
 */
export function formatHookResults(results, includeDetails = false) {
  const { allSucceeded, results: hookResults, errors, totalExecutionTimeMs } = results;

  const successCount = hookResults.filter(r => r.success).length;
  const totalCount = hookResults.length;

  let summary = `Hook execution: ${successCount}/${totalCount} succeeded`;
  summary += ` (${totalExecutionTimeMs}ms total)`;

  if (!allSucceeded) {
    summary += `\nErrors: ${errors.length}`;
    if (includeDetails) {
      errors.forEach((error, index) => {
        summary += `\n  ${index + 1}. ${error.message}`;
      });
    }
  }

  if (includeDetails && hookResults.length > 0) {
    summary += '\nIndividual results:';
    hookResults.forEach((result, index) => {
      const status = result.success ? '✓' : '✗';
      summary += `\n  ${status} ${result.hookName} (${result.executionTimeMs}ms)`;
      if (!result.success && result.error) {
        summary += ` - ${result.error.message}`;
      }
    });
  }

  return summary;
}