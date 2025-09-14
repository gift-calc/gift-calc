// Gift Calculator Core Logic
// Pure calculation functions with no Node.js dependencies
// Can be used in both CLI and browser environments

/**
 * Calculate gift amount with variation, friend score, and nice score influences
 * @param {number} base - Base gift amount
 * @param {number} variationPercent - Variation percentage (0-100)
 * @param {number} friendScore - Friend score (1-10)
 * @param {number} niceScore - Nice score (0-10)
 * @param {number} decimalPlaces - Number of decimal places for rounding
 * @returns {number} Calculated gift amount
 */
export function calculateGiftAmount(base, variationPercent, friendScore, niceScore, decimalPlaces) {
  // Friend score influences the bias towards higher amounts
  // Score 1-5: neutral to negative bias, Score 6-10: positive bias
  const friendBias = (friendScore - 5.5) * 0.1; // Range: -0.45 to +0.45
  
  // Nice score also influences the bias towards higher amounts
  // Score 1-5: neutral to negative bias, Score 6-10: positive bias
  const niceBias = (niceScore - 5.5) * 0.1; // Range: -0.45 to +0.45
  
  // Combine both biases (average them to avoid double effect)
  const combinedBias = (friendBias + niceBias) / 2;
  
  // Generate base random percentage within the variation range
  const randomPercentage = (Math.random() * (variationPercent * 2)) - variationPercent;
  
  // Apply combined bias - higher scores increase chance of higher amounts
  const biasedPercentage = randomPercentage + (combinedBias * variationPercent);
  
  // Ensure we don't exceed the original variation bounds
  const finalPercentage = Math.max(-variationPercent, Math.min(variationPercent, biasedPercentage));
  
  const variation = base * (finalPercentage / 100);
  const giftAmount = base + variation;
  
  // Round to specified decimal places
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(giftAmount * multiplier) / multiplier;
}


/**
 * Calculate final gift amount with special nice score handling
 * @param {number} baseValue - Base value for calculation
 * @param {number} variation - Variation percentage
 * @param {number} friendScore - Friend score (1-10)
 * @param {number} niceScore - Nice score (0-10)
 * @param {number} decimals - Number of decimal places
 * @param {boolean} useMaximum - Force maximum amount
 * @param {boolean} useMinimum - Force minimum amount
 * @returns {number} Final calculated gift amount
 */
export function calculateFinalAmount(baseValue, variation, friendScore, niceScore, decimals, useMaximum = false, useMinimum = false) {
  let suggestedAmount;
  
  if (niceScore === 0) {
    // Special case: nice score 0 = amount is 0 (overrides everything)
    suggestedAmount = 0;
  } else if (niceScore === 1) {
    // Special case: nice score 1 = baseValue * 0.1 (overrides everything)
    suggestedAmount = baseValue * 0.1;
  } else if (niceScore === 2) {
    // Special case: nice score 2 = baseValue * 0.2 (overrides everything)
    suggestedAmount = baseValue * 0.2;
  } else if (niceScore === 3) {
    // Special case: nice score 3 = baseValue * 0.3 (overrides everything)
    suggestedAmount = baseValue * 0.3;
  } else if (useMaximum) {
    // Maximum is baseValue + 20%
    suggestedAmount = baseValue * 1.2;
  } else if (useMinimum) {
    // Minimum is baseValue - 20%
    suggestedAmount = baseValue * 0.8;
  } else {
    // Normal random calculation for nice scores 4-10
    suggestedAmount = calculateGiftAmount(baseValue, variation, friendScore, niceScore, decimals);
  }
  
  // Round to specified decimal places
  const multiplier = Math.pow(10, decimals);
  return Math.round(suggestedAmount * multiplier) / multiplier;
}

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
    currency: defaultConfig.currency || 'SEK',
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
  
  if (args[0] === '--version' || args[0] === '-v' || args[0] === '-V') {
    config.command = 'version';
    return config;
  }
  
  // Check for naughty list commands
  if (args[0] === 'naughty-list' || args[0] === 'nl') {
    return parseNaughtyListArguments(args.slice(1));
  }
  
  // Check for budget commands
  if (args[0] === 'budget' || args[0] === 'b') {
    return parseBudgetArguments(args.slice(1));
  }
  
  // Check for spendings commands
  if (args[0] === 'spendings' || args[0] === 's') {
    return parseSpendingsArguments(args.slice(1));
  }
  
  // Check for person commands
  if (args[0] === 'person' || args[0] === 'p') {
    return parsePersonArguments(args.slice(1));
  }

  // Check for toplist commands
  if (args[0] === 'toplist' || args[0] === 'tl') {
    return parseToplistArguments(args.slice(1));
  }
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '-h' || arg === '--help') {
      config.showHelp = true;
      break;
    }
    
    if (arg === '--version' || arg === '-v' || arg === '-V') {
      config.command = 'version';
      break;
    }
    
    if (arg === '-b' || arg === '--basevalue') {
      const nextArg = args[i + 1];
      if (nextArg && !isNaN(nextArg)) {
        const baseValue = parseFloat(nextArg);
        if (baseValue <= 0) {
          throw new Error('-b/--basevalue must be positive');
        }
        config.baseValue = baseValue;
        i++; // Skip the next argument as it's the value
      } else {
        throw new Error('-b/--basevalue requires a numeric value');
      }
    }
    
    if (arg === '-r' || arg === '--variation') {
      const nextArg = args[i + 1];
      if (nextArg && !isNaN(nextArg)) {
        const varValue = parseFloat(nextArg);
        if (varValue >= 0 && varValue <= 100) {
          config.variation = varValue;
          i++; // Skip the next argument as it's the value
        } else {
          throw new Error('-r/--variation must be between 0 and 100');
        }
      } else {
        throw new Error('-r/--variation requires a numeric value');
      }
    }
    
    if (arg === '-f' || arg === '--friend-score') {
      const nextArg = args[i + 1];
      if (nextArg && !isNaN(nextArg)) {
        const scoreValue = parseFloat(nextArg);
        if (scoreValue >= 1 && scoreValue <= 10) {
          config.friendScore = scoreValue;
          i++; // Skip the next argument as it's the value
        } else {
          throw new Error('-f/--friend-score must be between 1 and 10');
        }
      } else {
        throw new Error('-f/--friend-score requires a numeric value');
      }
    }
    
    if (arg === '-n' || arg === '--nice-score') {
      const nextArg = args[i + 1];
      if (nextArg !== undefined && !isNaN(nextArg)) {
        const scoreValue = parseFloat(nextArg);
        if (scoreValue >= 0 && scoreValue <= 10) {
          config.niceScore = scoreValue;
          i++; // Skip the next argument as it's the value
        } else {
          throw new Error('-n/--nice-score must be between 0 and 10');
        }
      } else {
        throw new Error('-n/--nice-score requires a numeric value');
      }
    }
    
    if (arg === '-c' || arg === '--currency') {
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        config.currency = nextArg.toUpperCase();
        i++; // Skip the next argument as it's the value
      } else {
        throw new Error('-c/--currency requires a currency code (e.g., SEK, USD, EUR)');
      }
    }
    
    if (arg === '-C' || arg === '--copy') {
      config.copyToClipboard = true;
    }
    
    if (arg === '-d' || arg === '--decimals') {
      const nextArg = args[i + 1];
      if (nextArg && !isNaN(nextArg)) {
        const decValue = parseInt(nextArg);
        if (decValue >= 0 && decValue <= 10) {
          config.decimals = decValue;
          i++; // Skip the next argument as it's the value
        } else {
          throw new Error('-d/--decimals must be between 0 and 10');
        }
      } else {
        throw new Error('-d/--decimals requires a numeric value');
      }
    }
    
    if (arg === '--name') {
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        config.recipientName = nextArg;
        i++; // Skip the next argument as it's the value
      } else {
        throw new Error('--name requires a name value');
      }
    }
    
    if (arg === '--max') {
      config.useMaximum = true;
    }
    
    if (arg === '--min') {
      config.useMinimum = true;
    }
    
    if (arg === '--asshole' || arg === '--dickhead') {
      config.niceScore = 0;
    }
    
    if (arg === '--no-log') {
      config.logToFile = false;
    }
    
    if (arg === '-m' || arg === '--match') {
      config.matchPreviousGift = true;
      
      // Check if next argument is a name (not starting with '-' and exists)
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        config.matchRecipientName = nextArg;
        i++; // Skip the next argument as it's the recipient name
      }
    }
  }
  
  return config;
}

/**
 * Parse naughty list specific arguments
 * @param {string[]} args - Array of command line arguments (without naughty-list/nl prefix)
 * @returns {Object} Naughty list configuration object
 */
export function parseNaughtyListArguments(args) {
  const config = {
    command: 'naughty-list',
    action: null,        // 'add', 'remove', 'list', 'search'
    name: null,
    searchTerm: null,
    remove: false,
    success: true,
    error: null
  };
  
  // If no arguments provided, show help or error
  if (args.length === 0) {
    config.success = false;
    config.error = 'No action specified. Use "list" to see all naughty people, provide a name to add, or use --search to search.';
    return config;
  }
  
  // Check for flags first
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--remove' || arg === '-r') {
      config.remove = true;
      continue;
    }
    
    if (arg === '--search') {
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        config.searchTerm = nextArg;
        config.action = 'search';
        i++; // Skip the next argument as it's the search term
      } else {
        config.success = false;
        config.error = '--search requires a search term';
      }
      continue;
    }
    
    // Check for 'list' command
    if (arg === 'list') {
      config.action = 'list';
      continue;
    }
    
    // If it's not a flag and we're not in a search context, treat it as a name
    if (!arg.startsWith('-')) {
      config.name = arg;
      
      // Determine action based on remove flag
      if (config.remove) {
        config.action = 'remove';
      } else {
        config.action = 'add';
      }
      continue;
    }
    
    // If we get here, it's an unrecognized flag
    config.success = false;
    config.error = `Unknown flag: ${arg}`;
    break;
  }
  
  // Set action to explicit 'list' if no other action was determined
  if (!config.action) {
    config.action = 'list';
  }
  
  // Validate configuration
  if (config.action === 'add' && !config.name) {
    config.success = false;
    config.error = 'No name provided to add to naughty list';
  }
  
  if (config.action === 'remove' && !config.name) {
    config.success = false;
    config.error = 'No name provided to remove from naughty list';
  }
  
  return config;
}

/**
 * Format gift amount output with currency and optional recipient name
 * @param {number} amount - Gift amount
 * @param {string} currency - Currency code
 * @param {string|null} recipientName - Optional recipient name
 * @param {number} decimals - Number of decimal places to display (optional)
 * @returns {string} Formatted output string
 */
