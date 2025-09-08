/**
 * CRITICAL BUG TEST CASES - MCP Server Parameter Validation Bypass
 * 
 * These tests validate the critical security/validation bugs found in the MCP server
 * where parameter validation is completely bypassed for range/type checks.
 * 
 * Bug Location: src/mcp/server.js:213 - Incomplete validateToolArguments function
 * Root Cause: Server uses incomplete validation instead of importing the complete 
 * validation from src/mcp/protocol.js
 * 
 * Impact: HIGH SEVERITY - All schema validation (min/max/type) is bypassed
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { spawn } from 'node:child_process';

describe('CRITICAL BUG - MCP Server Validation Bypass', () => {
  /**
   * Helper function to send JSON-RPC message to MCP server
   */
  const sendMCPRequest = (message) => {
    return new Promise((resolve, reject) => {
      const mcpProcess = spawn('node', ['mcp-server.js'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdoutData = '';
      let stderrData = '';
      
      mcpProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });
      
      mcpProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });
      
      mcpProcess.on('close', (code) => {
        // Extract JSON response (first line of stdout)
        const lines = stdoutData.trim().split('\n');
        const jsonResponse = lines[0];
        
        try {
          const response = JSON.parse(jsonResponse);
          resolve({ response, stderr: stderrData });
        } catch (error) {
          reject(new Error(`Failed to parse MCP response: ${jsonResponse}`));
        }
      });
      
      mcpProcess.stdin.write(JSON.stringify(message) + '\n');
      mcpProcess.stdin.end();
    });
  };

  describe('BUG #1: calculate_gift_amount Parameter Validation Bypass', () => {
    it('should REJECT negative baseValue but currently ACCEPTS it', async () => {
      const message = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'calculate_gift_amount',
          arguments: {
            baseValue: -50,  // INVALID: schema has minimum: 0
            variation: 20,
            friendScore: 5,
            niceScore: 5
          }
        }
      };
      
      const { response } = await sendMCPRequest(message);
      
      // FIXED: Now returns validation error as expected
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32602);
      expect(response.error.message).toContain('baseValue');
    });
    
    it('should REJECT variation > 100 but currently ACCEPTS it', async () => {
      const message = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'calculate_gift_amount',
          arguments: {
            baseValue: 100,
            variation: 150,  // INVALID: schema has maximum: 100
            friendScore: 5,
            niceScore: 5
          }
        }
      };
      
      const { response } = await sendMCPRequest(message);
      
      // FIXED: Now returns validation error as expected
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32602);
      expect(response.error.message).toContain('variation');
    });
    
    it('should REJECT friendScore > 10 but currently ACCEPTS it', async () => {
      const message = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'calculate_gift_amount',
          arguments: {
            baseValue: 100,
            variation: 20,
            friendScore: 15,  // INVALID: schema has maximum: 10
            niceScore: 5
          }
        }
      };
      
      const { response } = await sendMCPRequest(message);
      
      // FIXED: Now returns validation error as expected
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32602);
      expect(response.error.message).toContain('friendScore');
    });
    
    it('should REJECT friendScore = 0 but currently ACCEPTS it', async () => {
      const message = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'calculate_gift_amount',
          arguments: {
            baseValue: 100,
            variation: 20,
            friendScore: 0,  // INVALID: schema has minimum: 1
            niceScore: 5
          }
        }
      };
      
      const { response } = await sendMCPRequest(message);
      
      // FIXED: Now returns validation error as expected
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32602);
      expect(response.error.message).toContain('friendScore');
    });
  });

  describe('BUG #2: set_budget Parameter Validation Bypass', () => {
    it('should REJECT negative budget amount but currently ACCEPTS it', async () => {
      const message = {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'set_budget',
          arguments: {
            amount: -500,  // INVALID: schema has minimum: 0.01
            fromDate: '2024-12-01',
            toDate: '2024-12-31'
          }
        }
      };
      
      const { response } = await sendMCPRequest(message);
      
      // FIXED: Now returns validation error as expected
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32602);
      expect(response.error.message).toContain('amount');
      
      // EXPECTED: Should return validation error for negative amount
    });
  });

  describe('BUG #3: get_calculation_history Parameter Validation Bypass', () => {
    it('should REJECT limit > 50 but currently ACCEPTS it', async () => {
      const message = {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'get_calculation_history',
          arguments: {
            limit: 100  // INVALID: schema has maximum: 50
          }
        }
      };
      
      const { response } = await sendMCPRequest(message);
      
      // FIXED: Now returns validation error as expected
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32602);
      expect(response.error.message).toContain('limit');
    });
    
    it('should REJECT limit = 0 but currently ACCEPTS it', async () => {
      const message = {
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'get_calculation_history',
          arguments: {
            limit: 0  // INVALID: schema has minimum: 1
          }
        }
      };
      
      const { response } = await sendMCPRequest(message);
      
      // FIXED: Now returns validation error as expected
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32602);
      expect(response.error.message).toContain('limit');
    });
  });

  describe('BUG #4: init_config Parameter Validation Bypass', () => {
    it('should REJECT decimals > 10 but currently ACCEPTS it', async () => {
      const message = {
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          name: 'init_config',
          arguments: {
            decimals: 15  // INVALID: schema has maximum: 10
          }
        }
      };
      
      const { response } = await sendMCPRequest(message);
      
      // FIXED: Now returns validation error as expected
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32602);
      expect(response.error.message).toContain('decimals');
    });
  });

  describe('Validation That DOES Work (Required Fields)', () => {
    it('properly REJECTS missing required fields', async () => {
      const message = {
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: {
          name: 'calculate_gift_amount',
          arguments: {
            baseValue: 100,
            variation: 20,
            friendScore: 5
            // Missing niceScore (required field)
          }
        }
      };
      
      const { response } = await sendMCPRequest(message);
      
      // This validation DOES work
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32602);
      expect(response.error.message).toContain('Missing required field: niceScore');
    });
  });
});