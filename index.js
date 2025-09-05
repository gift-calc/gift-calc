#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { exec } = require('child_process');

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
let friendScore = config.friendScore || 5;
let currency = config.currency || 'SEK';
let decimals = config.decimals || 2;
let copyToClipboard = false;
let showHelp = false;

// Check for init-config command first
if (args[0] === 'init-config') {
  initConfig();
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
}

if (showHelp) {
  console.log(`
Gift Calculator - CLI Tool

DESCRIPTION:
  A CLI tool that suggests a gift amount based on a base value with 
  configurable random variation and friend score influence.

USAGE:
  gift-calc [options]
  gift-calc init-config
  gcalc [options]              # Short alias

COMMANDS:
  init-config                 Setup configuration file with default values

OPTIONS:
  -b, --basevalue <number>    Set the base value for gift calculation (default: 70)
  -v, --variation <percent>   Set variation percentage (0-100, default: 20)
  -f, --friend-score <1-10>   Friend score affecting gift amount bias (default: 5)
                              Higher scores increase chance of higher amounts
  -c, --currency <code>       Currency code to display (default: SEK)
  -d, --decimals <0-10>       Number of decimal places (default: 2)
  -cp, --copy                 Copy amount (without currency) to clipboard
  -h, --help                  Show this help message

CONFIGURATION:
  Default values can be configured by running 'gift-calc init-config' or 'gcalc init-config'.
  Config is stored at: ~/.config/gift-calc/.config.json
  Command line options override config file defaults.

EXAMPLES:
  gift-calc                             # Use config defaults or built-in defaults
  gcalc init-config                     # Setup configuration file (short form)
  gift-calc -b 100                      # Base value of 100
  gcalc -b 100 -v 30 -d 0               # Base 100, 30% variation, no decimals
  gift-calc -b 50 -f 9 -c USD -d 3      # Base 50, high friend score, USD, 3 decimals
  gcalc -b 80 -v 15 -f 3 -cp            # Base 80, 15% variation, copy to clipboard
  gift-calc -c EUR -d 1 -cp             # Use defaults with EUR, 1 decimal, copy
  gift-calc --help                      # Shows this help message

FRIEND SCORE GUIDE:
  1-3: Acquaintance (bias toward lower amounts)
  4-6: Regular friend (neutral)
  7-8: Good friend (bias toward higher amounts)
  9-10: Best friend/family (strong bias toward higher amounts)

OUTPUT:
  The script returns a randomly calculated gift amount with variation 
  and friend score influence applied to the base value.
  `);
  process.exit(0);
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

  // Friend Score
  const friendScoreAnswer = await askQuestion(`Friend score 1-10 (default: 5): `);
  if (friendScoreAnswer.trim() && !isNaN(friendScoreAnswer)) {
    const scoreValue = parseFloat(friendScoreAnswer);
    if (scoreValue >= 1 && scoreValue <= 10) {
      newConfig.friendScore = scoreValue;
    } else {
      console.log('Warning: Friend score must be between 1 and 10. Skipping.');
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
      if (newConfig.friendScore) console.log(`  Friend score: ${newConfig.friendScore}`);
      if (newConfig.currency) console.log(`  Currency: ${newConfig.currency}`);
      if (newConfig.decimals !== undefined) console.log(`  Decimals: ${newConfig.decimals}`);
    }
  } catch (error) {
    console.error('Error saving configuration:', error.message);
    process.exit(1);
  }
}

function calculateGiftAmount(base, variationPercent, friendScore, decimalPlaces) {
  // Friend score influences the bias towards higher amounts
  // Score 1-5: neutral to negative bias, Score 6-10: positive bias
  const friendBias = (friendScore - 5.5) * 0.1; // Range: -0.45 to +0.45
  
  // Generate base random percentage within the variation range
  const randomPercentage = (Math.random() * (variationPercent * 2)) - variationPercent;
  
  // Apply friend bias - higher scores increase chance of higher amounts
  const biasedPercentage = randomPercentage + (friendBias * variationPercent);
  
  // Ensure we don't exceed the original variation bounds
  const finalPercentage = Math.max(-variationPercent, Math.min(variationPercent, biasedPercentage));
  
  const variation = base * (finalPercentage / 100);
  const giftAmount = base + variation;
  
  // Round to specified decimal places
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(giftAmount * multiplier) / multiplier;
}

const suggestedAmount = calculateGiftAmount(baseValue, variation, friendScore, decimals);

// Format output with currency
const output = `${suggestedAmount} ${currency}`;
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