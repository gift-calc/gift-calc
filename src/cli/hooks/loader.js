/**
 * @fileoverview Hook script loading and validation system
 *
 * Handles loading hook scripts from file paths with comprehensive validation
 * and error handling. Supports both CommonJS and ES modules while ensuring
 * safe loading practices that won't crash the main CLI application.
 *
 * Key features:
 * - Dynamic loading of hook scripts from file paths
 * - Support for both .js and .mjs file extensions
 * - CommonJS and ES module compatibility
 * - Hook function validation and signature checking
 * - Graceful error handling for missing or invalid scripts
 * - Security considerations for script execution
 * - Module caching and cleanup
 *
 * The loader follows security best practices by validating hook functions
 * before execution and providing clear error messages for debugging.
 * It integrates with the existing gift-calc error handling patterns.
 *
 * @module cli/hooks/loader
 * @version 1.0.0
 * @requires node:fs
 * @requires node:path
 * @requires node:url
 * @see {@link module:cli/hooks/config} Hook configuration management
 * @see {@link module:cli/hooks/executor} Hook execution engine
 * @example
 * // Load a single hook script
 * const result = await loadHookScript('/path/to/hook.js');
 * if (result.success) {
 *   // Use result.hookFunction
 * }
 *
 * // Load multiple hook scripts
 * const results = await loadHookScripts(['/path/to/hook1.js', '/path/to/hook2.js']);
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Load a single hook script from file path
 *
 * Dynamically loads a hook script and validates that it exports a proper
 * hook function. Handles both CommonJS and ES module formats gracefully.
 *
 * Expected hook exports:
 * - Default export function: export default function(args, config, ...) {}
 * - Named export function: export function hookFunction(args, config, ...) {}
 * - CommonJS export: module.exports = function(args, config, ...) {}
 *
 * @param {string} scriptPath - Absolute path to hook script file
 * @param {Object} options - Loading options
 * @param {boolean} [options.verbose=false] - Whether to log verbose loading info
 * @param {boolean} [options.validateSignature=true] - Whether to validate function signature
 * @returns {Promise<Object>} Loading result with success status and hook function
 * @returns {boolean} returns.success - Whether loading succeeded
 * @returns {Function|null} returns.hookFunction - Loaded hook function
 * @returns {Error|null} returns.error - Error object if loading failed
 * @returns {string} returns.scriptPath - Path of the loaded script
 * @returns {string} returns.moduleType - Type of module loaded ('esm' or 'cjs')
 * @example
 * const result = await loadHookScript('/path/to/pre-command-hook.js', {
 *   verbose: true,
 *   validateSignature: true
 * });
 *
 * if (result.success) {
 *   console.log('Loaded hook:', result.scriptPath);
 *   await result.hookFunction(args, config, command);
 * }
 */
export async function loadHookScript(scriptPath, options = {}) {
  const { verbose = false, validateSignature = true } = options;

  if (verbose) {
    console.log(`Loading hook script: ${scriptPath}`);
  }

  try {
    // Validate script path
    const validationResult = validateScriptPath(scriptPath);
    if (!validationResult.isValid) {
      throw new Error(validationResult.error);
    }

    // Determine module type
    const moduleType = determineModuleType(scriptPath);

    // Load the module
    const module = await loadModule(scriptPath, moduleType);

    // Extract hook function from module
    const hookFunction = extractHookFunction(module, scriptPath);

    // Validate hook function if requested
    if (validateSignature && !isValidHookFunction(hookFunction)) {
      throw new Error(`Hook function has invalid signature: ${scriptPath}`);
    }

    if (verbose) {
      console.log(`Successfully loaded ${moduleType} hook: ${scriptPath}`);
    }

    return {
      success: true,
      hookFunction,
      error: null,
      scriptPath,
      moduleType
    };

  } catch (error) {
    if (verbose) {
      console.error(`Failed to load hook script ${scriptPath}:`, error.message);
    }

    return {
      success: false,
      hookFunction: null,
      error: error,
      scriptPath,
      moduleType: 'unknown'
    };
  }
}