export function formatOutput(amount, currency, recipientName = null, decimals = null) {
  let formattedAmount;
  
  if (decimals !== null) {
    if (amount % 1 === 0 && decimals === 2) {
      // Whole number with default decimals (2) - don't show trailing zeros
      formattedAmount = amount.toString();
    } else {
      // Either non-whole number or explicitly configured decimals - show with precision
      formattedAmount = amount.toFixed(decimals);
    }
  } else {
    // Backward compatibility - no decimals parameter provided
    formattedAmount = amount.toString();
  }
  
  let output = `${formattedAmount} ${currency}`;
  if (recipientName) {
    output += ` for ${recipientName}`;
  }
  return output;
}

/**
 * Get help text for the gift calculator
 * @returns {string} Help text
 */
export function getHelpText() {
  return `
Gift Calculator - CLI Tool

DESCRIPTION:
  A CLI tool that suggests a gift amount based on a base value with 
  configurable random variation, friend score, and nice score influences.
  Perfect for birthday, holiday, and special occasion gift planning!

USAGE:
  gift-calc [options]
  gift-calc init-config
  gift-calc update-config
  gift-calc log
  gift-calc naughty-list <name>      # Add person to naughty list
  gift-calc naughty-list list        # List all naughty people
  gift-calc naughty-list --remove <name>  # Remove from naughty list
  gift-calc budget add <amount> <from-date> <to-date> [description]  # Add budget
  gift-calc budget list              # List all budgets with status
  gift-calc budget status            # Show current budget status
  gift-calc budget edit <id> [options]  # Edit existing budget
  gift-calc spendings --from <date> --to <date>  # Show spending in date range
  gift-calc spendings --days <n>     # Show spending in last n days
  gift-calc person set --name <name> [options]  # Set person configuration
  gift-calc person list [--sort-by field] # List person configurations
  gift-calc person clear --name <name>   # Clear person configuration
  gift-calc toplist                      # Top 10 persons by total gift amount
  gift-calc toplist -n                   # Top 10 persons by nice score
  gift-calc toplist --friend-score -l 5  # Top 5 persons by friend score
  gift-calc toplist -c USD               # Top 10 persons by USD gift amount
  gift-calc toplist --list-currencies    # Show available currencies
  gcalc [options]              # Short alias
  gcalc nl <name>              # Add to naughty list (short form)
  gcalc nl list                # List naughty people
  gcalc nl --remove <name>     # Remove from naughty list
  gcalc nl --search <term>     # Search naughty list
  gcalc b add 5000 2024-12-01 2024-12-31 "Christmas"  # Add budget (short)
  gcalc b list                 # List budgets (short form)
  gcalc b status               # Show budget status (short form)
  gcalc s --weeks 4            # Show spending in last 4 weeks (short form)
  gcalc p set -n "Alice" -s 9 -f 8 -b 100 -c USD  # Set person config (short)
  gcalc p list --sort-by name  # List person configs (short form)
  gcalc p clear -n "Alice"     # Clear person config (short form)

COMMANDS:
  init-config                 Setup configuration file with default values
  update-config               Update existing configuration file
  log                         Open gift calculation log file with less
  naughty-list, nl            Manage the naughty list (add/remove/list/search)
  budget, b                   Manage budgets (add/list/status/edit)
  spendings, s                Track and analyze spending patterns over time
  person, p                   Manage person-specific configurations

OPTIONS:
  -h, --help                  Show this help message
  -v, -V, --version           Show version information
  -b, --basevalue <number>    Set the base value for gift calculation (default: 70)
  -r, --variation <percent>   Set variation percentage (0-100, default: 20)
  -f, --friend-score <1-10>   Friend score affecting gift amount bias (default: 5)
                              Higher scores increase chance of higher amounts
  -n, --nice-score <0-10>     Nice score affecting gift amount bias (default: 5)
                              0=no gift, 1-3=fixed reductions, 4-10=bias amounts
  -c, --currency <code>       Currency code to display (default: SEK)
  -d, --decimals <0-10>       Number of decimal places (default: 2)
  --name <name>               Name of gift recipient to include in output
  -m, --match [name]          Match previous gift amount. If name provided, matches
                              last gift for that recipient. Otherwise matches last gift.
  --max                       Set amount to maximum (baseValue + 20%)
  --min                       Set amount to minimum (baseValue - 20%)
  --asshole                   Set nice score to 0 (no gift)
  --dickhead                  Set nice score to 0 (no gift)
  --no-log                    Disable logging to file (logging enabled by default)
  -C, --copy                  Copy amount (without currency) to clipboard

NAUGHTY LIST OPTIONS:
  --remove, -r                Remove person from naughty list (use with naughty-list command)
  --search <term>             Search naughty list for names starting with term

BUDGET EDIT OPTIONS:
  --amount <number>           Update budget amount (use with budget edit command)
  --from-date <date>          Update start date in YYYY-MM-DD format (use with budget edit command)
  --to-date <date>            Update end date in YYYY-MM-DD format (use with budget edit command)
  --description <text>        Update budget description (use with budget edit command)

CONFIGURATION:
  Default values can be configured by running 'gift-calc init-config' or 'gcalc init-config'.
  Config is stored at: ~/.config/gift-calc/.config.json
  Naughty list is stored at: ~/.config/gift-calc/naughty-list.json
  Budgets are stored at: ~/.config/gift-calc/budgets.json
  Person configurations are stored at: ~/.config/gift-calc/persons.json
  Gift calculations are logged at: ~/.config/gift-calc/gift-calc.log
  
  CONFIGURATION PRECEDENCE (highest to lowest priority):
    1. CLI arguments (--base-value, --nice-score, etc.)
    2. Person-specific config (when using --name)
    3. Global config file (~/.config/gift-calc/.config.json)
    4. Built-in defaults
  
  NAUGHTY LIST:
    When a recipient is on the naughty list, their gift amount is always 0,
    overriding all other calculation parameters (nice score, friend score, etc.).
    This is the highest priority check in the calculation logic.
    
  BUDGET SYSTEM:
    Budget periods cannot overlap. Each budget has a unique time range.
    Status shows ACTIVE (current), FUTURE (upcoming), or EXPIRED (past).
    Budget amounts are displayed in your configured currency (default: SEK).
    
  PERSON CONFIGURATIONS:
    Store person-specific parameters (nice-score, friend-score, base-value, currency)
    to avoid specifying them repeatedly. Use --name with stored configurations.
    Person configs override global config but are overridden by CLI arguments.
    Supports sorting by any field when listing configurations.
    
  GIFT MATCHING:
    Gift calculations are automatically logged when using the default logging.
    Use -m/--match to repeat previous gift amounts from the log instead of calculating new ones.
    Match by recipient name or use the most recent gift overall.
    Gift matching uses the existing calculation log for a single source of truth.
    
  AUTOMATIC BUDGET TRACKING:
    When an active budget exists, budget tracking is automatically displayed
    after each gift calculation, showing real-time spending including the
    newly calculated amount. Only amounts matching the budget currency are
    included in calculations. Different currencies are tracked separately
    and shown in a warning note. No configuration required.

EXAMPLES:
  gift-calc                             # Use config defaults or built-in defaults
  gcalc init-config                     # Setup configuration file (short form)
  gift-calc update-config               # Update existing configuration file
  gift-calc log                         # Open log file with less
  gift-calc -b 100                      # Base value of 100
  gcalc -b 100 -r 30 -d 0               # Base 100, 30% variation, no decimals
  gift-calc --name "Alice" -c USD       # Gift for Alice in USD currency
  gcalc -b 50 -f 9 --name "Bob"         # Gift for Bob (with logging by default)
  gift-calc -c EUR -d 1 -C --no-log     # Use defaults with EUR, copy but no log
  gcalc --name "Charlie" -b 80 -C       # Gift for Charlie, copy to clipboard
  gift-calc -f 8 -n 9                   # High friend and nice scores
  gift-calc -n 0 -b 100                 # No gift (nice score 0)
  gift-calc --asshole --name "Kevin"    # No gift for asshole Kevin
  gift-calc -b 50 --dickhead            # No gift for terrible person
  gift-calc -n 2 -b 100                 # Mean person (20 SEK from base 100)
  gift-calc -b 100 --max                # Set to maximum amount (120)
  gcalc -b 100 --min                    # Set to minimum amount (80)
  gift-calc --help                      # Shows this help message
  
  GIFT MATCHING EXAMPLES:
  gift-calc -m                          # Match the last gift amount (any recipient)
  gcalc --match                         # Same as above (short form)
  gift-calc --match David               # Match last gift amount for David
  gcalc -m Alice                        # Match last gift amount for Alice
  gift-calc -m Bob --copy               # Match Bob's last gift and copy to clipboard
  
  NAUGHTY LIST EXAMPLES:
  gift-calc naughty-list Sven           # Add Sven to naughty list
  gcalc nl David                        # Add David to naughty list (short form)
  gcalc nl list                         # List all people on naughty list
  gift-calc naughty-list --remove David # Remove David from naughty list
  gcalc nl -r Sven                      # Remove Sven from naughty list (short form)
  gcalc nl --search Dav                  # Search for names starting with "Dav"
  gift-calc --name "Sven" -b 100        # Returns "0 SEK for Sven (on naughty list!)"
  
  PERSON CONFIGURATION EXAMPLES:
  gift-calc person set --name "Alice" --nice-score 9 --friend-score 8 --base-value 150 --currency USD
  gcalc p set -n "Bob" -s 7 -f 9 -b 80 -c EUR                        # Short form
  gift-calc person list                                               # List all person configs
  gcalc p list --sort-by base-value --order desc                      # Sort by base value
  gift-calc person clear --name "Alice"                               # Clear Alice's config
  gift-calc --name "Alice"                                            # Use Alice's stored values
  gift-calc --name "Alice" --base-value 200                           # Override base value

  TOPLIST EXAMPLES:
  gift-calc toplist                                                    # Top 10 persons by total gift amount
  gcalc tl                                                            # Same as above (short form)
  gift-calc toplist --nice-score                                      # Top 10 persons by nice score
  gcalc tl -n                                                         # Same as above (short form)
  gift-calc toplist --friend-score                                    # Top 10 persons by friend score
  gcalc tl -f                                                         # Same as above (short form)
  gift-calc toplist --length 20                                       # Top 20 persons by total gifts
  gcalc tl -l 5                                                       # Top 5 persons by total gifts
  gift-calc toplist -n -l 3                                          # Top 3 persons by nice score
  gcalc tl --friend-score --length 15                                # Top 15 persons by friend score
  gift-calc toplist --currency USD                                    # Top 10 persons by USD gifts only
  gcalc tl -c SEK -l 5                                               # Top 5 persons by SEK gifts only
  gift-calc toplist --list-currencies                                 # Show available currencies in dataset
  
  BUDGET EXAMPLES:
  gift-calc budget add 5000 2024-12-01 2024-12-31 "Christmas gifts"      # Add Christmas budget
  gcalc b add 2000 2024-11-01 2024-11-30 "Birthday gifts"                # Add birthday budget (short)
  gift-calc budget list                                                   # List all budgets with status
  gcalc b list                                                            # List budgets (short form)
  gift-calc budget status                                                 # Show current active budget
  gcalc b status                                                          # Show status (short form)
  gift-calc budget edit 1 --amount 6000 --description "Updated Christmas" # Edit budget amount and description
  gcalc b edit 1 --to-date 2025-01-15                                     # Extend budget end date (short)
  gcalc b edit 2 --from-date 2024-10-15 --to-date 2024-11-15            # Change budget dates
  gift-calc budget                                                        # Defaults to showing status
  
  SPENDINGS EXAMPLES:
  # Absolute date ranges (specific start and end dates)
  gift-calc spendings --from 2024-01-01 --to 2024-12-31                   # All spending in 2024
  gift-calc spendings -f 2024-12-01 -t 2024-12-31                         # December 2024 spending (short form)
  
  # Relative time periods (calculated from current date)
  gcalc spendings --days 30                                               # Last 30 days spending
  gcalc s --weeks 4                                                       # Last 4 weeks spending (short alias)
  gift-calc spendings --months 3                                          # Last 3 months spending
  gcalc spendings --years 1                                               # Last year spending
  
  # Invalid: Cannot mix absolute and relative periods
  # gift-calc spendings --from 2024-01-01 --days 30                       # Error: mutually exclusive
  
  # Output shows total per currency and itemized chronological list
  # Multi-currency spending is grouped by currency for easy analysis
  
  AUTOMATIC BUDGET TRACKING EXAMPLES:
  # With active budget (automatic display after calculation):
  gift-calc -b 100 --name "Alice"
  # Output: 99.34 SEK for Alice
  #         Budget: 1000 SEK | Used: 345.59 SEK | Remaining: 654.41 SEK | Ends: 2024-12-31 (25 days)
  
  # Budget exceeded warning:
  gift-calc -b 200 --name "Bob"  
  # Output: 201.25 SEK for Bob
  #         ⚠️  BUDGET EXCEEDED! Budget: 1000 SEK | Used: 1096.73 SEK | Over by: 96.73 SEK | Ends: 2024-12-31 (25 days)
  
  # Mixed currencies (with warning):
  gift-calc -b 150 -c USD --name "Charlie"
  # Output: 149.99 USD for Charlie
  #         Budget: 1000 SEK | Used: 500.25 SEK | Remaining: 499.75 SEK | Ends: 2024-12-31 (25 days) [*mixed currencies]
  #         Note: Excluded from budget calculation: 149.99 USD (2024-12-15) (Charlie)

FRIEND SCORE GUIDE:
  1-3: Acquaintance (bias toward lower amounts)
  4-6: Regular friend (neutral)
  7-8: Good friend (bias toward higher amounts)
  9-10: Best friend/family (strong bias toward higher amounts)

NICE SCORE GUIDE:
  0: Asshole (amount = 0)
  1: Terrible person (10% of base value)
  2: Very mean person (20% of base value)
  3: Mean person (30% of base value)
  4-6: Average niceness (neutral bias)
  7-8: Nice person (bias toward higher amounts)
  9-10: Very nice person (strong bias toward higher amounts)

OUTPUT:
  The script returns a randomly calculated gift amount with variation,
  friend score, and nice score influences applied to the base value.
  `;
}

