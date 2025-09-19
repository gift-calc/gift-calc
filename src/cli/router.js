/**
 * @fileoverview CLI command router with improved error handling and DRY principles
 *
 * Centralized command routing system that delegates execution to appropriate
 * domain-specific handlers. This router supports the modular architecture by
 * providing clean separation between command parsing and business logic.
 *
 * Key features:
 * - Domain command abstraction with unified error handling
 * - Special command routing (init-config, log, version, help)
 * - Default gift calculation fallback
 * - Proper process exit code management
 * - Lazy loading of help text to avoid circular dependencies
 * - Consistent error message formatting
 *
 * The router follows DRY principles by abstracting common domain command
 * handling patterns while maintaining flexibility for special cases.
 *
 * @module cli/router
 * @version 1.0.0
 * @requires node:process
 * @see {@link module:cli/commands} Command handlers
 * @see {@link module:domains} Domain-specific business logic
 * @see {@link module:types} CLIRouterConfig and CLIResult types
 * @example
 * // Route a parsed configuration to appropriate handler
 * await routeCommand(parsedConfig);
 *
 * @exitcode {0} Success - command completed successfully
 * @exitcode {1} Error - command execution failed or validation error
 */

import { handleNaughtyListCommand } from './commands/naughty-list.js';
import { parseNaughtyListArguments } from '../domains/naughty-list/index.js';
import { handleBudgetCommand } from './commands/budget.js';
import { handleSpendingsCommand } from './commands/spendings.js';
import { handlePersonCommand } from './commands/person.js';
import { handleToplistCommand } from './commands/toplist.js';
import {
  parseBudgetArguments,
  parseSpendingsArguments,
  parsePersonArguments,
  parseToplistArguments
} from '../core.js';
import { handleGiftCalculation } from './commands/gift-calculation.js';
import { showVersion } from './utils/version.js';
import { displayLog } from './utils/log.js';
import { initConfig, updateConfig } from './utils/config-interactive.js';
import { executePostCommandHooks } from './hooks/index.js';

/**
 * Get domain-specific arguments by removing the command prefix
 *
 * Extracts arguments specific to a domain command by removing the command
 * name from the process.argv array. This allows domain parsers to receive
 * clean argument arrays without the command prefix.
 *
 * @param {string} commandName - The command name to remove from args
 * @returns {string[]} Domain-specific arguments without command prefix
 * @example
 * // For command: git-calc naughty-list add "BadPerson"
 * // Returns: ["add", "BadPerson"]
 * const args = getDomainArgs('naughty-list');
 *
 * @since 1.0.0
 */
function getDomainArgs(commandName) {
  return process.argv.slice(2).slice(1); // Remove command name
}

/**
 * Handle domain command with proper error handling and DRY principles
 *
 * Unified handler for all domain commands that abstracts the common pattern
 * of parsing domain-specific arguments and executing the appropriate handler.
 * Provides consistent error handling and exit code management across all domains.
 *
 * This function implements the DRY principle by eliminating code duplication
 * across different domain command handlers while maintaining proper error
 * boundaries and process exit behavior.
 *
 * @param {string} commandName - Name of the domain command (e.g., 'naughty-list')
 * @param {Function} parser - Domain-specific parsing function
 * @param {Function} handler - Domain command handler function
 * @param {Object} parsedConfig - Full parsed configuration for hook context
 * @returns {void} Function calls process.exit() with appropriate code
 * @throws {Error} Errors are caught and converted to exit code 1
 * @example
 * // Handle naughty list command
 * handleDomainCommand('naughty-list', parseNaughtyListArguments, handleNaughtyListCommand, parsedConfig);
 *
 * @exitcode {0} Success - domain command completed successfully
 * @exitcode {1} Error - parsing failed, validation error, or command execution error
 * @since 1.0.0
 */
async function handleDomainCommand(commandName, parser, handler, parsedConfig) {

  try {
    const domainArgs = getDomainArgs(commandName);
    const config = parser(domainArgs);
    handler(config);

    // Apply post-command hooks on success
    await executePostCommandHooks(
      process.argv.slice(2),
      config,
      `${commandName} command completed`,
      { success: true },
      commandName
    );
    process.exit(0);
  } catch (error) {
    console.error(`Error in ${commandName} command:`, error.message);

    // Apply post-command hooks on error
    await executePostCommandHooks(
      process.argv.slice(2),
      config,
      error.message,
      { success: false, error },
      commandName
    );
    process.exit(1);
  }
}