/**
 * Load multiple hook scripts from an array of paths
 *
 * Loads multiple hook scripts in parallel and returns results for each.
 * Failed loads don't prevent successful loads from completing.
 *
 * @param {string[]} scriptPaths - Array of absolute paths to hook scripts
 * @param {Object} options - Loading options (see loadHookScript)
 * @returns {Promise<Object>} Combined loading results
 * @returns {boolean} returns.allSucceeded - Whether all scripts loaded successfully
 * @returns {Object[]} returns.results - Individual loading results
 * @returns {Function[]} returns.hookFunctions - Successfully loaded hook functions
 * @returns {Error[]} returns.errors - Array of loading errors
 * @returns {string[]} returns.successfulPaths - Paths that loaded successfully
 * @example
 * const results = await loadHookScripts([
 *   '/path/to/hook1.js',
 *   '/path/to/hook2.js',
 *   '/path/to/hook3.js'
 * ], { verbose: true });
 *
 * if (results.allSucceeded) {
 *   // All hooks loaded successfully
 * } else {
 *   console.log(`${results.hookFunctions.length} hooks loaded successfully`);
 * }
 */
export async function loadHookScripts(scriptPaths, options = {}) {
  const { verbose = false } = options;

  if (verbose && scriptPaths.length > 0) {
    console.log(`Loading ${scriptPaths.length} hook script(s)`);
  }

  // Load all scripts in parallel
  const loadPromises = scriptPaths.map(scriptPath =>
    loadHookScript(scriptPath, options)
  );

  const results = await Promise.all(loadPromises);

  // Collect successful results
  const successfulResults = results.filter(result => result.success);
  const hookFunctions = successfulResults.map(result => result.hookFunction);
  const successfulPaths = successfulResults.map(result => result.scriptPath);
  const errors = results.filter(result => !result.success).map(result => result.error);

  const allSucceeded = errors.length === 0;

  if (verbose) {
    console.log(`Hook loading completed: ${successfulResults.length}/${results.length} succeeded`);
  }

  return {
    allSucceeded,
    results,
    hookFunctions,
    errors,
    successfulPaths
  };
}

/**
 * Validate script path for security and accessibility
 *
 * Performs security checks on the script path to ensure it's safe
 * to load and that the file exists and is readable.
 *
 * @param {string} scriptPath - Path to validate
 * @returns {Object} Validation result
 * @returns {boolean} returns.isValid - Whether path is valid
 * @returns {string|null} returns.error - Error message if invalid
 * @private
 */
function validateScriptPath(scriptPath) {
  if (typeof scriptPath !== 'string') {
    return { isValid: false, error: 'Script path must be a non-empty string' };
  }

  const trimmedPath = scriptPath.trim();
  if (trimmedPath.length === 0) {
    return { isValid: false, error: 'Script path cannot be empty' };
  }

  // Check if path is absolute (for security)
  if (!path.isAbsolute(trimmedPath)) {
    return { isValid: false, error: 'Script path must be absolute for security' };
  }

  // Check if file exists
  if (!fs.existsSync(trimmedPath)) {
    return { isValid: false, error: `Script file does not exist: ${trimmedPath}` };
  }

  // Check if it's a file (not directory)
  const stats = fs.statSync(trimmedPath);
  if (!stats.isFile()) {
    return { isValid: false, error: `Script path is not a file: ${trimmedPath}` };
  }

  // Check file extension
  const ext = path.extname(trimmedPath).toLowerCase();
  if (!['.js', '.mjs', '.cjs'].includes(ext)) {
    return { isValid: false, error: `Unsupported script extension: ${ext}` };
  }

  return { isValid: true, error: null };
}

/**
 * Determine module type based on file extension and package.json
 *
 * Determines whether a script should be loaded as CommonJS or ES module
 * based on file extension and package.json type field.
 *
 * @param {string} scriptPath - Path to the script
 * @returns {string} Module type ('esm' or 'cjs')
 * @private
 */
function determineModuleType(scriptPath) {
  const ext = path.extname(scriptPath).toLowerCase();

  // Explicit module types
  if (ext === '.mjs') return 'esm';
  if (ext === '.cjs') return 'cjs';

  // For .js files, check package.json type field
  // Default to CommonJS for backward compatibility
  try {
    const packageJsonPath = findPackageJson(scriptPath);
    if (packageJsonPath) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (packageJson.type === 'module') {
        return 'esm';
      }
    }
  } catch (error) {
    // Ignore package.json errors, default to CommonJS
  }

  return 'cjs';
}

/**
 * Find package.json file for a script path
 *
 * Searches up the directory tree to find the nearest package.json file.
 *
 * @param {string} scriptPath - Starting path to search from
 * @returns {string|null} Path to package.json or null if not found
 * @private
 */