// Default export for easier importing
export default {
  calculateGiftAmount,
  calculateFinalAmount,
  parseArguments,
  formatOutput,
  getHelpText
};

// Naughty List Management Functions
// These functions require Node.js modules and should only be used in Node.js contexts

/**
 * Get the path to the naughty list JSON file
 * @param {object} pathModule - Node.js path module
 * @param {object} osModule - Node.js os module
 * @returns {string} Path to naughty list file
 */
export function getNaughtyListPath(pathModule, osModule) {
  if (!pathModule || !osModule) {
    throw new Error('Path and os modules are required for naughty list operations');
  }
  return pathModule.join(osModule.homedir(), '.config', 'gift-calc', 'naughty-list.json');
}

/**
 * Load the naughty list from file
 * @param {string} naughtyListPath - Path to naughty list file
 * @param {object} fsModule - Node.js fs module
 * @returns {Object} Object containing naughtyList array and loaded boolean
 */
export function loadNaughtyList(naughtyListPath, fsModule) {
  if (!fsModule) {
    throw new Error('fs module is required for naughty list operations');
  }
  
  if (fsModule.existsSync(naughtyListPath)) {
    try {
      const naughtyListData = fsModule.readFileSync(naughtyListPath, 'utf8');
      const parsed = JSON.parse(naughtyListData);
      return { 
        naughtyList: parsed.naughtyList || [], 
        loaded: true 
      };
    } catch (error) {
      console.error(`Warning: Could not parse naughty list file at ${naughtyListPath}. Starting with empty list.`);
      return { naughtyList: [], loaded: false };
    }
  }
  return { naughtyList: [], loaded: false };
}

/**
 * Save the naughty list to file
 * @param {Array} naughtyList - Array of naughty list objects
 * @param {string} naughtyListPath - Path to naughty list file
 * @param {object} fsModule - Node.js fs module
 * @param {object} pathModule - Node.js path module
 * @returns {boolean} True if save was successful
 */
