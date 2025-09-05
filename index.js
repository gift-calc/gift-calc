#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

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
}

if (showHelp) {
  console.log(`
gift-amount - Gift Amount Calculator

DESCRIPTION:
  A CLI tool that suggests a gift amount based on a base value with 
  configurable random variation and friend score influence.

USAGE:
  gift-amount [options]
  gift-amount init-config

COMMANDS:
  init-config                 Setup configuration file with default values

OPTIONS:
  -b, --basevalue <number>    Set the base value for gift calculation (default: 70)
  -v, --variation <percent>   Set variation percentage (0-100, default: 20)
  -f, --friend-score <1-10>   Friend score affecting gift amount bias (default: 5)
                              Higher scores increase chance of higher amounts
  -h, --help                  Show this help message

CONFIGURATION:
  Default values can be configured by running 'gift-amount init-config'.
  Config is stored at: ~/.config/gift-calc/.config.json
  Command line options override config file defaults.

EXAMPLES:
  gift-amount                           # Use config defaults or built-in defaults
  gift-amount init-config               # Setup configuration file
  gift-amount -b 100                    # Base value of 100
  gift-amount -b 100 -v 30              # Base 100 with 30% variation
  gift-amount -b 50 -f 9                # Base 50, high friend score (bias toward higher)
  gift-amount -b 80 -v 15 -f 3          # Base 80, 15% variation, low friend score
  gift-amount --help                    # Shows this help message

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
    }
  } catch (error) {
    console.error('Error saving configuration:', error.message);
    process.exit(1);
  }
}

function calculateGiftAmount(base, variationPercent, friendScore) {
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
  
  // Round to 2 decimal places
  return Math.round(giftAmount * 100) / 100;
}

const suggestedAmount = calculateGiftAmount(baseValue, variation, friendScore);
console.log(suggestedAmount);