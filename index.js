#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { exec, spawnSync } from 'node:child_process';
import {
  parseArguments,
  calculateFinalAmount,
  formatOutput,
  formatOutputWithConversion,
  getHelpText,
  parseNaughtyListArguments,
  getNaughtyListPath,
  addToNaughtyList,
  removeFromNaughtyList,
  isOnNaughtyList,
  listNaughtyList,
  searchNaughtyList,
  parseBudgetArguments,
  getBudgetPath,
  addBudget,
  editBudget,
  getBudgetStatus,
  listBudgets,
  formatBudgetAmount,
  parseLogEntry,
  calculateBudgetUsage,
  formatBudgetSummary,
  formatMatchedGift,
  findLastGiftFromLog,
  findLastGiftForRecipientFromLog,
  parseSpendingsArguments,
  calculateRelativeDate,
  getSpendingsBetweenDates,
  formatSpendingsOutput,
  validateDate,
  parsePersonArguments,
  getPersonConfigPath,
  setPersonConfig,
  clearPersonConfig,
  listPersonConfigs,
  getPersonConfig,
  parseToplistArguments,
  getToplistData,
  formatToplistOutput
} from './src/core.js';

// Config utilities
function getConfigPath() {
  // Use process.env.HOME if available (important for tests), otherwise fall back to os.homedir()
  const homeDir = process.env.HOME || os.homedir();
  const configDir = path.join(homeDir, '.config', 'gift-calc');
  return path.join(configDir, '.config.json');
}

function ensureConfigDir() {
  const configDir = path.dirname(getConfigPath());
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

function getLogPath() {
  // Use process.env.HOME if available (important for tests), otherwise fall back to os.homedir()
  const homeDir = process.env.HOME || os.homedir();
  return path.join(homeDir, '.config', 'gift-calc', 'gift-calc.log');
}

function loadConfig(personName = null) {
  const config = {};

  // Load from file first
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      const fileConfig = JSON.parse(configData);
      Object.assign(config, fileConfig);

      // Migration: if only 'currency' exists, migrate to 'baseCurrency'
      if (fileConfig.currency && !fileConfig.baseCurrency) {
        config.baseCurrency = fileConfig.currency;
      }
    } catch (error) {
      console.error(`Warning: Could not parse config file at ${configPath}. Using defaults.`);
    }
  }

  // Load person-specific config if name provided
  if (personName) {
    try {
      const personConfigPath = getPersonConfigPath(path, os);
      const personConfig = getPersonConfig(personName, personConfigPath, fs);
      if (personConfig) {
        // Person config overrides global config
        if (personConfig.baseValue !== undefined) config.baseValue = personConfig.baseValue;
        // Person currency is now display currency only (stored separately)
        if (personConfig.currency !== undefined) config.displayCurrency = personConfig.currency;
        if (personConfig.niceScore !== undefined) config.niceScore = personConfig.niceScore;
        if (personConfig.friendScore !== undefined) config.friendScore = personConfig.friendScore;
      }
    } catch (error) {
      // Silently ignore person config errors to avoid disrupting main functionality
    }
  }

  // Environment variable overrides (highest priority)
  if (process.env.GIFT_CALC_BASE_VALUE) {
    const baseValue = parseInt(process.env.GIFT_CALC_BASE_VALUE);
    if (!isNaN(baseValue)) config.baseValue = baseValue;
  }
  if (process.env.GIFT_CALC_VARIATION) {
    const variation = parseInt(process.env.GIFT_CALC_VARIATION);
    if (!isNaN(variation)) config.variation = variation;
  }
  if (process.env.GIFT_CALC_FRIEND_SCORE) {
    const friendScore = parseInt(process.env.GIFT_CALC_FRIEND_SCORE);
    if (!isNaN(friendScore)) config.friendScore = friendScore;
  }
  if (process.env.GIFT_CALC_BASE_CURRENCY) {
    config.baseCurrency = process.env.GIFT_CALC_BASE_CURRENCY;
  }

  return config;
}

function showVersion() {
  try {
    // Read package.json to get version
    const packageJsonPath = path.join(path.dirname(new URL(import.meta.url).pathname), 'package.json');
    const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log(`gift-calc v${packageData.version}`);
  } catch (error) {
    console.error('Error reading version information');
    process.exit(1);
  }
}