export function saveNaughtyList(naughtyList, naughtyListPath, fsModule, pathModule) {
  if (!fsModule || !pathModule) {
    throw new Error('fs and path modules are required for naughty list operations');
  }
  
  try {
    // Ensure directory exists
    const configDir = pathModule.dirname(naughtyListPath);
    if (!fsModule.existsSync(configDir)) {
      fsModule.mkdirSync(configDir, { recursive: true });
    }
    
    const data = { naughtyList };
    fsModule.writeFileSync(naughtyListPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error saving naughty list: ${error.message}`);
    return false;
  }
}

/**
 * Add a person to the naughty list
 * @param {string} name - Name to add to naughty list
 * @param {string} naughtyListPath - Path to naughty list file
 * @param {object} fsModule - Node.js fs module
 * @param {object} pathModule - Node.js path module
 * @returns {Object} Result object with success, message, and existing flags
 */
export function addToNaughtyList(name, naughtyListPath, fsModule, pathModule) {
  // Validate input
  if (!name || name.trim() === '') {
    return {
      success: false,
      message: 'Name cannot be empty',
      existing: false
    };
  }
  name = name.trim(); // Use trimmed name
  
  const { naughtyList: currentList } = loadNaughtyList(naughtyListPath, fsModule);
  
  // Check if person is already on the list (case-insensitive)
  const existingEntry = currentList.find(entry => entry.name.toLowerCase() === name.toLowerCase());
  if (existingEntry) {
    return {
      success: false,
      message: `${name} is already on the naughty list`,
      existing: true,
      existingEntry
    };
  }
  
  // Add new entry with timestamp
  const newEntry = {
    name,
    addedAt: new Date().toISOString()
  };
  
  currentList.push(newEntry);
  const saved = saveNaughtyList(currentList, naughtyListPath, fsModule, pathModule);
  
  if (saved) {
    return {
      success: true,
      message: `${name} added to naughty list`,
      added: true,
      entry: newEntry
    };
  } else {
    return {
      success: false,
      message: `Failed to save naughty list`,
      added: false
    };
  }
}

/**
 * Remove a person from the naughty list
 * @param {string} name - Name to remove from naughty list
 * @param {string} naughtyListPath - Path to naughty list file
 * @param {object} fsModule - Node.js fs module
 * @param {object} pathModule - Node.js path module
 * @returns {Object} Result object with success, message, and found flags
 */
export function removeFromNaughtyList(name, naughtyListPath, fsModule, pathModule) {
  // Validate input
  if (!name || name.trim() === '') {
    return {
      success: false,
      message: 'Name cannot be empty',
      found: false
    };
  }
  name = name.trim(); // Use trimmed name
  
  const { naughtyList: currentList } = loadNaughtyList(naughtyListPath, fsModule);
  
  // Find the person in the list (case-insensitive)
  const entryIndex = currentList.findIndex(entry => entry.name.toLowerCase() === name.toLowerCase());
  if (entryIndex === -1) {
    return {
      success: false,
      message: `${name} is not on the naughty list`,
      found: false
    };
  }
  
  const removedEntry = currentList.splice(entryIndex, 1)[0];
  const saved = saveNaughtyList(currentList, naughtyListPath, fsModule, pathModule);
  
  if (saved) {
    return {
      success: true,
      message: `${name} removed from naughty list`,
      removed: true,
      entry: removedEntry
    };
  } else {
    return {
      success: false,
      message: `Failed to save naughty list`,
      removed: false
    };
  }
}

/**
 * Check if a person is on the naughty list
 * @param {string} name - Name to check
 * @param {string} naughtyListPath - Path to naughty list file
 * @param {object} fsModule - Node.js fs module
 * @returns {boolean} True if person is on naughty list
 */
export function isOnNaughtyList(name, naughtyListPath, fsModule) {
  // Handle empty/invalid names
  if (!name || name.trim() === '') {
    return false;
  }
  name = name.trim(); // Use trimmed name
  
  const { naughtyList: currentList } = loadNaughtyList(naughtyListPath, fsModule);
  return currentList.some(entry => entry.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get formatted list of all people on naughty list
 * @param {string} naughtyListPath - Path to naughty list file
 * @param {object} fsModule - Node.js fs module
 * @returns {Array} Array of formatted strings with names and timestamps
 */
export function listNaughtyList(naughtyListPath, fsModule) {
  const { naughtyList: currentList } = loadNaughtyList(naughtyListPath, fsModule);
  
  if (currentList.length === 0) {
    return [];
  }
  
  return currentList.map(entry => {
    const date = new Date(entry.addedAt).toLocaleString();
    return `${entry.name} (added: ${date})`;
  });
}

/**
 * Search for names on the naughty list that start with the search term
 * @param {string} searchTerm - Search term
 * @param {string} naughtyListPath - Path to naughty list file
 * @param {object} fsModule - Node.js fs module
 * @returns {Array} Array of formatted strings with matching names and timestamps
 */
export function searchNaughtyList(searchTerm, naughtyListPath, fsModule) {
  const { naughtyList: currentList } = loadNaughtyList(naughtyListPath, fsModule);
  
  if (!searchTerm || searchTerm.trim() === '') {
    return [];
  }
  
  const matches = currentList.filter(entry => 
    entry.name.toLowerCase().startsWith(searchTerm.toLowerCase())
  );
  
  if (matches.length === 0) {
    return [];
  }
  
  return matches.map(entry => {
    const date = new Date(entry.addedAt).toLocaleString();
    return `${entry.name} (added: ${date})`;
  });
}

// Budget Management Functions
// These functions require Node.js modules and should only be used in Node.js contexts

// Budget configuration validation constants
const VALID_BUDGET_ACTIONS = ['add', 'list', 'status', 'edit'];
const VALID_BUDGET_EDIT_OPTIONS = ['--amount', '--from-date', '--to-date', '--description'];

/**
 * Parse budget specific arguments
 * @param {string[]} args - Array of command line arguments (without budget/b prefix)
 * @returns {Object} Budget configuration object
 */
export function parseBudgetArguments(args) {
  const config = {
    command: 'budget',
    action: null,        // 'add', 'edit', 'list', 'status'
    amount: null,
    fromDate: null,
    toDate: null,
    description: null,
    budgetId: null,
    updates: {},
    success: true,
    error: null
  };
  
  // If no arguments provided, default to status
  if (args.length === 0) {
    config.action = 'status';
    return config;
  }
  
  // Check for help flag first
  const firstArg = args[0];
  if (firstArg === '--help' || firstArg === '-h') {
    config.action = 'help';
    return config;
  }
  
  if (firstArg === 'add') {
    config.action = 'add';
    
    // Parse add arguments: add <amount> <from-date> <to-date> [description]
    if (args.length < 4) {
      config.success = false;
      config.error = 'add command requires: <amount> <from-date> <to-date> [description]';
      return config;
    }
    
    const amount = parseFloat(args[1]);
    if (isNaN(amount) || amount <= 0) {
      config.success = false;
      config.error = 'Amount must be a positive number';
      return config;
    }
    config.amount = amount;
    
    config.fromDate = args[2];
    config.toDate = args[3];
    
    // Optional description (can have spaces)
    if (args.length > 4) {
      config.description = args.slice(4).join(' ');
    }
    
  } else if (firstArg === 'list') {
    config.action = 'list';
    
  } else if (firstArg === 'status') {
    config.action = 'status';
    
  } else if (firstArg === 'edit') {
    config.action = 'edit';
    
    if (args.length < 2) {
      config.success = false;
      config.error = 'edit command requires budget ID';
      return config;
    }
    
    const budgetId = parseInt(args[1]);
    if (isNaN(budgetId)) {
      config.success = false;
      config.error = 'Budget ID must be a number';
      return config;
    }
    config.budgetId = budgetId;
    
    // Parse edit options
    for (let i = 2; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--amount') {
        const nextArg = args[i + 1];
        if (nextArg && !isNaN(nextArg)) {
          const amount = parseFloat(nextArg);
          if (amount > 0) {
            config.updates.amount = amount;
            i++; // Skip next argument
          } else {
            config.success = false;
            config.error = 'Amount must be positive';
            return config;
          }
        } else {
          config.success = false;
          config.error = '--amount requires a numeric value';
          return config;
        }
      } else if (arg === '--from-date') {
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          config.updates.fromDate = nextArg;
          i++;
        } else {
          config.success = false;
          config.error = '--from-date requires a date value (YYYY-MM-DD)';
          return config;
        }
      } else if (arg === '--to-date') {
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          config.updates.toDate = nextArg;
          i++;
        } else {
          config.success = false;
          config.error = '--to-date requires a date value (YYYY-MM-DD)';
          return config;
        }
      } else if (arg === '--description') {
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          config.updates.description = nextArg;
          i++;
        } else {
          config.success = false;
          config.error = '--description requires a description value';
          return config;
        }
      } else {
        config.success = false;
        config.error = `Unknown option: ${arg}. Valid options for edit: ${VALID_BUDGET_EDIT_OPTIONS.join(', ')}`;
        return config;
      }
    }
    
  } else {
    config.success = false;
    config.error = `Unknown budget action: ${firstArg}. Valid actions: ${VALID_BUDGET_ACTIONS.join(', ')}`;
  }
  
  return config;
}

/**
 * Get the path to the budget JSON file
 * @param {object} pathModule - Node.js path module
 * @param {object} osModule - Node.js os module
 * @returns {string} Path to budget file
 */
export function getBudgetPath(pathModule, osModule) {
  if (!pathModule || !osModule) {
    throw new Error('Path and os modules are required for budget operations');
  }
  return pathModule.join(osModule.homedir(), '.config', 'gift-calc', 'budgets.json');
}

/**
 * Load the budget list from file
 * @param {string} budgetPath - Path to budget file
 * @param {object} fsModule - Node.js fs module
 * @returns {Object} Object containing budgets array, nextId, and loaded boolean
 */
export function loadBudgetList(budgetPath, fsModule) {
  if (!fsModule) {
    throw new Error('fs module is required for budget operations');
  }
  
  if (fsModule.existsSync(budgetPath)) {
    try {
      const budgetData = fsModule.readFileSync(budgetPath, 'utf8');
      const parsed = JSON.parse(budgetData);
      return { 
        budgets: parsed.budgets || [], 
        nextId: parsed.nextId || 1,
        loaded: true 
      };
    } catch (error) {
      console.error(`Warning: Could not parse budget file at ${budgetPath}. Starting with empty budget list.`);
      return { budgets: [], nextId: 1, loaded: false };
    }
  }
  return { budgets: [], nextId: 1, loaded: false };
}

/**
 * Save the budget list to file
 * @param {Array} budgets - Array of budget objects
 * @param {number} nextId - Next ID to use for new budgets
 * @param {string} budgetPath - Path to budget file
 * @param {object} fsModule - Node.js fs module
 * @param {object} pathModule - Node.js path module
 * @returns {boolean} True if save was successful
 */
export function saveBudgetList(budgets, nextId, budgetPath, fsModule, pathModule) {
  if (!fsModule || !pathModule) {
    throw new Error('fs and path modules are required for budget operations');
  }
  
  try {
    // Ensure directory exists
    const configDir = pathModule.dirname(budgetPath);
    if (!fsModule.existsSync(configDir)) {
      fsModule.mkdirSync(configDir, { recursive: true });
    }
    
    const data = { budgets, nextId };
    fsModule.writeFileSync(budgetPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error saving budget list: ${error.message}`);
    return false;
  }
}

/**
 * Validate date format and range
 * @param {string} dateStr - Date string to validate (YYYY-MM-DD)
 * @returns {Object} Validation result with valid flag and parsed date
 */
export function validateDate(dateStr) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return { valid: false, error: 'Date must be in YYYY-MM-DD format' };
  }
  
  // Parse the date components
  const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
  
  // Create a date and check if it matches the input
  const date = new Date(year, month - 1, day); // month is 0-indexed
  
  // Verify the date components match (prevents auto-correction)
  if (date.getFullYear() !== year || 
      date.getMonth() !== month - 1 || 
      date.getDate() !== day) {
    return { valid: false, error: 'Invalid date' };
  }
  
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date' };
  }
  
  return { valid: true, date };
}

/**
 * Check for overlapping budget periods
 * @param {string} fromDate - Start date (YYYY-MM-DD)
 * @param {string} toDate - End date (YYYY-MM-DD)
 * @param {Array} existingBudgets - Array of existing budgets
 * @param {number|null} excludeId - Budget ID to exclude from overlap check (for editing)
 * @returns {Object} Validation result
 */
export function validateBudgetDates(fromDate, toDate, existingBudgets, excludeId = null) {
  // Validate date formats
  const fromValidation = validateDate(fromDate);
  if (!fromValidation.valid) {
    return { valid: false, error: `From date error: ${fromValidation.error}` };
  }
  
  const toValidation = validateDate(toDate);
  if (!toValidation.valid) {
    return { valid: false, error: `To date error: ${toValidation.error}` };
  }
  
  // Check if from date is before or equal to to date (allow same-day budgets)
  if (fromValidation.date > toValidation.date) {
    return { valid: false, error: 'From date must be before or equal to to date' };
  }
  
  // Check for overlaps with existing budgets
  const newFrom = fromValidation.date;
  const newTo = toValidation.date;
  
  for (const budget of existingBudgets) {
    // Skip if this is the budget being edited
    if (excludeId && budget.id === excludeId) {
      continue;
    }
    
    const existingFrom = new Date(budget.fromDate + 'T00:00:00');
    const existingTo = new Date(budget.toDate + 'T00:00:00');
    
    // Check for overlap
    if ((newFrom <= existingTo && newTo >= existingFrom)) {
      return { 
        valid: false, 
        error: `Budget period overlaps with existing budget: "${budget.description || 'Unnamed'}" (${budget.fromDate} to ${budget.toDate})` 
      };
    }
  }
  
  return { valid: true };
}

/**
 * Add a new budget
 * @param {number} amount - Budget amount
 * @param {string} fromDate - Start date (YYYY-MM-DD)
 * @param {string} toDate - End date (YYYY-MM-DD)
 * @param {string} description - Budget description
 * @param {string} budgetPath - Path to budget file
 * @param {object} fsModule - Node.js fs module
 * @param {object} pathModule - Node.js path module
 * @returns {Object} Result object with success, message, and budget data
 */
export function addBudget(amount, fromDate, toDate, description, budgetPath, fsModule, pathModule) {
  // Load existing budgets
  const { budgets: currentBudgets, nextId } = loadBudgetList(budgetPath, fsModule);
  
  // Validate dates and check for overlaps
  const validation = validateBudgetDates(fromDate, toDate, currentBudgets);
  if (!validation.valid) {
    return {
      success: false,
      message: validation.error
    };
  }
  
  // Create new budget entry
  const newBudget = {
    id: nextId,
    totalAmount: amount,
    fromDate,
    toDate,
    description: description || `Budget ${nextId}`,
    createdAt: new Date().toISOString()
  };
  
  currentBudgets.push(newBudget);
  const saved = saveBudgetList(currentBudgets, nextId + 1, budgetPath, fsModule, pathModule);
  
  if (saved) {
    return {
      success: true,
      message: `Budget "${newBudget.description}" added successfully (ID: ${newBudget.id})`,
      budget: newBudget
    };
  } else {
    return {
      success: false,
      message: 'Failed to save budget'
    };
  }
}

/**
 * Edit an existing budget
 * @param {number} budgetId - Budget ID to edit
 * @param {Object} updates - Updates to apply
 * @param {string} budgetPath - Path to budget file
 * @param {object} fsModule - Node.js fs module
 * @param {object} pathModule - Node.js path module
 * @returns {Object} Result object with success, message, and budget data
 */
