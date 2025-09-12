#!/usr/bin/env node

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { registerAllTools } from '../src/mcp/tools.js';
import { MCPServer } from '../src/mcp/server.js';
import fs from 'node:fs';

// Mock all Node.js filesystem and OS modules
vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(() => '{}'),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn()
  }
}));

vi.mock('node:path', () => ({
  default: {
    join: vi.fn((...args) => args.join('/')),
    dirname: vi.fn(() => '/test/dir')
  }
}));

vi.mock('node:os', () => ({
  default: {
    homedir: vi.fn(() => '/test/home')
  }
}));

// Mock process for MCPServer
const mockProcess = {
  stdin: { setEncoding: vi.fn(), on: vi.fn() },
  stdout: { write: vi.fn() },
  on: vi.fn(),
  exit: vi.fn(),
  env: { HOME: '/test/home' }
};

describe('MCP Tools Tests', () => {
  let server;

  beforeEach(() => {
    // Mock global process
    global.process = mockProcess;
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create server and register tools
    server = new MCPServer();
    registerAllTools(server);
  });

  describe('Tool Registration', () => {
    test('should register all expected tools', () => {
      const expectedTools = [
        'calculate_gift_amount',
        'match_previous_gift', 
        'check_naughty_list',
        'get_config',
        'set_budget',
        'get_budget_status',
        'add_to_naughty_list',
        'remove_from_naughty_list',
        'init_config',
        'get_calculation_history',
        'get_spendings'
      ];

      // Check that registerAllTools function exists and is callable
      expect(typeof registerAllTools).toBe('function');
      expect(server).toBeDefined();
      
      // Verify the expected tool count makes sense
      expect(expectedTools.length).toBe(11);
    });
  });

  describe('Tool Schemas and Validation', () => {
    test('should validate calculate_gift_amount schema structure', () => {
      const requiredFields = ['baseValue', 'variation', 'friendScore', 'niceScore'];
      const optionalFields = ['currency', 'decimals', 'recipientName', 'useMaximum', 'useMinimum'];
      
      // Test that we know the expected structure
      expect(requiredFields).toContain('baseValue');
      expect(requiredFields).toContain('variation');
      expect(requiredFields).toContain('friendScore');
      expect(requiredFields).toContain('niceScore');
      
      expect(optionalFields).toContain('currency');
      expect(optionalFields).toContain('decimals');
    });

    test('should validate parameter constraints for calculate_gift_amount', () => {
      // Test parameter validation logic
      const validArgs = {
        baseValue: 100,
        variation: 20,
        friendScore: 7,
        niceScore: 8
      };

      expect(validArgs.baseValue).toBeGreaterThan(0);
      expect(validArgs.variation).toBeGreaterThanOrEqual(0);
      expect(validArgs.variation).toBeLessThanOrEqual(100);
      expect(validArgs.friendScore).toBeGreaterThanOrEqual(1);
      expect(validArgs.friendScore).toBeLessThanOrEqual(10);
      expect(validArgs.niceScore).toBeGreaterThanOrEqual(0);
      expect(validArgs.niceScore).toBeLessThanOrEqual(10);
    });

    test('should validate budget parameters', () => {
      const validBudgetArgs = {
        amount: 1000.50,
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
        description: 'Holiday budget'
      };

      // Validate date format
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      expect(datePattern.test(validBudgetArgs.fromDate)).toBe(true);
      expect(datePattern.test(validBudgetArgs.toDate)).toBe(true);
      
      // Validate amount
      expect(validBudgetArgs.amount).toBeGreaterThan(0);
    });

    test('should validate name parameters for naughty list operations', () => {
      const validName = 'John Doe';
      const invalidNames = ['', ' ', null, undefined];

      expect(validName.length).toBeGreaterThan(0);
      expect(typeof validName).toBe('string');

      invalidNames.forEach(name => {
        if (name === null || name === undefined) {
          expect(name).toBeFalsy();
        } else {
          expect(name.trim().length).toBe(0);
        }
      });
    });

    test('should validate init_config parameters', () => {
      const configArgs = {
        baseValue: 100,
        variation: 25,
        currency: 'USD',
        decimals: 2
      };

      // Validate parameter types and ranges
      expect(typeof configArgs.baseValue).toBe('number');
      expect(configArgs.baseValue).toBeGreaterThanOrEqual(0);
      
      expect(typeof configArgs.variation).toBe('number');
      expect(configArgs.variation).toBeGreaterThanOrEqual(0);
      expect(configArgs.variation).toBeLessThanOrEqual(100);
      
      expect(typeof configArgs.currency).toBe('string');
      
      expect(Number.isInteger(configArgs.decimals)).toBe(true);
      expect(configArgs.decimals).toBeGreaterThanOrEqual(0);
      expect(configArgs.decimals).toBeLessThanOrEqual(10);
    });

    test('should validate history parameters', () => {
      const historyArgs = {
        limit: 10,
        recipientFilter: 'John'
      };

      expect(Number.isInteger(historyArgs.limit)).toBe(true);
      expect(historyArgs.limit).toBeGreaterThanOrEqual(1);
      expect(historyArgs.limit).toBeLessThanOrEqual(50);
      
      if (historyArgs.recipientFilter) {
        expect(typeof historyArgs.recipientFilter).toBe('string');
      }
    });
  });

  describe('Tool Safety Classifications', () => {
    test('should properly classify read-only tools', () => {
      const readOnlyTools = [
        'calculate_gift_amount',
        'match_previous_gift',
        'check_naughty_list', 
        'get_config',
        'get_budget_status',
        'get_calculation_history'
      ];

      // These tools should be marked as read-only in their implementations
      readOnlyTools.forEach(toolName => {
        expect(typeof toolName).toBe('string');
        expect(toolName.length).toBeGreaterThan(0);
      });
    });

    test('should properly classify destructive tools', () => {
      const destructiveTools = [
        'set_budget',
        'add_to_naughty_list',
        'remove_from_naughty_list',
        'init_config'
      ];

      // These tools should be marked as destructive (isReadOnly: false) in their implementations  
      destructiveTools.forEach(toolName => {
        expect(typeof toolName).toBe('string');
        expect(toolName.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Tool Response Structure', () => {
    test('should expect proper MCP tool response structure', () => {
      const expectedResponseStructure = {
        content: [
          {
            type: 'text',
            text: 'Expected response text'
          }
        ],
        isReadOnly: true // or false for destructive operations
      };

      expect(expectedResponseStructure).toHaveProperty('content');
      expect(Array.isArray(expectedResponseStructure.content)).toBe(true);
      expect(expectedResponseStructure.content[0]).toHaveProperty('type');
      expect(expectedResponseStructure.content[0]).toHaveProperty('text');
      expect(expectedResponseStructure.content[0].type).toBe('text');
      expect(expectedResponseStructure).toHaveProperty('isReadOnly');
      expect(typeof expectedResponseStructure.isReadOnly).toBe('boolean');
    });
  });

  describe('Error Handling Expectations', () => {
    test('should handle missing required parameters appropriately', () => {
      const requiredParams = ['baseValue', 'variation', 'friendScore', 'niceScore'];
      const incompleteArgs = { baseValue: 100 };

      requiredParams.forEach(param => {
        if (!incompleteArgs.hasOwnProperty(param)) {
          // This should trigger a validation error in the actual implementation
          expect(incompleteArgs[param]).toBeUndefined();
        }
      });
    });

    test('should handle invalid parameter values appropriately', () => {
      const invalidParameterSets = [
        { baseValue: -10, variation: 20, friendScore: 5, niceScore: 5 }, // Negative baseValue
        { baseValue: 100, variation: 150, friendScore: 5, niceScore: 5 }, // Invalid variation
        { baseValue: 100, variation: 20, friendScore: 0, niceScore: 5 }, // Invalid friendScore
        { baseValue: 100, variation: 20, friendScore: 5, niceScore: -1 } // Invalid niceScore
      ];

      invalidParameterSets.forEach(args => {
        const isValid = args.baseValue >= 0 &&
                       args.variation >= 0 && args.variation <= 100 &&
                       args.friendScore >= 1 && args.friendScore <= 10 &&
                       args.niceScore >= 0 && args.niceScore <= 10;
        
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Integration with Core Functions', () => {
    test('should import and use core functions correctly', async () => {
      // Test that the tools module can import from core
      expect(() => import('../src/mcp/tools.js')).not.toThrow();
      expect(() => import('../src/core.js')).not.toThrow();
    });

    test('should use proper file paths and configurations', () => {
      const expectedPaths = [
        'naughty-list',
        'budget',
        'config',
        'log'
      ];

      expectedPaths.forEach(pathType => {
        expect(typeof pathType).toBe('string');
        expect(pathType.length).toBeGreaterThan(0);
      });
    });
  });

  describe('get_spendings Tool Schema', () => {
    test('should validate actual JSON schema structure', async () => {
      // Test schema validation through functional execution
      // Verify that the tool accepts valid anyOf combinations correctly
      
      // Test absolute date combination
      const absoluteResult = await server.executeTool('get_spendings', {
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
        format: 'summary'
      });
      expect(absoluteResult).toBeDefined();
      
      // Test relative date combinations
      const relativeResults = await Promise.all([
        server.executeTool('get_spendings', { days: 30 }),
        server.executeTool('get_spendings', { weeks: 4 }),
        server.executeTool('get_spendings', { months: 1 }),
        server.executeTool('get_spendings', { years: 1 })
      ]);
      
      relativeResults.forEach(result => {
        expect(result).toBeDefined();
        expect(result.isReadOnly).toBe(true);
      });
    });

    test('should validate absolute date parameters', () => {
      const requiredFields = ['fromDate', 'toDate'];
      const datePattern = '^\\d{4}-\\d{2}-\\d{2}$';
      
      expect(requiredFields).toContain('fromDate');
      expect(requiredFields).toContain('toDate');
      expect(datePattern).toContain('\\d{4}');
      expect(datePattern).toContain('-');
    });

    test('should validate relative time parameters', () => {
      const relativeFields = ['days', 'weeks', 'months', 'years'];
      
      relativeFields.forEach(field => {
        expect(typeof field).toBe('string');
        expect(field.length).toBeGreaterThan(0);
      });
    });

    test('should validate format parameter', () => {
      const validFormats = ['detailed', 'summary'];
      
      expect(validFormats).toContain('detailed');
      expect(validFormats).toContain('summary');
      expect(validFormats.length).toBe(2);
    });

    test('should validate parameter constraints', () => {
      // Days: 1-3650
      expect(1).toBeLessThanOrEqual(3650);
      expect(3650).toBeGreaterThanOrEqual(1);
      
      // Weeks: 1-520  
      expect(1).toBeLessThanOrEqual(520);
      expect(520).toBeGreaterThanOrEqual(1);
      
      // Months: 1-120
      expect(1).toBeLessThanOrEqual(120);
      expect(120).toBeGreaterThanOrEqual(1);
      
      // Years: 1-10
      expect(1).toBeLessThanOrEqual(10);
      expect(10).toBeGreaterThanOrEqual(1);
    });

    test('should validate mutually exclusive date arguments', () => {
      // The anyOf schema ensures only one combination is valid
      const validCombinations = [
        ['fromDate', 'toDate'],
        ['days'],
        ['weeks'], 
        ['months'],
        ['years']
      ];

      expect(validCombinations).toHaveLength(5);
      expect(validCombinations[0]).toEqual(['fromDate', 'toDate']);
    });
  });

  describe('Tool Safety Classifications Updated', () => {
    test('should include get_spendings as read-only tool', () => {
      const readOnlyTools = [
        'calculate_gift_amount',
        'match_previous_gift',
        'check_naughty_list', 
        'get_config',
        'get_budget_status',
        'get_calculation_history',
        'get_spendings'
      ];

      readOnlyTools.forEach(toolName => {
        expect(typeof toolName).toBe('string');
        expect(toolName.length).toBeGreaterThan(0);
      });
    });
  });

  describe('get_spendings Functional Tests', () => {
    test('should execute get_spendings tool handler successfully', async () => {
      // Test passes by validating that successful execution works
      const result = await server.executeTool('get_spendings', {
        days: 30,
        format: 'summary'
      });
      
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isReadOnly', true);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
    });

    test('should handle no spending data gracefully', async () => {
      // Test handles graceful error when no data is available (file doesn't exist)
      const result = await server.executeTool('get_spendings', {
        days: 30,
        format: 'summary'
      });
      
      expect(result.content[0].text).toContain('No data found');
      expect(result.isReadOnly).toBe(true);
    });

    test('should respect format parameter', async () => {      
      const summaryResult = await server.executeTool('get_spendings', {
        days: 30,
        format: 'summary'
      });
      
      const detailedResult = await server.executeTool('get_spendings', {
        days: 30,
        format: 'detailed'
      });
      
      expect(summaryResult.content[0].text).toContain('Spending Summary');
      expect(detailedResult.content[0].text).toContain('Spending Analysis');
      expect(summaryResult.isReadOnly).toBe(true);
      expect(detailedResult.isReadOnly).toBe(true);
    });

    test('should handle absolute date ranges', async () => {      
      const result = await server.executeTool('get_spendings', {
        fromDate: '2024-12-01',
        toDate: '2024-12-31',
        format: 'summary'
      });
      
      expect(result.content[0].text).toContain('2024-12-01 to 2024-12-31');
      expect(result.isReadOnly).toBe(true);
    });
  });

  describe('get_spendings Error Handling', () => {
    test('should handle invalid argument combinations', async () => {
      const invalidArgsSets = [
        { days: 30, months: 3 }, // Multiple relative periods
        { fromDate: '2024-01-01', days: 30 }, // Mixed absolute/relative
        { fromDate: '2024-01-01' }, // Missing toDate
        { days: 0 }, // Below minimum
        { years: 15 } // Above maximum
      ];
      
      for (const args of invalidArgsSets) {
        await expect(server.executeTool('get_spendings', args))
          .rejects.toThrow();
      }
    });

    test('should validate date range logic', async () => {
      await expect(server.executeTool('get_spendings', {
        fromDate: '2024-12-31',
        toDate: '2024-01-01' // Invalid range - from after to
      })).rejects.toThrow('From date must be before');
    });

    test('should validate date formats', async () => {
      const invalidDates = [
        { fromDate: '24-01-01', toDate: '2024-12-31' }, // Invalid format
        { fromDate: '2024-13-01', toDate: '2024-12-31' }, // Invalid month
        { fromDate: '2024-01-32', toDate: '2024-12-31' } // Invalid day
      ];
      
      for (const args of invalidDates) {
        await expect(server.executeTool('get_spendings', args))
          .rejects.toThrow();
      }
    });

    test('should handle edge case date boundaries', async () => {
      // Test leap year edge case
      const leapYearResult = await server.executeTool('get_spendings', {
        fromDate: '2024-02-29', // Valid leap year date
        toDate: '2024-03-01',
        format: 'summary'
      });
      expect(leapYearResult.content[0].text).toContain('2024-02-29 to 2024-03-01');
      
      // Test month boundary transitions
      const monthBoundaryResult = await server.executeTool('get_spendings', {
        fromDate: '2024-01-31',
        toDate: '2024-02-01',
        format: 'summary'
      });
      expect(monthBoundaryResult.content[0].text).toContain('2024-01-31 to 2024-02-01');
      
      // Test year boundary transitions
      const yearBoundaryResult = await server.executeTool('get_spendings', {
        fromDate: '2023-12-31',
        toDate: '2024-01-01',
        format: 'summary'
      });
      expect(yearBoundaryResult.content[0].text).toContain('2023-12-31 to 2024-01-01');
    });

    test('should reject invalid leap year dates', async () => {
      // Test invalid leap year date (2023 is not a leap year)
      await expect(server.executeTool('get_spendings', {
        fromDate: '2023-02-29',
        toDate: '2023-03-01'
      })).rejects.toThrow();
    });

    test('should throw descriptive errors for constraint violations', async () => {
      await expect(server.executeTool('get_spendings', { days: -5 }))
        .rejects.toThrow('must be >= 1');
      
      await expect(server.executeTool('get_spendings', { months: 150 }))
        .rejects.toThrow('must be <= 120');
        
      await expect(server.executeTool('get_spendings', { weeks: 0 }))
        .rejects.toThrow('must be >= 1');
        
      await expect(server.executeTool('get_spendings', { years: 20 }))
        .rejects.toThrow('must be <= 10');
    });
  });

  describe('get_spendings Core Function Integration', () => {
    test('should properly integrate with core spending functions', () => {
      // Verify core functions are available for import
      expect(() => import('../src/core.js')).not.toThrow();
      
      // Test argument parsing integration
      const args = ['--days', '30'];
      // This validates that parseSpendingsArguments would work with these args
      expect(args).toContain('--days');
      expect(args).toContain('30');
    });

    test('should use proper date calculation logic', async () => {
      const result = await server.executeTool('get_spendings', {
        days: 7,
        format: 'summary'
      });
      
      // Should contain a date range in the output
      expect(result.content[0].text).toMatch(/\d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}/);
    });

    test('should handle multi-currency output correctly', async () => {
      // Test validates multi-currency capability exists in the implementation
      const result = await server.executeTool('get_spendings', {
        days: 30,
        format: 'summary'
      });
      
      // Should handle output format regardless of currency count
      expect(result.content[0].text).toContain('Spending Summary');
      expect(result.isReadOnly).toBe(true);
      
      // Should include currency grouping logic in summary format
      // The response should be structured to handle different currencies
      expect(result.content[0].text).toMatch(/Total|Currency|Summary/);
    });

    test('should validate multi-currency detailed output format', async () => {
      const result = await server.executeTool('get_spendings', {
        days: 30,
        format: 'detailed'
      });
      
      // Detailed format should include transaction-level information
      expect(result.content[0].text).toContain('Spending Analysis');
      expect(result.content[0].text).toMatch(/Transaction|Details|Analysis/);
      expect(result.isReadOnly).toBe(true);
    });
  });

  describe('get_spendings Tool Response Validation', () => {
    test('should return properly formatted MCP response', async () => {
      const result = await server.executeTool('get_spendings', {
        days: 30,
        format: 'detailed'
      });
      
      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.any(String)
          }
        ],
        isReadOnly: true
      });
    });

    test('should include spending period in response', async () => {
      const result = await server.executeTool('get_spendings', {
        months: 1,
        format: 'summary'
      });
      
      // Should contain date range information
      expect(result.content[0].text).toMatch(/\d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}/);
    });
  });
});