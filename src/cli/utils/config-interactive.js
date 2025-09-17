import fs from 'node:fs';
import readline from 'node:readline';
import { getConfigPath, ensureConfigDir, loadConfig } from '../config.js';

/**
 * Interactive configuration update
 */
export async function updateConfig() {
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

/**
 * Interactive configuration initialization
 */
export async function initConfig() {
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