export function editBudget(budgetId, updates, budgetPath, fsModule, pathModule) {
  // Load existing budgets
  const { budgets: currentBudgets, nextId } = loadBudgetList(budgetPath, fsModule);
  
  // Find the budget to edit
  const budgetIndex = currentBudgets.findIndex(b => b.id === budgetId);
  if (budgetIndex === -1) {
    return {
      success: false,
      message: `Budget with ID ${budgetId} not found`
    };
  }
  
  const budget = currentBudgets[budgetIndex];
  
  // Apply updates
  const updatedBudget = { ...budget };
  if (updates.amount !== undefined) updatedBudget.totalAmount = updates.amount;
  if (updates.fromDate !== undefined) updatedBudget.fromDate = updates.fromDate;
  if (updates.toDate !== undefined) updatedBudget.toDate = updates.toDate;
  if (updates.description !== undefined) updatedBudget.description = updates.description;
  
  // Validate dates if they were updated
  if (updates.fromDate !== undefined || updates.toDate !== undefined) {
    const validation = validateBudgetDates(updatedBudget.fromDate, updatedBudget.toDate, currentBudgets, budgetId);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.error
      };
    }
  }
  
  // Update the budget
  currentBudgets[budgetIndex] = updatedBudget;
  const saved = saveBudgetList(currentBudgets, nextId, budgetPath, fsModule, pathModule);
  
  if (saved) {
    return {
      success: true,
      message: `Budget "${updatedBudget.description}" updated successfully`,
      budget: updatedBudget
    };
  } else {
    return {
      success: false,
      message: 'Failed to save budget updates'
    };
  }
}

/**
 * Get current active budget status
 * @param {string} budgetPath - Path to budget file
 * @param {object} fsModule - Node.js fs module
 * @returns {Object} Status object with current budget info or null if none active
 */
export function getBudgetStatus(budgetPath, fsModule) {
  const { budgets } = loadBudgetList(budgetPath, fsModule);
  
  if (budgets.length === 0) {
    return {
      hasActiveBudget: false,
      message: 'No budgets configured. Use "budget add" to create one.'
    };
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Find active budget (today falls within the date range)
  const activeBudget = budgets.find(budget => {
    const fromDate = new Date(budget.fromDate + 'T00:00:00');
    const toDate = new Date(budget.toDate + 'T00:00:00');
    return today >= fromDate && today <= toDate;
  });
  
  if (!activeBudget) {
    return {
      hasActiveBudget: false,
      message: 'No active budget for today. Use "budget add" to create one.'
    };
  }
  
  // Calculate remaining days
  const toDate = new Date(activeBudget.toDate + 'T00:00:00');
  const remainingDays = Math.ceil((toDate - today) / (1000 * 60 * 60 * 24));
  
  return {
    hasActiveBudget: true,
    budget: activeBudget,
    remainingDays: remainingDays,
    totalDays: Math.ceil((new Date(activeBudget.toDate + 'T00:00:00') - new Date(activeBudget.fromDate + 'T00:00:00')) / (1000 * 60 * 60 * 24)) + 1
  };
}

/**
 * Get formatted list of all budgets with status
 * @param {string} budgetPath - Path to budget file
 * @param {object} fsModule - Node.js fs module
 * @returns {Array} Array of formatted budget strings with status
 */
export function listBudgets(budgetPath, fsModule) {
  const { budgets } = loadBudgetList(budgetPath, fsModule);
  
  if (budgets.length === 0) {
    return [];
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return budgets.map(budget => {
    const fromDate = new Date(budget.fromDate + 'T00:00:00');
    const toDate = new Date(budget.toDate + 'T00:00:00');
    
    let status;
    if (today > toDate) {
      status = 'EXPIRED';
    } else if (today < fromDate) {
      status = 'FUTURE';
    } else {
      status = 'ACTIVE';
    }
    
    return `${budget.id}. ${budget.description}: ${budget.totalAmount} (${budget.fromDate} to ${budget.toDate}) [${status}]`;
  });
}

/**
 * Format budget amount with currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted amount string
 */
export function formatBudgetAmount(amount, currency) {
  return `${amount} ${currency}`;
}

/**
 * Parse a single log entry line to extract gift calculation details
 * @param {string} logLine - Single line from the log file
 * @returns {Object|null} Parsed entry object or null if invalid
 */
export function parseLogEntry(logLine) {
  if (!logLine || typeof logLine !== 'string') {
    return null;
  }
  
  const trimmedLine = logLine.trim();
  if (!trimmedLine) {
    return null;
  }
  
  // Expected format: "2025-09-07T18:42:08.399Z 99.34 SEK for Alice"
  // or: "2025-09-07T18:42:08.399Z 99.34 SEK"
  const timestampMatch = trimmedLine.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+(.+)$/);
  if (!timestampMatch) {
    return null;
  }
  
  const timestamp = timestampMatch[1];
  const outputPart = timestampMatch[2];
  
  // Extract amount and currency
  // Formats to handle: "99.34 SEK for Alice", "99.34 SEK", "150.25 SEK for Bob (on naughty list!)"
  const amountMatch = outputPart.match(/^(\d+(?:\.\d+)?)\s+([A-Z]{3})(?:\s+for\s+(.+?))?(?:\s+\(.*\))?$/);
  if (!amountMatch) {
    return null;
  }
  
  const amount = parseFloat(amountMatch[1]);
  const currency = amountMatch[2];
  const recipient = amountMatch[3] || null;
  
  if (isNaN(amount)) {
    return null;
  }
  
  return {
    timestamp: new Date(timestamp),
    amount,
    currency,
    recipient,
    rawOutput: outputPart
  };
}

/**
 * Calculate budget usage from log file with currency filtering
 * @param {string} logPath - Path to the log file
 * @param {Object} activeBudget - Active budget object
 * @param {string} budgetCurrency - Currency to match for budget calculations
 * @param {object} fsModule - Node.js fs module
 * @returns {Object} Usage calculation result
 */
export function calculateBudgetUsage(logPath, activeBudget, budgetCurrency, fsModule) {
  const result = {
    totalSpent: 0,
    skippedEntries: [],
    hasSkippedCurrencies: false,
    errorMessage: null
  };
  
  // Check if log file exists
  if (!fsModule.existsSync(logPath)) {
    return result;
  }
  
  let logContent;
  try {
    logContent = fsModule.readFileSync(logPath, 'utf8');
  } catch (error) {
    result.errorMessage = `Could not read log file: ${error.message}`;
    return result;
  }
  
  const lines = logContent.split('\n').filter(line => line.trim());
  const budgetStartDate = new Date(activeBudget.fromDate + 'T00:00:00');
  const budgetEndDate = new Date(activeBudget.toDate + 'T23:59:59');
  
  for (const line of lines) {
    const entry = parseLogEntry(line);
    if (!entry) {
      continue; // Skip malformed lines silently
    }
    
    // Check if entry falls within budget period
    if (entry.timestamp < budgetStartDate || entry.timestamp > budgetEndDate) {
      continue;
    }
    
    // Check currency match
    if (entry.currency === budgetCurrency) {
      result.totalSpent += entry.amount;
    } else {
      // Track skipped entry
      result.skippedEntries.push({
        amount: entry.amount,
        currency: entry.currency,
        date: entry.timestamp.toISOString().split('T')[0], // YYYY-MM-DD format
        recipient: entry.recipient
      });
      result.hasSkippedCurrencies = true;
    }
  }
  
  return result;
}

/**
 * Format budget summary with currency warnings
 * @param {number} usedAmount - Amount spent in budget currency
 * @param {number} newAmount - Newly calculated amount to include
 * @param {number} totalBudget - Total budget amount
 * @param {number} remainingDays - Days remaining in budget period
 * @param {string} endDate - Budget end date (YYYY-MM-DD)
 * @param {string} currency - Budget currency
 * @param {boolean} hasSkippedCurrencies - Whether other currencies were found
 * @returns {string} Formatted budget summary
 */
export function formatBudgetSummary(usedAmount, newAmount, totalBudget, remainingDays, endDate, currency, hasSkippedCurrencies) {
  const totalUsed = usedAmount + newAmount;
  const remaining = totalBudget - totalUsed;
  const isOverBudget = totalUsed > totalBudget;
  
  let summary = '';
  
  if (isOverBudget) {
    const overAmount = totalUsed - totalBudget;
    summary = `⚠️  BUDGET EXCEEDED! Budget: ${formatBudgetAmount(totalBudget, currency)} | Used: ${formatBudgetAmount(totalUsed, currency)} | Over by: ${formatBudgetAmount(overAmount, currency)}`;
  } else {
    summary = `Budget: ${formatBudgetAmount(totalBudget, currency)} | Used: ${formatBudgetAmount(totalUsed, currency)} | Remaining: ${formatBudgetAmount(remaining, currency)}`;
  }
  
  summary += ` | Ends: ${endDate} (${remainingDays} day${remainingDays === 1 ? '' : 's'})`;
  
  if (hasSkippedCurrencies) {
    summary += ' [*mixed currencies]';
  }
  
  return summary;
}

/**
 * Format a matched gift for display
 * @param {Object} gift - Gift object from log parsing
 * @returns {string} Formatted string describing the matched gift
 */
export function formatMatchedGift(gift) {
  const date = new Date(gift.timestamp).toLocaleDateString();
  let matchText = `Matched previous gift: ${gift.amount} ${gift.currency}`;
  
  if (gift.recipient) {
    matchText += ` for ${gift.recipient}`;
  }
  
  matchText += ` (${date})`;
  return matchText;
}

/**
 * Find the last gift from the log file
 * @param {string} logPath - Path to the log file
 * @param {object} fsModule - Node.js fs module
 * @returns {Object|null} Last gift object or null if no valid entries found
 */
export function findLastGiftFromLog(logPath, fsModule) {
  if (!fsModule) {
    throw new Error('fs module is required for log operations');
  }
  
  // Check if log file exists
  if (!fsModule.existsSync(logPath)) {
    return null;
  }
  
  let logContent;
  try {
    logContent = fsModule.readFileSync(logPath, 'utf8');
  } catch (error) {
    return null;
  }
  
  const lines = logContent.split('\n').filter(line => line.trim());
  
  // Search backwards through the log for the most recent valid entry
  for (let i = lines.length - 1; i >= 0; i--) {
    const entry = parseLogEntry(lines[i]);
    if (entry) {
      return entry;
    }
  }
  
  return null;
}

/**
 * Find the last gift for a specific recipient from the log file
 * @param {string} recipientName - Name of the recipient to search for
 * @param {string} logPath - Path to the log file
 * @param {object} fsModule - Node.js fs module
 * @returns {Object|null} Last gift object for recipient or null if not found
 */
export function findLastGiftForRecipientFromLog(recipientName, logPath, fsModule) {
  if (!fsModule) {
    throw new Error('fs module is required for log operations');
  }
  
  if (!recipientName) {
    return null;
  }
  
  // Check if log file exists
  if (!fsModule.existsSync(logPath)) {
    return null;
  }
  
  let logContent;
  try {
    logContent = fsModule.readFileSync(logPath, 'utf8');
  } catch (error) {
    return null;
  }
  
  const lines = logContent.split('\n').filter(line => line.trim());
  
  // Search backwards through the log for the most recent gift to this recipient
  for (let i = lines.length - 1; i >= 0; i--) {
    const entry = parseLogEntry(lines[i]);
    if (entry && entry.recipient && entry.recipient.toLowerCase() === recipientName.toLowerCase()) {
      return entry;
    }
  }
  
  return null;
}

// Spending Tracking Functions
// These functions require Node.js modules and should only be used in Node.js contexts

// Spendings configuration validation constants
const VALID_SPENDING_OPTIONS = ['--from (-f)', '--to (-t)', '--days', '--weeks', '--months', '--years'];

/**
 * Parse spendings specific arguments
 * @param {string[]} args - Array of command line arguments (without spendings/s prefix)
 * @returns {Object} Spendings configuration object
 */
export function parseSpendingsArguments(args) {
  const config = {
    command: 'spendings',
    success: true,
    error: null,
    fromDate: null,
    toDate: null,
    days: null,
    weeks: null,
    months: null,
    years: null
  };
  
  // If no arguments provided, show help or default behavior
  if (args.length === 0) {
    config.success = false;
    config.error = 'No time period specified. Use --from/--to dates or --days/--weeks/--months/--years.';
    return config;
  }
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '-f' || arg === '--from') {
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        config.fromDate = nextArg;
        i++;
      } else {
        config.success = false;
        config.error = '--from requires a date value (YYYY-MM-DD)';
        return config;
      }
    } else if (arg === '-t' || arg === '--to') {
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        config.toDate = nextArg;
        i++;
      } else {
        config.success = false;
        config.error = '--to requires a date value (YYYY-MM-DD)';
        return config;
      }
    } else if (arg === '--days') {
      const nextArg = args[i + 1];
      if (nextArg && !isNaN(nextArg)) {
        const days = parseInt(nextArg);
        if (days > 0) {
          config.days = days;
          i++;
        } else {
          config.success = false;
          config.error = '--days must be a positive number';
          return config;
        }
      } else {
        config.success = false;
        config.error = '--days requires a numeric value';
        return config;
      }
    } else if (arg === '--weeks') {
      const nextArg = args[i + 1];
      if (nextArg && !isNaN(nextArg)) {
        const weeks = parseInt(nextArg);
        if (weeks > 0) {
          config.weeks = weeks;
          i++;
        } else {
          config.success = false;
          config.error = '--weeks must be a positive number';
          return config;
        }
      } else {
        config.success = false;
        config.error = '--weeks requires a numeric value';
        return config;
      }
    } else if (arg === '--months') {
      const nextArg = args[i + 1];
      if (nextArg && !isNaN(nextArg)) {
        const months = parseInt(nextArg);
        if (months > 0) {
          config.months = months;
          i++;
        } else {
          config.success = false;
          config.error = '--months must be a positive number';
          return config;
        }
      } else {
        config.success = false;
        config.error = '--months requires a numeric value';
        return config;
      }
    } else if (arg === '--years') {
      const nextArg = args[i + 1];
      if (nextArg && !isNaN(nextArg)) {
        const years = parseInt(nextArg);
        if (years > 0) {
          config.years = years;
          i++;
        } else {
          config.success = false;
          config.error = '--years must be a positive number';
          return config;
        }
      } else {
        config.success = false;
        config.error = '--years requires a numeric value';
        return config;
      }
    } else {
      config.success = false;
      config.error = `Unknown argument: ${arg}. Valid options: ${VALID_SPENDING_OPTIONS.join(', ')}`;
      return config;
    }
  }
  
  // Validate configuration - ensure exactly one time period method is specified
  const hasFromDate = config.fromDate !== null;
  const hasToDate = config.toDate !== null;
  const absoluteMethod = hasFromDate && hasToDate;
  const partialAbsolute = hasFromDate || hasToDate;
  const relativeMethod = config.days || config.weeks || config.months || config.years;
  
  // Check for mixing methods first (highest priority)
  if (partialAbsolute && relativeMethod) {
    config.success = false;
    config.error = 'Cannot combine absolute dates (--from/--to) with relative periods (--days/--weeks/--months/--years)';
    return config;
  }
  
  // Check for incomplete absolute date specification
  if (partialAbsolute && !absoluteMethod) {
    config.success = false;
    config.error = 'Both --from and --to dates are required for absolute date range';
    return config;
  }
  
  // Check that at least one method is specified
  if (!absoluteMethod && !relativeMethod) {
    config.success = false;
    config.error = 'Must specify either absolute dates (--from/--to) or relative period (--days/--weeks/--months/--years)';
    return config;
  }
  
  // Ensure only one relative period is specified
  const relativeCount = [config.days, config.weeks, config.months, config.years].filter(v => v !== null).length;
  if (relativeCount > 1) {
    config.success = false;
    config.error = 'Can only specify one relative period (--days, --weeks, --months, or --years)';
    return config;
  }
  
  return config;
}

