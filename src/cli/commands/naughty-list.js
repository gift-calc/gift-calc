/**
 * @fileoverview Naughty list command handler
 *
 * CLI command handler for naughty list operations including:
 * - Adding people to the naughty list with duplicate detection
 * - Removing people from the naughty list with confirmation
 * - Listing all people on the naughty list with timestamps
 * - Searching for people by name prefix
 * - Proper error handling and user feedback
 *
 * The naughty list affects gift calculations by setting nice score to 0,
 * which results in no gift being given. This handler provides a clean
 * CLI interface to the naughty list domain functionality.
 *
 * @module cli/commands/naughty-list
 * @version 1.0.0
 * @requires node:fs
 * @requires node:path
 * @requires node:os
 * @see {@link module:domains/naughty-list} Naughty list domain logic
 * @see {@link module:types} NaughtyListConfig and NaughtyListResult types
 * @example
 * // Add person to naughty list
 * handleNaughtyListCommand({
 *   action: 'add',
 *   name: 'BadPerson',
 *   success: true
 * });
 *
 * // Search naughty list
 * handleNaughtyListCommand({
 *   action: 'search',
 *   searchTerm: 'Bad',
 *   success: true
 * });
 *
 * @exitcode {0} Success - naughty list operation completed
 * @exitcode {1} Error - operation failed or validation error
 */

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
 * Handle naughty list command with comprehensive action support
 *
 * CLI command handler that processes all naughty list operations including
 * adding/removing people, listing all entries, and searching by name prefix.
 * Provides user feedback, error handling, and proper exit codes for all operations.
 *
 * Supported actions:
 * - 'add': Add person to naughty list with duplicate detection
 * - 'remove': Remove person from naughty list with confirmation
 * - 'list': Display all people on naughty list with timestamps
 * - 'search': Find people by name prefix with partial matching
 *
 * The naughty list affects gift calculations by automatically setting nice
 * score to 0, which results in no gift being given regardless of other scores.
 *
 * @param {NaughtyListConfig} config - Parsed naughty list configuration
 * @param {string} config.command - Always 'naughty-list'
 * @param {('add'|'remove'|'list'|'search')} config.action - Action to perform
 * @param {string|null} config.name - Person name for add/remove operations
 * @param {string|null} config.searchTerm - Search term for search operations
 * @param {boolean} config.success - Whether configuration parsing succeeded
 * @param {string|null} config.error - Error message if parsing failed
 * @returns {void} Function exits process with appropriate exit code
 * @throws {Error} When file system operations fail
 * @example
 * // Add person to naughty list
 * handleNaughtyListCommand({
 *   command: 'naughty-list',
 *   action: 'add',
 *   name: 'BadPerson',
 *   success: true,
 *   error: null
 * });
 *
 * // Search naughty list
 * handleNaughtyListCommand({
 *   command: 'naughty-list',
 *   action: 'search',
 *   searchTerm: 'Bad',
 *   success: true,
 *   error: null
 * });
 *
 * @exitcode {0} Success - naughty list operation completed successfully
 * @exitcode {1} Error - parsing failed, operation failed, or validation error
 * @since 1.0.0
 * @see {@link module:domains/naughty-list} Domain logic for naughty list operations
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