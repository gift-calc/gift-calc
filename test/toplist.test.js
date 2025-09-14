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