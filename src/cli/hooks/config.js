/**
 * @fileoverview Hook configuration management for gift-calc CLI hooks system
 *
 * Manages hook configuration structure, defaults, and validation for the
 * gift-calc CLI hooks system. Provides a centralized configuration interface
 * that ensures consistent hook behavior across different commands.
 *
 * Key features:
 * - Default hook configuration with sensible fallbacks
 * - Hook configuration validation and sanitization
 * - Support for both pre-command and post-command hooks
 * - Integration with existing gift-calc configuration system
 * - Graceful handling of missing or invalid hook configurations
 *
 * The configuration system follows the existing gift-calc patterns of
 * providing defaults, validating inputs, and gracefully handling errors
 * without crashing the CLI.
 *
 * @module cli/hooks/config
 * @version 1.0.0
 * @see {@link module:cli/config} Main CLI configuration
 * @see {@link module:types} Hook configuration types
 * @example
 * // Get default hook configuration
 * const config = getDefaultHookConfig();
 * console.log(config.enabled); // false by default
 *
 * // Validate hook configuration
 * const result = validateHookConfig(userConfig);
 * if (result.isValid) {
 *   // Use validated config
 * }
 */

/**
 * Default hook configuration structure
 *
 * Provides sensible defaults for the hooks system that prioritize safety
 * and simplicity. Hooks are disabled by default to ensure the CLI works
 * normally until explicitly configured by users.
 *
 * @type {Object}
 * @property {boolean} enabled - Whether hooks are enabled globally
 * @property {Object} preCommand - Pre-command hook configuration
 * @property {boolean} preCommand.enabled - Whether pre-command hooks are enabled
 * @property {string[]} preCommand.scripts - Array of script paths to execute
 * @property {number} preCommand.timeoutMs - Maximum execution time per hook
 * @property {Object} postCommand - Post-command hook configuration
 * @property {boolean} postCommand.enabled - Whether post-command hooks are enabled
 * @property {string[]} postCommand.scripts - Array of script paths to execute
 * @property {number} postCommand.timeoutMs - Maximum execution time per hook
 * @property {boolean} failOnError - Whether to fail command execution on hook errors
 * @property {boolean} verbose - Whether to display verbose hook execution info
 */
const DEFAULT_HOOK_CONFIG = {
  enabled: false,
  preCommand: {
    enabled: false,
    scripts: [],
    timeoutMs: 5000 // 5 second timeout for safety
  },
  postCommand: {
    enabled: false,
    scripts: [],
    timeoutMs: 5000 // 5 second timeout for safety
  },
  failOnError: false, // Don't break CLI on hook failures by default
  verbose: false
};

/**
 * Get default hook configuration
 *
 * Returns a deep copy of the default hook configuration to prevent
 * accidental mutations of the base configuration object.
 *
 * @returns {Object} Deep copy of default hook configuration
 * @example
 * const config = getDefaultHookConfig();
 * config.enabled = true; // Safe to modify
 */
export function getDefaultHookConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_HOOK_CONFIG));
}

/**
 * Validate hook configuration object
 *
 * Performs comprehensive validation of hook configuration to ensure
 * it meets the expected structure and contains valid values. Returns
 * both validation status and sanitized configuration.
 *
 * Validation checks:
 * - Required properties exist and have correct types
 * - Script paths are strings (but doesn't check file existence)
 * - Timeout values are positive numbers within reasonable bounds
 * - Boolean flags are actual booleans
 *
 * @param {Object} config - Hook configuration to validate
 * @returns {Object} Validation result with isValid flag and sanitized config
 * @returns {boolean} returns.isValid - Whether configuration is valid
 * @returns {Object} returns.config - Sanitized configuration object
 * @returns {string[]} returns.errors - Array of validation error messages
 * @example
 * const result = validateHookConfig(userConfig);
 * if (result.isValid) {
 *   // Use result.config
 * } else {
 *   console.error('Validation errors:', result.errors);
 * }
 */
export function validateHookConfig(config) {
  const errors = [];
  const sanitized = getDefaultHookConfig();

  if (!config || typeof config !== 'object') {
    return {
      isValid: false,
      config: sanitized,
      errors: ['Hook configuration must be an object']
    };
  }

  // Validate global enabled flag
  if (config.enabled !== undefined) {
    if (typeof config.enabled === 'boolean') {
      sanitized.enabled = config.enabled;
    } else {
      errors.push('hooks.enabled must be a boolean');
    }
  }

  // Validate failOnError flag
  if (config.failOnError !== undefined) {
    if (typeof config.failOnError === 'boolean') {
      sanitized.failOnError = config.failOnError;
    } else {
      errors.push('hooks.failOnError must be a boolean');
    }
  }

  // Validate verbose flag
  if (config.verbose !== undefined) {
    if (typeof config.verbose === 'boolean') {
      sanitized.verbose = config.verbose;
    } else {
      errors.push('hooks.verbose must be a boolean');
    }
  }

  // Validate pre-command hooks
  if (config.preCommand) {
    const preErrors = validateHookPhaseConfig(config.preCommand, 'preCommand');
    errors.push(...preErrors.errors);
    // Always apply sanitized config (includes valid entries filtered from invalid ones)
    sanitized.preCommand = preErrors.config;
  }

  // Validate post-command hooks
  if (config.postCommand) {
    const postErrors = validateHookPhaseConfig(config.postCommand, 'postCommand');
    errors.push(...postErrors.errors);
    // Always apply sanitized config (includes valid entries filtered from invalid ones)
    sanitized.postCommand = postErrors.config;
  }

  return {
    isValid: errors.length === 0,
    config: sanitized,
    errors
  };
}