/**
 * Route commands to appropriate handlers with comprehensive error management
 *
 * Central command routing function that analyzes the parsed configuration
 * and delegates execution to the appropriate specialized handler. Supports
 * both special commands (init-config, version, help) and domain commands
 * (naughty-list, budget, gift calculation) with proper fallback behavior.
 *
 * Command routing priority:
 * 1. Special commands (init-config, update-config, log, help, version)
 * 2. Domain commands (naughty-list, budget, spendings, person, toplist)
 * 3. Default gift calculation (fallback for unrecognized commands)
 *
 * All commands are handled with consistent error management and appropriate
 * process exit codes to ensure proper CLI behavior and integration with
 * shell scripts and automation tools.
 *
 * @param {GiftConfig} parsedConfig - Parsed configuration from command line
 * @param {string|null} parsedConfig.command - Command to execute
 * @param {boolean} parsedConfig.showHelp - Whether to display help
 * @returns {Promise<boolean>} Resolves to true when routing completes
 * @throws {Error} Errors are caught and converted to appropriate exit codes
 * @example
 * // Route gift calculation command
 * await routeCommand({
 *   command: null,
 *   baseValue: 100,
 *   recipientName: 'John'
 * });
 *
 * // Route domain command
 * await routeCommand({
 *   command: 'naughty-list'
 * });
 *
 * @exitcode {0} Success - command completed successfully
 * @exitcode {1} Error - command execution failed, validation error, or system error
 * @since 1.0.0
 * @see {@link handleGiftCalculation} Default gift calculation handler
 * @see {@link handleDomainCommand} Domain command abstraction
 */
export async function routeCommand(parsedConfig) {

  // Handle special commands that don't use the standard parsing structure
  if (parsedConfig.command === 'init-config') {
    try {
      initConfig();
      await executePostCommandHooks(
        process.argv.slice(2),
        parsedConfig,
        'Config initialized',
        { success: true },
        'init-config'
      );
      process.exit(0);
    } catch (error) {
      await executePostCommandHooks(
        process.argv.slice(2),
        parsedConfig,
        error.message,
        { success: false, error },
        'init-config'
      );
      throw error;
    }
  }

  if (parsedConfig.command === 'update-config') {
    try {
      updateConfig();
      await executePostCommandHooks(
        process.argv.slice(2),
        parsedConfig,
        'Config updated',
        { success: true },
        'update-config'
      );
      process.exit(0);
    } catch (error) {
      await executePostCommandHooks(
        process.argv.slice(2),
        parsedConfig,
        error.message,
        { success: false, error },
        'update-config'
      );
      throw error;
    }
  }

  if (parsedConfig.command === 'log') {
    try {
      displayLog();
      await executePostCommandHooks(
        process.argv.slice(2),
        parsedConfig,
        'Log displayed',
        { success: true },
        'log'
      );
      process.exit(0);
    } catch (error) {
      await executePostCommandHooks(
        process.argv.slice(2),
        parsedConfig,
        error.message,
        { success: false, error },
        'log'
      );
      throw error;
    }
  }

  if (parsedConfig.showHelp) {
    // Import and display help text from core
    import('../core.js').then(async ({ getHelpText }) => {
      try {
        console.log(getHelpText());
        await executePostCommandHooks(
          process.argv.slice(2),
          parsedConfig,
          'Help displayed',
          { success: true },
          'help'
        );
        process.exit(0);
      } catch (error) {
        await executePostCommandHooks(
          process.argv.slice(2),
          parsedConfig,
          error.message,
          { success: false, error },
          'help'
        );
        process.exit(1);
      }
    });
    return;
  }

  if (parsedConfig.command === 'version') {
    try {
      showVersion();
      await executePostCommandHooks(
        process.argv.slice(2),
        parsedConfig,
        'Version displayed',
        { success: true },
        'version'
      );
      process.exit(0);
    } catch (error) {
      await executePostCommandHooks(
        process.argv.slice(2),
        parsedConfig,
        error.message,
        { success: false, error },
        'version'
      );
      throw error;
    }
  }

  // Route domain commands to their handlers
  switch (parsedConfig.command) {
    case 'naughty-list':
      await handleDomainCommand('naughty-list', parseNaughtyListArguments, handleNaughtyListCommand, parsedConfig);
      break;

    case 'budget':
      await handleDomainCommand('budget', parseBudgetArguments, handleBudgetCommand, parsedConfig);
      break;

    case 'spendings':
      await handleDomainCommand('spendings', parseSpendingsArguments, handleSpendingsCommand, parsedConfig);
      break;

    case 'person':
      await handleDomainCommand('person', parsePersonArguments, handlePersonCommand, parsedConfig);
      break;

    case 'toplist':
      await handleDomainCommand('toplist', parseToplistArguments, handleToplistCommand, parsedConfig);
      break;

    default:
      // If no command matched, this is the default gift calculation
      try {
        const result = await handleGiftCalculation(parsedConfig);
        await executePostCommandHooks(
          process.argv.slice(2),
          parsedConfig,
          result || 'Gift calculation completed',
          { success: true },
          'gift-calculation'
        );
        process.exit(0);
      } catch (error) {
        console.error('Error in gift calculation:', error.message);
        await executePostCommandHooks(
          process.argv.slice(2),
          parsedConfig,
          error.message,
          { success: false, error },
          'gift-calculation'
        );
        process.exit(1);
      }
  }

  return true;
}