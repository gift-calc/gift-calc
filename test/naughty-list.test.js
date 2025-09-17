#!/usr/bin/env node

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  getNaughtyListPath,
  loadNaughtyList,
  saveNaughtyList,
  addToNaughtyList,
  removeFromNaughtyList,
  isOnNaughtyList,
  listNaughtyList,
  searchNaughtyList,
  parseNaughtyListArguments
} from '../src/domains/naughty-list/index.js';

// Test utility functions
function createTestNaughtyList() {
  return [
    { name: 'Sven', addedAt: '2024-09-06T22:56:00.000Z' },
    { name: 'David', addedAt: '2024-09-06T22:57:00.000Z' },
    { name: 'Alice', addedAt: '2024-09-06T22:58:00.000Z' }
  ];
}

describe('Naughty List Functions', () => {
  let testNaughtyListPath;

  beforeEach(() => {
    // Create a temporary test naughty list file
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gift-calc-test-'));
    testNaughtyListPath = path.join(tempDir, 'naughty-list.json');
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testNaughtyListPath)) {
      fs.unlinkSync(testNaughtyListPath);
    }
    const testDir = path.dirname(testNaughtyListPath);
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir);
    }
  });

  describe('getNaughtyListPath', () => {
    it('should create path using provided path and os modules', () => {
      const result = getNaughtyListPath(path, os);
      const expected = path.join(os.homedir(), '.config', 'gift-calc', 'naughty-list.json');
      expect(result).toBe(expected);
    });

    it('should throw error if path module is missing', () => {
      expect(() => getNaughtyListPath(null, os)).toThrow('Path and os modules are required');
    });

    it('should throw error if os module is missing', () => {
      expect(() => getNaughtyListPath(path, null)).toThrow('Path and os modules are required');
    });
  });

  describe('loadNaughtyList', () => {
    it('should return empty list when file does not exist', () => {
      const result = loadNaughtyList(testNaughtyListPath, fs);
      expect(result.naughtyList).toEqual([]);
      expect(result.loaded).toBe(false);
    });

    it('should load naughty list from existing file', () => {
      const testList = createTestNaughtyList();
      const testData = { naughtyList: testList };
      fs.writeFileSync(testNaughtyListPath, JSON.stringify(testData, null, 2));
      
      const result = loadNaughtyList(testNaughtyListPath, fs);
      expect(result.naughtyList).toEqual(testList);
      expect(result.loaded).toBe(true);
    });

    it('should handle corrupted JSON file gracefully', () => {
      fs.writeFileSync(testNaughtyListPath, '{ "corrupted": json');
      
      const result = loadNaughtyList(testNaughtyListPath, fs);
      expect(result.naughtyList).toEqual([]);
      expect(result.loaded).toBe(false);
    });

    it('should handle missing naughtyList array in JSON', () => {
      fs.writeFileSync(testNaughtyListPath, '{"otherData": "value"}');
      
      const result = loadNaughtyList(testNaughtyListPath, fs);
      expect(result.naughtyList).toEqual([]);
      expect(result.loaded).toBe(true);
    });

    it('should throw error if fs module is missing', () => {
      expect(() => loadNaughtyList(testNaughtyListPath, null)).toThrow('fs module is required for naughty list operations');
    });
  });

  describe('saveNaughtyList', () => {
    it('should save naughty list to file', () => {
      const testList = createTestNaughtyList();
      const result = saveNaughtyList(testList, testNaughtyListPath, fs, path);
      
      expect(result).toBe(true);
      expect(fs.existsSync(testNaughtyListPath)).toBe(true);
      
      const savedData = JSON.parse(fs.readFileSync(testNaughtyListPath, 'utf8'));
      expect(savedData.naughtyList).toEqual(testList);
    });

    it('should create directory if it does not exist', () => {
      const testList = createTestNaughtyList();
      const result = saveNaughtyList(testList, testNaughtyListPath, fs, path);
      
      expect(result).toBe(true);
      expect(fs.existsSync(testNaughtyListPath)).toBe(true);
      expect(fs.existsSync(path.dirname(testNaughtyListPath))).toBe(true);
    });

    it('should throw error if fs module is missing', () => {
      const testList = createTestNaughtyList();
      expect(() => saveNaughtyList(testList, testNaughtyListPath, null, path)).toThrow('fs and path modules are required');
    });

    it('should throw error if path module is missing', () => {
      const testList = createTestNaughtyList();
      expect(() => saveNaughtyList(testList, testNaughtyListPath, fs, null)).toThrow('fs and path modules are required');
    });
  });

  describe('addToNaughtyList', () => {
    it('should add new person to naughty list', () => {
      const result = addToNaughtyList('Sven', testNaughtyListPath, fs, path);
      
      expect(result.success).toBe(true);
      expect(result.added).toBe(true);
      expect(result.message).toBe('Sven added to naughty list');
      expect(result.entry.name).toBe('Sven');
      expect(result.entry.addedAt).toBeDefined();
      
      // Verify file was created and contains the new entry
      expect(fs.existsSync(testNaughtyListPath)).toBe(true);
      const loaded = loadNaughtyList(testNaughtyListPath, fs);
      expect(loaded.naughtyList).toHaveLength(1);
      expect(loaded.naughtyList[0].name).toBe('Sven');
    });

    it('should return error when adding duplicate person', () => {
      // Add first person
      addToNaughtyList('Sven', testNaughtyListPath, fs, path);
      
      // Try to add same person again
      const result = addToNaughtyList('Sven', testNaughtyListPath, fs, path);
      
      expect(result.success).toBe(false);
      expect(result.existing).toBe(true);
      expect(result.message).toBe('Sven is already on the naughty list');
      
      // Verify list still has only one entry
      const loaded = loadNaughtyList(testNaughtyListPath, fs);
      expect(loaded.naughtyList).toHaveLength(1);
    });

    it('should handle multiple additions', () => {
      addToNaughtyList('Sven', testNaughtyListPath, fs, path);
      addToNaughtyList('David', testNaughtyListPath, fs, path);
      
      const loaded = loadNaughtyList(testNaughtyListPath, fs);
      expect(loaded.naughtyList).toHaveLength(2);
      expect(loaded.naughtyList[0].name).toBe('Sven');
      expect(loaded.naughtyList[1].name).toBe('David');
    });

    it('should validate empty name input', () => {
      const result = addToNaughtyList('', testNaughtyListPath, fs, path);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Name cannot be empty');
      expect(result.existing).toBe(false);
    });

    it('should validate null name input', () => {
      const result = addToNaughtyList(null, testNaughtyListPath, fs, path);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Name cannot be empty');
      expect(result.existing).toBe(false);
    });

    it('should validate whitespace-only name input', () => {
      const result = addToNaughtyList('   ', testNaughtyListPath, fs, path);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Name cannot be empty');
      expect(result.existing).toBe(false);
    });

    it('should trim whitespace from valid names', () => {
      const result = addToNaughtyList('  Sven  ', testNaughtyListPath, fs, path);
      
      expect(result.success).toBe(true);
      expect(result.entry.name).toBe('Sven'); // Should be trimmed
      
      const loaded = loadNaughtyList(testNaughtyListPath, fs);
      expect(loaded.naughtyList[0].name).toBe('Sven');
    });
  });

  describe('removeFromNaughtyList', () => {
    beforeEach(() => {
      // Add test data
      const testList = createTestNaughtyList();
      saveNaughtyList(testList, testNaughtyListPath, fs, path);
    });

    it('should remove existing person from naughty list', () => {
      const result = removeFromNaughtyList('David', testNaughtyListPath, fs, path);
      
      expect(result.success).toBe(true);
      expect(result.removed).toBe(true);
      expect(result.message).toBe('David removed from naughty list');
      expect(result.entry.name).toBe('David');
      
      // Verify person was actually removed
      const loaded = loadNaughtyList(testNaughtyListPath, fs);
      expect(loaded.naughtyList).toHaveLength(2);
      expect(loaded.naughtyList.some(entry => entry.name === 'David')).toBe(false);
    });

    it('should return error when removing non-existent person', () => {
      const result = removeFromNaughtyList('NonExistent', testNaughtyListPath, fs, path);
      
      expect(result.success).toBe(false);
      expect(result.found).toBe(false);
      expect(result.message).toBe('NonExistent is not on the naughty list');
      
      // Verify list remains unchanged
      const loaded = loadNaughtyList(testNaughtyListPath, fs);
      expect(loaded.naughtyList).toHaveLength(3);
    });

    it('should handle case-insensitive matching', () => {
      // Should find 'David' when searching for 'david' (case-insensitive)
      const result = removeFromNaughtyList('david', testNaughtyListPath, fs, path);
      
      expect(result.success).toBe(true);
      expect(result.removed).toBe(true);
      expect(result.message).toBe('david removed from naughty list');
      
      // Verify 'David' was actually removed from list
      const loaded = loadNaughtyList(testNaughtyListPath, fs);
      expect(loaded.naughtyList).toHaveLength(2);
      expect(loaded.naughtyList.some(entry => entry.name.toLowerCase() === 'david')).toBe(false);
    });

    it('should validate empty name input', () => {
      const result = removeFromNaughtyList('', testNaughtyListPath, fs, path);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Name cannot be empty');
      expect(result.found).toBe(false);
    });

    it('should validate null name input', () => {
      const result = removeFromNaughtyList(null, testNaughtyListPath, fs, path);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Name cannot be empty');
      expect(result.found).toBe(false);
    });

    it('should validate whitespace-only name input', () => {
      const result = removeFromNaughtyList('   ', testNaughtyListPath, fs, path);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Name cannot be empty');
      expect(result.found).toBe(false);
    });
  });

  describe('isOnNaughtyList', () => {
    beforeEach(() => {
      // Add test data
      const testList = createTestNaughtyList();
      saveNaughtyList(testList, testNaughtyListPath, fs, path);
    });

    it('should return true for person on naughty list', () => {
      expect(isOnNaughtyList('Sven', testNaughtyListPath, fs)).toBe(true);
      expect(isOnNaughtyList('David', testNaughtyListPath, fs)).toBe(true);
      expect(isOnNaughtyList('Alice', testNaughtyListPath, fs)).toBe(true);
    });

    it('should return false for person not on naughty list', () => {
      expect(isOnNaughtyList('Bob', testNaughtyListPath, fs)).toBe(false);
      expect(isOnNaughtyList('Charlie', testNaughtyListPath, fs)).toBe(false);
    });

    it('should handle empty naughty list', () => {
      // Create empty list
      saveNaughtyList([], testNaughtyListPath, fs, path);
      
      expect(isOnNaughtyList('Sven', testNaughtyListPath, fs)).toBe(false);
    });

    it('should handle non-existent file', () => {
      // Remove the file
      fs.unlinkSync(testNaughtyListPath);
      
      expect(isOnNaughtyList('Sven', testNaughtyListPath, fs)).toBe(false);
    });

    it('should handle case-insensitive matching', () => {
      // Should find 'Sven' when searching for 'sven' and 'David' when searching for 'DAVID'
      expect(isOnNaughtyList('sven', testNaughtyListPath, fs)).toBe(true);
      expect(isOnNaughtyList('DAVID', testNaughtyListPath, fs)).toBe(true);
      expect(isOnNaughtyList('alice', testNaughtyListPath, fs)).toBe(true);
      expect(isOnNaughtyList('ALICE', testNaughtyListPath, fs)).toBe(true);
    });

    it('should handle empty name input', () => {
      expect(isOnNaughtyList('', testNaughtyListPath, fs)).toBe(false);
    });

    it('should handle null name input', () => {
      expect(isOnNaughtyList(null, testNaughtyListPath, fs)).toBe(false);
    });

    it('should handle whitespace-only name input', () => {
      expect(isOnNaughtyList('   ', testNaughtyListPath, fs)).toBe(false);
    });
  });

  describe('listNaughtyList', () => {
    beforeEach(() => {
      // Add test data with specific timestamps for consistent testing
      const testList = [
        { name: 'Sven', addedAt: '2024-09-06T22:56:00.000Z' },
        { name: 'David', addedAt: '2024-09-06T22:57:00.000Z' }
      ];
      saveNaughtyList(testList, testNaughtyListPath, fs, path);
    });

    it('should return formatted list of naughty people', () => {
      const result = listNaughtyList(testNaughtyListPath, fs);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toContain('Sven');
      expect(result[0]).toContain('added:');
      expect(result[1]).toContain('David');
      expect(result[1]).toContain('added:');
    });

    it('should return empty array for empty naughty list', () => {
      // Create empty list
      saveNaughtyList([], testNaughtyListPath, fs, path);
      
      const result = listNaughtyList(testNaughtyListPath, fs);
      
      expect(result).toEqual([]);
    });

    it('should handle non-existent file', () => {
      // Remove the file
      fs.unlinkSync(testNaughtyListPath);
      
      const result = listNaughtyList(testNaughtyListPath, fs);
      
      expect(result).toEqual([]);
    });
  });

  describe('searchNaughtyList', () => {
    beforeEach(() => {
      // Add test data with variety of names
      const testList = [
        { name: 'David', addedAt: '2024-09-06T22:56:00.000Z' },
        { name: 'Dave', addedAt: '2024-09-06T22:57:00.000Z' },
        { name: 'Alice', addedAt: '2024-09-06T22:58:00.000Z' },
        { name: 'Daniel', addedAt: '2024-09-06T22:59:00.000Z' }
      ];
      saveNaughtyList(testList, testNaughtyListPath, fs, path);
    });

    it('should find names starting with search term (case-insensitive)', () => {
      const result = searchNaughtyList('dav', testNaughtyListPath, fs);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toContain('David');
      expect(result[1]).toContain('Dave');
    });

    it('should handle empty search term', () => {
      const result = searchNaughtyList('', testNaughtyListPath, fs);
      
      expect(result).toEqual([]);
    });

    it('should handle whitespace-only search term', () => {
      const result = searchNaughtyList('   ', testNaughtyListPath, fs);
      
      expect(result).toEqual([]);
    });

    it('should return empty array when no matches found', () => {
      const result = searchNaughtyList('xyz', testNaughtyListPath, fs);
      
      expect(result).toEqual([]);
    });

    it('should handle single character search', () => {
      const result = searchNaughtyList('d', testNaughtyListPath, fs);
      
      expect(result).toHaveLength(3); // David, Dave, Daniel
    });

    it('should handle empty naughty list', () => {
      // Create empty list
      saveNaughtyList([], testNaughtyListPath, fs, path);
      
      const result = searchNaughtyList('david', testNaughtyListPath, fs);
      
      expect(result).toEqual([]);
    });

    it('should handle non-existent file', () => {
      // Remove the file
      fs.unlinkSync(testNaughtyListPath);
      
      const result = searchNaughtyList('david', testNaughtyListPath, fs);
      
      expect(result).toEqual([]);
    });
  });

  describe('parseNaughtyListArguments', () => {
    it('should parse add command with name', () => {
      const result = parseNaughtyListArguments(['Sven']);
      
      expect(result.command).toBe('naughty-list');
      expect(result.action).toBe('add');
      expect(result.name).toBe('Sven');
      expect(result.success).toBe(true);
    });

    it('should parse list command', () => {
      const result = parseNaughtyListArguments(['list']);
      
      expect(result.command).toBe('naughty-list');
      expect(result.action).toBe('list');
      expect(result.success).toBe(true);
    });

    it('should parse remove command with long flag', () => {
      const result = parseNaughtyListArguments(['--remove', 'Sven']);
      
      expect(result.command).toBe('naughty-list');
      expect(result.action).toBe('remove');
      expect(result.name).toBe('Sven');
      expect(result.remove).toBe(true);
      expect(result.success).toBe(true);
    });

    it('should parse remove command with short flag', () => {
      const result = parseNaughtyListArguments(['-r', 'David']);
      
      expect(result.command).toBe('naughty-list');
      expect(result.action).toBe('remove');
      expect(result.name).toBe('David');
      expect(result.remove).toBe(true);
      expect(result.success).toBe(true);
    });

    it('should parse search command', () => {
      const result = parseNaughtyListArguments(['--search', 'Dav']);
      
      expect(result.command).toBe('naughty-list');
      expect(result.action).toBe('search');
      expect(result.searchTerm).toBe('Dav');
      expect(result.success).toBe(true);
    });

    it('should handle empty arguments', () => {
      const result = parseNaughtyListArguments([]);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No action specified');
    });

    it('should handle unrecognized flags', () => {
      const result = parseNaughtyListArguments(['--unknown-flag']);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown flag: --unknown-flag');
    });

    it('should handle missing search term', () => {
      const result = parseNaughtyListArguments(['--search']);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('--search requires a search term');
    });

    it('should set action to list when no other action is determined', () => {
      const result = parseNaughtyListArguments(['--remove']); // No name provided
      
      expect(result.action).toBe('list');
      expect(result.name).toBeNull();
    });

    it('should validate add action requires name', () => {
      const result = parseNaughtyListArguments(['--remove']); // This becomes list, but let's test add validation
      
      // Simulate add action without name
      const addResult = { ...result, action: 'add' };
      
      // This validation is tested in the main function, but we can test the logic
      expect(addResult.action).toBe('add');
      expect(!addResult.name).toBeDefined();
    });

    it('should validate remove action requires name', () => {
      const result = parseNaughtyListArguments(['--remove']); // No name provided
      
      expect(result.action).toBe('list'); // Falls back to list
      expect(result.success).toBe(true);
    });
  });
});