const args = process.argv.slice(2);

// First parse to detect person name for config loading
let tempConfig;
try {
  tempConfig = parseArguments(args, {});
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}

// Load config defaults with person-specific overrides if name is provided
const configDefaults = loadConfig(tempConfig.recipientName);

// Parse arguments again with proper defaults
let parsedConfig;
try {
  parsedConfig = parseArguments(args, configDefaults);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}

// Handle special commands
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
  console.log(getHelpText());
  process.exit(0);
}

if (parsedConfig.command === 'version') {
  showVersion();
  process.exit(0);
}

// Handle naughty list commands
if (parsedConfig.command === 'naughty-list') {
  handleNaughtyListCommand(parsedConfig);
  process.exit(0);
}

// Handle budget commands
if (parsedConfig.command === 'budget') {
  handleBudgetCommand(parsedConfig);
  process.exit(0);
}

// Handle spendings commands
if (parsedConfig.command === 'spendings') {
  handleSpendingsCommand(parsedConfig);
  process.exit(0);
}

// Handle person commands
if (parsedConfig.command === 'person') {
  handlePersonCommand(parsedConfig);
  process.exit(0);
}

// Handle toplist commands
if (parsedConfig.command === 'toplist') {
  handleToplistCommand(parsedConfig);
  process.exit(0);
}

async function updateConfig() {
  console.log('Gift Calculator - Configuration Update');
  console.log('======================================\n');
  console.log('This will update your configuration file at:', getConfigPath());
  console.log('Current values are shown in parentheses. Press enter to keep current value.\n');

  const existingConfig = loadConfig();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askQuestion = (question) => {
    return new Promise((resolve) => {
      rl.question(question, resolve);
    });
  };

  const newConfig = {};

  // Base Value
  const currentBase = existingConfig.baseValue || 70;
  const baseValueAnswer = await askQuestion(`Base value (current: ${currentBase}): `);
  if (baseValueAnswer.trim() && !isNaN(baseValueAnswer)) {
    newConfig.baseValue = parseFloat(baseValueAnswer);
  } else if (existingConfig.baseValue) {
    newConfig.baseValue = existingConfig.baseValue;
  }

  // Variation
  const currentVariation = existingConfig.variation || 20;
  const variationAnswer = await askQuestion(`Variation percentage 0-100 (current: ${currentVariation}): `);
  if (variationAnswer.trim() && !isNaN(variationAnswer)) {
    const varValue = parseFloat(variationAnswer);
    if (varValue >= 0 && varValue <= 100) {
      newConfig.variation = varValue;
    } else {
      console.log('Warning: Variation must be between 0 and 100. Keeping current value.');
      if (existingConfig.variation) newConfig.variation = existingConfig.variation;
    }
  } else if (existingConfig.variation) {
    newConfig.variation = existingConfig.variation;
  }

  // Base Currency (used for all calculations and storage)
  const currentBaseCurrency = existingConfig.baseCurrency || existingConfig.currency || 'SEK';
  const baseCurrencyAnswer = await askQuestion(`Base currency for calculations (current: ${currentBaseCurrency}): `);
  if (baseCurrencyAnswer.trim()) {
    newConfig.baseCurrency = baseCurrencyAnswer.toUpperCase();
  } else if (existingConfig.baseCurrency || existingConfig.currency) {
    newConfig.baseCurrency = existingConfig.baseCurrency || existingConfig.currency;
  }

  // Decimals
  const currentDecimals = existingConfig.decimals !== undefined ? existingConfig.decimals : 2;
  const decimalsAnswer = await askQuestion(`Number of decimals 0-10 (current: ${currentDecimals}): `);
  if (decimalsAnswer.trim() && !isNaN(decimalsAnswer)) {
    const decValue = parseInt(decimalsAnswer);
    if (decValue >= 0 && decValue <= 10) {
      newConfig.decimals = decValue;
    } else {
      console.log('Warning: Decimals must be between 0 and 10. Keeping current value.');
      if (existingConfig.decimals !== undefined) newConfig.decimals = existingConfig.decimals;
    }
  } else if (existingConfig.decimals !== undefined) {
    newConfig.decimals = existingConfig.decimals;
  }

  rl.close();

  // Save config
  ensureConfigDir();
  const configPath = getConfigPath();
  
  try {
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    console.log(`\nConfiguration updated at: ${configPath}`);
    if (Object.keys(newConfig).length === 0) {
      console.log('No values were configured. Using default values.');
    } else {
      console.log('Updated values:');
      if (newConfig.baseValue) console.log(`  Base value: ${newConfig.baseValue}`);
      if (newConfig.variation !== undefined) console.log(`  Variation: ${newConfig.variation}%`);
      if (newConfig.baseCurrency) console.log(`  Base currency: ${newConfig.baseCurrency}`);
      if (newConfig.decimals !== undefined) console.log(`  Decimals: ${newConfig.decimals}`);
    }
  } catch (error) {
    console.error('Error updating configuration:', error.message);
    process.exit(1);
  }
}

