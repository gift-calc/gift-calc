/**
 * @fileoverview Command line argument parsing utilities
 *
 * Comprehensive CLI argument parsing system that handles both gift calculation
 * arguments and domain-specific commands. This module provides the foundation
 * for all command-line interactions in the gift-calc application.
 *
 * Key features:
 * - Gift calculation argument parsing with validation
 * - Domain command detection and routing (naughty-list, budget, person, etc.)
 * - Special command handling (init-config, version, help, log)
 * - Input validation with detailed error messages
 * - Backwards compatibility support
 * - Flexible argument structure (flags, positional arguments, named options)
 *
 * The parser follows a precedence model where explicit CLI arguments override
 * configuration file values, supporting the overall configuration hierarchy.
 *
 * @module shared/argument-parsing
 * @version 1.0.0
 * @requires None - Pure parsing functions
 * @see {@link module:domains/naughty-list} Naughty list argument parsing
 * @see {@link module:types} GiftConfig and ParsedArguments types
 * @example
 * // Parse gift calculation arguments
 * const config = parseArguments(['--basevalue', '100', '--name', 'John']);
 * console.log(config.baseValue); // 100
 * console.log(config.recipientName); // 'John'
 *
 * // Parse domain command
 * const nlConfig = parseArguments(['naughty-list', 'add', 'BadPerson']);
 * console.log(nlConfig.command); // 'naughty-list'
 */

/**
 * Parse command line arguments for gift calculator with comprehensive validation
 *
 * Main argument parsing function that handles both gift calculation parameters
 * and domain command detection. Supports a wide range of CLI argument patterns
 * including short and long flags, positional arguments, and special commands.
 *
 * Argument categories handled:
 * - Gift calculation: --basevalue, --variation, --friend-score, --nice-score
 * - Currency: --currency (display), with base currency from config
 * - Output: --decimals, --name, --no-log, --copy
 * - Overrides: --max, --min, --asshole (nice score 0)
 * - Matching: --match [recipient]
 * - Special commands: version, help, init-config, update-config, log
 * - Domain commands: naughty-list, budget, spendings, person, toplist
 *
 * The parser applies input validation with range checking and provides
 * detailed error messages for invalid arguments. It maintains backwards
 * compatibility with legacy flag names and supports flexible argument ordering.
 *
 * @param {string[]} args - Array of command line arguments from process.argv
 * @param {GiftConfig} [defaultConfig={}] - Default configuration to merge with parsed args
 * @returns {GiftConfig} Parsed configuration object with all recognized parameters
 * @throws {Error} When argument validation fails or required values are missing
 * @example
 * // Parse basic gift calculation
 * const config = parseArguments(['--basevalue', '100', '--name', 'John']);
 * // Returns: { baseValue: 100, recipientName: 'John', ...defaults }
 *
 * // Parse with validation error
 * try {
 *   parseArguments(['--nice-score', '15']); // Invalid range
 * } catch (error) {
 *   console.log(error.message); // '--nice-score must be between 0 and 10'
 * }
 *
 * // Parse domain command
 * const nlConfig = parseArguments(['naughty-list', 'add', 'BadPerson']);
 * // Returns: { command: 'naughty-list', ...domain-specific config }
 *
 * @since 1.0.0
 * @see {@link module:domains/naughty-list} Naughty list argument parsing
 * @see {@link module:types} GiftConfig type definition
 */
