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

/**
 * Get domain-specific arguments by removing the command prefix
 * @param {string} commandName - The command name to remove from args
 * @returns {string[]} Domain-specific arguments
 */
function getDomainArgs(commandName) {
  return process.argv.slice(2).slice(1); // Remove command name
}

/**
 * Handle domain command with proper error handling
 * @param {string} commandName - Name of the command
 * @param {Function} parser - Parsing function
 * @param {Function} handler - Command handler function
 */
function handleDomainCommand(commandName, parser, handler) {
  try {
    const domainArgs = getDomainArgs(commandName);
    const config = parser(domainArgs);
    handler(config);
    process.exit(0);
  } catch (error) {
    console.error(`Error in ${commandName} command:`, error.message);
    process.exit(1);
  }
}

/**
 * Route commands to appropriate handlers
 * @param {Object} parsedConfig - Parsed configuration from command line
 */
export async function routeCommand(parsedConfig) {
  // Handle special commands that don't use the standard parsing structure
  if (parsedConfig.command === 'init-config') {
    initConfig();
    process.exit(0);
  }

  if (parsedConfig.command === 'update-config') {
    updateConfig();
    process.exit(0);
  }

  if (parsedConfig.command === 'log') {
    displayLog();
    process.exit(0);
  }

  if (parsedConfig.showHelp) {
    // Import and display help text from core
    import('../core.js').then(({ getHelpText }) => {
      console.log(getHelpText());
      process.exit(0);
    });
    return;
  }

  if (parsedConfig.command === 'version') {
    showVersion();
    process.exit(0);
  }

  // Route domain commands to their handlers
  switch (parsedConfig.command) {
    case 'naughty-list':
      handleDomainCommand('naughty-list', parseNaughtyListArguments, handleNaughtyListCommand);
      break;

    case 'budget':
      handleDomainCommand('budget', parseBudgetArguments, handleBudgetCommand);
      break;

    case 'spendings':
      handleDomainCommand('spendings', parseSpendingsArguments, handleSpendingsCommand);
      break;

    case 'person':
      handleDomainCommand('person', parsePersonArguments, handlePersonCommand);
      break;

    case 'toplist':
      handleDomainCommand('toplist', parseToplistArguments, handleToplistCommand);
      break;

    default:
      // If no command matched, this is the default gift calculation
      try {
        await handleGiftCalculation(parsedConfig);
        process.exit(0);
      } catch (error) {
        console.error('Error in gift calculation:', error.message);
        process.exit(1);
      }
  }

  return true;
}