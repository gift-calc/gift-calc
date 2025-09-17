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
      // Re-parse with domain-specific parser
      const args = process.argv.slice(2);
      const naughtyListConfig = parseNaughtyListArguments(args.slice(1)); // Remove 'naughty-list' prefix
      handleNaughtyListCommand(naughtyListConfig);
      process.exit(0);

    case 'budget':
      // Re-parse with domain-specific parser
      const budgetArgs = process.argv.slice(2);
      const budgetConfig = parseBudgetArguments(budgetArgs.slice(1)); // Remove 'budget' prefix
      handleBudgetCommand(budgetConfig);
      process.exit(0);

    case 'spendings':
      // Re-parse with domain-specific parser
      const spendingsArgs = process.argv.slice(2);
      const spendingsConfig = parseSpendingsArguments(spendingsArgs.slice(1)); // Remove 'spendings' prefix
      handleSpendingsCommand(spendingsConfig);
      process.exit(0);

    case 'person':
      // Re-parse with domain-specific parser
      const personArgs = process.argv.slice(2);
      const personConfig = parsePersonArguments(personArgs.slice(1)); // Remove 'person' prefix
      handlePersonCommand(personConfig);
      process.exit(0);

    case 'toplist':
      // Re-parse with domain-specific parser
      const toplistArgs = process.argv.slice(2);
      const toplistConfig = parseToplistArguments(toplistArgs.slice(1)); // Remove 'toplist' prefix
      handleToplistCommand(toplistConfig);
      process.exit(0);

    default:
      // If no command matched, this is the default gift calculation
      await handleGiftCalculation(parsedConfig);
      process.exit(0);
  }

  return true;
}