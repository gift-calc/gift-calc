/**
 * @fileoverview Configuration management for gift-calc CLI
 *
 * Handles configuration loading with proper precedence hierarchy:
 * 1. CLI arguments (highest priority)
 * 2. Person-specific config file (~/.config/gift-calc/person-config.json)
 * 3. Global config file (~/.config/gift-calc/.config.json)
 * 4. Environment variables (GIFT_CALC_*)
 * 5. Built-in defaults (lowest priority)
 *
 * Key features:
 * - Automatic config directory creation
 * - Person-specific configuration overrides
 * - Environment variable integration
 * - Backwards compatibility for legacy config fields
 * - Graceful error handling for corrupted config files
 * - Configuration sanitization and validation
 *
 * The configuration system supports the modular architecture by providing
 * centralized configuration management that all domain modules can rely on.
 *
 * @module cli/config
 * @version 1.0.0
 * @requires node:fs
 * @requires node:path
 * @requires node:os
 * @see {@link module:core} Core configuration functions
 * @see {@link module:types} GiftConfig type definition
 * @example
 * // Load config with person-specific overrides
 * const config = loadConfig('John');
 * console.log(config.baseValue); // May be overridden for John
 *
 * // Get standard config paths
 * const configPath = getConfigPath();
 * const logPath = getLogPath();
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getPersonConfig, getPersonConfigPath } from '../core.js';
import { extractHooksConfig } from './hooks/index.js';

/**
 * Get configuration file path
 * @returns {string} Path to config file
 */
export function getConfigPath() {
  // Use process.env.HOME if available (important for tests), otherwise fall back to os.homedir()
  const homeDir = process.env.HOME || os.homedir();
  const configDir = path.join(homeDir, '.config', 'gift-calc');
  return path.join(configDir, '.config.json');
}

/**
 * Ensure configuration directory exists
 */
export function ensureConfigDir() {
  const configDir = path.dirname(getConfigPath());
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

/**
 * Get log file path
 * @returns {string} Path to log file
 */
export function getLogPath() {
  // Use process.env.HOME if available (important for tests), otherwise fall back to os.homedir()
  const homeDir = process.env.HOME || os.homedir();
  return path.join(homeDir, '.config', 'gift-calc', 'gift-calc.log');
}

/**
 * Load configuration with optional person-specific overrides
 * @param {string|null} personName - Person name for person-specific config
 * @returns {Object} Configuration object
 */
export function loadConfig(personName = null) {
  const config = {};

  // Load from file first
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      const fileConfig = JSON.parse(configData);

      // Sanitize fileConfig before assigning - filter out invalid types
      const sanitizedConfig = { ...fileConfig };
      if (sanitizedConfig.currency && typeof sanitizedConfig.currency !== 'string') {
        delete sanitizedConfig.currency; // Remove invalid currency type
      }

      Object.assign(config, sanitizedConfig);

      // Migration: if only 'currency' exists, migrate to 'baseCurrency'
      if (sanitizedConfig.currency && !sanitizedConfig.baseCurrency && typeof sanitizedConfig.currency === 'string') {
        config.baseCurrency = sanitizedConfig.currency;
      }

      // Load and validate hooks configuration
      if (sanitizedConfig.hooks) {
        try {
          // Use the new hooks system to extract and validate hooks config
          const hooksConfig = extractHooksConfig(sanitizedConfig);
          config.hooks = hooksConfig;
        } catch (error) {
          console.warn('Warning: Invalid hooks configuration in config file. Hooks disabled.');
        }
      }
    } catch (error) {
      console.error(`Warning: Could not parse config file at ${configPath}. Using defaults.`);
    }
  }

  // Load person-specific config if name provided
  if (personName) {
    try {
      const personConfigPath = getPersonConfigPath(path, os);
      const personConfig = getPersonConfig(personName, personConfigPath, fs);

      if (personConfig) {
        // Override with person-specific settings
        if (personConfig.baseValue !== undefined) {
          config.baseValue = personConfig.baseValue;
        }
        if (personConfig.niceScore !== undefined) {
          config.niceScore = personConfig.niceScore;
        }
        if (personConfig.friendScore !== undefined) {
          config.friendScore = personConfig.friendScore;
        }
        if (personConfig.currency !== undefined) {
          config.baseCurrency = personConfig.currency;
          config.currency = personConfig.currency; // backwards compatibility
        }
      }
    } catch (error) {
      // Ignore person config errors - file might not exist
    }
  }

  // Load environment variables
  if (process.env.GIFT_CALC_BASE_VALUE) {
    config.baseValue = parseFloat(process.env.GIFT_CALC_BASE_VALUE);
  }
  if (process.env.GIFT_CALC_VARIATION) {
    config.variation = parseFloat(process.env.GIFT_CALC_VARIATION);
  }
  if (process.env.GIFT_CALC_BASE_CURRENCY) {
    config.baseCurrency = process.env.GIFT_CALC_BASE_CURRENCY;
    config.currency = process.env.GIFT_CALC_BASE_CURRENCY; // backwards compatibility
  }
  if (process.env.GIFT_CALC_DISPLAY_CURRENCY) {
    config.displayCurrency = process.env.GIFT_CALC_DISPLAY_CURRENCY;
  }
  if (process.env.GIFT_CALC_DECIMALS) {
    config.decimals = parseInt(process.env.GIFT_CALC_DECIMALS);
  }

  return config;
}