/**
 * Simplified command line argument parsing for gift calculator
 * Handles main gift calculation arguments and identifies domain commands
 */

/**
 * Parse command line arguments for gift calculator
 * @param {string[]} args - Array of command line arguments
 * @returns {Object} Parsed configuration object
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
    matchRecipientName: null,
    dryRun: false
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

  // Check for domain commands - these will be handled by domain parsers
  if (args[0] === 'naughty-list' || args[0] === 'nl') {
    config.command = 'naughty-list';
    return config; // Domain will parse the rest
  }

  if (args[0] === 'budget' || args[0] === 'b') {
    config.command = 'budget';
    return config; // Domain will parse the rest
  }

  if (args[0] === 'spendings' || args[0] === 's') {
    config.command = 'spendings';
    return config; // Domain will parse the rest
  }

  if (args[0] === 'person' || args[0] === 'p') {
    config.command = 'person';
    return config; // Domain will parse the rest
  }

  if (args[0] === 'toplist' || args[0] === 'tl') {
    config.command = 'toplist';
    return config; // Domain will parse the rest
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
      const baseValue = parseFloat(value);
      if (baseValue <= 0) {
        throw new Error('basevalue must be positive');
      }
      config.baseValue = baseValue;
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
      config.currency = value.toUpperCase(); // backwards compatibility
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
    } else if (arg === '--dry-run') {
      config.dryRun = true;
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