/**
 * Calculate relative date from current date
 * @param {string} timeUnit - Time unit: 'days', 'weeks', 'months', 'years'
 * @param {number} timeValue - Number of time units
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function calculateRelativeDate(timeUnit, timeValue) {
  const now = new Date();
  let fromDate = new Date(now);
  
  switch (timeUnit) {
    case 'days':
      fromDate.setDate(now.getDate() - timeValue);
      break;
    case 'weeks':
      fromDate.setDate(now.getDate() - (timeValue * 7));
      break;
    case 'months':
      fromDate.setMonth(now.getMonth() - timeValue);
      break;
    case 'years':
      fromDate.setFullYear(now.getFullYear() - timeValue);
      break;
    default:
      throw new Error(`Unknown time unit: ${timeUnit}`);
  }
  
  // Format as YYYY-MM-DD
  return fromDate.toISOString().split('T')[0];
}

/**
 * Get spendings between dates from log file
 * @param {string} logPath - Path to the log file
 * @param {string} fromDate - Start date (YYYY-MM-DD)
 * @param {string} toDate - End date (YYYY-MM-DD)
 * @param {object} fsModule - Node.js fs module
 * @returns {Object} Spendings data with entries grouped by currency
 */
export function getSpendingsBetweenDates(logPath, fromDate, toDate, fsModule) {
  const result = {
    entries: [],
    currencyTotals: {},
    errorMessage: null,
    hasData: false
  };
  
  // Check if log file exists
  if (!fsModule.existsSync(logPath)) {
    result.errorMessage = 'No spending data found. Start logging with gift calculations to track spending.';
    return result;
  }
  
  let logContent;
  try {
    logContent = fsModule.readFileSync(logPath, 'utf8');
  } catch (error) {
    result.errorMessage = `Could not read log file: ${error.message}`;
    return result;
  }
  
  const lines = logContent.split('\n').filter(line => line.trim());
  const startDate = new Date(fromDate + 'T00:00:00');
  const endDate = new Date(toDate + 'T23:59:59');
  
  for (const line of lines) {
    const entry = parseLogEntry(line);
    if (!entry) {
      continue;
    }
    
    // Check if entry falls within specified date range
    if (entry.timestamp >= startDate && entry.timestamp <= endDate) {
      result.entries.push(entry);
      result.hasData = true;
      
      // Update currency totals
      if (!result.currencyTotals[entry.currency]) {
        result.currencyTotals[entry.currency] = 0;
      }
      result.currencyTotals[entry.currency] += entry.amount;
    }
  }
  
  // Sort entries chronologically
  result.entries.sort((a, b) => a.timestamp - b.timestamp);
  
  if (!result.hasData) {
    result.errorMessage = `No spending found for the specified period (${fromDate} to ${toDate}).`;
  }
  
  return result;
}

/**
 * Format spendings output with totals and itemized list
 * @param {Object} spendingsData - Data from getSpendingsBetweenDates
 * @param {string} fromDate - Start date (YYYY-MM-DD)
 * @param {string} toDate - End date (YYYY-MM-DD)
 * @returns {string} Formatted output string
 */
export function formatSpendingsOutput(spendingsData, fromDate, toDate) {
  if (spendingsData.errorMessage) {
    return spendingsData.errorMessage;
  }
  
  const currencies = Object.keys(spendingsData.currencyTotals);
  let output = '';
  
  // Format title with date range
  if (currencies.length === 1) {
    const currency = currencies[0];
    const total = spendingsData.currencyTotals[currency];
    output += `Total Spending (${fromDate} to ${toDate}): ${formatBudgetAmount(total, currency)}\n\n`;
  } else {
    output += `Total Spending (${fromDate} to ${toDate}):\n`;
    for (const currency of currencies.sort()) {
      const total = spendingsData.currencyTotals[currency];
      output += `  ${formatBudgetAmount(total, currency)}\n`;
    }
    output += '\n';
  }
  
  // Group entries by currency for display
  const entriesByCurrency = {};
  for (const entry of spendingsData.entries) {
    if (!entriesByCurrency[entry.currency]) {
      entriesByCurrency[entry.currency] = [];
    }
    entriesByCurrency[entry.currency].push(entry);
  }
  
  // Display itemized list
  if (currencies.length === 1) {
    // Single currency - no currency headers
    const currency = currencies[0];
    for (const entry of entriesByCurrency[currency]) {
      const date = entry.timestamp.toISOString().split('T')[0];
      const recipientPart = entry.recipient ? ` for ${entry.recipient}` : '';
      output += `${date}  ${formatBudgetAmount(entry.amount, entry.currency)}${recipientPart}\n`;
    }
  } else {
    // Multi-currency - show currency headers
    for (const currency of currencies.sort()) {
      output += `${currency}:\n`;
      for (const entry of entriesByCurrency[currency]) {
        const date = entry.timestamp.toISOString().split('T')[0];
        const recipientPart = entry.recipient ? ` for ${entry.recipient}` : '';
        output += `${date}  ${formatBudgetAmount(entry.amount, entry.currency)}${recipientPart}\n`;
      }
      output += '\n';
    }
  }
  
  return output.trim();
}

// Person Configuration Functions
// These functions require Node.js modules and should only be used in Node.js contexts

// Person configuration validation constants
const VALID_SORT_FIELDS = ['name', 'nice-score', 'friend-score', 'base-value', 'currency'];
const VALID_SORT_ORDERS = ['asc', 'desc'];
const VALID_PERSON_ACTIONS = ['set', 'clear', 'list'];

/**
 * Parse person specific arguments
 * @param {string[]} args - Array of command line arguments (without person/p prefix)
 * @returns {Object} Person configuration object
 */
