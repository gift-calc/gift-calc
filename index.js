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
  findLastGiftForRecipientFromLog
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

function loadConfig() {
  const config = {};
  
  // Load from file first
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      Object.assign(config, JSON.parse(configData));
    } catch (error) {
      console.error(`Warning: Could not parse config file at ${configPath}. Using defaults.`);
    }
  }
  
  // Environment variable overrides
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

// Load config defaults
const configDefaults = loadConfig();

// Parse arguments using shared core function
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

  // Currency
  const currentCurrency = existingConfig.currency || 'SEK';
  const currencyAnswer = await askQuestion(`Currency code (current: ${currentCurrency}): `);
  if (currencyAnswer.trim()) {
    newConfig.currency = currencyAnswer.toUpperCase();
  } else if (existingConfig.currency) {
    newConfig.currency = existingConfig.currency;
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
      if (newConfig.currency) console.log(`  Currency: ${newConfig.currency}`);
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

  // Currency
  const currencyAnswer = await askQuestion(`Currency code (default: SEK): `);
  if (currencyAnswer.trim()) {
    newConfig.currency = currencyAnswer.toUpperCase();
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
      if (newConfig.currency) console.log(`  Currency: ${newConfig.currency}`);
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
          currency: config.currency,
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
    currency: config.currency,
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

function displayResults(result, config) {
  // Format naughty list note
  let naughtyListNote = '';
  if (result.naughtyList || result.naughtyListOverride) {
    naughtyListNote = ' (on naughty list!)';
  }
  
  // Format and display main output using result's currency and recipient
  const output = formatOutput(result.amount, result.currency, result.recipient, config.decimals) + naughtyListNote;
  console.log(output);
  
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
      const budgetCurrency = result.currency; // Use actual gift currency
      
      // Calculate budget usage with currency filtering
      const usage = calculateBudgetUsage(logPath, budgetStatus.budget, budgetCurrency, fs);
      
      if (!usage.errorMessage) {
        // Format and display budget summary
        const budgetSummary = formatBudgetSummary(
          usage.totalSpent,
          result.amount,
          budgetStatus.budget.totalAmount,
          budgetStatus.remainingDays,
          budgetStatus.budget.toDate,
          budgetCurrency,
          usage.hasSkippedCurrencies
        );
        
        console.log(budgetSummary);
        
        // Display skipped currency details if any
        if (usage.skippedEntries.length > 0) {
          const skippedDetails = usage.skippedEntries
            .map(entry => {
              const recipientPart = entry.recipient ? ` (${entry.recipient})` : '';
              return `${entry.amount} ${entry.currency} (${entry.date})${recipientPart}`;
            })
            .join(', ');
          
          console.log(`Note: Excluded from budget calculation: ${skippedDetails}`);
        }
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

displayResults(result, parsedConfig);

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

// Log to file if requested
if (parsedConfig.logToFile) {
  const logPath = getLogPath();
  const timestamp = new Date().toISOString();
  
  // Format naughty list note
  let naughtyListNote = '';
  if (result.naughtyList || result.naughtyListOverride) {
    naughtyListNote = ' (on naughty list!)';
  }
  
  const output = formatOutput(result.amount, result.currency, result.recipient, parsedConfig.decimals) + naughtyListNote;
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

