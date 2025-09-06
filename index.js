#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { exec, spawnSync } from 'node:child_process';
import { parseArguments, calculateFinalAmount, formatOutput, getHelpText } from './src/core.js';

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

// Calculate the suggested amount using shared core function
const suggestedAmount = calculateFinalAmount(
  parsedConfig.baseValue, 
  parsedConfig.variation, 
  parsedConfig.friendScore, 
  parsedConfig.niceScore, 
  parsedConfig.decimals,
  parsedConfig.useMaximum,
  parsedConfig.useMinimum
);

// Format and display output
const output = formatOutput(suggestedAmount, parsedConfig.currency, parsedConfig.recipientName);
console.log(output);

// Copy to clipboard if requested
if (parsedConfig.copyToClipboard) {
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
if (parsedConfig.logToFile) {
  const logPath = path.join(os.homedir(), '.config', 'gift-calc', 'gift-calc.log');
  const timestamp = new Date().toISOString();
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