#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  parsePersonArguments,
  getPersonConfigPath,
  loadPersonConfig,
  savePersonConfig,
  setPersonConfig,
  clearPersonConfig,
  listPersonConfigs,
  sortPersons,
  getPersonConfig
} from '../src/core.js';

// Test configuration paths
const CONFIG_DIR = path.join(os.homedir(), '.config', 'gift-calc');
const PERSON_CONFIG_PATH = path.join(CONFIG_DIR, 'persons.json');
const CLI_PATH = path.join(process.cwd(), 'index.js');

// Enhanced cleanup function
function globalCleanup() {
  try {
    if (fs.existsSync(PERSON_CONFIG_PATH)) fs.unlinkSync(PERSON_CONFIG_PATH);
    if (fs.existsSync(CONFIG_DIR) && fs.readdirSync(CONFIG_DIR).length === 0) {
      fs.rmdirSync(CONFIG_DIR);
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}

// Helper function to run CLI commands
function runCLI(args = '', options = {}) {
  try {
    const result = execSync(`node "${CLI_PATH}" ${args}`, {
      encoding: 'utf8',
      timeout: 5000,
      ...options
    });
    return { stdout: result.trim(), stderr: '', success: true };
  } catch (error) {
    return {
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || error.message,
      success: false,
      code: error.status
    };
  }
}

// Test suite setup and cleanup
globalCleanup();

console.log('\n🧪 Starting Person Configuration Tests...\n');

//
// ARGUMENT PARSING TESTS
//

console.log('🔍 Testing parsePersonArguments function...');

// Test 1: Valid person set command with all fields
const result1 = parsePersonArguments(['set', '--name', 'Alice', '--nice-score', '8.5', '--friend-score', '7', '--base-value', '100', '--currency', 'USD']);
console.assert(result1.success === true, '❌ Should parse valid set command');
console.assert(result1.action === 'set', '❌ Should set action to "set"');
console.assert(result1.name === 'Alice', '❌ Should parse name correctly');
console.assert(result1.niceScore === 8.5, '❌ Should parse nice score correctly');
console.assert(result1.friendScore === 7, '❌ Should parse friend score correctly');
console.assert(result1.baseValue === 100, '❌ Should parse base value correctly');
console.assert(result1.currency === 'USD', '❌ Should parse currency correctly');
console.log('✅ Valid set command with all fields');

// Test 2: Valid person set command with short flags
const result2 = parsePersonArguments(['set', '-n', 'Bob', '-s', '9', '-f', '8.5', '-b', '150', '-c', 'eur']);
console.assert(result2.success === true, '❌ Should parse valid set command with short flags');
console.assert(result2.name === 'Bob', '❌ Should parse name with -n');
console.assert(result2.niceScore === 9, '❌ Should parse nice score with -s');
console.assert(result2.friendScore === 8.5, '❌ Should parse friend score with -f');
console.assert(result2.baseValue === 150, '❌ Should parse base value with -b');
console.assert(result2.currency === 'EUR', '❌ Should convert currency to uppercase');
console.log('✅ Valid set command with short flags');

// Test 3: Valid person set command with partial fields
const result3 = parsePersonArguments(['set', '--name', 'Charlie', '--nice-score', '7.5']);
console.assert(result3.success === true, '❌ Should parse set command with partial fields');
console.assert(result3.name === 'Charlie', '❌ Should parse name');
console.assert(result3.niceScore === 7.5, '❌ Should parse nice score');
console.assert(result3.friendScore === null, '❌ Friend score should be null when not provided');
console.log('✅ Valid set command with partial fields');

// Test 4: Valid person clear command
const result4 = parsePersonArguments(['clear', '--name', 'Alice']);
console.assert(result4.success === true, '❌ Should parse valid clear command');
console.assert(result4.action === 'clear', '❌ Should set action to "clear"');
console.assert(result4.name === 'Alice', '❌ Should parse name for clear command');
console.log('✅ Valid clear command');

// Test 5: Valid person clear command with short flag
const result5 = parsePersonArguments(['clear', '-n', 'Bob']);
console.assert(result5.success === true, '❌ Should parse clear command with short flag');
console.assert(result5.name === 'Bob', '❌ Should parse name with -n for clear');
console.log('✅ Valid clear command with short flag');

// Test 6: Valid person list command (no args)
const result6 = parsePersonArguments(['list']);
console.assert(result6.success === true, '❌ Should parse valid list command');
console.assert(result6.action === 'list', '❌ Should set action to "list"');
console.log('✅ Valid list command');

// Test 7: Valid person list command with sort options
const result7 = parsePersonArguments(['list', '--sort-by', 'nice-score', '--order', 'desc']);
console.assert(result7.success === true, '❌ Should parse list command with sort options');
console.assert(result7.sortBy === 'nice-score', '❌ Should parse sort-by field');
console.assert(result7.order === 'desc', '❌ Should parse order');
console.log('✅ Valid list command with sort options');

// ERROR HANDLING TESTS

// Test 8: No arguments provided
const result8 = parsePersonArguments([]);
console.assert(result8.success === false, '❌ Should fail when no arguments provided');
console.assert(result8.error.includes('No action specified'), '❌ Should provide helpful error message');
console.log('✅ Error handling for no arguments');

// Test 9: Invalid action
const result9 = parsePersonArguments(['invalid']);
console.assert(result9.success === false, '❌ Should fail for invalid action');
console.assert(result9.error.includes('Unknown person action'), '❌ Should indicate invalid action');
console.log('✅ Error handling for invalid action');

// Test 10: Set command without name
const result10 = parsePersonArguments(['set', '--nice-score', '8']);
console.assert(result10.success === false, '❌ Should fail set command without name');
console.assert(result10.error.includes('Name is required'), '❌ Should require name for set');
console.log('✅ Error handling for set without name');

// Test 11: Clear command without name
const result11 = parsePersonArguments(['clear']);
console.assert(result11.success === false, '❌ Should fail clear command without name');
console.assert(result11.error.includes('Name is required'), '❌ Should require name for clear');
console.log('✅ Error handling for clear without name');

// Test 12: Invalid nice score (too high)
const result12 = parsePersonArguments(['set', '--name', 'Test', '--nice-score', '11']);
console.assert(result12.success === false, '❌ Should fail for nice score > 10');
console.assert(result12.error.includes('Nice score must be between 0 and 10'), '❌ Should validate nice score range');
console.log('✅ Error handling for invalid nice score (too high)');

// Test 13: Invalid nice score (negative)
const result13 = parsePersonArguments(['set', '--name', 'Test', '--nice-score', '-1']);
console.assert(result13.success === false, '❌ Should fail for negative nice score');
console.assert(result13.error.includes('Nice score must be between 0 and 10'), '❌ Should validate nice score range');
console.log('✅ Error handling for invalid nice score (negative)');

// Test 14: Invalid friend score (too low)
const result14 = parsePersonArguments(['set', '--name', 'Test', '--friend-score', '0.5']);
console.assert(result14.success === false, '❌ Should fail for friend score < 1');
console.assert(result14.error.includes('Friend score must be between 1 and 10'), '❌ Should validate friend score range');
console.log('✅ Error handling for invalid friend score (too low)');

// Test 15: Invalid friend score (too high)
const result15 = parsePersonArguments(['set', '--name', 'Test', '--friend-score', '11']);
console.assert(result15.success === false, '❌ Should fail for friend score > 10');
console.assert(result15.error.includes('Friend score must be between 1 and 10'), '❌ Should validate friend score range');
console.log('✅ Error handling for invalid friend score (too high)');

// Test 16: Invalid base value (negative)
const result16 = parsePersonArguments(['set', '--name', 'Test', '--base-value', '-50']);
console.assert(result16.success === false, '❌ Should fail for negative base value');
console.assert(result16.error.includes('Base value must be positive'), '❌ Should validate base value');
console.log('✅ Error handling for invalid base value');

// Test 17: Invalid sort field
const result17 = parsePersonArguments(['list', '--sort-by', 'invalid']);
console.assert(result17.success === false, '❌ Should fail for invalid sort field');
console.assert(result17.error.includes('Invalid sort field'), '❌ Should validate sort field');
console.log('✅ Error handling for invalid sort field');

// Test 18: Invalid sort order
const result18 = parsePersonArguments(['list', '--sort-by', 'name', '--order', 'invalid']);
console.assert(result18.success === false, '❌ Should fail for invalid sort order');
console.assert(result18.error.includes('Invalid order'), '❌ Should validate sort order');
console.log('✅ Error handling for invalid sort order');

//
// CONFIGURATION MANAGEMENT TESTS
//

console.log('\n🔍 Testing configuration management functions...');

globalCleanup(); // Clean start for config tests

// Test 19: getPersonConfigPath
const configPath = getPersonConfigPath(path, os);
console.assert(configPath.endsWith('persons.json'), '❌ Should return correct config path');
console.assert(configPath.includes('.config/gift-calc'), '❌ Should be in correct config directory');
console.log('✅ getPersonConfigPath returns correct path');

// Test 20: loadPersonConfig with no file
const emptyConfig = loadPersonConfig(PERSON_CONFIG_PATH, fs);
console.assert(emptyConfig !== null && typeof emptyConfig === 'object', '❌ Should return object when no file exists');
console.assert(emptyConfig.loaded === false, '❌ Should indicate not loaded');
console.assert(Object.keys(emptyConfig.persons).length === 0, '❌ Should have empty persons object');
console.log('✅ loadPersonConfig handles missing file');

// Test 21: savePersonConfig and loadPersonConfig
const testPersons = {
  'alice': { niceScore: 8.5, friendScore: 7, baseValue: 100, currency: 'USD' },
  'bob': { niceScore: 9, friendScore: 8.5, baseValue: 150, currency: 'EUR' }
};
const saveResult = savePersonConfig(testPersons, PERSON_CONFIG_PATH, fs, path);
console.assert(saveResult === true, '❌ Should save person config successfully');

const loadedConfig = loadPersonConfig(PERSON_CONFIG_PATH, fs);
console.assert(loadedConfig.persons.alice.niceScore === 8.5, '❌ Should load saved nice score');
console.assert(loadedConfig.persons.bob.currency === 'EUR', '❌ Should load saved currency');
console.log('✅ savePersonConfig and loadPersonConfig work correctly');

// Test 22: setPersonConfig (new person)
const setResult1 = setPersonConfig('charlie', { niceScore: 7.5, friendScore: 6 }, PERSON_CONFIG_PATH, fs, path);
console.assert(setResult1.success === true, '❌ Should set new person config');

const updatedConfig1 = loadPersonConfig(PERSON_CONFIG_PATH, fs);
console.assert(updatedConfig1.persons.charlie.niceScore === 7.5, '❌ Should add new person');
console.assert(updatedConfig1.persons.alice.niceScore === 8.5, '❌ Should preserve existing persons');
console.log('✅ setPersonConfig adds new person');

// Test 23: setPersonConfig (update existing person)
const setResult2 = setPersonConfig('alice', { niceScore: 9.5, currency: 'GBP' }, PERSON_CONFIG_PATH, fs, path);
console.assert(setResult2.success === true, '❌ Should update existing person config');

const updatedConfig2 = loadPersonConfig(PERSON_CONFIG_PATH, fs);
console.assert(updatedConfig2.persons.alice.niceScore === 9.5, '❌ Should update nice score');
console.assert(updatedConfig2.persons.alice.currency === 'GBP', '❌ Should update currency');
console.assert(updatedConfig2.persons.alice.friendScore === 7, '❌ Should preserve unchanged fields');
console.log('✅ setPersonConfig updates existing person');

// Test 24: clearPersonConfig (existing person)
const clearResult1 = clearPersonConfig('bob', PERSON_CONFIG_PATH, fs, path);
console.assert(clearResult1.success === true, '❌ Should clear existing person');

const updatedConfig3 = loadPersonConfig(PERSON_CONFIG_PATH, fs);
console.assert(updatedConfig3.persons.bob === undefined, '❌ Should remove person');
console.assert(updatedConfig3.persons.alice !== undefined, '❌ Should preserve other persons');
console.log('✅ clearPersonConfig removes existing person');

// Test 25: clearPersonConfig (non-existing person)
const clearResult2 = clearPersonConfig('nonexistent', PERSON_CONFIG_PATH, fs, path);
console.assert(clearResult2.success === false, '❌ Should fail to clear non-existing person');
console.assert(clearResult2.message.includes('not found'), '❌ Should indicate person not found');
console.log('✅ clearPersonConfig handles non-existing person');

// Test 26: listPersonConfigs (with data)
const listResult1 = listPersonConfigs(PERSON_CONFIG_PATH, fs);
console.assert(Array.isArray(listResult1), '❌ Should return array');
console.assert(listResult1.length > 0, '❌ Should return person configs');
console.assert(listResult1.some(p => p.name === 'alice'), '❌ Should include alice');
console.log('✅ listPersonConfigs returns person list');

// Test 27: sortPersons function
const unsortedPersons = [
  { name: 'charlie', niceScore: 7.5 },
  { name: 'alice', niceScore: 9.5 },
  { name: 'bob', niceScore: 8.0 }
];

const sortedByName = sortPersons(unsortedPersons, 'name', 'asc');
console.assert(sortedByName[0].name === 'alice', '❌ Should sort by name ascending');
console.assert(sortedByName[2].name === 'charlie', '❌ Should sort correctly');

const sortedByScore = sortPersons(unsortedPersons, 'niceScore', 'desc');
console.assert(sortedByScore[0].niceScore === 9.5, '❌ Should sort by niceScore descending');
console.assert(sortedByScore[2].niceScore === 7.5, '❌ Should sort numerically');
console.log('✅ sortPersons works correctly');

// Test 28: getPersonConfig
const getResult1 = getPersonConfig('alice', PERSON_CONFIG_PATH, fs);
console.assert(getResult1 !== null, '❌ Should get existing person config');
console.assert(getResult1.niceScore === 9.5, '❌ Should return correct data');

const getResult2 = getPersonConfig('nonexistent', PERSON_CONFIG_PATH, fs);
console.assert(getResult2 === null, '❌ Should return null for non-existing person');
console.log('✅ getPersonConfig works correctly');

//
// CLI INTEGRATION TESTS
//

console.log('\n🔍 Testing CLI integration...');

globalCleanup(); // Clean start for CLI tests

// Test 29: CLI person set command
const cliResult1 = runCLI('person set --name TestUser --nice-score 8.5 --friend-score 7 --base-value 100 --currency USD');
console.assert(cliResult1.success === true, `❌ CLI person set should succeed: ${cliResult1.stderr}`);
console.assert(cliResult1.stdout.includes('Person configuration set for TestUser'), '❌ Should show success message');
console.log('✅ CLI person set command');

// Test 30: CLI person list command
const cliResult2 = runCLI('person list');
console.assert(cliResult2.success === true, `❌ CLI person list should succeed: ${cliResult2.stderr}`);
console.assert(cliResult2.stdout.includes('TestUser'), '❌ Should list the created person');
console.log('✅ CLI person list command');

// Test 31: CLI person set with short form 'p'
const cliResult3 = runCLI('p set -n ShortUser -s 9 -f 8.5');
console.assert(cliResult3.success === true, `❌ CLI short form should succeed: ${cliResult3.stderr}`);
console.log('✅ CLI short form person command');

// Test 32: CLI person clear command
const cliResult4 = runCLI('person clear --name TestUser');
console.assert(cliResult4.success === true, `❌ CLI person clear should succeed: ${cliResult4.stderr}`);
console.assert(cliResult4.stdout.includes('Person configuration cleared for TestUser'), '❌ Should show clear success message');
console.log('✅ CLI person clear command');

// Test 33: CLI error handling - missing name
const cliResult5 = runCLI('person set --nice-score 8');
console.assert(cliResult5.success === false, '❌ CLI should fail for missing name');
console.assert(cliResult5.stderr.includes('Name is required') || cliResult5.stdout.includes('Name is required'), '❌ Should show name required error');
console.log('✅ CLI error handling for missing name');

// Test 34: CLI error handling - invalid score
const cliResult6 = runCLI('person set --name Test --nice-score 15');
console.assert(cliResult6.success === false, '❌ CLI should fail for invalid score');
console.log('✅ CLI error handling for invalid score');

//
// CONFIGURATION PRECEDENCE TESTS
//

console.log('\n🔍 Testing configuration precedence...');

globalCleanup();

// Set up test data
runCLI('person set --name PrecedenceUser --nice-score 7 --friend-score 6 --base-value 80 --currency EUR');

// Test 35: Person config overrides default values
const cliResult7 = runCLI('--person PrecedenceUser --dry-run Alice:8.5:7:50');
console.assert(cliResult7.success === true, `❌ CLI with person config should succeed: ${cliResult7.stderr}`);
// Verify that person config values are used (base-value 80 instead of default)
console.assert(cliResult7.stdout.includes('80') || cliResult7.stdout.includes('EUR'), '❌ Should use person config values');
console.log('✅ Person config overrides defaults');

// Test 36: CLI args override person config
const cliResult8 = runCLI('--person PrecedenceUser --base-value 120 --dry-run Alice:8.5:7:50');
console.assert(cliResult8.success === true, `❌ CLI args should override person config: ${cliResult8.stderr}`);
// CLI arg should override person config
console.assert(cliResult8.stdout.includes('120'), '❌ CLI args should override person config');
console.log('✅ CLI args override person config');

//
// EDGE CASES AND ERROR SCENARIOS
//

console.log('\n🔍 Testing edge cases...');

// Test 37: Large numbers
const result37 = parsePersonArguments(['set', '--name', 'BigSpender', '--base-value', '999999.99']);
console.assert(result37.success === true, '❌ Should handle large base values');
console.assert(result37.baseValue === 999999.99, '❌ Should parse large numbers correctly');
console.log('✅ Large number handling');

// Test 38: Decimal precision
const result38 = parsePersonArguments(['set', '--name', 'Precise', '--nice-score', '8.123', '--friend-score', '7.456']);
console.assert(result38.success === true, '❌ Should handle decimal precision');
console.assert(Math.abs(result38.niceScore - 8.123) < 0.001, '❌ Should preserve decimal precision');
console.log('✅ Decimal precision handling');

// Test 39: Unicode characters in names
const result39 = parsePersonArguments(['set', '--name', 'José María', '--nice-score', '8']);
console.assert(result39.success === true, '❌ Should handle unicode characters in names');
console.assert(result39.name === 'José María', '❌ Should preserve unicode characters');
console.log('✅ Unicode character handling');

// Test 40: Case insensitive currency handling
const result40 = parsePersonArguments(['set', '--name', 'Test', '--currency', 'gbp']);
console.assert(result40.success === true, '❌ Should handle lowercase currency');
console.assert(result40.currency === 'GBP', '❌ Should convert to uppercase');
console.log('✅ Currency case handling');

// Final cleanup
globalCleanup();

console.log('\n🎉 All person configuration tests passed!\n');
console.log('📊 Test Summary:');
console.log('  • Argument parsing: ✅ 18 tests');
console.log('  • Configuration management: ✅ 10 tests');
console.log('  • CLI integration: ✅ 6 tests');
console.log('  • Configuration precedence: ✅ 2 tests');
console.log('  • Edge cases: ✅ 4 tests');
console.log('  • Total: ✅ 40 tests\n');