async function initConfig() {
  console.log('Gift Calculator - Configuration Setup');
  console.log('=====================================\n');
  console.log('This will create a configuration file at:', getConfigPath());
  console.log('You can skip any setting to keep the default value.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askQuestion = (question) => {
    return new Promise((resolve) => {
      rl.question(question, resolve);
    });
  };

  const newConfig = {};

  // Base Value
  const baseValueAnswer = await askQuestion(`Base value (default: 70): `);
  if (baseValueAnswer.trim() && !isNaN(baseValueAnswer)) {
    newConfig.baseValue = parseFloat(baseValueAnswer);
  }

  // Variation
  const variationAnswer = await askQuestion(`Variation percentage 0-100 (default: 20): `);
  if (variationAnswer.trim() && !isNaN(variationAnswer)) {
    const varValue = parseFloat(variationAnswer);
    if (varValue >= 0 && varValue <= 100) {
      newConfig.variation = varValue;
    } else {
      console.log('Warning: Variation must be between 0 and 100. Skipping.');
    }
  }

  // Base Currency (used for all calculations and storage)
  const baseCurrencyAnswer = await askQuestion(`Base currency for calculations (default: SEK): `);
  if (baseCurrencyAnswer.trim()) {
    newConfig.baseCurrency = baseCurrencyAnswer.toUpperCase();
  }

  // Decimals
  const decimalsAnswer = await askQuestion(`Number of decimals 0-10 (default: 2): `);
  if (decimalsAnswer.trim() && !isNaN(decimalsAnswer)) {
    const decValue = parseInt(decimalsAnswer);
    if (decValue >= 0 && decValue <= 10) {
      newConfig.decimals = decValue;
    } else {
      console.log('Warning: Decimals must be between 0 and 10. Skipping.');
    }
  }

  rl.close();

  // Save config
  ensureConfigDir();
  const configPath = getConfigPath();
  
  try {
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    console.log(`\nConfiguration saved to: ${configPath}`);
    if (Object.keys(newConfig).length === 0) {
      console.log('No values were configured. The file was created but will use default values.');
    } else {
      console.log('Configured values:');
      if (newConfig.baseValue) console.log(`  Base value: ${newConfig.baseValue}`);
      if (newConfig.variation) console.log(`  Variation: ${newConfig.variation}%`);
      if (newConfig.baseCurrency) console.log(`  Base currency: ${newConfig.baseCurrency}`);
      if (newConfig.decimals !== undefined) console.log(`  Decimals: ${newConfig.decimals}`);
    }
  } catch (error) {
    console.error('Error saving configuration:', error.message);
    process.exit(1);
  }
}

