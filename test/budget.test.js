#!/usr/bin/env node

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { 
  parseBudgetArguments,
  getBudgetPath,
  loadBudgetList,
  saveBudgetList,
  validateDate,
  validateBudgetDates,
  addBudget,
  editBudget,
  getBudgetStatus,
  listBudgets,
  formatBudgetAmount
} from '../src/core.js';

const TEST_CONFIG_DIR = path.join(os.tmpdir(), 'gift-calc-budget-test');
const TEST_BUDGET_PATH = path.join(TEST_CONFIG_DIR, 'budgets.json');

describe('Budget Management Functions', () => {
  beforeEach(() => {
    // Clean up and create test directory
    if (fs.existsSync(TEST_CONFIG_DIR)) {
      fs.rmSync(TEST_CONFIG_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_CONFIG_DIR)) {
      fs.rmSync(TEST_CONFIG_DIR, { recursive: true });
    }
  });

  describe('parseBudgetArguments', () => {
    it('should default to status action with no arguments', () => {
      const result = parseBudgetArguments([]);
      expect(result.command).toBe('budget');
      expect(result.action).toBe('status');
      expect(result.success).toBe(true);
    });

    it('should parse add command correctly', () => {
      const result = parseBudgetArguments(['add', '5000', '2024-12-01', '2024-12-31', 'Christmas']);
      expect(result.action).toBe('add');
      expect(result.amount).toBe(5000);
      expect(result.fromDate).toBe('2024-12-01');
      expect(result.toDate).toBe('2024-12-31');
      expect(result.description).toBe('Christmas');
      expect(result.success).toBe(true);
    });

    it('should parse add command with multi-word description', () => {
      const result = parseBudgetArguments(['add', '2000', '2024-11-01', '2024-11-30', 'Birthday', 'gifts', 'fund']);
      expect(result.description).toBe('Birthday gifts fund');
    });

    it('should fail add command with insufficient arguments', () => {
      const result = parseBudgetArguments(['add', '5000', '2024-12-01']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('add command requires');
    });

    it('should fail add command with invalid amount', () => {
      const result = parseBudgetArguments(['add', 'invalid', '2024-12-01', '2024-12-31']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Amount must be a positive number');
    });

    it('should fail add command with negative amount', () => {
      const result = parseBudgetArguments(['add', '-100', '2024-12-01', '2024-12-31']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Amount must be a positive number');
    });

    it('should parse list command correctly', () => {
      const result = parseBudgetArguments(['list']);
      expect(result.action).toBe('list');
      expect(result.success).toBe(true);
    });

    it('should parse status command correctly', () => {
      const result = parseBudgetArguments(['status']);
      expect(result.action).toBe('status');
      expect(result.success).toBe(true);
    });

    it('should parse edit command correctly', () => {
      const result = parseBudgetArguments(['edit', '1', '--amount', '6000', '--description', 'Updated']);
      expect(result.action).toBe('edit');
      expect(result.budgetId).toBe(1);
      expect(result.updates.amount).toBe(6000);
      expect(result.updates.description).toBe('Updated');
      expect(result.success).toBe(true);
    });

    it('should fail edit command without ID', () => {
      const result = parseBudgetArguments(['edit']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('edit command requires budget ID');
    });

    it('should fail edit command with invalid ID', () => {
      const result = parseBudgetArguments(['edit', 'invalid']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Budget ID must be a number');
    });

    it('should parse edit with date options', () => {
      const result = parseBudgetArguments(['edit', '1', '--from-date', '2024-12-01', '--to-date', '2024-12-31']);
      expect(result.updates.fromDate).toBe('2024-12-01');
      expect(result.updates.toDate).toBe('2024-12-31');
    });

    it('should fail with unknown action', () => {
      const result = parseBudgetArguments(['unknown']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown budget action');
    });

    it('should fail edit with unknown option', () => {
      const result = parseBudgetArguments(['edit', '1', '--unknown', 'value']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown option');
    });
  });

  describe('getBudgetPath', () => {
    it('should return correct budget path', () => {
      const result = getBudgetPath(path, os);
      expect(result).toContain('.config/gift-calc/budgets.json');
    });

    it('should throw error without required modules', () => {
      expect(() => getBudgetPath(null, os)).toThrow('Path and os modules are required');
      expect(() => getBudgetPath(path, null)).toThrow('Path and os modules are required');
    });
  });

  describe('loadBudgetList and saveBudgetList', () => {
    it('should return empty list when file does not exist', () => {
      const result = loadBudgetList(TEST_BUDGET_PATH, fs);
      expect(result.budgets).toEqual([]);
      expect(result.nextId).toBe(1);
      expect(result.loaded).toBe(false);
    });

    it('should save and load budget list correctly', () => {
      const budgets = [
        {
          id: 1,
          totalAmount: 5000,
          fromDate: '2024-12-01',
          toDate: '2024-12-31',
          description: 'Christmas',
          createdAt: '2024-11-15T10:00:00.000Z'
        }
      ];
      
      const saved = saveBudgetList(budgets, 2, TEST_BUDGET_PATH, fs, path);
      expect(saved).toBe(true);
      
      const loaded = loadBudgetList(TEST_BUDGET_PATH, fs);
      expect(loaded.budgets).toEqual(budgets);
      expect(loaded.nextId).toBe(2);
      expect(loaded.loaded).toBe(true);
    });

    it('should handle corrupted budget file', () => {
      fs.writeFileSync(TEST_BUDGET_PATH, 'invalid json');
      const result = loadBudgetList(TEST_BUDGET_PATH, fs);
      expect(result.budgets).toEqual([]);
      expect(result.nextId).toBe(1);
      expect(result.loaded).toBe(false);
    });

    it('should require fs and path modules', () => {
      expect(() => loadBudgetList(TEST_BUDGET_PATH, null)).toThrow('fs module is required');
      expect(() => saveBudgetList([], 1, TEST_BUDGET_PATH, null, path)).toThrow('fs and path modules are required');
      expect(() => saveBudgetList([], 1, TEST_BUDGET_PATH, fs, null)).toThrow('fs and path modules are required');
    });
  });

  describe('validateDate', () => {
    it('should validate correct date format', () => {
      const result = validateDate('2024-12-01');
      expect(result.valid).toBe(true);
      expect(result.date).toBeInstanceOf(Date);
    });

    it('should reject incorrect date format', () => {
      const result = validateDate('12/01/2024');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('YYYY-MM-DD format');
    });

    it('should reject invalid dates', () => {
      const result = validateDate('2024-13-01');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid date');
    });

    it('should reject February 30th', () => {
      const result = validateDate('2024-02-30');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid date');
    });
  });

  describe('validateBudgetDates', () => {
    const existingBudgets = [
      {
        id: 1,
        fromDate: '2024-11-01',
        toDate: '2024-11-30',
        description: 'November budget'
      },
      {
        id: 2,
        fromDate: '2024-12-15',
        toDate: '2024-12-31',
        description: 'December budget'
      }
    ];

    it('should validate non-overlapping dates', () => {
      const result = validateBudgetDates('2024-10-01', '2024-10-31', existingBudgets);
      expect(result.valid).toBe(true);
    });

    it('should reject overlapping dates', () => {
      const result = validateBudgetDates('2024-11-15', '2024-12-15', existingBudgets);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Budget period overlaps');
    });

    it('should reject from date after to date', () => {
      const result = validateBudgetDates('2024-12-31', '2024-12-01', existingBudgets);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('From date must be before or equal to to date');
    });

    it('should allow same from and to date (same-day budget)', () => {
      const result = validateBudgetDates('2024-10-15', '2024-10-15', existingBudgets);
      expect(result.valid).toBe(true);
    });

    it('should allow editing existing budget without self-overlap', () => {
      const result = validateBudgetDates('2024-11-01', '2024-11-28', existingBudgets, 1);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid date formats', () => {
      const result = validateBudgetDates('invalid-date', '2024-12-31', existingBudgets);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('From date error');
    });
  });

  describe('addBudget', () => {
    it('should add budget successfully', () => {
      const result = addBudget(5000, '2024-12-01', '2024-12-31', 'Christmas', TEST_BUDGET_PATH, fs, path);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Christmas');
      expect(result.budget.id).toBe(1);
      expect(result.budget.totalAmount).toBe(5000);
    });

    it('should generate default description if none provided', () => {
      const result = addBudget(2000, '2024-11-01', '2024-11-30', '', TEST_BUDGET_PATH, fs, path);
      expect(result.success).toBe(true);
      expect(result.budget.description).toBe('Budget 1');
    });

    it('should reject overlapping budget', () => {
      // Add first budget
      addBudget(5000, '2024-12-01', '2024-12-31', 'Christmas', TEST_BUDGET_PATH, fs, path);
      
      // Try to add overlapping budget
      const result = addBudget(2000, '2024-12-15', '2025-01-15', 'New Year', TEST_BUDGET_PATH, fs, path);
      expect(result.success).toBe(false);
      expect(result.message).toContain('overlaps');
    });

    it('should assign sequential IDs', () => {
      const result1 = addBudget(5000, '2024-11-01', '2024-11-30', 'November', TEST_BUDGET_PATH, fs, path);
      const result2 = addBudget(6000, '2024-12-01', '2024-12-31', 'December', TEST_BUDGET_PATH, fs, path);
      
      expect(result1.budget.id).toBe(1);
      expect(result2.budget.id).toBe(2);
    });
  });

  describe('editBudget', () => {
    beforeEach(() => {
      // Add a test budget
      addBudget(5000, '2024-12-01', '2024-12-31', 'Christmas', TEST_BUDGET_PATH, fs, path);
    });

    it('should edit budget amount successfully', () => {
      const result = editBudget(1, { amount: 6000 }, TEST_BUDGET_PATH, fs, path);
      expect(result.success).toBe(true);
      expect(result.budget.totalAmount).toBe(6000);
    });

    it('should edit budget description successfully', () => {
      const result = editBudget(1, { description: 'Updated Christmas' }, TEST_BUDGET_PATH, fs, path);
      expect(result.success).toBe(true);
      expect(result.budget.description).toBe('Updated Christmas');
    });

    it('should edit budget dates successfully', () => {
      const result = editBudget(1, { fromDate: '2024-12-15', toDate: '2025-01-15' }, TEST_BUDGET_PATH, fs, path);
      expect(result.success).toBe(true);
      expect(result.budget.fromDate).toBe('2024-12-15');
      expect(result.budget.toDate).toBe('2025-01-15');
    });

    it('should edit multiple fields successfully', () => {
      const updates = {
        amount: 7000,
        description: 'Holiday Budget',
        fromDate: '2024-12-10',
        toDate: '2025-01-10'
      };
      const result = editBudget(1, updates, TEST_BUDGET_PATH, fs, path);
      expect(result.success).toBe(true);
      expect(result.budget.totalAmount).toBe(7000);
      expect(result.budget.description).toBe('Holiday Budget');
    });

    it('should reject non-existent budget ID', () => {
      const result = editBudget(999, { amount: 6000 }, TEST_BUDGET_PATH, fs, path);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Budget with ID 999 not found');
    });

    it('should reject overlapping dates when editing', () => {
      // Add second budget
      addBudget(2000, '2024-11-01', '2024-11-30', 'November', TEST_BUDGET_PATH, fs, path);
      
      // Try to edit first budget to overlap with second
      const result = editBudget(1, { fromDate: '2024-11-15' }, TEST_BUDGET_PATH, fs, path);
      expect(result.success).toBe(false);
      expect(result.message).toContain('overlaps');
    });
  });

  describe('getBudgetStatus', () => {
    it('should return no budgets message when empty', () => {
      const result = getBudgetStatus(TEST_BUDGET_PATH, fs);
      expect(result.hasActiveBudget).toBe(false);
      expect(result.message).toContain('No budgets configured');
    });

    it('should return no active budget when none match current date', () => {
      // Add budget for future date
      addBudget(5000, '2025-12-01', '2025-12-31', 'Future', TEST_BUDGET_PATH, fs, path);
      
      const result = getBudgetStatus(TEST_BUDGET_PATH, fs);
      expect(result.hasActiveBudget).toBe(false);
      expect(result.message).toContain('No active budget for today');
    });

    it('should calculate remaining days correctly', () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const dayAfter = new Date(today);
      dayAfter.setDate(today.getDate() + 2);

      const fromDate = today.toISOString().split('T')[0];
      const toDate = dayAfter.toISOString().split('T')[0];

      addBudget(5000, fromDate, toDate, 'Current', TEST_BUDGET_PATH, fs, path);
      
      const result = getBudgetStatus(TEST_BUDGET_PATH, fs);
      expect(result.hasActiveBudget).toBe(true);
      expect(result.remainingDays).toBeGreaterThanOrEqual(1);
    });
  });

  describe('listBudgets', () => {
    it('should return empty array when no budgets exist', () => {
      const result = listBudgets(TEST_BUDGET_PATH, fs);
      expect(result).toEqual([]);
    });

    it('should format budget list correctly', () => {
      addBudget(5000, '2024-12-01', '2024-12-31', 'Christmas', TEST_BUDGET_PATH, fs, path);
      addBudget(2000, '2025-01-01', '2025-01-31', 'New Year', TEST_BUDGET_PATH, fs, path);
      
      const result = listBudgets(TEST_BUDGET_PATH, fs);
      expect(result).toHaveLength(2);
      expect(result[0]).toContain('1. Christmas: 5000 (2024-12-01 to 2024-12-31)');
      expect(result[1]).toContain('2. New Year: 2000 (2025-01-01 to 2025-01-31)');
    });

    it('should show correct status for past, current, and future budgets', () => {
      const today = new Date();
      
      // Create clearly separated date ranges
      const pastStart = '2024-01-01';
      const pastEnd = '2024-01-31';
      
      const currentStart = today.toISOString().split('T')[0];
      const currentEnd = today.toISOString().split('T')[0];
      
      const futureStart = '2026-01-01';
      const futureEnd = '2026-01-31';

      // Add budgets in separate, non-overlapping periods
      const result1 = addBudget(1000, pastStart, pastEnd, 'Past', TEST_BUDGET_PATH, fs, path);
      const result2 = addBudget(2000, currentStart, currentEnd, 'Current', TEST_BUDGET_PATH, fs, path);
      const result3 = addBudget(3000, futureStart, futureEnd, 'Future', TEST_BUDGET_PATH, fs, path);
      
      // Verify all budgets were created successfully
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);
      
      const result = listBudgets(TEST_BUDGET_PATH, fs);
      expect(result).toHaveLength(3);
      expect(result[0]).toContain('[EXPIRED]');
      expect(result[1]).toContain('[ACTIVE]');
      expect(result[2]).toContain('[FUTURE]');
    });
  });

  describe('formatBudgetAmount', () => {
    it('should format amount with currency correctly', () => {
      expect(formatBudgetAmount(5000, 'SEK')).toBe('5000 SEK');
      expect(formatBudgetAmount(1500.50, 'USD')).toBe('1500.5 USD');
      expect(formatBudgetAmount(0, 'EUR')).toBe('0 EUR');
    });
  });
});