/**
 * MCP Server Edge Case Tests
 * Comprehensive edge cases discovered during manual testing
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('MCP Server Edge Cases', () => {
  let tempDir;
  let originalHome;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gift-calc-mcp-edge-test-'));
    originalHome = process.env.HOME;
    process.env.HOME = tempDir;
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Special Character Handling', () => {
    test('should handle special characters in names without corrupting naughty list', async () => {
      const specialName = 'Test User åäö @#$%';
      const mcpResult = await sendMCPCommand({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'add_to_naughty_list',
          arguments: { name: specialName }
        }
      });

      expect(mcpResult.result).toBeDefined();
      expect(mcpResult.result.content[0].text).toContain('added to naughty list');
      expect(mcpResult.result.isReadOnly).toBe(false);

      // Verify the naughty list file can be read properly afterwards
      const checkResult = await sendMCPCommand({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'check_naughty_list',
          arguments: { name: specialName }
        }
      });

      expect(checkResult.result.content[0].text).toContain('on the naughty list');
    });
  });

  describe('Extreme Value Handling', () => {
    test('should handle extremely large numbers in calculations', async () => {
      const largeBaseValue = 999999;
      const result = await sendMCPCommand({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'calculate_gift_amount',
          arguments: {
            baseValue: largeBaseValue,
            variation: 100,
            friendScore: 10,
            niceScore: 10,
            decimals: 10
          }
        }
      });

      expect(result.result).toBeDefined();
      expect(result.result.content[0].text).toMatch(/\d+(\.\d+)? SEK/);
      const amount = parseFloat(result.result.content[0].text.split(' ')[0]);
      expect(amount).toBeGreaterThan(0);
      expect(amount).toBeLessThan(largeBaseValue * 2.2); // Allow for maximum possible calculation with high variation and friend/nice scores
    });

    test('should handle minimal values without errors', async () => {
      const result = await sendMCPCommand({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'calculate_gift_amount',
          arguments: {
            baseValue: 0.01,
            variation: 0,
            friendScore: 1,
            niceScore: 1,
            decimals: 2
          }
        }
      });

      expect(result.result).toBeDefined();
      expect(result.result.content[0].text).toMatch(/\d+(\.\d+)? SEK/);
    });
  });

  describe('Configuration Error Recovery', () => {
    test('should gracefully handle corrupted config files', async () => {
      // Create corrupted config file
      const configDir = path.join(tempDir, '.config', 'gift-calc');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(path.join(configDir, '.config.json'), 'invalid json');

      const result = await sendMCPCommand({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'get_config',
          arguments: {}
        }
      });

      expect(result.result).toBeDefined();
      expect(result.result.content[0].text).toContain('Current gift-calc configuration');
      // Should fallback to defaults
      expect(result.result.content[0].text).toContain('baseValue: 70');
      expect(result.result.content[0].text).toContain('currency: SEK');
    });

    test('should handle missing config file gracefully', async () => {
      // Don't create any config file
      const result = await sendMCPCommand({
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'get_config',
          arguments: {}
        }
      });

      expect(result.result).toBeDefined();
      expect(result.result.content[0].text).toContain('Current gift-calc configuration');
      expect(result.result.content[0].text).toContain('baseValue: 70'); // default
    });

    test('should handle corrupted naughty list file without crashing', async () => {
      // Create corrupted naughty list file
      const configDir = path.join(tempDir, '.config', 'gift-calc');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(path.join(configDir, 'naughty-list.json'), 'invalid json');

      const result = await sendMCPCommand({
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'check_naughty_list',
          arguments: { name: 'TestUser' }
        }
      });

      expect(result.result).toBeDefined();
      expect(result.result.content[0].text).toContain('TestUser is nice'); // Default to nice
    });
  });

  describe('STDIO Transport Edge Cases', () => {
    test('should handle multiple messages in single input correctly', async () => {
      const messages = [
        { jsonrpc: '2.0', id: 8, method: 'tools/list', params: {} },
        { 
          jsonrpc: '2.0', 
          id: 9, 
          method: 'tools/call', 
          params: { 
            name: 'get_config', 
            arguments: {} 
          } 
        }
      ];

      const mcpServer = spawn('node', ['mcp-server.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      const responses = [];
      const responseData = [];

      mcpServer.stdout.on('data', (data) => {
        responseData.push(data.toString());
      });

      // Send both messages
      for (const message of messages) {
        mcpServer.stdin.write(JSON.stringify(message) + '\n');
      }

      mcpServer.stdin.end();

      await new Promise((resolve) => {
        mcpServer.on('exit', resolve);
      });

      const fullResponse = responseData.join('');
      const lines = fullResponse.split('\n').filter(line => line.trim());
      
      expect(lines.length).toBeGreaterThanOrEqual(2);
      
      // First response should be tools list
      const firstResponse = JSON.parse(lines[0]);
      expect(firstResponse.id).toBe(8);
      expect(firstResponse.result.tools).toBeDefined();
      expect(firstResponse.result.tools.length).toBeGreaterThan(0);

      // Second response should be config
      const secondResponse = JSON.parse(lines[1]);
      expect(secondResponse.id).toBe(9);
      expect(secondResponse.result.content[0].text).toContain('Current gift-calc configuration');
    });

    test('should handle empty lines in input gracefully', async () => {
      const mcpServer = spawn('node', ['mcp-server.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      const responseData = [];
      mcpServer.stdout.on('data', (data) => {
        responseData.push(data.toString());
      });

      // Send message with empty lines
      mcpServer.stdin.write('\n\n');
      mcpServer.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/call',
        params: { name: 'get_config', arguments: {} }
      }) + '\n');
      mcpServer.stdin.write('\n\n');
      mcpServer.stdin.end();

      await new Promise((resolve) => {
        mcpServer.on('exit', resolve);
      });

      const fullResponse = responseData.join('');
      const lines = fullResponse.split('\n').filter(line => line.trim());
      
      expect(lines.length).toBeGreaterThanOrEqual(1);
      const response = JSON.parse(lines[0]);
      expect(response.id).toBe(10);
      expect(response.result).toBeDefined();
    });
  });

  describe('Business Logic Edge Cases', () => {
    test('should prioritize naughty list over nice score 0', async () => {
      // Add to naughty list
      await sendMCPCommand({
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/call',
        params: {
          name: 'add_to_naughty_list',
          arguments: { name: 'BadUser' }
        }
      });

      // Calculate with nice score 0 (should still show naughty list message)
      const result = await sendMCPCommand({
        jsonrpc: '2.0',
        id: 12,
        method: 'tools/call',
        params: {
          name: 'calculate_gift_amount',
          arguments: {
            baseValue: 100,
            variation: 20,
            friendScore: 8,
            niceScore: 0,
            recipientName: 'BadUser'
          }
        }
      });

      expect(result.result.content[0].text).toContain('0 SEK for BadUser (on naughty list!)');
      // Should show naughty list message, not nice score 0 message
      expect(result.result.content[0].text).toContain('(on naughty list!)');
    });

    test('should handle very short budget periods', async () => {
      const result = await sendMCPCommand({
        jsonrpc: '2.0',
        id: 13,
        method: 'tools/call',
        params: {
          name: 'set_budget',
          arguments: {
            amount: 1000,
            fromDate: '2024-01-01',
            toDate: '2024-01-02',
            description: 'One day budget'
          }
        }
      });

      expect(result.result).toBeDefined();
      expect(result.result.content[0].text).toContain('Budget "One day budget" added successfully');
      expect(result.result.isReadOnly).toBe(false);
    });
  });

  describe('History and Data Edge Cases', () => {
    test('should handle filtered history with no matches', async () => {
      const result = await sendMCPCommand({
        jsonrpc: '2.0',
        id: 14,
        method: 'tools/call',
        params: {
          name: 'get_calculation_history',
          arguments: {
            limit: 10,
            recipientFilter: 'NonExistentPerson'
          }
        }
      });

      expect(result.result).toBeDefined();
      expect(result.result.content[0].text).toContain('No calculation history found');
    });

    test('should handle history when log file does not exist', async () => {
      const result = await sendMCPCommand({
        jsonrpc: '2.0',
        id: 15,
        method: 'tools/call',
        params: {
          name: 'get_calculation_history',
          arguments: { limit: 10 }
        }
      });

      expect(result.result).toBeDefined();
      expect(result.result.content[0].text).toContain('No calculation history found');
    });
  });
});

/**
 * Helper function to send MCP commands and get responses
 */
async function sendMCPCommand(message) {
  return new Promise((resolve, reject) => {
    const mcpServer = spawn('node', ['mcp-server.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    let responseData = '';
    
    mcpServer.stdout.on('data', (data) => {
      responseData += data.toString();
    });

    mcpServer.stderr.on('data', (data) => {
      // Debug messages go to stderr, ignore them
    });

    mcpServer.on('exit', (code) => {
      try {
        const lines = responseData.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
          const response = JSON.parse(lines[0]);
          resolve(response);
        } else {
          reject(new Error('No response received'));
        }
      } catch (error) {
        reject(error);
      }
    });

    mcpServer.stdin.write(JSON.stringify(message) + '\n');
    mcpServer.stdin.end();

    // Timeout after 5 seconds
    setTimeout(() => {
      mcpServer.kill();
      reject(new Error('MCP server timeout'));
    }, 5000);
  });
}