import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

describe('Person Configuration Functions', () => {
  beforeEach(() => {
    globalCleanup();
  });

  afterEach(() => {
    globalCleanup();
  });

  describe('parsePersonArguments', () => {
    it('should parse valid set command with all fields', () => {
      const result = parsePersonArguments(['set', '--name', 'Alice', '--nice-score', '8.5', '--friend-score', '7', '--base-value', '100', '--currency', 'USD']);
      expect(result.success).toBe(true);
      expect(result.action).toBe('set');
      expect(result.name).toBe('Alice');
      expect(result.niceScore).toBe(8.5);
      expect(result.friendScore).toBe(7);
      expect(result.baseValue).toBe(100);
      expect(result.currency).toBe('USD');
    });

    it('should parse valid set command with short flags', () => {
      const result = parsePersonArguments(['set', '-n', 'Bob', '-s', '9', '-f', '8.5', '-b', '150', '-c', 'eur']);
      expect(result.success).toBe(true);
      expect(result.name).toBe('Bob');
      expect(result.niceScore).toBe(9);
      expect(result.friendScore).toBe(8.5);
      expect(result.baseValue).toBe(150);
      expect(result.currency).toBe('EUR');
    });

    it('should parse set command with partial fields', () => {
      const result = parsePersonArguments(['set', '--name', 'Charlie', '--nice-score', '7.5']);
      expect(result.success).toBe(true);
      expect(result.name).toBe('Charlie');
      expect(result.niceScore).toBe(7.5);
      expect(result.friendScore).toBe(null);
    });

    it('should parse valid clear command', () => {
      const result = parsePersonArguments(['clear', '--name', 'Alice']);
      expect(result.success).toBe(true);
      expect(result.action).toBe('clear');
      expect(result.name).toBe('Alice');
    });

    it('should parse clear command with short flag', () => {
      const result = parsePersonArguments(['clear', '-n', 'Bob']);
      expect(result.success).toBe(true);
      expect(result.name).toBe('Bob');
    });

    it('should parse valid list command', () => {
      const result = parsePersonArguments(['list']);
      expect(result.success).toBe(true);
      expect(result.action).toBe('list');
    });

    it('should parse list command with sort options', () => {
      const result = parsePersonArguments(['list', '--sort-by', 'nice-score', '--order', 'desc']);
      expect(result.success).toBe(true);
      expect(result.sortBy).toBe('nice-score');
      expect(result.order).toBe('desc');
    });

    // Error handling tests
    it('should fail when no arguments provided', () => {
      const result = parsePersonArguments([]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No action specified');
    });

    it('should fail for invalid action', () => {
      const result = parsePersonArguments(['invalid']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown person action');
    });

    it('should fail set command without name', () => {
      const result = parsePersonArguments(['set', '--nice-score', '8']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Person name is required');
    });

    it('should fail clear command without name', () => {
      const result = parsePersonArguments(['clear']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Person name is required');
    });

    it('should fail for nice score too high', () => {
      const result = parsePersonArguments(['set', '--name', 'Test', '--nice-score', '11']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Nice score must be between 0 and 10');
    });

    it('should fail for negative nice score', () => {
      const result = parsePersonArguments(['set', '--name', 'Test', '--nice-score', '-1']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Nice score must be between 0 and 10');
    });

    it('should fail for friend score too low', () => {
      const result = parsePersonArguments(['set', '--name', 'Test', '--friend-score', '0.5']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Friend score must be between 1 and 10');
    });

    it('should fail for friend score too high', () => {
      const result = parsePersonArguments(['set', '--name', 'Test', '--friend-score', '11']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Friend score must be between 1 and 10');
    });

    it('should fail for negative base value', () => {
      const result = parsePersonArguments(['set', '--name', 'Test', '--base-value', '-50']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Base value must be positive');
    });

    it('should fail for invalid sort field', () => {
      const result = parsePersonArguments(['list', '--sort-by', 'invalid']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid sort field');
    });

    it('should fail for invalid sort order', () => {
      const result = parsePersonArguments(['list', '--sort-by', 'name', '--order', 'invalid']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid order');
    });
  });

  describe('Configuration Management', () => {
    it('should return correct config path', () => {
      const configPath = getPersonConfigPath(path, os);
      expect(configPath).toContain('persons.json');
      expect(configPath).toContain('.config/gift-calc');
    });

    it('should handle missing file', () => {
      const emptyConfig = loadPersonConfig(PERSON_CONFIG_PATH, fs);
      expect(emptyConfig).toBeTypeOf('object');
      expect(emptyConfig.loaded).toBe(false);
      expect(Object.keys(emptyConfig.persons)).toHaveLength(0);
    });

    it('should save and load person config', () => {
      const testPersons = {
        'alice': { niceScore: 8.5, friendScore: 7, baseValue: 100, currency: 'USD' },
        'bob': { niceScore: 9, friendScore: 8.5, baseValue: 150, currency: 'EUR' }
      };
      const saveResult = savePersonConfig(testPersons, PERSON_CONFIG_PATH, fs, path);
      expect(saveResult).toBe(true);

      const loadedConfig = loadPersonConfig(PERSON_CONFIG_PATH, fs);
      expect(loadedConfig.persons.alice.niceScore).toBe(8.5);
      expect(loadedConfig.persons.bob.currency).toBe('EUR');
    });

    it('should add new person', () => {
      const setResult = setPersonConfig('charlie', { niceScore: 7.5, friendScore: 6 }, PERSON_CONFIG_PATH, fs, path);
      expect(setResult.success).toBe(true);

      const updatedConfig = loadPersonConfig(PERSON_CONFIG_PATH, fs);
      expect(updatedConfig.persons.charlie.niceScore).toBe(7.5);
    });

    it('should update existing person', () => {
      // First set a person
      setPersonConfig('alice', { niceScore: 8.5, friendScore: 7, baseValue: 100, currency: 'USD' }, PERSON_CONFIG_PATH, fs, path);

      // Then update
      const setResult = setPersonConfig('alice', { niceScore: 9.5, currency: 'GBP' }, PERSON_CONFIG_PATH, fs, path);
      expect(setResult.success).toBe(true);

      const updatedConfig = loadPersonConfig(PERSON_CONFIG_PATH, fs);
      expect(updatedConfig.persons.alice.niceScore).toBe(9.5);
      expect(updatedConfig.persons.alice.currency).toBe('GBP');
      expect(updatedConfig.persons.alice.friendScore).toBe(7); // Should preserve unchanged fields
    });

    it('should remove existing person', () => {
      // First set persons
      setPersonConfig('alice', { niceScore: 8.5 }, PERSON_CONFIG_PATH, fs, path);
      setPersonConfig('bob', { niceScore: 9 }, PERSON_CONFIG_PATH, fs, path);

      const clearResult = clearPersonConfig('bob', PERSON_CONFIG_PATH, fs, path);
      expect(clearResult.success).toBe(true);

      const updatedConfig = loadPersonConfig(PERSON_CONFIG_PATH, fs);
      expect(updatedConfig.persons.bob).toBeUndefined();
      expect(updatedConfig.persons.alice).toBeDefined();
    });

    it('should handle non-existing person for clear', () => {
      const clearResult = clearPersonConfig('nonexistent', PERSON_CONFIG_PATH, fs, path);
      expect(clearResult.success).toBe(false);
      expect(clearResult.message).toContain('not found');
    });

    it('should list person configs', () => {
      setPersonConfig('alice', { niceScore: 8.5 }, PERSON_CONFIG_PATH, fs, path);

      const listResult = listPersonConfigs(PERSON_CONFIG_PATH, fs);
      expect(Array.isArray(listResult)).toBe(true);
      expect(listResult.length).toBeGreaterThan(0);
      expect(listResult.some(p => p.includes('alice:'))).toBe(true);
    });

    it('should sort persons correctly', () => {
      const unsortedPersons = [
        { name: 'charlie', niceScore: 7.5 },
        { name: 'alice', niceScore: 9.5 },
        { name: 'bob', niceScore: 8.0 }
      ];

      const sortedByName = sortPersons(unsortedPersons, 'name', 'asc');
      expect(sortedByName[0].name).toBe('alice');
      expect(sortedByName[2].name).toBe('charlie');

      const sortedByScore = sortPersons(unsortedPersons, 'nice-score', 'desc');
      expect(sortedByScore[0].niceScore).toBe(9.5);
      expect(sortedByScore[2].niceScore).toBe(7.5);
    });

    it('should get person config', () => {
      setPersonConfig('alice', { niceScore: 9.5 }, PERSON_CONFIG_PATH, fs, path);

      const getResult = getPersonConfig('alice', PERSON_CONFIG_PATH, fs);
      expect(getResult).not.toBeNull();
      expect(getResult.niceScore).toBe(9.5);

      const getResult2 = getPersonConfig('nonexistent', PERSON_CONFIG_PATH, fs);
      expect(getResult2).toBeNull();
    });
  });

  describe('CLI Integration', () => {
    it('should handle CLI person set command', () => {
      const result = runCLI('person set --name TestUser --nice-score 8.5 --friend-score 7 --base-value 100 --currency USD');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Person configuration saved for TestUser');
    });

    it('should handle CLI person list command', () => {
      runCLI('person set --name TestUser --nice-score 8.5');
      const result = runCLI('person list');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('TestUser');
    });

    it('should handle CLI short form person command', () => {
      const result = runCLI('p set -n ShortUser -s 9 -f 8.5');
      expect(result.success).toBe(true);
    });

    it('should handle CLI person clear command', () => {
      runCLI('person set --name TestUser --nice-score 8.5');
      const result = runCLI('person clear --name TestUser');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Person configuration cleared for TestUser');
    });

    it('should handle CLI error for missing name', () => {
      const result = runCLI('person set --nice-score 8');
      expect(result.success).toBe(false);
      expect(result.stderr + result.stdout).toContain('Person name is required');
    });

    it('should handle CLI error for invalid score', () => {
      const result = runCLI('person set --name Test --nice-score 15');
      expect(result.success).toBe(false);
    });
  });

  describe('Configuration Precedence', () => {
    it('should use person config values', () => {
      runCLI('person set --name PrecedenceUser --nice-score 7 --friend-score 6 --base-value 80 --currency EUR');

      const result = runCLI('--name PrecedenceUser --dry-run Alice:8.5:7:50');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('EUR');
    });

    it('should allow CLI args to override person config', () => {
      runCLI('person set --name PrecedenceUser --nice-score 7 --friend-score 6 --base-value 80 --currency EUR');

      // Test that overriding with different currency changes the output
      const result = runCLI('--name PrecedenceUser --currency USD --dry-run Alice:8.5:7:50');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('USD');
    });
  });

  describe('Edge Cases', () => {
    it('should handle large numbers', () => {
      const result = parsePersonArguments(['set', '--name', 'BigSpender', '--base-value', '999999.99']);
      expect(result.success).toBe(true);
      expect(result.baseValue).toBe(999999.99);
    });

    it('should handle decimal precision', () => {
      const result = parsePersonArguments(['set', '--name', 'Precise', '--nice-score', '8.123', '--friend-score', '7.456']);
      expect(result.success).toBe(true);
      expect(Math.abs(result.niceScore - 8.123)).toBeLessThan(0.001);
    });

    it('should handle unicode characters in names', () => {
      const result = parsePersonArguments(['set', '--name', 'José María', '--nice-score', '8']);
      expect(result.success).toBe(true);
      expect(result.name).toBe('José María');
    });

    it('should handle case insensitive currency', () => {
      const result = parsePersonArguments(['set', '--name', 'Test', '--currency', 'gbp']);
      expect(result.success).toBe(true);
      expect(result.currency).toBe('GBP');
    });
  });
});