export function parsePersonArguments(args) {
  const config = {
    command: 'person',
    action: null,        // 'set', 'clear', 'list'
    name: null,
    niceScore: null,
    friendScore: null,
    baseValue: null,
    currency: null,
    sortBy: 'name',      // Default sort
    order: 'asc',        // Default order
    success: true,
    error: null
  };
  
  // If no arguments provided, show help
  if (args.length === 0) {
    config.success = false;
    config.error = 'No action specified. Use "set", "clear", or "list".';
    return config;
  }
  
  const firstArg = args[0];
  
  if (firstArg === 'set') {
    config.action = 'set';
    
    // Parse set options
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      
      if ((arg === '--name' || arg === '-n') && args[i + 1]) {
        config.name = args[i + 1];
        i++;
      } else if ((arg === '--nice-score' || arg === '-s') && args[i + 1]) {
        const score = parseFloat(args[i + 1]);
        if (score >= 0 && score <= 10) {
          config.niceScore = score;
          i++;
        } else {
          config.success = false;
          config.error = 'Nice score must be between 0 and 10';
          return config;
        }
      } else if ((arg === '--friend-score' || arg === '-f') && args[i + 1]) {
        const score = parseFloat(args[i + 1]);
        if (score >= 1 && score <= 10) {
          config.friendScore = score;
          i++;
        } else {
          config.success = false;
          config.error = 'Friend score must be between 1 and 10';
          return config;
        }
      } else if ((arg === '--base-value' || arg === '-b') && args[i + 1]) {
        const value = parseFloat(args[i + 1]);
        if (value > 0) {
          config.baseValue = value;
          i++;
        } else {
          config.success = false;
          config.error = 'Base value must be positive';
          return config;
        }
      } else if ((arg === '--currency' || arg === '-c') && args[i + 1]) {
        config.currency = args[i + 1].toUpperCase();
        i++;
      } else {
        config.success = false;
        config.error = `Unknown option: ${arg}. Valid options for set: --name (-n), --nice-score (-s), --friend-score (-f), --base-value (-b), --currency (-c)`;
        return config;
      }
    }
    
    // Validate required fields
    if (!config.name) {
      config.success = false;
      config.error = 'Person name is required for person set command';
      return config;
    }
    
  } else if (firstArg === 'clear') {
    config.action = 'clear';
    
    // Parse clear options
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      
      if ((arg === '--name' || arg === '-n') && args[i + 1]) {
        config.name = args[i + 1];
        i++;
      } else {
        config.success = false;
        config.error = `Unknown option: ${arg}. Valid option for clear: --name (-n)`;
        return config;
      }
    }
    
    if (!config.name) {
      config.success = false;
      config.error = 'Person name is required for person clear command';
      return config;
    }
    
  } else if (firstArg === 'list') {
    config.action = 'list';
    
    // Parse list options
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      
      if ((arg === '--sort-by' || arg === '-s') && args[i + 1]) {
        const field = args[i + 1];
        if (VALID_SORT_FIELDS.includes(field)) {
          config.sortBy = field;
          i++;
        } else {
          config.success = false;
          config.error = `Invalid sort field: ${field}. Valid options: ${VALID_SORT_FIELDS.join(', ')}`;
          return config;
        }
      } else if ((arg === '--order' || arg === '-o') && args[i + 1]) {
        const order = args[i + 1];
        if (VALID_SORT_ORDERS.includes(order)) {
          config.order = order;
          i++;
        } else {
          config.success = false;
          config.error = `Invalid order: ${order}. Valid options: ${VALID_SORT_ORDERS.join(', ')}`;
          return config;
        }
      } else if (arg === '--reverse' || arg === '-r') {
        config.order = 'desc';
      } else {
        config.success = false;
        config.error = `Unknown option: ${arg}. Valid options for list: --sort-by (-s), --order (-o), --reverse (-r)`;
        return config;
      }
    }
    
  } else {
    config.success = false;
    config.error = `Unknown person action: ${firstArg}. Valid actions: ${VALID_PERSON_ACTIONS.join(', ')}`;
  }
  
  return config;
}

/**
 * Get the path to the person configuration JSON file
 * @param {object} pathModule - Node.js path module
 * @param {object} osModule - Node.js os module
 * @returns {string} Path to person config file
 */
export function getPersonConfigPath(pathModule, osModule) {
  if (!pathModule || !osModule) {
    throw new Error('Path and os modules are required for person config operations');
  }
  return pathModule.join(osModule.homedir(), '.config', 'gift-calc', 'persons.json');
}

/**
 * Load the person configuration from file
 * @param {string} personConfigPath - Path to person config file
 * @param {object} fsModule - Node.js fs module
 * @returns {Object} Object containing persons and loaded boolean
 */
export function loadPersonConfig(personConfigPath, fsModule) {
  if (!fsModule) {
    throw new Error('fs module is required for person config operations');
  }
  
  if (fsModule.existsSync(personConfigPath)) {
    try {
      const configData = fsModule.readFileSync(personConfigPath, 'utf8');
      const parsed = JSON.parse(configData);
      return { 
        persons: parsed.persons || {}, 
        loaded: true 
      };
    } catch (error) {
      console.error(`Warning: Could not parse person config file at ${personConfigPath}. Starting with empty config.`);
      return { persons: {}, loaded: false };
    }
  }
  return { persons: {}, loaded: false };
}

/**
 * Save the person configuration to file
 * @param {Object} persons - Object containing person configurations
 * @param {string} personConfigPath - Path to person config file
 * @param {object} fsModule - Node.js fs module
 * @param {object} pathModule - Node.js path module
 * @returns {boolean} True if save was successful
 */
