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
  
  if (args[0] === '--version' || args[0] === '-v' || args[0] === '-V') {
    config.command = 'version';
    return config;
  }
  
  // Check for naughty list commands
  if (args[0] === 'naughty-list' || args[0] === 'nl') {
    return parseNaughtyListArguments(args.slice(1));
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
        config.baseValue = parseFloat(nextArg);
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
 * @returns {string} Formatted output string
 */
export function formatOutput(amount, currency, recipientName = null) {
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
  gcalc [options]              # Short alias
  gcalc nl <name>              # Add to naughty list (short form)
  gcalc nl list                # List naughty people
  gcalc nl --remove <name>     # Remove from naughty list
  gcalc nl --search <term>     # Search naughty list

COMMANDS:
  init-config                 Setup configuration file with default values
  update-config               Update existing configuration file
  log                         Open gift calculation log file with less
  naughty-list, nl            Manage the naughty list (add/remove/list/search)

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
  --max                       Set amount to maximum (baseValue + 20%)
  --min                       Set amount to minimum (baseValue - 20%)
  --asshole                   Set nice score to 0 (no gift)
  --dickhead                  Set nice score to 0 (no gift)
  --no-log                    Disable logging to file (logging enabled by default)
  -C, --copy                  Copy amount (without currency) to clipboard

NAUGHTY LIST OPTIONS:
  --remove, -r                Remove person from naughty list (use with naughty-list command)
  --search <term>             Search naughty list for names starting with term

CONFIGURATION:
  Default values can be configured by running 'gift-calc init-config' or 'gcalc init-config'.
  Config is stored at: ~/.config/gift-calc/.config.json
  Naughty list is stored at: ~/.config/gift-calc/naughty-list.json
  Command line options override config file defaults.
  
  NAUGHTY LIST:
    When a recipient is on the naughty list, their gift amount is always 0,
    overriding all other calculation parameters (nice score, friend score, etc.).
    This is the highest priority check in the calculation logic.

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
  
  NAUGHTY LIST EXAMPLES:
  gift-calc naughty-list Sven           # Add Sven to naughty list
  gcalc nl David                        # Add David to naughty list (short form)
  gcalc nl list                         # List all people on naughty list
  gift-calc naughty-list --remove David # Remove David from naughty list
  gcalc nl -r Sven                      # Remove Sven from naughty list (short form)
  gcalc nl --search Dav                  # Search for names starting with "Dav"
  gift-calc --name "Sven" -b 100        # Returns "0 SEK for Sven (on naughty list!)"

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