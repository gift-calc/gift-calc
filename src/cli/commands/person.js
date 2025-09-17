import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  getPersonConfigPath,
  setPersonConfig,
  clearPersonConfig,
  listPersonConfigs
} from '../../core.js';

/**
 * Handle person command
 * @param {Object} config - Parsed configuration
 */
export function handlePersonCommand(config) {
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