export function savePersonConfig(persons, personConfigPath, fsModule, pathModule) {
  if (!fsModule || !pathModule) {
    throw new Error('fs and path modules are required for person config operations');
  }
  
  try {
    // Ensure directory exists
    const configDir = pathModule.dirname(personConfigPath);
    if (!fsModule.existsSync(configDir)) {
      fsModule.mkdirSync(configDir, { recursive: true });
    }
    
    const data = { persons };
    fsModule.writeFileSync(personConfigPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error saving person config: ${error.message}`);
    return false;
  }
}

/**
 * Set person configuration
 * @param {string} name - Person name
 * @param {Object} personData - Person configuration data
 * @param {string} personConfigPath - Path to person config file
 * @param {object} fsModule - Node.js fs module
 * @param {object} pathModule - Node.js path module
 * @returns {Object} Result object with success and message
 */
export function setPersonConfig(name, personData, personConfigPath, fsModule, pathModule) {
  if (!name || name.trim() === '') {
    return {
      success: false,
      message: 'Name cannot be empty'
    };
  }

  // Sanitize name by trimming whitespace
  const trimmedName = name.trim();

  const { persons } = loadPersonConfig(personConfigPath, fsModule);
  const key = trimmedName.toLowerCase();
  
  // Preserve existing values and update with new ones
  const existingData = persons[key] || {};
  const updatedData = {
    name: trimmedName, // Use the trimmed name with proper casing
    niceScore: personData.niceScore !== undefined ? personData.niceScore : existingData.niceScore,
    friendScore: personData.friendScore !== undefined ? personData.friendScore : existingData.friendScore,
    baseValue: personData.baseValue !== undefined ? personData.baseValue : existingData.baseValue,
    currency: personData.currency !== undefined ? personData.currency : existingData.currency
  };
  
  persons[key] = updatedData;
  
  const saved = savePersonConfig(persons, personConfigPath, fsModule, pathModule);
  
  if (saved) {
    return {
      success: true,
      message: `Person configuration saved for ${trimmedName}`,
      person: updatedData
    };
  } else {
    return {
      success: false,
      message: 'Failed to save person configuration'
    };
  }
}

/**
 * Clear person configuration
 * @param {string} name - Person name
 * @param {string} personConfigPath - Path to person config file
 * @param {object} fsModule - Node.js fs module
 * @param {object} pathModule - Node.js path module
 * @returns {Object} Result object with success and message
 */
export function clearPersonConfig(name, personConfigPath, fsModule, pathModule) {
  if (!name || name.trim() === '') {
    return {
      success: false,
      message: 'Name cannot be empty'
    };
  }

  // Sanitize name by trimming whitespace
  const trimmedName = name.trim();

  const { persons } = loadPersonConfig(personConfigPath, fsModule);
  const key = trimmedName.toLowerCase();
  
  if (!persons[key]) {
    return {
      success: false,
      message: `Person configuration for ${trimmedName} not found`
    };
  }
  
  delete persons[key];
  
  const saved = savePersonConfig(persons, personConfigPath, fsModule, pathModule);
  
  if (saved) {
    return {
      success: true,
      message: `Person configuration cleared for ${trimmedName}`
    };
  } else {
    return {
      success: false,
      message: 'Failed to save person configuration'
    };
  }
}

/**
 * List all person configurations with optional sorting
 * @param {string} personConfigPath - Path to person config file
 * @param {object} fsModule - Node.js fs module
 * @param {string} sortBy - Field to sort by
 * @param {string} order - Sort order (asc/desc)
 * @returns {Array} Array of formatted person strings
 */
export function listPersonConfigs(personConfigPath, fsModule, sortBy = 'name', order = 'asc') {
  const { persons } = loadPersonConfig(personConfigPath, fsModule);
  
  if (Object.keys(persons).length === 0) {
    return [];
  }
  
  // Convert to array and sort
  const personArray = Object.values(persons);
  const sortedPersons = sortPersons(personArray, sortBy, order);
  
  return sortedPersons.map(person => {
    const parts = [];
    parts.push(`${person.name}:`);
    
    if (person.niceScore !== undefined) parts.push(`nice-score=${person.niceScore}`);
    if (person.friendScore !== undefined) parts.push(`friend-score=${person.friendScore}`);
    if (person.baseValue !== undefined) parts.push(`base-value=${person.baseValue}`);
    if (person.currency !== undefined) parts.push(`currency=${person.currency}`);
    
    return parts.join(' ');
  });
}

/**
 * Sort persons array by specified field and order
 * @param {Array} persons - Array of person objects
 * @param {string} sortBy - Field to sort by
 * @param {string} order - Sort order (asc/desc)
 * @returns {Array} Sorted array
 */
export function sortPersons(persons, sortBy, order) {
  const sortedPersons = [...persons].sort((a, b) => {
    let aVal, bVal;
    
    switch (sortBy) {
      case 'name':
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case 'nice-score':
        aVal = a.niceScore || 0;
        bVal = b.niceScore || 0;
        break;
      case 'friend-score':
        aVal = a.friendScore || 0;
        bVal = b.friendScore || 0;
        break;
      case 'base-value':
        aVal = a.baseValue || 0;
        bVal = b.baseValue || 0;
        break;
      case 'currency':
        aVal = a.currency || '';
        bVal = b.currency || '';
        break;
      default:
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
    }
    
    if (typeof aVal === 'string') {
      return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    } else {
      return order === 'asc' ? aVal - bVal : bVal - aVal;
    }
  });
  
  return sortedPersons;
}

/**
 * Get person configuration by name
 * @param {string} name - Person name
 * @param {string} personConfigPath - Path to person config file
 * @param {object} fsModule - Node.js fs module
 * @returns {Object|null} Person configuration or null if not found
 */
export function getPersonConfig(name, personConfigPath, fsModule) {
  if (!name || name.trim() === '') {
    return null;
  }

  // Sanitize name by trimming whitespace
  const trimmedName = name.trim();

  const { persons } = loadPersonConfig(personConfigPath, fsModule);
  const key = trimmedName.toLowerCase();
  
  return persons[key] || null;
}

// Toplist Functions
// Functions for ranking persons by total gifts, nice score, or friend score

/**
 * Parse toplist specific arguments
 * @param {string[]} args - Array of command line arguments (without toplist/tl prefix)
 * @returns {Object} Toplist configuration object
 */
export function parseToplistArguments(args) {
  const config = {
    command: 'toplist',
    success: true,
    error: null,
    sortBy: 'total',      // 'total', 'nice-score', 'friend-score'
    length: 10,           // Default top 10
    currency: null,       // Filter by specific currency
    listCurrencies: false, // Show available currencies
    multiCurrency: false  // Show separate toplists for each currency
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-n' || arg === '--nice-score') {
      config.sortBy = 'nice-score';
    } else if (arg === '-f' || arg === '--friend-score') {
      config.sortBy = 'friend-score';
    } else if (arg === '-l' || arg === '--length') {
      const nextArg = args[i + 1];
      if (nextArg && !isNaN(nextArg)) {
        const length = parseInt(nextArg);
        if (length > 0) {
          config.length = length;
          i++;
        } else {
          config.success = false;
          config.error = '--length must be a positive number';
          return config;
        }
      } else {
        config.success = false;
        config.error = '--length requires a numeric value';
        return config;
      }
    } else if (arg === '-c' || arg === '--currency') {
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        config.currency = nextArg.toUpperCase();
        i++;
      } else {
        config.success = false;
        config.error = '--currency requires a currency code (e.g., SEK, USD, EUR)';
        return config;
      }
    } else if (arg === '--list-currencies') {
      config.listCurrencies = true;
    } else if (arg === '--multi-currency') {
      config.multiCurrency = true;
    } else {
      config.success = false;
      config.error = `Unknown argument: ${arg}. Valid options: --nice-score (-n), --friend-score (-f), --length (-l), --currency (-c), --list-currencies, --multi-currency`;
      return config;
    }
  }

  return config;
}

/**
 * Get toplist data by aggregating person configs and gift log data
 * @param {string} personConfigPath - Path to person config file
 * @param {string} logPath - Path to gift log file
 * @param {object} fsModule - Node.js fs module
 * @returns {Object} Toplist data with persons and their total gifts
 */
export function getToplistData(personConfigPath, logPath, fsModule) {
  const result = {
    persons: [],
    currencies: new Set(),
    errorMessage: null
  };

  // Load person configurations
  const { persons } = loadPersonConfig(personConfigPath, fsModule);

  // Calculate gift totals per person from log
  const giftTotals = {};

  if (fsModule.existsSync(logPath)) {
    try {
      const logContent = fsModule.readFileSync(logPath, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const entry = parseLogEntry(line);
        if (entry && entry.recipient) {
          const recipientKey = entry.recipient.toLowerCase();
          if (!giftTotals[recipientKey]) {
            giftTotals[recipientKey] = {};
          }

          // Group by currency
          const currency = entry.currency;
          result.currencies.add(currency);
          if (!giftTotals[recipientKey][currency]) {
            giftTotals[recipientKey][currency] = 0;
          }
          giftTotals[recipientKey][currency] += entry.amount;
        }
      }
    } catch (error) {
      result.errorMessage = `Could not read log file: ${error.message}`;
      return result;
    }
  }

  // Combine person data with gift totals
  const personKeys = new Set([...Object.keys(persons), ...Object.keys(giftTotals)]);

  for (const personKey of personKeys) {
    const personConfig = persons[personKey] || {};
    const personGifts = giftTotals[personKey] || {};

    // Use person config name if available, otherwise capitalize the key
    const displayName = personConfig.name || personKey.charAt(0).toUpperCase() + personKey.slice(1);

    result.persons.push({
      name: displayName,
      niceScore: personConfig.niceScore,
      friendScore: personConfig.friendScore,
      baseValue: personConfig.baseValue,
      currency: personConfig.currency,
      gifts: personGifts
    });
  }

  // Convert currencies Set to sorted array
  result.currencies = Array.from(result.currencies).sort();

  return result;
}

/**
 * Format toplist output with ranking and clean display
 * @param {Array} persons - Array of person objects with gift data
 * @param {string} sortBy - Sort criteria: 'total', 'nice-score', 'friend-score'
 * @param {number} length - Number of results to show
 * @param {Array} availableCurrencies - Array of currencies found in the dataset
 * @param {string|null} currencyFilter - Optional currency to filter by
 * @returns {string} Formatted toplist output
 */
export function formatToplistOutput(persons, sortBy, length, availableCurrencies = [], currencyFilter = null) {
  if (persons.length === 0) {
    return 'No persons found in configuration or gift history.';
  }

  // Handle --list-currencies case
  if (availableCurrencies.length > 0 && currencyFilter === 'LIST_CURRENCIES') {
    if (availableCurrencies.length === 0) {
      return 'No currencies found in gift history.';
    }
    return `Available currencies in dataset: ${availableCurrencies.join(', ')}`;
  }

  // If sorting by scores, show all persons regardless of currency
  if (sortBy === 'nice-score' || sortBy === 'friend-score') {
    return formatScoreBasedToplist(persons, sortBy, length);
  }

  // For total gifts sorting, handle currencies
  if (currencyFilter) {
    // Single currency filter - show only that currency
    return formatSingleCurrencyToplist(persons, sortBy, length, currencyFilter);
  } else if (availableCurrencies.length <= 1) {
    // Single currency in dataset (or no currencies) - use original behavior
    return formatSingleCurrencyToplist(persons, sortBy, length, null);
  } else {
    // Multiple currencies - show separate toplists for each currency
    return formatMultiCurrencyToplist(persons, sortBy, length, availableCurrencies);
  }
}

/**
 * Format toplist for score-based sorting (nice-score, friend-score)
 */
function formatScoreBasedToplist(persons, sortBy, length) {
  const sortedPersons = [...persons].sort((a, b) => {
    if (sortBy === 'nice-score') {
      const aScore = a.niceScore !== undefined ? a.niceScore : -1;
      const bScore = b.niceScore !== undefined ? b.niceScore : -1;
      return bScore - aScore;
    } else if (sortBy === 'friend-score') {
      const aScore = a.friendScore !== undefined ? a.friendScore : -1;
      const bScore = b.friendScore !== undefined ? b.friendScore : -1;
      return bScore - aScore;
    }
    return 0;
  });

  const topPersons = sortedPersons.slice(0, length);
  const sortLabel = sortBy === 'nice-score' ? 'Nice Score' : 'Friend Score';

  let output = `Top ${topPersons.length} Persons (${sortLabel}):\n\n`;

  topPersons.forEach((person, index) => {
    const rank = index + 1;
    let line = `${rank}. ${person.name}`;

    if (sortBy === 'nice-score') {
      const score = person.niceScore !== undefined ? person.niceScore : 'N/A';
      line += `: ${score}`;
      if (person.friendScore !== undefined) line += ` (friend: ${person.friendScore})`;
    } else if (sortBy === 'friend-score') {
      const score = person.friendScore !== undefined ? person.friendScore : 'N/A';
      line += `: ${score}`;
      if (person.niceScore !== undefined) line += ` (nice: ${person.niceScore})`;
    }

    output += line + '\n';
  });

  return output.trim();
}

/**
 * Format toplist for a single currency
 */
function formatSingleCurrencyToplist(persons, sortBy, length, currency) {
  if (persons.length === 0) {
    return currency
      ? `No persons found with gifts in ${currency}.`
      : 'No persons found in configuration or gift history.';
  }

  // When currency is specified, we still include all persons but sort by that currency's amount
  // When currency is null, we use the original behavior
  const sortedPersons = [...persons].sort((a, b) => {
    if (currency) {
      const aAmount = a.gifts && a.gifts[currency] || 0;
      const bAmount = b.gifts && b.gifts[currency] || 0;
      return bAmount - aAmount;
    } else {
      const aAmount = calculateTotalGiftValue(a.gifts);
      const bAmount = calculateTotalGiftValue(b.gifts);
      return bAmount - aAmount;
    }
  });

  // When no currency filter, include all persons (original behavior)
  // When currency filter is specified, only show persons with gifts in that currency
  const relevantPersons = currency
    ? sortedPersons.filter(person => person.gifts && person.gifts[currency] > 0)
    : sortedPersons;

  if (relevantPersons.length === 0) {
    return currency
      ? `No persons found with gifts in ${currency}.`
      : 'No persons found in configuration or gift history.';
  }

  const topPersons = relevantPersons.slice(0, length);
  const currencyLabel = currency ? ` - ${currency}` : '';

  let output = `Top ${topPersons.length} Persons (Total Gifts${currencyLabel}):\n\n`;

  topPersons.forEach((person, index) => {
    const rank = index + 1;
    let line = `${rank}. ${person.name}`;

    if (currency && person.gifts && person.gifts[currency]) {
      line += `: ${formatBudgetAmount(person.gifts[currency], currency)}`;
    } else {
      const giftSummary = formatGiftSummary(person.gifts);
      line += `: ${giftSummary}`;
    }

    // Add scores if available
    const scores = [];
    if (person.niceScore !== undefined) scores.push(`nice: ${person.niceScore}`);
    if (person.friendScore !== undefined) scores.push(`friend: ${person.friendScore}`);
    if (scores.length > 0) line += ` (${scores.join(', ')})`;

    output += line + '\n';
  });

  return output.trim();
}

/**
 * Format toplist with separate sections for each currency
 */
function formatMultiCurrencyToplist(persons, sortBy, length, availableCurrencies) {
  let output = '';

  for (let currencyIndex = 0; currencyIndex < availableCurrencies.length; currencyIndex++) {
    const currency = availableCurrencies[currencyIndex];

    if (currencyIndex > 0) {
      output += '\n\n';
    }

    const currencyToplist = formatSingleCurrencyToplist(persons, sortBy, length, currency);
    output += currencyToplist;
  }

  return output;
}

/**
 * Calculate total monetary value from gift amounts (for sorting)
 * @param {Object} gifts - Object with currency->amount mappings
 * @returns {number} Approximate total value for sorting
 */
function calculateTotalGiftValue(gifts) {
  if (!gifts || Object.keys(gifts).length === 0) {
    return 0;
  }

  // For sorting purposes, sum all amounts regardless of currency
  // This is a simplification but works for relative ranking
  return Object.values(gifts).reduce((sum, amount) => sum + amount, 0);
}

/**
 * Format gift summary for display
 * @param {Object} gifts - Object with currency->amount mappings
 * @returns {string} Formatted gift summary
 */
function formatGiftSummary(gifts) {
  if (!gifts || Object.keys(gifts).length === 0) {
    return '0';
  }

  const currencies = Object.keys(gifts).sort();

  if (currencies.length === 1) {
    const currency = currencies[0];
    return `${formatBudgetAmount(gifts[currency], currency)}`;
  } else {
    const parts = currencies.map(currency => `${formatBudgetAmount(gifts[currency], currency)}`);
    return parts.join(', ');
  }
}