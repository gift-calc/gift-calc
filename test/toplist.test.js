import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  parseToplistArguments,
  getToplistData,
  formatToplistOutput,
  getPersonConfigPath,
  loadPersonConfig,
  savePersonConfig
} from '../src/core.js';

// Test configuration paths
const CONFIG_DIR = path.join(os.homedir(), '.config', 'gift-calc');
const PERSON_CONFIG_PATH = path.join(CONFIG_DIR, 'persons.json');
const LOG_PATH = path.join(CONFIG_DIR, 'gift-calc.log');
const CLI_PATH = path.join(process.cwd(), 'index.js');

// Enhanced cleanup function
function globalCleanup() {
  try {
    if (fs.existsSync(PERSON_CONFIG_PATH)) fs.unlinkSync(PERSON_CONFIG_PATH);
    if (fs.existsSync(LOG_PATH)) fs.unlinkSync(LOG_PATH);
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

// Helper function to create test persons config
function createTestPersonsConfig() {
  const persons = {
    'alice': {
      name: 'Alice',
      niceScore: 9,
      friendScore: 8,
      baseValue: 100,
      currency: 'SEK'
    },
    'bob': {
      name: 'Bob',
      niceScore: 7,
      friendScore: 6,
      baseValue: 80,
      currency: 'USD'
    },
    'charlie': {
      name: 'Charlie',
      niceScore: 5,
      friendScore: 9,
      baseValue: 120,
      currency: 'SEK'
    }
  };

  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  savePersonConfig(persons, PERSON_CONFIG_PATH, fs, path);
  return persons;
}

// Helper function to create test log entries
function createTestLogEntries() {
  const logEntries = [
    '2024-12-01T10:00:00.000Z 150.50 SEK for Alice',
    '2024-12-02T11:00:00.000Z 200.00 USD for Bob',
    '2024-12-03T12:00:00.000Z 300.25 SEK for Alice',
    '2024-12-04T13:00:00.000Z 100.75 SEK for Charlie',
    '2024-12-05T14:00:00.000Z 175.00 USD for Bob',
    '2024-12-06T15:00:00.000Z 50.00 SEK for David'
  ];

  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  fs.writeFileSync(LOG_PATH, logEntries.join('\n'));
}

describe('Toplist Arguments Parsing', () => {
  it('should parse empty arguments with defaults', () => {
    const result = parseToplistArguments([]);
    expect(result.success).toBe(true);
    expect(result.command).toBe('toplist');
    expect(result.sortBy).toBe('total');
    expect(result.length).toBe(10);
    expect(result.error).toBe(null);
  });

  it('should parse nice score flag', () => {
    const result = parseToplistArguments(['-n']);
    expect(result.success).toBe(true);
    expect(result.sortBy).toBe('nice-score');
    expect(result.length).toBe(10);
  });

  it('should parse friend score long flag', () => {
    const result = parseToplistArguments(['--friend-score']);
    expect(result.success).toBe(true);
    expect(result.sortBy).toBe('friend-score');
    expect(result.length).toBe(10);
  });

  it('should parse length parameter', () => {
    const result = parseToplistArguments(['-l', '20']);
    expect(result.success).toBe(true);
    expect(result.sortBy).toBe('total');
    expect(result.length).toBe(20);
  });

  it('should parse multiple flags', () => {
    const result = parseToplistArguments(['-n', '--length', '5']);
    expect(result.success).toBe(true);
    expect(result.sortBy).toBe('nice-score');
    expect(result.length).toBe(5);
  });

  it('should handle invalid length values', () => {
    const result = parseToplistArguments(['-l', '0']);
    expect(result.success).toBe(false);
    expect(result.error).toContain('must be a positive number');
  });

  it('should handle missing length value', () => {
    const result = parseToplistArguments(['-l']);
    expect(result.success).toBe(false);
    expect(result.error).toContain('requires a numeric value');
  });

  it('should handle unknown arguments', () => {
    const result = parseToplistArguments(['--invalid']);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown argument');
  });

  it('should parse --from date parameter', () => {
    const result = parseToplistArguments(['--from', '2024-01-01']);
    expect(result.success).toBe(true);
    expect(result.fromDate).toBe('2024-01-01');
    expect(result.toDate).toBe(new Date().toISOString().split('T')[0]); // Should default to today
  });

  it('should parse --to date parameter', () => {
    const result = parseToplistArguments(['--to', '2024-12-31']);
    expect(result.success).toBe(true);
    expect(result.fromDate).toBe(null);
    expect(result.toDate).toBe('2024-12-31');
  });

  it('should parse both --from and --to date parameters', () => {
    const result = parseToplistArguments(['--from', '2024-01-01', '--to', '2024-12-31']);
    expect(result.success).toBe(true);
    expect(result.fromDate).toBe('2024-01-01');
    expect(result.toDate).toBe('2024-12-31');
  });

  it('should handle invalid --from date format', () => {
    const result = parseToplistArguments(['--from', 'invalid-date']);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid from date');
  });

  it('should handle invalid --to date format', () => {
    const result = parseToplistArguments(['--to', '2024-13-45']);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid to date');
  });

  it('should handle missing --from value', () => {
    const result = parseToplistArguments(['--from']);
    expect(result.success).toBe(false);
    expect(result.error).toContain('--from requires a date in YYYY-MM-DD format');
  });

  it('should handle missing --to value', () => {
    const result = parseToplistArguments(['--to']);
    expect(result.success).toBe(false);
    expect(result.error).toContain('--to requires a date in YYYY-MM-DD format');
  });

  it('should handle from date after to date', () => {
    const result = parseToplistArguments(['--from', '2024-12-31', '--to', '2024-01-01']);
    expect(result.success).toBe(false);
    expect(result.error).toContain('From date must be before or equal to to date');
  });

  it('should combine time filtering with other parameters', () => {
    const result = parseToplistArguments(['--from', '2024-01-01', '--to', '2024-12-31', '-n', '-l', '5']);
    expect(result.success).toBe(true);
    expect(result.fromDate).toBe('2024-01-01');
    expect(result.toDate).toBe('2024-12-31');
    expect(result.sortBy).toBe('nice-score');
    expect(result.length).toBe(5);
  });

  it('should parse currency flag', () => {
    const result = parseToplistArguments(['-c', 'USD']);
    expect(result.success).toBe(true);
    expect(result.currency).toBe('USD');
    expect(result.sortBy).toBe('total');
    expect(result.length).toBe(10);
  });

  it('should parse currency long flag', () => {
    const result = parseToplistArguments(['--currency', 'SEK']);
    expect(result.success).toBe(true);
    expect(result.currency).toBe('SEK');
  });

  it('should handle missing currency value', () => {
    const result = parseToplistArguments(['-c']);
    expect(result.success).toBe(false);
    expect(result.error).toContain('--currency requires a currency code');
  });

  it('should parse list-currencies flag', () => {
    const result = parseToplistArguments(['--list-currencies']);
    expect(result.success).toBe(true);
    expect(result.listCurrencies).toBe(true);
  });

  it('should combine currency filtering with other parameters', () => {
    const result = parseToplistArguments(['-c', 'USD', '-n', '-l', '5']);
    expect(result.success).toBe(true);
    expect(result.currency).toBe('USD');
    expect(result.sortBy).toBe('nice-score');
    expect(result.length).toBe(5);
  });

  it('should handle invalid currency codes gracefully', () => {
    // Should accept any currency code without validation at parse time
    const result = parseToplistArguments(['-c', 'INVALID']);
    expect(result.success).toBe(true);
    expect(result.currency).toBe('INVALID');
  });
});

describe('Toplist Data Aggregation', () => {
  beforeEach(() => {
    globalCleanup();
  });

  afterEach(() => {
    globalCleanup();
  });

  it('should handle empty person config and log', () => {
    const result = getToplistData(PERSON_CONFIG_PATH, LOG_PATH, fs);
    expect(result.errorMessage).toBe(null);
    expect(result.persons).toEqual([]);
  });

  it('should load persons from config only', () => {
    const testPersons = createTestPersonsConfig();
    const result = getToplistData(PERSON_CONFIG_PATH, LOG_PATH, fs);

    expect(result.errorMessage).toBe(null);
    expect(result.persons).toHaveLength(3);
    expect(result.persons.map(p => p.name)).toContain('Alice');
    expect(result.persons.map(p => p.name)).toContain('Bob');
    expect(result.persons.map(p => p.name)).toContain('Charlie');
  });

  it('should aggregate gift data from log', () => {
    const testPersons = createTestPersonsConfig();
    createTestLogEntries();

    const result = getToplistData(PERSON_CONFIG_PATH, LOG_PATH, fs);

    expect(result.errorMessage).toBe(null);
    expect(result.persons).toHaveLength(4); // 3 config + 1 log-only (David)

    // Find Alice and check her gift totals
    const alice = result.persons.find(p => p.name === 'Alice');
    expect(alice).toBeDefined();
    expect(alice.gifts.SEK).toBeCloseTo(450.75); // 150.50 + 300.25
    expect(alice.niceScore).toBe(9);
    expect(alice.friendScore).toBe(8);

    // Find Bob and check his gift totals
    const bob = result.persons.find(p => p.name === 'Bob');
    expect(bob).toBeDefined();
    expect(bob.gifts.USD).toBeCloseTo(375.00); // 200.00 + 175.00
    expect(bob.niceScore).toBe(7);
    expect(bob.friendScore).toBe(6);

    // Find David (log-only person)
    const david = result.persons.find(p => p.name === 'David');
    expect(david).toBeDefined();
    expect(david.gifts.SEK).toBeCloseTo(50.00);
    expect(david.niceScore).toBeUndefined();
    expect(david.friendScore).toBeUndefined();
  });

  it('should handle log file read errors', () => {
    createTestPersonsConfig();
    // Create a directory instead of a file to simulate read error
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.mkdirSync(LOG_PATH, { recursive: true }); // This will cause a read error

    const result = getToplistData(PERSON_CONFIG_PATH, LOG_PATH, fs);
    expect(result.errorMessage).toContain('Could not read log file');

    // Cleanup the directory
    fs.rmdirSync(LOG_PATH, { recursive: true });
  });

  it('should filter by date range when both fromDate and toDate provided', () => {
    createTestPersonsConfig();

    // Create log entries across different dates
    const logEntries = [
      '2024-11-29T10:00:00.000Z 100.00 SEK for Alice',  // Before range
      '2024-12-01T10:00:00.000Z 150.50 SEK for Alice',  // In range
      '2024-12-02T11:00:00.000Z 200.00 USD for Bob',    // In range
      '2024-12-03T12:00:00.000Z 300.25 SEK for Alice',  // In range
      '2024-12-05T14:00:00.000Z 50.00 SEK for David',   // In range (moved to Dec 5 to be within filter)
      '2024-12-06T15:00:00.000Z 75.00 SEK for Charlie', // After range (excluded)
    ];

    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(LOG_PATH, logEntries.join('\n'));

    // Filter for 2024-12-01 to 2024-12-05
    const result = getToplistData(PERSON_CONFIG_PATH, LOG_PATH, fs, '2024-12-01', '2024-12-05');

    expect(result.errorMessage).toBe(null);

    // Alice should have gifts from Dec 1 and Dec 3 only (not Nov 29)
    const alice = result.persons.find(p => p.name === 'Alice');
    expect(alice).toBeDefined();
    expect(alice.gifts.SEK).toBeCloseTo(450.75); // 150.50 + 300.25

    // Bob should have gift from Dec 2
    const bob = result.persons.find(p => p.name === 'Bob');
    expect(bob).toBeDefined();
    expect(bob.gifts.USD).toBeCloseTo(200.00);

    // David should have gift from Dec 5 (within range)
    const david = result.persons.find(p => p.name === 'David');
    expect(david).toBeDefined();
    expect(david.gifts.SEK).toBeCloseTo(50.00);

    // Charlie should NOT appear because his gift was on Dec 6 (outside range)
    const charlie = result.persons.find(p => p.name === 'Charlie');
    const charlieGifts = charlie ? Object.keys(charlie.gifts || {}) : [];
    expect(charlieGifts).toHaveLength(0); // Should have no gifts in this date range
  });

  it('should filter from date only (to date defaults to today)', () => {
    createTestPersonsConfig();

    // Create log entries with dates before and after the from date
    const logEntries = [
      '2024-11-30T10:00:00.000Z 100.00 SEK for Alice',  // Before from date
      '2024-12-01T10:00:00.000Z 150.50 SEK for Alice',  // On from date
      '2024-12-02T11:00:00.000Z 200.00 USD for Bob',    // After from date
    ];

    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(LOG_PATH, logEntries.join('\n'));

    // Filter from 2024-12-01 only
    const result = getToplistData(PERSON_CONFIG_PATH, LOG_PATH, fs, '2024-12-01', null);

    expect(result.errorMessage).toBe(null);

    // Alice should only have gifts from Dec 1 onwards (not Nov 30)
    const alice = result.persons.find(p => p.name === 'Alice');
    expect(alice).toBeDefined();
    expect(alice.gifts.SEK).toBeCloseTo(150.50); // Only Dec 1 gift

    // Bob should have gift from Dec 2
    const bob = result.persons.find(p => p.name === 'Bob');
    expect(bob).toBeDefined();
    expect(bob.gifts.USD).toBeCloseTo(200.00);
  });

  it('should filter to date only', () => {
    createTestPersonsConfig();

    // Create log entries with dates before and after the to date
    const logEntries = [
      '2024-12-01T10:00:00.000Z 150.50 SEK for Alice',  // Before to date
      '2024-12-02T11:00:00.000Z 200.00 USD for Bob',    // On to date
      '2024-12-03T12:00:00.000Z 300.25 SEK for Alice',  // After to date
    ];

    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(LOG_PATH, logEntries.join('\n'));

    // Filter up to 2024-12-02 only
    const result = getToplistData(PERSON_CONFIG_PATH, LOG_PATH, fs, null, '2024-12-02');

    expect(result.errorMessage).toBe(null);

    // Alice should only have gifts up to Dec 2 (not Dec 3)
    const alice = result.persons.find(p => p.name === 'Alice');
    expect(alice).toBeDefined();
    expect(alice.gifts.SEK).toBeCloseTo(150.50); // Only Dec 1 gift

    // Bob should have gift from Dec 2
    const bob = result.persons.find(p => p.name === 'Bob');
    expect(bob).toBeDefined();
    expect(bob.gifts.USD).toBeCloseTo(200.00);
  });

  it('should return no persons when date range excludes all entries', () => {
    createTestPersonsConfig();
    createTestLogEntries(); // Creates entries from 2024-12-01 to 2024-12-06

    // Filter for a range that excludes all existing log entries
    const result = getToplistData(PERSON_CONFIG_PATH, LOG_PATH, fs, '2024-01-01', '2024-01-31');

    expect(result.errorMessage).toBe(null);

    // Should still have the 3 persons from config, but with no gifts
    expect(result.persons).toHaveLength(3);
    result.persons.forEach(person => {
      expect(Object.keys(person.gifts || {})).toHaveLength(0);
    });
  });
});

describe('Toplist Output Formatting', () => {
  let testPersons;

  beforeEach(() => {
    // Create test person data with mixed currencies
    testPersons = [
      {
        name: 'Alice',
        niceScore: 9,
        friendScore: 8,
        gifts: { SEK: 450.75, USD: 100.00 }
      },
      {
        name: 'Bob',
        niceScore: 7,
        friendScore: 6,
        gifts: { USD: 375.00 }
      },
      {
        name: 'Charlie',
        niceScore: 5,
        friendScore: 9,
        gifts: { SEK: 100.75 }
      },
      {
        name: 'David',
        niceScore: undefined,
        friendScore: undefined,
        gifts: { SEK: 50.00 }
      }
    ];
  });

  it('should handle empty persons list', () => {
    const output = formatToplistOutput([], 'total', 10);
    expect(output).toBe('No persons found in configuration or gift history.');
  });

  it('should sort by total gifts (default)', () => {
    const output = formatToplistOutput(testPersons, 'total', 10);
    expect(output).toContain('Top 4 Persons (Total Gifts)');

    // Alice should be first (highest total: ~550)
    expect(output).toMatch(/1\.\s*Alice/);
    // Bob should be second (375 USD)
    expect(output).toMatch(/2\.\s*Bob/);
    // Charlie should be third (100.75 SEK)
    expect(output).toMatch(/3\.\s*Charlie/);
    // David should be last (50.00 SEK)
    expect(output).toMatch(/4\.\s*David/);
  });

  it('should sort by nice score', () => {
    const output = formatToplistOutput(testPersons, 'nice-score', 10);
    expect(output).toContain('Top 4 Persons (Nice Score)');

    // Alice should be first (nice score: 9)
    expect(output).toMatch(/1\.\s*Alice:\s*9/);
    // Bob should be second (nice score: 7)
    expect(output).toMatch(/2\.\s*Bob:\s*7/);
    // Charlie should be third (nice score: 5)
    expect(output).toMatch(/3\.\s*Charlie:\s*5/);
    // David should be last (N/A nice score)
    expect(output).toMatch(/4\.\s*David:\s*N\/A/);
  });

  it('should sort by friend score', () => {
    const output = formatToplistOutput(testPersons, 'friend-score', 10);
    expect(output).toContain('Top 4 Persons (Friend Score)');

    // Charlie should be first (friend score: 9)
    expect(output).toMatch(/1\.\s*Charlie:\s*9/);
    // Alice should be second (friend score: 8)
    expect(output).toMatch(/2\.\s*Alice:\s*8/);
    // Bob should be third (friend score: 6)
    expect(output).toMatch(/3\.\s*Bob:\s*6/);
    // David should be last (N/A friend score)
    expect(output).toMatch(/4\.\s*David:\s*N\/A/);
  });

  it('should limit results based on length parameter', () => {
    const output = formatToplistOutput(testPersons, 'total', 2);
    expect(output).toContain('Top 2 Persons (Total Gifts)');

    const lines = output.split('\n');
    const dataLines = lines.filter(line => /^\d+\./.test(line));
    expect(dataLines).toHaveLength(2);
  });

  it('should show gift amounts and scores for total sort', () => {
    const output = formatToplistOutput(testPersons, 'total', 10);

    // Alice should show multi-currency gifts and both scores
    expect(output).toMatch(/Alice:.*450\.75.*SEK.*100.*USD.*(nice: 9, friend: 8)/);
    // Bob should show single currency and both scores
    expect(output).toMatch(/Bob:.*375.*USD.*(nice: 7, friend: 6)/);
    // David should show gifts but no scores
    expect(output).toMatch(/David:.*50.*SEK/);
    // David should not have any parentheses (which would contain scores)
    expect(output).not.toMatch(/David:.*\(/);
    expect(output).not.toMatch(/David.*nice/);
    expect(output).not.toMatch(/David.*friend/);
  });

  it('should show cross-scores when sorting by specific score', () => {
    const output = formatToplistOutput(testPersons, 'nice-score', 10);

    // When sorting by nice-score, should show friend score in parentheses
    expect(output).toMatch(/Alice:\s*9.*\(friend: 8\)/);
    expect(output).toMatch(/Bob:\s*7.*\(friend: 6\)/);
    expect(output).toMatch(/Charlie:\s*5.*\(friend: 9\)/);
  });

  it('should handle currency filtering with single currency data', () => {
    const output = formatToplistOutput(testPersons, 'total', 10, ['SEK', 'USD'], 'SEK');
    expect(output).toContain('Top 3 Persons (Total Gifts - SEK)');
    expect(output).toContain('Alice: 450.75 SEK');
    expect(output).toContain('Charlie: 100.75 SEK');
    expect(output).toContain('David: 50 SEK');
    expect(output).not.toContain('USD');
  });

  it('should handle currency filtering with non-existent currency', () => {
    const output = formatToplistOutput(testPersons, 'total', 10, ['SEK', 'USD'], 'EUR');
    expect(output).toBe('No persons found with gifts in EUR.');
  });

  it('should handle list currencies output', () => {
    const output = formatToplistOutput(testPersons, 'total', 10, ['SEK', 'USD'], 'LIST_CURRENCIES');
    expect(output).toBe('Available currencies in dataset: SEK, USD');
  });

  it('should handle list currencies with no currencies', () => {
    const output = formatToplistOutput([], 'total', 10, [], 'LIST_CURRENCIES');
    expect(output).toBe('No persons found in configuration or gift history.');
  });

  it('should handle currency filtering with score-based sorting', () => {
    const output = formatToplistOutput(testPersons, 'nice-score', 10, ['SEK', 'USD'], 'SEK');
    expect(output).toContain('Top 4 Persons (Nice Score)');
    expect(output).toContain('Alice: 9 (friend: 8)');
    expect(output).toContain('Bob: 7 (friend: 6)');
    expect(output).toContain('Charlie: 5 (friend: 9)');
    expect(output).toContain('David: N/A');
    // Score-based sorting shows all persons regardless of currency filter
  });

  it('should handle persons with mixed currencies when filtering', () => {
    // Alice has both SEK and USD, but when filtering for SEK, should only show SEK amounts
    const output = formatToplistOutput(testPersons, 'total', 10, ['SEK', 'USD'], 'SEK');
    expect(output).toContain('Alice: 450.75 SEK');
    expect(output).not.toContain('Alice:.*100.*USD');
  });

  it('should handle edge case: person with no gifts in filtered currency but has scores', () => {
    const personsWithScoresOnly = [
      {
        name: 'Bob',
        niceScore: 7,
        friendScore: 6,
        gifts: { USD: 375.00 }
      }
    ];
    const output = formatToplistOutput(personsWithScoresOnly, 'total', 10, ['USD'], 'SEK');
    expect(output).toBe('No persons found with gifts in SEK.');
  });

  it('should handle edge case: empty gifts object with currency filter', () => {
    const personsWithEmptyGifts = [
      {
        name: 'Eve',
        niceScore: 8,
        friendScore: 7,
        gifts: {}
      }
    ];
    const output = formatToplistOutput(personsWithEmptyGifts, 'total', 10, ['SEK'], 'SEK');
    expect(output).toBe('No persons found with gifts in SEK.');
  });
});

describe('CLI Integration', () => {
  beforeEach(() => {
    globalCleanup();
  });

  afterEach(() => {
    globalCleanup();
  });

  it('should handle toplist command with no data', () => {
    const result = runCLI('toplist');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('No persons found');
  });

  it('should handle toplist with short alias', () => {
    const result = runCLI('tl');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('No persons found');
  });

  it('should show help for invalid toplist arguments', () => {
    const result = runCLI('toplist --invalid');
    expect(result.success).toBe(false);

    // Error message is in stderr, usage is in stdout
    expect(result.stderr).toContain('Unknown argument');
    expect(result.stdout).toContain('gift-calc toplist');
  });

  it('should execute toplist with real data', () => {
    createTestPersonsConfig();
    createTestLogEntries();

    const result = runCLI('toplist');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Top');
    expect(result.stdout).toContain('Total Gifts');
    expect(result.stdout).toContain('Alice');
    expect(result.stdout).toContain('Bob');
    expect(result.stdout).toContain('Charlie');
  });

  it('should execute toplist with nice score sorting', () => {
    createTestPersonsConfig();
    createTestLogEntries();

    const result = runCLI('toplist -n');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Nice Score');
    expect(result.stdout).toMatch(/1\.\s*Alice:\s*9/);
  });

  it('should execute toplist with custom length', () => {
    createTestPersonsConfig();
    createTestLogEntries();

    const result = runCLI('toplist -l 2');
    expect(result.success).toBe(true);
    // With multi-currency data, shows separate sections
    expect(result.stdout).toContain('Top 2 Persons (Total Gifts - SEK)');
    expect(result.stdout).toContain('Top 1 Persons (Total Gifts - USD)');

    const lines = result.stdout.split('\n');
    const dataLines = lines.filter(line => /^\d+\./.test(line));
    // Expects 3 total data lines: 2 from SEK section + 1 from USD section
    expect(dataLines).toHaveLength(3);
  });

  it('should execute toplist with friend score and length', () => {
    createTestPersonsConfig();
    createTestLogEntries();

    const result = runCLI('toplist --friend-score --length 3');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Top 3 Persons (Friend Score)');
    expect(result.stdout).toMatch(/1\.\s*Charlie:\s*9/); // Charlie has highest friend score
  });

  it('should handle currency filtering via CLI', () => {
    createTestPersonsConfig();
    createTestLogEntries();

    const result = runCLI('toplist -c SEK');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Top 3 Persons (Total Gifts - SEK)');
    expect(result.stdout).toContain('Alice: 450.75 SEK');
    expect(result.stdout).toContain('Charlie: 100.75 SEK');
    expect(result.stdout).toContain('David: 50 SEK');
    // Should not show USD in the filtered output
    expect(result.stdout).not.toContain('USD');
  });

  it('should handle currency filtering with non-existent currency', () => {
    createTestPersonsConfig();
    createTestLogEntries();

    const result = runCLI('toplist -c EUR');
    expect(result.success).toBe(false);
    expect(result.stderr).toContain('Currency \'EUR\' not found');
  });

  it('should handle list-currencies flag via CLI', () => {
    createTestPersonsConfig();
    createTestLogEntries();

    const result = runCLI('toplist --list-currencies');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Available currencies in dataset: SEK, USD');
  });

  it('should handle list-currencies with no data', () => {
    const result = runCLI('toplist --list-currencies');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('No currencies found');
  });

  it('should handle date filtering via CLI', () => {
    createTestPersonsConfig();
    createTestLogEntries();

    const result = runCLI('toplist --from 2024-12-01 --to 2024-12-05');
    expect(result.success).toBe(true);

    // Should contain entries within the date range (Dec 1-5)
    expect(result.stdout).toContain('Alice');
    expect(result.stdout).toContain('Bob');
    expect(result.stdout).toContain('Charlie');
    // David's gift was on Dec 6, so should NOT appear
    expect(result.stdout).not.toContain('David');
  });

  it('should handle from date only via CLI', () => {
    createTestPersonsConfig();
    createTestLogEntries();

    const result = runCLI('toplist --from 2024-12-05');
    expect(result.success).toBe(true);

    // Should only show gifts from Dec 5 onwards
    expect(result.stdout).toContain('David: 50 SEK'); // Dec 5 gift
    // Bob's gift was on Dec 6, so should appear in USD section
    expect(result.stdout).toContain('Bob: 175 USD');
  });

  it('should handle to date only via CLI', () => {
    createTestPersonsConfig();
    createTestLogEntries();

    const result = runCLI('toplist --to 2024-12-02');
    expect(result.success).toBe(true);

    // Should only show gifts up to Dec 2
    expect(result.stdout).toContain('Alice'); // Has gifts on Dec 1 and Dec 3, but Dec 3 is after filter
    expect(result.stdout).toContain('Bob'); // Has gift on Dec 2
    // David's gift was on Dec 6, so should not appear
    const davidMatch = result.stdout.match(/David:/g);
    expect(davidMatch).toBeNull();
  });

  it('should handle currency filtering with date filtering via CLI', () => {
    createTestPersonsConfig();
    createTestLogEntries();

    const result = runCLI('toplist -c SEK --from 2024-12-01 --to 2024-12-05');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Top 2 Persons (Total Gifts - SEK)');
    expect(result.stdout).toContain('Alice: 450.75 SEK');
    expect(result.stdout).toContain('Charlie: 100.75 SEK');
    // David should be filtered out (his gift is on Dec 6, outside Dec 1-5 range)
    expect(result.stdout).not.toContain('David');
    expect(result.stdout).not.toContain('USD');
  });
});

describe('Edge Cases', () => {
  beforeEach(() => {
    globalCleanup();
  });

  afterEach(() => {
    globalCleanup();
  });

  it('should handle malformed log entries gracefully', () => {
    createTestPersonsConfig();

    // Create log with mixed valid and invalid entries
    const logEntries = [
      '2024-12-01T10:00:00.000Z 150.50 SEK for Alice',
      'invalid log entry',
      '2024-12-02T11:00:00.000Z 200.00 USD for Bob',
      '',
      'another malformed entry'
    ];

    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(LOG_PATH, logEntries.join('\n'));

    const result = getToplistData(PERSON_CONFIG_PATH, LOG_PATH, fs);
    expect(result.errorMessage).toBe(null);

    // Should still work with valid entries
    const alice = result.persons.find(p => p.name === 'Alice');
    expect(alice.gifts.SEK).toBe(150.50);

    const bob = result.persons.find(p => p.name === 'Bob');
    expect(bob.gifts.USD).toBe(200.00);
  });

  it('should handle persons with no gifts in log', () => {
    createTestPersonsConfig();

    // Create log with only one person
    const logEntries = ['2024-12-01T10:00:00.000Z 150.50 SEK for Alice'];
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(LOG_PATH, logEntries.join('\n'));

    const result = runCLI('toplist');
    expect(result.success).toBe(true);

    // Should include all persons from config, even those without gifts
    expect(result.stdout).toContain('Alice');
    expect(result.stdout).toContain('Bob');
    expect(result.stdout).toContain('Charlie');
  });

  it('should handle case-insensitive recipient matching', () => {
    createTestPersonsConfig();

    // Create log entries with different case variations
    const logEntries = [
      '2024-12-01T10:00:00.000Z 150.50 SEK for alice', // lowercase
      '2024-12-02T11:00:00.000Z 200.00 USD for ALICE', // uppercase
      '2024-12-03T12:00:00.000Z 100.00 SEK for Alice'  // normal case
    ];

    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(LOG_PATH, logEntries.join('\n'));

    const result = getToplistData(PERSON_CONFIG_PATH, LOG_PATH, fs);
    const alice = result.persons.find(p => p.name === 'Alice');

    // Should aggregate all Alice entries regardless of case
    expect(alice.gifts.SEK).toBeCloseTo(250.50); // 150.50 + 100.00
    expect(alice.gifts.USD).toBeCloseTo(200.00);
  });
});

describe('MCP Tool Integration', () => {
  beforeEach(() => {
    globalCleanup();
  });

  afterEach(() => {
    globalCleanup();
  });

  it('should handle toplist MCP tool with basic parameters', () => {
    createTestPersonsConfig();
    createTestLogEntries();

    const result = runCLI('toplist');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Top');
    expect(result.stdout).toContain('Alice');
    expect(result.stdout).toContain('Bob');
    expect(result.stdout).toContain('Charlie');
  });

  it('should handle toplist MCP tool with currency filter', () => {
    createTestPersonsConfig();
    createTestLogEntries();

    const result = runCLI('toplist -c SEK');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('SEK');
    expect(result.stdout).not.toContain('USD');
  });

  it('should handle toplist MCP tool with list currencies', () => {
    createTestPersonsConfig();
    createTestLogEntries();

    const result = runCLI('toplist --list-currencies');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Available currencies in dataset: SEK, USD');
  });

  it('should handle toplist MCP tool with score sorting', () => {
    createTestPersonsConfig();
    createTestLogEntries();

    const result = runCLI('toplist -n');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Nice Score');
    expect(result.stdout).toMatch(/Alice:\s*9/);
  });

  it('should handle toplist MCP tool with custom length', () => {
    createTestPersonsConfig();
    createTestLogEntries();

    const result = runCLI('toplist -l 2');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Top 2');
  });

  it('should handle toplist MCP tool with date filtering', () => {
    createTestPersonsConfig();
    createTestLogEntries();

    const result = runCLI('toplist --from 2024-12-01 --to 2024-12-05');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Alice');
    expect(result.stdout).toContain('Bob');
    expect(result.stdout).toContain('Charlie');
    // David should be filtered out (his gift is on Dec 6, outside Dec 1-5 range)
    expect(result.stdout).not.toContain('David');
  });

  it('should handle toplist MCP tool with combined parameters', () => {
    createTestPersonsConfig();
    createTestLogEntries();

    const result = runCLI('toplist -c SEK -n -l 2 --from 2024-12-01');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Top 2 Persons (Nice Score)');
    expect(result.stdout).toContain('Alice: 9');
    // Charlie is filtered out by date (his gift is on Dec 10, outside --from 2024-12-01 without --to)
    expect(result.stdout).toContain('Bob: 7');
  });

  it('should handle toplist MCP tool error cases', () => {
    const result = runCLI('toplist --invalid-arg');
    expect(result.success).toBe(false);
    expect(result.stderr).toContain('Unknown argument');
  });

  it('should handle toplist MCP tool with no data', () => {
    const result = runCLI('toplist');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('No persons found');
  });
});

describe('Score Edge Cases', () => {
  let testPersons;

  beforeEach(() => {
    globalCleanup();
    testPersons = [
      {
        name: 'Alice',
        niceScore: 0,
        friendScore: 0,
        gifts: { SEK: 100.00 }
      },
      {
        name: 'Bob',
        niceScore: 10,
        friendScore: 10,
        gifts: { SEK: 200.00 }
      },
      {
        name: 'Charlie',
        niceScore: -1,
        friendScore: 5,
        gifts: { SEK: 50.00 }
      },
      {
        name: 'David',
        niceScore: 5,
        friendScore: -1,
        gifts: { SEK: 75.00 }
      },
      {
        name: 'Eve',
        niceScore: undefined,
        friendScore: undefined,
        gifts: { SEK: 25.00 }
      },
      {
        name: 'Frank',
        niceScore: null,
        friendScore: null,
        gifts: { SEK: 150.00 }
      }
    ];
  });

  afterEach(() => {
    globalCleanup();
  });

  it('should handle zero scores correctly', () => {
    const output = formatToplistOutput(testPersons, 'nice-score', 10);
    expect(output).toContain('Alice: 0 (friend: 0)');
    expect(output).toContain('Bob: 10 (friend: 10)');
    // Alice should appear with zero score, not be filtered out
    expect(output).toContain('Alice');
  });

  it('should handle negative scores correctly', () => {
    const output = formatToplistOutput(testPersons, 'nice-score', 10);
    expect(output).toContain('Charlie: -1 (friend: 5)');
    // Negative scores should still be displayed
    expect(output).toContain('Charlie');
  });

  it('should handle undefined scores correctly', () => {
    const output = formatToplistOutput(testPersons, 'nice-score', 10);
    expect(output).toContain('Eve: N/A');
    // Undefined scores should show as N/A
    expect(output).toContain('Eve');
  });

  it('should handle null scores correctly', () => {
    const output = formatToplistOutput(testPersons, 'nice-score', 10);
    expect(output).toContain('Frank: N/A');
    // Null scores should show as N/A
    expect(output).toContain('Frank');
  });

  it('should sort correctly with mixed score types', () => {
    const output = formatToplistOutput(testPersons, 'nice-score', 10);

    // Should sort: Bob (10), David (5), Alice (0), Charlie (-1), Eve (N/A), Frank (N/A)
    const lines = output.split('\n').filter(line => line.match(/^\d+\./));

    expect(lines[0]).toContain('Bob: 10');
    expect(lines[1]).toContain('David: 5');
    expect(lines[2]).toContain('Alice: 0');
    expect(lines[3]).toContain('Charlie: -1');
    expect(lines[4]).toContain('Eve: N/A');
    expect(lines[5]).toContain('Frank: N/A');
  });

  it('should handle CLI with zero scores', () => {
    // Create custom config with Alice having zero scores
    const config = {
      alice: {
        name: 'Alice',
        niceScore: 0,
        friendScore: 0
      },
      bob: {
        name: 'Bob',
        niceScore: 7,
        friendScore: 6
      },
      charlie: {
        name: 'Charlie',
        niceScore: 5,
        friendScore: 9
      }
    };
    savePersonConfig(config, PERSON_CONFIG_PATH, fs, path);
    createTestLogEntries();

    const result = runCLI('toplist -n');
    expect(result.success).toBe(true);
    // Alice with 0 score should be included (0 is valid, only null/undefined are filtered)
    expect(result.stdout).toContain('Alice: 0');
    expect(result.stdout).toContain('Bob: 7');
    expect(result.stdout).toContain('Charlie: 5');
  });

  it('should handle CLI with missing scores', () => {
    createTestPersonsConfig();
    // Remove scores for David (log-only person)
    createTestLogEntries();

    const result = runCLI('toplist -n');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('David: N/A');
  });

  it('should handle large dataset performance (basic)', () => {
    // Create a larger dataset with 50 persons
    const largeConfig = {};
    for (let i = 1; i <= 50; i++) {
      largeConfig[`person${i}`] = {
        name: `Person ${i}`,
        niceScore: Math.floor(Math.random() * 10),
        friendScore: Math.floor(Math.random() * 10),
        baseValue: 100 + Math.floor(Math.random() * 100),
        currency: 'SEK'
      };
    }

    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    savePersonConfig(largeConfig, PERSON_CONFIG_PATH, fs, path);

    const result = getToplistData(PERSON_CONFIG_PATH, LOG_PATH, fs);
    expect(result.errorMessage).toBe(null);
    expect(result.persons).toHaveLength(50);

    const output = formatToplistOutput(result.persons, 'nice-score', 10);
    expect(output).toContain('Top 10 Persons (Nice Score)');
    // Should handle large dataset without performance issues
    expect(output.split('\n').filter(line => line.match(/^\d+\./))).toHaveLength(10);
  });

  it('should handle extreme date ranges', () => {
    createTestPersonsConfig();
    createTestLogEntries();

    // Test with very large date range
    const result = runCLI('toplist --from 2020-01-01 --to 2030-12-31');
    expect(result.success).toBe(true);
    // Should include all data since our test dates are within this range
    expect(result.stdout).toContain('Alice');
    expect(result.stdout).toContain('Bob');
    expect(result.stdout).toContain('Charlie');
    expect(result.stdout).toContain('David');
  });

  it('should handle date range with no matching data', () => {
    createTestPersonsConfig();
    createTestLogEntries();

    // Test with date range that excludes all our test data
    const result = runCLI('toplist --from 2023-01-01 --to 2023-12-31');
    expect(result.success).toBe(true);
    // Should show persons from config but with no gifts
    expect(result.stdout).toContain('Alice');
    expect(result.stdout).toContain('Bob');
    expect(result.stdout).toContain('Charlie');
    // But no gift amounts should appear
    expect(result.stdout).not.toContain('SEK');
    expect(result.stdout).not.toContain('USD');
  });
});