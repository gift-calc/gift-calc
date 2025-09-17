/**
 * Naughty List Domain
 * Handles all naughty list operations including argument parsing,
 * file management, and CRUD operations
 */

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
 * Get the naughty list file path
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