/**
 * Validate hook phase configuration (preCommand or postCommand)
 *
 * Validates the configuration for a specific hook phase, ensuring
 * proper structure and valid values for enabled flag, script paths,
 * and timeout settings.
 *
 * @param {Object} phaseConfig - Hook phase configuration to validate
 * @param {string} phaseName - Name of the phase for error messages
 * @returns {Object} Validation result for the phase
 * @private
 */
function validateHookPhaseConfig(phaseConfig, phaseName) {
  const errors = [];
  const defaultPhase = DEFAULT_HOOK_CONFIG[phaseName];
  const sanitized = { ...defaultPhase };

  if (typeof phaseConfig !== 'object') {
    return {
      isValid: false,
      config: sanitized,
      errors: [`hooks.${phaseName} must be an object`]
    };
  }

  // Validate enabled flag
  if (phaseConfig.enabled !== undefined) {
    if (typeof phaseConfig.enabled === 'boolean') {
      sanitized.enabled = phaseConfig.enabled;
    } else {
      errors.push(`hooks.${phaseName}.enabled must be a boolean`);
    }
  }

  // Validate scripts array
  if (phaseConfig.scripts !== undefined) {
    if (Array.isArray(phaseConfig.scripts)) {
      const validScripts = [];
      for (let i = 0; i < phaseConfig.scripts.length; i++) {
        const script = phaseConfig.scripts[i];
        if (script !== null && script !== undefined && typeof script === 'string' && script.trim().length > 0) {
          validScripts.push(script.trim());
        } else {
          errors.push(`hooks.${phaseName}.scripts[${i}] must be a non-empty string`);
        }
      }
      sanitized.scripts = validScripts;
    } else {
      errors.push(`hooks.${phaseName}.scripts must be an array`);
    }
  }

  // Validate timeout
  if (phaseConfig.timeoutMs !== undefined) {
    const timeout = Number(phaseConfig.timeoutMs);
    if (Number.isInteger(timeout) && timeout > 0 && timeout <= 60000) {
      sanitized.timeoutMs = timeout;
    } else {
      errors.push(`hooks.${phaseName}.timeoutMs must be a positive integer ≤ 60000ms`);
    }
  }

  return {
    isValid: errors.length === 0,
    config: sanitized,
    errors
  };
}

/**
 * Merge hook configuration with defaults
 *
 * Takes a partial hook configuration and merges it with defaults,
 * ensuring all required properties are present with valid values.
 * This is useful for handling configurations loaded from files
 * that may be incomplete.
 *
 * @param {Object} partialConfig - Partial hook configuration
 * @returns {Object} Complete hook configuration with defaults applied
 * @example
 * const fullConfig = mergeWithDefaults({
 *   enabled: true,
 *   preCommand: { enabled: true }
 * });
 * // Returns complete config with defaults for missing properties
 */
export function mergeWithDefaults(partialConfig) {
  const validation = validateHookConfig(partialConfig);
  return validation.config; // Always returns a complete config with defaults
}

/**
 * Check if hooks are enabled for a specific phase
 *
 * Determines whether hooks should be executed for a given phase
 * based on the global enabled flag and phase-specific enabled flag.
 * Both must be true for hooks to execute.
 *
 * @param {Object} config - Complete hook configuration
 * @param {string} phase - Hook phase ('preCommand' or 'postCommand')
 * @returns {boolean} Whether hooks are enabled for the phase
 * @example
 * const enabled = areHooksEnabled(config, 'preCommand');
 * if (enabled) {
 *   // Execute pre-command hooks
 * }
 */
export function areHooksEnabled(config, phase) {
  if (!config || !config.enabled) {
    return false;
  }

  const phaseConfig = config[phase];
  if (!phaseConfig || !phaseConfig.enabled) {
    return false;
  }

  return phaseConfig.scripts && phaseConfig.scripts.length > 0;
}

/**
 * Extract hooks configuration from main gift-calc config
 *
 * Safely extracts hooks configuration from the main configuration
 * object, applying defaults and validation. Returns a complete
 * hooks configuration ready for use.
 *
 * @param {Object} mainConfig - Main gift-calc configuration object
 * @returns {Object} Validated hooks configuration
 * @example
 * const giftConfig = loadConfig();
 * const hookConfig = extractHooksConfig(giftConfig);
 */
export function extractHooksConfig(mainConfig) {
  if (!mainConfig || typeof mainConfig !== 'object') {
    return getDefaultHookConfig();
  }

  const hooksConfig = mainConfig.hooks;
  if (!hooksConfig) {
    return getDefaultHookConfig();
  }

  const validation = validateHookConfig(hooksConfig);
  if (!validation.isValid && validation.errors.length > 0) {
    // Log validation errors but continue with defaults
    console.warn('Hook configuration validation errors:', validation.errors.join(', '));
  }

  return validation.config;
}