function displayLog() {
  const logPath = getLogPath();
  
  // Check if log file exists
  if (!fs.existsSync(logPath)) {
    console.log('No log file found. Use --log flag to start logging gift calculations.');
    return;
  }
  
  // Open log file with less using spawnSync for immediate execution
  try {
    const result = spawnSync('less', [logPath], { 
      stdio: 'inherit'
    });
    
    if (result.error) {
      console.error(`Error opening log file with less: ${result.error.message}`);
      console.log(`Log file location: ${logPath}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error opening log file with less: ${error.message}`);
    console.log(`Log file location: ${logPath}`);
    process.exit(1);
  }
}

function determineGiftAmount(config) {
  // Try gift matching first if requested
  if (config.matchPreviousGift) {
    const matchResult = tryGiftMatching(config);
    if (matchResult.found) {
      // Apply business rules (naughty list) to matched recipient
      const matchedRecipient = matchResult.gift.recipient;
      if (matchedRecipient) {
        const naughtyListPath = getNaughtyListPath(path, os);
        if (isOnNaughtyList(matchedRecipient, naughtyListPath, fs)) {
          // Return result with naughty list override but preserve matched gift info
          return {
            amount: 0,
            currency: matchResult.gift.currency,
            recipient: matchedRecipient,
            isMatched: true,
            matchedGift: matchResult.gift,
            naughtyListOverride: true
          };
        }
      }
      
      // Return matched gift with preserved currency
      return {
        amount: matchResult.gift.amount,
        currency: matchResult.gift.currency, // Preserve original currency!
        recipient: matchResult.gift.recipient,
        isMatched: true,
        matchedGift: matchResult.gift
      };
    } else {
      // No match found - return special value to indicate this
      return null;
    }
  }
  
  // Normal calculation path (not matching)
  // Check naughty list for normal calculations
  if (config.recipientName) {
    const recipientName = validateRecipientName(config.recipientName);
    if (recipientName) {
      const naughtyListPath = getNaughtyListPath(path, os);
      if (isOnNaughtyList(recipientName, naughtyListPath, fs)) {
        return {
          amount: 0,
          currency: config.baseCurrency,
          recipient: recipientName,
          isMatched: false,
          naughtyList: true
        };
      }
    }
  }
  
  // Normal calculation
  const calculatedAmount = calculateFinalAmount(
    config.baseValue, 
    config.variation, 
    config.friendScore, 
    config.niceScore, 
    config.decimals,
    config.useMaximum,
    config.useMinimum
  );
  
  return {
    amount: calculatedAmount,
    currency: config.baseCurrency,
    recipient: config.recipientName,
    isMatched: false
  };
}

function tryGiftMatching(config) {
  const logPath = getLogPath();
  let matchedGift = null;
  
  if (config.matchRecipientName) {
    const recipientName = validateRecipientName(config.matchRecipientName);
    if (recipientName) {
      matchedGift = findLastGiftForRecipientFromLog(recipientName, logPath, fs);
    }
  } else {
    matchedGift = findLastGiftFromLog(logPath, fs);
  }
  
  return {
    found: matchedGift !== null,
    gift: matchedGift
  };
}

function handleNoMatchFound(config) {
  if (config.matchRecipientName) {
    const recipientName = validateRecipientName(config.matchRecipientName);
    console.log(`No previous gift found for ${recipientName}.`);
    
    // Future enhancement: Interactive prompt
    // console.log('Generate new gift? (y/n):');
    // For now, just indicate no match found
  } else {
    console.log('No previous gifts found in log.');
  }
}

function validateRecipientName(name) {
  return name?.trim() || null;
}

function getMatchInfo(config) {
  if (!config.matchPreviousGift) {
    return null;
  }
  
  const logPath = getLogPath();
  let matchedGift = null;
  
  if (config.matchRecipientName) {
    const recipientName = validateRecipientName(config.matchRecipientName);
    if (recipientName) {
      matchedGift = findLastGiftForRecipientFromLog(recipientName, logPath, fs);
    }
  } else {
    matchedGift = findLastGiftFromLog(logPath, fs);
  }
  
  return matchedGift ? formatMatchedGift(matchedGift) : null;
}

function getNaughtyListInfo(config) {
  if (!config.recipientName) {
    return '';
  }
  
  const recipientName = validateRecipientName(config.recipientName);
  if (!recipientName) {
    return '';
  }
  
  const naughtyListPath = getNaughtyListPath(path, os);
  return isOnNaughtyList(recipientName, naughtyListPath, fs) ? ' (on naughty list!)' : '';
}

async function displayResults(result, config) {
  // Format naughty list note
  let naughtyListNote = '';
  if (result.naughtyList || result.naughtyListOverride) {
    naughtyListNote = ' (on naughty list!)';
  }

  // Format and display main output
  let output;
  if (result.isMatched && result.matchedGift) {
    // When matching a gift, preserve the original currency (no conversion)
    output = formatOutput(result.amount, result.matchedGift.currency, result.recipient, config.decimals);
  } else {
    // Normal flow: use base currency and display currency conversion
    output = await formatOutputWithConversion(
      result.amount,
      config.baseCurrency,
      config.displayCurrency,
      result.recipient,
      config.decimals
    );
  }
  console.log(output + naughtyListNote);
  
  // Display matched gift information if applicable
  if (result.isMatched && result.matchedGift) {
    const matchedGiftText = formatMatchedGift(result.matchedGift);
    console.log(matchedGiftText);
  }
  
  // Display budget tracking if active budget exists
  try {
    const budgetPath = getBudgetPath(path, os);
    const budgetStatus = getBudgetStatus(budgetPath, fs);
    
    if (budgetStatus.hasActiveBudget) {
      const logPath = getLogPath();
      const budgetCurrency = config.baseCurrency; // Use base currency for budget calculations
      
      // Calculate budget usage (simplified)
      const usage = calculateBudgetUsage(logPath, budgetStatus.budget, fs);
      
      if (!usage.errorMessage) {
        // Format and display budget summary
        const budgetSummary = formatBudgetSummary(
          usage.totalSpent,
          result.amount,
          budgetStatus.budget.totalAmount,
          budgetStatus.remainingDays,
          budgetStatus.budget.toDate,
          budgetCurrency
        );
        
        console.log(budgetSummary);
        
        // Note: Simplified budget calculation now includes all entries
      }
    }
  } catch (error) {
    // Silently ignore budget tracking errors to avoid disrupting main functionality
  }
}


// Calculate and display gift amount using simplified architecture
const result = determineGiftAmount(parsedConfig);

// Handle "no match found" scenario
if (result === null) {
  handleNoMatchFound(parsedConfig);
  process.exit(0);
}

await displayResults(result, parsedConfig);

// Copy to clipboard if requested
if (parsedConfig.copyToClipboard) {
  const copyText = result.amount.toString();
  const platform = os.platform();
  
  let copyCommand;
  if (platform === 'darwin') {
    copyCommand = `echo "${copyText}" | pbcopy`;
  } else if (platform === 'win32') {
    copyCommand = `echo ${copyText} | clip`;
  } else {
    // Linux/Unix - try xclip first, then xsel
    copyCommand = `echo "${copyText}" | xclip -selection clipboard 2>/dev/null || echo "${copyText}" | xsel --clipboard --input 2>/dev/null`;
  }
  
  exec(copyCommand, (error) => {
    if (error) {
      console.error('Warning: Could not copy to clipboard. Make sure xclip or xsel is installed (Linux) or use macOS/Windows.');
    } else {
      console.log(`Amount ${copyText} copied to clipboard`);
    }
  });
}

// Log to file if requested (always log in base currency)
if (parsedConfig.logToFile) {
  const logPath = getLogPath();
  const timestamp = new Date().toISOString();

  // Format naughty list note
  let naughtyListNote = '';
  if (result.naughtyList || result.naughtyListOverride) {
    naughtyListNote = ' (on naughty list!)';
  }

  // Always log in base currency for consistency
  const output = formatOutput(result.amount, parsedConfig.baseCurrency, result.recipient, parsedConfig.decimals) + naughtyListNote;
  const logEntry = `${timestamp} ${output}\n`;

  // Ensure log directory exists
  ensureConfigDir();

  // Append to log file
  try {
    fs.appendFileSync(logPath, logEntry);
  } catch (error) {
    console.error(`Warning: Could not write to log file: ${error.message}`);
  }
}

function handleNaughtyListCommand(config) {
  // Check if parsing succeeded
  if (!config.success) {
    console.error('Error:', config.error);
    console.log('\nUsage:');
    console.log('  gift-calc naughty-list <name>        # Add person to naughty list');
    console.log('  gcalc nl <name>                      # Add person to naughty list (short)');
    console.log('  gcalc nl list                        # List all naughty people');
    console.log('  gcalc nl --search <term>             # Search naughty list');
    console.log('  gift-calc naughty-list --remove <name>  # Remove person from naughty list');
    console.log('  gcalc nl -r <name>                   # Remove person from naughty list');
    process.exit(1);
  }
  
  // Get naughty list path
  const naughtyListPath = getNaughtyListPath(path, os);
  
  // Handle different actions
  switch (config.action) {
    case 'add':
      const addResult = addToNaughtyList(config.name, naughtyListPath, fs, path);
      console.log(addResult.message);
      if (!addResult.success) {
        process.exit(1);
      }
      break;
      
    case 'remove':
      const removeResult = removeFromNaughtyList(config.name, naughtyListPath, fs, path);
      console.log(removeResult.message);
      break;
      
    case 'list':
      const list = listNaughtyList(naughtyListPath, fs);
      if (list.length === 0) {
        console.log('No one on the naughty list. 🎅');
      } else {
        console.log('Naughty List:');
        list.forEach(entry => {
          console.log(`  ${entry}`);
        });
      }
      break;
      
    case 'search':
      const searchResults = searchNaughtyList(config.searchTerm, naughtyListPath, fs);
      if (searchResults.length === 0) {
        console.log(`No one found matching "${config.searchTerm}" on the naughty list.`);
      } else {
        console.log(`Matching naughty people for "${config.searchTerm}":`);
        searchResults.forEach(entry => {
          console.log(`  ${entry}`);
        });
      }
      break;
      
    default:
      console.error('Unknown action:', config.action);
      process.exit(1);
  }
}

function handleBudgetCommand(config) {
  // Check if parsing succeeded
  if (!config.success) {
    console.error('Error:', config.error);
    console.log('\nUsage:');
    console.log('  gift-calc budget add <amount> <from-date> <to-date> [description]  # Add new budget');
    console.log('  gift-calc budget list                                            # List all budgets');
    console.log('  gift-calc budget status                                          # Show current budget status');
    console.log('  gift-calc budget edit <id> [--amount X] [--from-date X] [--to-date X] [--description X]  # Edit budget');
    console.log('  gcalc b add 5000 2024-12-01 2024-12-31 "Christmas gifts"       # Add budget (short form)');
    console.log('  gcalc b list                                                     # List budgets (short)');
    console.log('  gcalc b status                                                   # Show status (short)');
    console.log('  gcalc b edit 1 --amount 6000 --description "Updated Christmas" # Edit budget (short)');
    process.exit(1);
  }
  
  // Get budget file path
  const budgetPath = getBudgetPath(path, os);
  
  // Load config for currency formatting
  const configDefaults = loadConfig();
  const currency = configDefaults.currency || 'SEK';
  
  // Handle different actions
  switch (config.action) {
    case 'help':
      console.log('Budget Management Commands:');
      console.log('');
      console.log('  gift-calc budget add <amount> <from-date> <to-date> [description]');
      console.log('    Add a new budget for a specific period');
      console.log('    Example: gift-calc budget add 5000 2024-12-01 2024-12-31 "Christmas gifts"');
      console.log('');
      console.log('  gift-calc budget list');
      console.log('    List all budgets with their status (ACTIVE, FUTURE, EXPIRED)');
      console.log('');
      console.log('  gift-calc budget status');
      console.log('    Show current active budget and remaining days');
      console.log('');
      console.log('  gift-calc budget edit <id> [options]');
      console.log('    Edit an existing budget');
      console.log('    Options: --amount X, --from-date YYYY-MM-DD, --to-date YYYY-MM-DD, --description "text"');
      console.log('    Example: gift-calc budget edit 1 --amount 6000 --description "Updated Christmas"');
      console.log('');
      console.log('Short form: Use "gcalc b" instead of "gift-calc budget"');
      console.log('');
      console.log('Notes:');
      console.log('  - Dates must be in YYYY-MM-DD format');
      console.log('  - Budget periods cannot overlap');
      console.log('  - Amounts are displayed using your configured currency');
      break;
      
    case 'add':
      const addResult = addBudget(
        config.amount, 
        config.fromDate, 
        config.toDate, 
        config.description, 
        budgetPath, 
        fs, 
        path
      );
      console.log(addResult.message);
      if (!addResult.success) {
        process.exit(1);
      }
      break;
      
    case 'edit':
      const editResult = editBudget(
        config.budgetId,
        config.updates,
        budgetPath,
        fs,
        path
      );
      console.log(editResult.message);
      break;
      
    case 'list':
      const budgetList = listBudgets(budgetPath, fs);
      if (budgetList.length === 0) {
        console.log('No budgets configured. Use "budget add" to create one.');
      } else {
        console.log('Budgets:');
        budgetList.forEach(entry => {
          // Format amounts with currency - extract amount and add currency
          const entryWithCurrency = entry.replace(/: (\d+(?:\.\d+)?) \(/g, (match, amount) => `: ${formatBudgetAmount(amount, currency)} (`);
          console.log(`  ${entryWithCurrency}`);
        });
      }
      break;
      
    case 'status':
      const status = getBudgetStatus(budgetPath, fs);
      if (!status.hasActiveBudget) {
        console.log(status.message);
        console.log('');
        console.log('Available commands:');
        console.log('  gift-calc budget add <amount> <from-date> <to-date> [description]  # Add new budget');
        console.log('  gift-calc budget list                                            # List all budgets');
        console.log('  gift-calc budget --help                                          # Show detailed help');
      } else {
        const budget = status.budget;
        console.log(`Current Budget: ${budget.description}`);
        console.log(`Total: ${formatBudgetAmount(budget.totalAmount, currency)} | Days Left: ${status.remainingDays}`);
        console.log(`Period: ${budget.fromDate} to ${budget.toDate}`);
      }
      break;
      
    default:
      console.error('Unknown action:', config.action);
      process.exit(1);
  }
}

function handleSpendingsCommand(config) {
  // Check if parsing succeeded
  if (!config.success) {
    console.error('Error:', config.error);
    console.error('');
    console.error('Usage:');
    console.error('  gift-calc spendings -f <from-date> -t <to-date>        # Absolute date range');
    console.error('  gift-calc spendings --from 2024-01-01 --to 2024-12-31  # Absolute date range');
    console.error('  gift-calc spendings --days 30                          # Last 30 days');
    console.error('  gift-calc spendings --weeks 4                          # Last 4 weeks');
    console.error('  gift-calc spendings --months 3                         # Last 3 months');
    console.error('  gift-calc spendings --years 1                          # Last year');
    console.error('  gcalc spendings --days 30                               # Short form');
    console.error('  gcalc s --weeks 8                                       # Short alias');
    process.exit(1);
  }
  
  const logPath = getLogPath();
  let fromDate, toDate;
  
  // Calculate date range
  if (config.fromDate && config.toDate) {
    // Absolute dates
    const fromValidation = validateDate(config.fromDate);
    const toValidation = validateDate(config.toDate);
    
    if (!fromValidation.valid) {
      console.error('Error:', fromValidation.error);
      process.exit(1);
    }
    
    if (!toValidation.valid) {
      console.error('Error:', toValidation.error);
      process.exit(1);
    }
    
    if (fromValidation.date > toValidation.date) {
      console.error('Error: From date must be before or equal to to date');
      process.exit(1);
    }
    
    fromDate = config.fromDate;
    toDate = config.toDate;
  } else {
    // Relative dates
    let timeUnit, timeValue;
    
    if (config.days) {
      timeUnit = 'days';
      timeValue = config.days;
    } else if (config.weeks) {
      timeUnit = 'weeks';
      timeValue = config.weeks;
    } else if (config.months) {
      timeUnit = 'months';
      timeValue = config.months;
    } else if (config.years) {
      timeUnit = 'years';
      timeValue = config.years;
    }
    
    fromDate = calculateRelativeDate(timeUnit, timeValue);
    toDate = new Date().toISOString().split('T')[0]; // Today
  }
  
  // Get spending data
  const spendingsData = getSpendingsBetweenDates(logPath, fromDate, toDate, fs);
  
  // Format and display output
  const output = formatSpendingsOutput(spendingsData, fromDate, toDate);
  console.log(output);
}

function handlePersonCommand(config) {
  // Check if parsing succeeded
  if (!config.success) {
    console.error('Error:', config.error);
    console.log('\nUsage:');
    console.log('  gift-calc person set --name "Alice" --nice-score 9 --friend-score 8 --base-value 150 --currency USD');
    console.log('  gift-calc person list [--sort-by FIELD] [--order ORDER] [--reverse]');
    console.log('  gift-calc person clear --name "Alice"');
    console.log('  gcalc p set -n "Alice" -s 9 -f 8 -b 100 -c USD  # Short form');
    console.log('  gcalc p list --sort-by name --order asc');
    console.log('  gcalc p list -s base-value -o desc');
    console.log('  gcalc p clear --name "Alice"');
    process.exit(1);
  }
  
  // Get person config path
  const personConfigPath = getPersonConfigPath(path, os);
  
  // Handle different actions
  switch (config.action) {
    case 'set':
      const personData = {};
      if (config.niceScore !== null) personData.niceScore = config.niceScore;
      if (config.friendScore !== null) personData.friendScore = config.friendScore;
      if (config.baseValue !== null) personData.baseValue = config.baseValue;
      if (config.currency !== null) personData.currency = config.currency;
      
      const setResult = setPersonConfig(config.name, personData, personConfigPath, fs, path);
      console.log(setResult.message);
      if (!setResult.success) {
        process.exit(1);
      }
      break;
      
    case 'clear':
      const clearResult = clearPersonConfig(config.name, personConfigPath, fs, path);
      console.log(clearResult.message);
      if (!clearResult.success) {
        process.exit(1);
      }
      break;
      
    case 'list':
      const personList = listPersonConfigs(personConfigPath, fs, config.sortBy, config.order);
      if (personList.length === 0) {
        console.log('No person configurations found.');
      } else {
        console.log('Person Configurations:');
        personList.forEach(entry => {
          console.log(`  ${entry}`);
        });
      }
      break;

    default:
      console.error('Unknown action:', config.action);
      process.exit(1);
  }
}

function handleToplistCommand(config) {
  // Check if parsing succeeded
  if (!config.success) {
    console.error('Error:', config.error);
    console.log('\nUsage:');
    console.log('  gift-calc toplist                      # Top 10 by total gift amount');
    console.log('  gift-calc toplist -n                   # Top 10 by nice score');
    console.log('  gift-calc toplist --friend-score       # Top 10 by friend score');
    console.log('  gift-calc toplist --gift-count         # Top 10 by gift count');
    console.log('  gift-calc toplist -l 20                # Top 20 by total gift amount');
    console.log('  gift-calc toplist -c USD               # Top 10 by USD gift amount');
    console.log('  gift-calc toplist --from 2024-01-01    # Top 10 from January 1, 2024 to today');
    console.log('  gift-calc toplist --from 2024-01-01 --to 2024-12-31  # Top 10 for 2024');
    console.log('  gift-calc toplist --list-currencies    # Show available currencies');
    console.log('  gcalc tl                               # Short form');
    console.log('  gcalc tl -g                           # Top 10 by gift count (short form)');
    console.log('  gcalc tl -n -l 5 --from 2024-12-01     # Top 5 by nice score from December');
    process.exit(1);
  }

  // Get file paths
  const personConfigPath = getPersonConfigPath(path, os);
  const logPath = getLogPath();

  // Get toplist data
  const toplistData = getToplistData(personConfigPath, logPath, fs, config.fromDate, config.toDate);

  if (toplistData.errorMessage) {
    console.error('Error:', toplistData.errorMessage);
    process.exit(1);
  }

  // Handle --list-currencies
  if (config.listCurrencies) {
    if (toplistData.currencies.length === 0) {
      console.log('No currencies found in gift history.');
    } else {
      console.log(`Available currencies in dataset: ${toplistData.currencies.join(', ')}`);
    }
    return;
  }

  // Validate currency filter if specified
  if (config.currency && toplistData.currencies.length > 0 && !toplistData.currencies.includes(config.currency)) {
    console.error(`Error: Currency '${config.currency}' not found in gift history.`);
    console.error(`Available currencies: ${toplistData.currencies.join(', ')}`);
    process.exit(1);
  }

  // Format and display output
  const output = formatToplistOutput(
    toplistData.persons,
    config.sortBy,
    config.length,
    toplistData.currencies,
    config.currency
  );
  console.log(output);
}