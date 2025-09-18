import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  getPersonConfigPath,
  getToplistData,
  formatToplistOutput
} from '../../core.js';
import { getLogPath } from '../config.js';

/**
 * Handle toplist command
 * @param {Object} config - Parsed configuration
 */
export function handleToplistCommand(config) {
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