export function parseArguments(args, defaultConfig = {}) {
  const config = {
    baseValue: defaultConfig.baseValue || 70,
    variation: defaultConfig.variation || 20,
    friendScore: 5,
    niceScore: 5,
    baseCurrency: defaultConfig.baseCurrency || defaultConfig.currency || 'SEK',
    displayCurrency: defaultConfig.displayCurrency || null, // null means use base currency
    currency: defaultConfig.currency || 'SEK', // backwards compatibility
    decimals: defaultConfig.decimals !== undefined ? defaultConfig.decimals : 2,
    recipientName: null,
    logToFile: true,
    copyToClipboard: false,
    showHelp: false,
    useMaximum: false,
    useMinimum: false,
    command: null,
    matchPreviousGift: false,
    matchRecipientName: null
  };

  // Check for special commands first
  if (args[0] === 'init-config') {
    config.command = 'init-config';
    return config;
  }

  if (args[0] === 'update-config') {
    config.command = 'update-config';
    return config;
  }

  if (args[0] === 'log') {
    config.command = 'log';
    return config;
  }

  if (args[0] === 'version') {
    config.command = 'version';
    return config;
  }

  // Check for domain commands
  if (args[0] === 'naughty-list' || args[0] === 'nl') {
    config.command = 'naughty-list';
    return parseNaughtyListArguments(args);
  }

  if (args[0] === 'budget' || args[0] === 'b') {
    config.command = 'budget';
    return parseBudgetArguments(args);
  }

  if (args[0] === 'spendings' || args[0] === 's') {
    config.command = 'spendings';
    return parseSpendingsArguments(args);
  }

  if (args[0] === 'person' || args[0] === 'p') {
    config.command = 'person';
    return parsePersonArguments(args);
  }

  if (args[0] === 'toplist' || args[0] === 'tl') {
    config.command = 'toplist';
    return parseToplistArguments(args);
  }

  // Parse regular gift calculation arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      config.showHelp = true;
    } else if (arg === '-v' || arg === '-V' || arg === '--version') {
      config.command = 'version';
    } else if (arg === '-b' || arg === '--basevalue') {
      const value = args[++i];
      if (!value || isNaN(value)) {
        throw new Error('-b/--basevalue requires a numeric value');
      }
      config.baseValue = parseFloat(value);
    } else if (arg === '-r' || arg === '--variation') {
      const value = args[++i];
      if (!value || isNaN(value)) {
        throw new Error('-r/--variation requires a numeric value');
      }
      const varValue = parseFloat(value);
      if (varValue < 0 || varValue > 100) {
        throw new Error('-r/--variation must be between 0 and 100');
      }
      config.variation = varValue;
    } else if (arg === '-f' || arg === '--friend-score') {
      const value = args[++i];
      if (!value || isNaN(value)) {
        throw new Error('-f/--friend-score requires a numeric value');
      }
      const friendValue = parseInt(value);
      if (friendValue < 1 || friendValue > 10) {
        throw new Error('-f/--friend-score must be between 1 and 10');
      }
      config.friendScore = friendValue;
    } else if (arg === '-n' || arg === '--nice-score') {
      const value = args[++i];
      if (!value || isNaN(value)) {
        throw new Error('-n/--nice-score requires a numeric value');
      }
      const niceValue = parseInt(value);
      if (niceValue < 0 || niceValue > 10) {
        throw new Error('-n/--nice-score must be between 0 and 10');
      }
      config.niceScore = niceValue;
    } else if (arg === '-c' || arg === '--currency') {
      const value = args[++i];
      if (!value) {
        throw new Error('-c/--currency requires a currency code for display (e.g., SEK, USD, EUR)');
      }
      config.displayCurrency = value.toUpperCase();
    } else if (arg === '-d' || arg === '--decimals') {
      const value = args[++i];
      if (!value || isNaN(value)) {
        throw new Error('-d/--decimals requires a numeric value');
      }
      const decValue = parseInt(value);
      if (decValue < 0 || decValue > 10) {
        throw new Error('-d/--decimals must be between 0 and 10');
      }
      config.decimals = decValue;
    } else if (arg === '--name') {
      const value = args[++i];
      if (!value) {
        throw new Error('--name requires a recipient name');
      }
      config.recipientName = value;
    } else if (arg === '-m' || arg === '--match') {
      config.matchPreviousGift = true;
      // Check if next argument is a recipient name
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        config.matchRecipientName = args[++i];
      }
    } else if (arg === '--max') {
      config.useMaximum = true;
    } else if (arg === '--min') {
      config.useMinimum = true;
    } else if (arg === '--asshole' || arg === '--dickhead') {
      config.niceScore = 0;
    } else if (arg === '--no-log') {
      config.logToFile = false;
    } else if (arg === '-C' || arg === '--copy') {
      config.copyToClipboard = true;
    } else if (!arg.startsWith('-')) {
      // Unnamed positional argument - treat as recipient name if not already set
      if (!config.recipientName) {
        config.recipientName = arg;
      }
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return config;
}

// Import the domain-specific parsing functions
import { parseNaughtyListArguments } from '../domains/naughty-list/index.js';

function parseBudgetArguments(args) {
  // This will be moved to budget domain
  return { command: 'budget', success: false, error: 'Budget parsing not yet extracted' };
}

function parseSpendingsArguments(args) {
  // This will be moved to spendings domain
  return { command: 'spendings', success: false, error: 'Spendings parsing not yet extracted' };
}

function parsePersonArguments(args) {
  // This will be moved to person domain
  return { command: 'person', success: false, error: 'Person parsing not yet extracted' };
}

function parseToplistArguments(args) {
  // This will be moved to toplist domain
  return { command: 'toplist', success: false, error: 'Toplist parsing not yet extracted' };
}