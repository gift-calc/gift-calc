// Gift Calculator Core Logic - Web Compatible Version
// Pure calculation functions with no Node.js dependencies
// Compatible with browsers (no ES modules)

/**
 * Calculate gift amount with variation, friend score, and nice score influences
 * @param {number} base - Base gift amount
 * @param {number} variationPercent - Variation percentage (0-100)
 * @param {number} friendScore - Friend score (1-10)
 * @param {number} niceScore - Nice score (0-10)
 * @param {number} decimalPlaces - Number of decimal places for rounding
 * @returns {number} Calculated gift amount
 */
function calculateGiftAmount(base, variationPercent, friendScore, niceScore, decimalPlaces) {
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
function calculateFinalAmount(baseValue, variation, friendScore, niceScore, decimals, useMaximum = false, useMinimum = false) {
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
 * @param {Object} defaultConfig - Default configuration object
 * @returns {Object} Parsed configuration object
 */
function parseArguments(args, defaultConfig = {}) {
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
    command: null
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
  
  if (args[0] === '--version') {
    config.command = 'version';
    return config;
  }
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '-h' || arg === '--help') {
      config.showHelp = true;
      break;
    }
    
    if (arg === '--version') {
      config.command = 'version';
      break;
    }
    
    if (arg === '-b' || arg === '--basevalue') {
      const nextArg = args[i + 1];
      if (nextArg && !isNaN(nextArg)) {
        config.baseValue = parseFloat(nextArg);
        i++; // Skip the next argument as it's the value
      } else {
        throw new Error('-b/--basevalue requires a numeric value');
      }
    }
    
    if (arg === '-v' || arg === '--variation') {
      const nextArg = args[i + 1];
      if (nextArg && !isNaN(nextArg)) {
        const varValue = parseFloat(nextArg);
        if (varValue >= 0 && varValue <= 100) {
          config.variation = varValue;
          i++; // Skip the next argument as it's the value
        } else {
          throw new Error('-v/--variation must be between 0 and 100');
        }
      } else {
        throw new Error('-v/--variation requires a numeric value');
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
    
    if (arg === '-cp' || arg === '--copy') {
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
  }
  
  return config;
}

/**
 * Format gift amount output with currency and optional recipient name
 * @param {number} amount - Gift amount
 * @param {string} currency - Currency code
 * @param {string|null} recipientName - Optional recipient name
 * @returns {string} Formatted output string
 */
function formatOutput(amount, currency, recipientName = null) {
  let output = `${amount} ${currency}`;
  if (recipientName) {
    output += ` for ${recipientName}`;
  }
  return output;
}

/**
 * Get help text for the gift calculator
 * @returns {string} Help text
 */
function getHelpText() {
  return `
Gift Calculator - CLI Tool

DESCRIPTION:
  A CLI tool that suggests a gift amount based on a base value with 
  configurable random variation, friend score, and nice score influences.

USAGE:
  gift-calc [options]
  gift-calc init-config
  gift-calc update-config
  gift-calc log
  gcalc [options]              # Short alias

COMMANDS:
  init-config                 Setup configuration file with default values
  update-config               Update existing configuration file
  log                         Open gift calculation log file with less

OPTIONS:
  -b, --basevalue <number>    Set the base value for gift calculation (default: 70)
  -v, --variation <percent>   Set variation percentage (0-100, default: 20)
  -f, --friend-score <1-10>   Friend score affecting gift amount bias (default: 5)
                              Higher scores increase chance of higher amounts
  -n, --nice-score <0-10>     Nice score affecting gift amount bias (default: 5)
                              0=no gift, 1-3=fixed reductions, 4-10=bias amounts
  -c, --currency <code>       Currency code to display (default: SEK)
  -d, --decimals <0-10>       Number of decimal places (default: 2)
  --name <name>               Name of gift recipient to include in output
  --max                       Set amount to maximum (baseValue + 20%)
  --min                       Set amount to minimum (baseValue - 20%)
  --asshole                   Set nice score to 0 (no gift)
  --dickhead                  Set nice score to 0 (no gift)
  --no-log                    Disable logging to file (logging enabled by default)
  -cp, --copy                 Copy amount (without currency) to clipboard
  -h, --help                  Show this help message
  --version                   Show version information

CONFIGURATION:
  Default values can be configured by running 'gift-calc init-config' or 'gcalc init-config'.
  Config is stored at: ~/.config/gift-calc/.config.json
  Command line options override config file defaults.

EXAMPLES:
  gift-calc                             # Use config defaults or built-in defaults
  gcalc init-config                     # Setup configuration file (short form)
  gift-calc update-config               # Update existing configuration file
  gift-calc log                         # Open log file with less
  gift-calc -b 100                      # Base value of 100
  gcalc -b 100 -v 30 -d 0               # Base 100, 30% variation, no decimals
  gift-calc --name "Alice" -c USD       # Gift for Alice in USD currency
  gcalc -b 50 -f 9 --name "Bob"         # Gift for Bob (with logging by default)
  gift-calc -c EUR -d 1 -cp --no-log     # Use defaults with EUR, copy but no log
  gcalc --name "Charlie" -b 80 -cp      # Gift for Charlie, copy to clipboard
  gift-calc -f 8 -n 9                   # High friend and nice scores
  gift-calc -n 0 -b 100                 # No gift (nice score 0)
  gift-calc --asshole --name "Kevin"    # No gift for asshole Kevin
  gift-calc --dickhead -b 50            # No gift for dickhead
  gift-calc -n 2 -b 100                 # Mean person (20 SEK from base 100)
  gift-calc -b 100 --max                # Set to maximum amount (120)
  gcalc -b 100 --min                    # Set to minimum amount (80)
  gift-calc --help                      # Shows this help message

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

// Make functions available globally for browser use
if (typeof window !== 'undefined') {
  window.GiftCalc = {
    calculateGiftAmount,
    calculateFinalAmount,
    parseArguments,
    formatOutput,
    getHelpText
  };
}

// Support both CommonJS and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateGiftAmount,
    calculateFinalAmount,
    parseArguments,
    formatOutput,
    getHelpText
  };
}