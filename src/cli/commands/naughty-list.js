import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  getNaughtyListPath,
  addToNaughtyList,
  removeFromNaughtyList,
  listNaughtyList,
  searchNaughtyList
} from '../../domains/naughty-list/index.js';

/**
 * Handle naughty list command
 * @param {Object} config - Parsed configuration
 */
export function handleNaughtyListCommand(config) {
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