#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { exec, spawnSync } from 'node:child_process';

// Config utilities
function getConfigPath() {
  const configDir = path.join(os.homedir(), '.config', 'gift-calc');
  return path.join(configDir, '.config.json');
}

function ensureConfigDir() {
  const configDir = path.dirname(getConfigPath());
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

function loadConfig() {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error(`Warning: Could not parse config file at ${configPath}. Using defaults.`);
      return {};
    }
  }
  return {};
}

const args = process.argv.slice(2);

// Load config defaults
const config = loadConfig();
let baseValue = config.baseValue || 70;
let variation = config.variation || 20;
let friendScore = 5;
let niceScore = 5;
let currency = config.currency || 'SEK';
let decimals = config.decimals || 2;
let recipientName = null;
let logToFile = true;
let copyToClipboard = false;
let showHelp = false;
let useMaximum = false;
let useMinimum = false;

// Check for init-config command first
if (args[0] === 'init-config') {
  initConfig();
  process.exit(0);
}

// Check for update-config command
if (args[0] === 'update-config') {
  updateConfig();
  process.exit(0);
}

// Check for log command
if (args[0] === 'log') {
  displayLog();
  process.exit(0);
}

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '-h' || arg === '--help') {
    showHelp = true;
    break;
  }
  
  if (arg === '-b' || arg === '--basevalue') {
    const nextArg = args[i + 1];
    if (nextArg && !isNaN(nextArg)) {
      baseValue = parseFloat(nextArg);
      i++; // Skip the next argument as it's the value
    } else {
      console.error('Error: -b/--basevalue requires a numeric value');
      process.exit(1);
    }
  }
  
  if (arg === '-v' || arg === '--variation') {
    const nextArg = args[i + 1];
    if (nextArg && !isNaN(nextArg)) {
      const varValue = parseFloat(nextArg);
      if (varValue >= 0 && varValue <= 100) {
        variation = varValue;
        i++; // Skip the next argument as it's the value
      } else {
        console.error('Error: -v/--variation must be between 0 and 100');
        process.exit(1);
      }
    } else {
      console.error('Error: -v/--variation requires a numeric value');
      process.exit(1);
    }
  }
  
  if (arg === '-f' || arg === '--friend-score') {
    const nextArg = args[i + 1];
    if (nextArg && !isNaN(nextArg)) {
      const scoreValue = parseFloat(nextArg);
      if (scoreValue >= 1 && scoreValue <= 10) {
        friendScore = scoreValue;
        i++; // Skip the next argument as it's the value
      } else {
        console.error('Error: -f/--friend-score must be between 1 and 10');
        process.exit(1);
      }
    } else {
      console.error('Error: -f/--friend-score requires a numeric value');
      process.exit(1);
    }
  }
  
  if (arg === '-n' || arg === '--nice-score') {
    const nextArg = args[i + 1];
    if (nextArg !== undefined && !isNaN(nextArg)) {
      const scoreValue = parseFloat(nextArg);
      if (scoreValue >= 0 && scoreValue <= 10) {
        niceScore = scoreValue;
        i++; // Skip the next argument as it's the value
      } else {
        console.error('Error: -n/--nice-score must be between 0 and 10');
        process.exit(1);
      }
    } else {
      console.error('Error: -n/--nice-score requires a numeric value');
      process.exit(1);
    }
  }
  
  if (arg === '-c' || arg === '--currency') {
    const nextArg = args[i + 1];
    if (nextArg && !nextArg.startsWith('-')) {
      currency = nextArg.toUpperCase();
      i++; // Skip the next argument as it's the value
    } else {
      console.error('Error: -c/--currency requires a currency code (e.g., SEK, USD, EUR)');
      process.exit(1);
    }
  }
  
  if (arg === '-cp' || arg === '--copy') {
    copyToClipboard = true;
  }
  
  if (arg === '-d' || arg === '--decimals') {
    const nextArg = args[i + 1];
    if (nextArg && !isNaN(nextArg)) {
      const decValue = parseInt(nextArg);
      if (decValue >= 0 && decValue <= 10) {
        decimals = decValue;
        i++; // Skip the next argument as it's the value
      } else {
        console.error('Error: -d/--decimals must be between 0 and 10');
        process.exit(1);
      }
    } else {
      console.error('Error: -d/--decimals requires a numeric value');
      process.exit(1);
    }
  }
  
  if (arg === '--name') {
    const nextArg = args[i + 1];
    if (nextArg && !nextArg.startsWith('-')) {
      recipientName = nextArg;
      i++; // Skip the next argument as it's the value
    } else {
      console.error('Error: --name requires a name value');
      process.exit(1);
    }
  }
  
  if (arg === '--max') {
    useMaximum = true;
  }
  
  if (arg === '--min') {
    useMinimum = true;
  }
  
  if (arg === '--asshole' || arg === '--dickhead') {
    niceScore = 0;
  }
  
  if (arg === '--no-log') {
    logToFile = false;
  }
}

if (showHelp) {
  console.log(`
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
  `);
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
  const logPath = path.join(os.homedir(), '.config', 'gift-calc', 'gift-calc.log');
  
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

// Calculate the suggested amount
let suggestedAmount;
if (niceScore === 0) {
  // Special case: nice score 0 = amount is 0 (overrides everything)
  suggestedAmount = 0;
} else if (niceScore === 1) {
  // Special case: nice score 1 = baseValue - 90% (overrides everything)
  suggestedAmount = baseValue * 0.1;
} else if (niceScore === 2) {
  // Special case: nice score 2 = baseValue - 80% (overrides everything)
  suggestedAmount = baseValue * 0.2;
} else if (niceScore === 3) {
  // Special case: nice score 3 = baseValue - 70% (overrides everything)
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
suggestedAmount = Math.round(suggestedAmount * multiplier) / multiplier;

// Format output with currency and optional name
let output = `${suggestedAmount} ${currency}`;
if (recipientName) {
  output += ` for ${recipientName}`;
}
console.log(output);

// Copy to clipboard if requested
if (copyToClipboard) {
  const copyText = suggestedAmount.toString();
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
if (logToFile) {
  const logPath = path.join(os.homedir(), '.config', 'gift-calc', 'gift-calc.log');
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} ${output}\n`;
  
  // Ensure log directory exists
  ensureConfigDir();
  
  // Append to log file
  try {
    fs.appendFileSync(logPath, logEntry);
    console.log(`Entry logged to ${logPath}`);
  } catch (error) {
    console.error(`Warning: Could not write to log file: ${error.message}`);
  }
}