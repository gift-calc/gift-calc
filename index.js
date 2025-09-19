#!/usr/bin/env node

/**
 * @fileoverview Main CLI entry point for gift-calc application
 *
 * Simplified 31-line entry point that handles:
 * - Command line argument parsing with person-specific configuration
 * - Configuration loading with proper precedence (CLI args → person config → global config → env vars → defaults)
 * - Command routing to appropriate domain handlers
 * - Error handling with proper exit codes
 *
 * This entry point supports the modular architecture by delegating all business logic
 * to domain-specific modules while maintaining a clean separation of concerns.
 *
 * @module index
 * @version 1.0.0
 * @requires node:process
 * @see {@link module:shared/argument-parsing-simple} Argument parsing
 * @see {@link module:cli/config} Configuration management
 * @see {@link module:cli/router} Command routing
 * @example
 * // Calculate gift for John with nice score 8
 * $ gift-calc --name John --nice-score 8
 *
 * // Add person to naughty list
 * $ gift-calc naughty-list add "Bad Person"
 *
 * // Show help
 * $ gift-calc --help
 *
 * @exitcode {0} Success - command completed successfully
 * @exitcode {1} Error - argument parsing failed or command execution error
 */

import { parseArguments } from './src/shared/argument-parsing-simple.js';
import { loadConfig } from './src/cli/config.js';
import { routeCommand } from './src/cli/router.js';
import { applyConfigHooks } from './src/cli/hooks/index.js';

// Get command line arguments
const args = process.argv.slice(2);

// First parse to detect person name for config loading
let tempConfig;
try {
  tempConfig = parseArguments(args, {});
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}

// Load config defaults with person-specific overrides if name is provided
const configDefaults = loadConfig(tempConfig.recipientName);

// Parse arguments again with proper defaults
let parsedConfig;
try {
  parsedConfig = parseArguments(args, configDefaults);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}

// Apply pre-command hooks and route command to appropriate handler
const finalConfig = await applyConfigHooks(args, parsedConfig, parsedConfig.command);
await routeCommand(finalConfig);