function findPackageJson(scriptPath) {
  let currentDir = path.dirname(scriptPath);
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      return packageJsonPath;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

/**
 * Load module using appropriate method based on type
 *
 * Dynamically imports ES modules or requires CommonJS modules
 * with proper error handling.
 *
 * @param {string} scriptPath - Path to the module
 * @param {string} moduleType - Type of module ('esm' or 'cjs')
 * @returns {Promise<*>} Loaded module
 * @private
 */
async function loadModule(scriptPath, moduleType) {
  if (moduleType === 'esm') {
    // Use dynamic import for ES modules
    const fileUrl = pathToFileURL(scriptPath).href;

    // Add cache busting for development (optional)
    const importPath = `${fileUrl}?timestamp=${Date.now()}`;

    return await import(importPath);
  } else {
    // Use require for CommonJS modules
    // Clear require cache to allow reloading during development
    delete require.cache[require.resolve(scriptPath)];

    return require(scriptPath);
  }
}

/**
 * Extract hook function from loaded module
 *
 * Attempts to find a valid hook function from various export patterns.
 * Supports default exports, named exports, and CommonJS exports.
 *
 * @param {*} module - Loaded module object
 * @param {string} scriptPath - Path for error messages
 * @returns {Function} Extracted hook function
 * @throws {Error} If no valid hook function found
 * @private
 */
function extractHookFunction(module, scriptPath) {
  // Try default export first (ES modules)
  if (typeof module.default === 'function') {
    return module.default;
  }

  // Try direct function export (CommonJS)
  if (typeof module === 'function') {
    return module;
  }

  // Try named exports
  const possibleNames = ['hookFunction', 'hook', 'default', 'main', 'execute'];
  for (const name of possibleNames) {
    if (typeof module[name] === 'function') {
      return module[name];
    }
  }

  // No valid function found
  throw new Error(`No valid hook function found in ${scriptPath}. Expected default export, function export, or named export (${possibleNames.join(', ')})`);
}

/**
 * Validate hook function signature
 *
 * Performs basic validation of hook function signature to ensure
 * it can be called with the expected arguments.
 *
 * @param {Function} hookFunction - Function to validate
 * @returns {boolean} Whether function has valid signature
 * @private
 */
function isValidHookFunction(hookFunction) {
  if (typeof hookFunction !== 'function') {
    return false;
  }

  // Check function arity (should accept 3-5 parameters)
  // Pre-command: (args, config, command) - 3 params
  // Post-command: (args, config, output, result, command) - 5 params
  const paramCount = hookFunction.length;
  return paramCount >= 3 && paramCount <= 5;
}

/**
 * Get hook script paths from configuration
 *
 * Extracts and validates hook script paths from configuration object,
 * converting relative paths to absolute paths based on config directory.
 *
 * @param {Object} hookConfig - Hook configuration object
 * @param {string} phase - Hook phase ('preCommand' or 'postCommand')
 * @param {string} [configDir] - Base directory for relative paths
 * @returns {string[]} Array of absolute script paths
 * @example
 * const paths = getHookScriptPaths(config, 'preCommand', '/home/user/.config/gift-calc');
 */
export function getHookScriptPaths(hookConfig, phase, configDir = process.cwd()) {
  if (!hookConfig || !hookConfig[phase] || !Array.isArray(hookConfig[phase].scripts)) {
    return [];
  }

  return hookConfig[phase].scripts
    .filter(scriptPath => scriptPath && typeof scriptPath === 'string')
    .map(scriptPath => {
      const trimmedPath = scriptPath.trim();
      if (path.isAbsolute(trimmedPath)) {
        return trimmedPath;
      } else {
        return path.resolve(configDir, trimmedPath);
      }
    });
}

/**
 * Create hook function wrapper for error isolation
 *
 * Wraps a hook function to provide additional error isolation and
 * context validation. The wrapper ensures hooks receive valid
 * context and handles any uncaught exceptions.
 *
 * @param {Function} hookFunction - Original hook function
 * @param {string} hookName - Name for error reporting
 * @returns {Function} Wrapped hook function
 * @example
 * const wrappedHook = createHookWrapper(originalHook, 'my-hook');
 * const result = await wrappedHook(args, config, command);
 */
export function createHookWrapper(hookFunction, hookName) {
  return async function wrappedHook(...args) {
    try {
      // Validate basic argument structure
      if (args.length < 3) {
        throw new Error(`Hook ${hookName} called with insufficient arguments: ${args.length}`);
      }

      // Call original function
      const result = await hookFunction(...args);

      return result;
    } catch (error) {
      // Re-throw with additional context
      const wrappedError = new Error(`Hook ${hookName} failed: ${error.message}`);
      wrappedError.originalError = error;
      wrappedError.hookName = hookName;
      throw wrappedError;
    }
  };
}