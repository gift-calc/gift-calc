/**
 * Naughty List Domain
 * Handles all naughty list operations including argument parsing,
 * file management, and CRUD operations
 */

/**
 * Parse naughty list specific arguments with comprehensive validation
 *
 * Parses command line arguments specific to naughty list operations,
 * handling all supported actions and providing detailed error reporting.
 * This parser is designed to work with arguments that have already had
 * the 'naughty-list' or 'nl' prefix removed.
 *
 * Supported argument patterns:
 * - `list` - List all people on naughty list
 * - `<name>` - Add person to naughty list
 * - `--remove <name>` or `-r <name>` - Remove person from naughty list
 * - `--search <term>` - Search for people by name prefix
 *
 * @param {string[]} args - Array of command line arguments (without naughty-list/nl prefix)
 * @returns {NaughtyListConfig} Parsed configuration with action and validation results
 * @throws {Error} When internal parsing logic fails (validation errors return in config.error)
 * @example
 * // Parse add command
 * const config = parseNaughtyListArguments(['John Doe']);
 * // Returns: { command: 'naughty-list', action: 'add', name: 'John Doe', success: true }
 *
 * // Parse remove command
 * const config = parseNaughtyListArguments(['--remove', 'John Doe']);
 * // Returns: { command: 'naughty-list', action: 'remove', name: 'John Doe', success: true }
 *
 * // Parse invalid command
 * const config = parseNaughtyListArguments([]);
 * // Returns: { success: false, error: 'No action specified...' }
 *
 * @since 1.0.0
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
 * Add a person to the naughty list with duplicate detection and validation
 *
 * Adds a person to the naughty list with comprehensive validation including
 * duplicate checking, input sanitization, and automatic timestamp generation.
 * This function ensures data integrity and provides detailed feedback about
 * the operation result.
 *
 * The function performs the following operations:
 * 1. Validates and trims the input name
 * 2. Loads the current naughty list from file
 * 3. Checks for existing entries (case-insensitive)
 * 4. Creates new entry with ISO timestamp
 * 5. Saves updated list to file
 * 6. Returns detailed operation result
 *
 * @param {string} name - Name to add to naughty list (will be trimmed)
 * @param {string} naughtyListPath - Absolute path to naughty list file
 * @param {object} fsModule - Node.js fs module for file operations
 * @param {object} pathModule - Node.js path module for path operations
 * @returns {NaughtyListResult} Result object with success status and details
 * @throws {Error} When required modules are missing or file operations fail critically
 * @example
 * // Add new person successfully
 * const result = addToNaughtyList('John Doe', '/path/to/naughty-list.json', fs, path);
 * // Returns: { success: true, message: 'John Doe added to naughty list', added: true, entry: {...} }
 *
 * // Try to add duplicate
 * const duplicate = addToNaughtyList('John Doe', '/path/to/naughty-list.json', fs, path);
 * // Returns: { success: false, message: 'John Doe is already on the naughty list', existing: true }
 *
 * // Invalid name
 * const invalid = addToNaughtyList('', '/path/to/naughty-list.json', fs, path);
 * // Returns: { success: false, message: 'Name cannot be empty', existing: false }
 *
 * @since 1.0.0
 * @see {@link loadNaughtyList} For loading existing list
 * @see {@link saveNaughtyList} For saving updated list
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