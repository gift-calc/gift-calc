/**
 * CRITICAL BUG TEST CASES - CLI Parameter Validation Issues  
 * 
 * These tests validate validation bugs found in the CLI interface
 * where some parameter validation is missing or inconsistent.
 */

import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';

describe('CRITICAL BUG - CLI Validation Issues', () => {
  /**
   * Helper function to execute CLI command
   */
  const executeCLI = (args) => {
    return new Promise((resolve) => {
      const cliProcess = spawn('node', ['index.js', ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdoutData = '';
      let stderrData = '';
      
      cliProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });
      
      cliProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });
      
      cliProcess.on('close', (code) => {
        resolve({
          code,
          stdout: stdoutData.trim(),
          stderr: stderrData.trim()
        });
      });
    });
  };

  describe('BUG #6: CLI Base Value Validation Missing', () => {
    it('should REJECT negative base value but currently ACCEPTS it', async () => {
      const result = await executeCLI(['-b', '-50', '-r', '20', '-f', '5', '-n', '5']);
      
      // BUG: Currently accepts negative base value and calculates negative gift
      expect(result.code).toBe(0);  // Success code 
      expect(result.stdout).toMatch(/-.*SEK/);  // Negative amount in output
      
      // EXPECTED BEHAVIOR: Should exit with error code and show validation message
      // expect(result.code).not.toBe(0);
      // expect(result.stderr).toContain('basevalue must be positive');
    });
    
    it('should REJECT zero base value but currently ACCEPTS it', async () => {
      const result = await executeCLI(['-b', '0', '-r', '20', '-f', '5', '-n', '5']);
      
      // BUG: Currently accepts zero base value
      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(/0.*SEK/);  // Zero or very small amount
      
      // EXPECTED: Should require positive base value
    });
  });

  describe('CLI Validation That DOES Work Correctly', () => {
    it('properly REJECTS variation > 100', async () => {
      const result = await executeCLI(['-b', '100', '-r', '150', '-f', '5', '-n', '5']);
      
      expect(result.code).not.toBe(0);  // Error code
      expect(result.stderr).toContain('-r/--variation must be between 0 and 100');
    });
    
    it('properly REJECTS friend score = 0', async () => {
      const result = await executeCLI(['-b', '100', '-r', '20', '-f', '0', '-n', '5']);
      
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain('-f/--friend-score must be between 1 and 10');
    });
    
    it('properly REJECTS friend score > 10', async () => {
      const result = await executeCLI(['-b', '100', '-r', '20', '-f', '15', '-n', '5']);
      
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain('-f/--friend-score must be between 1 and 10');
    });
    
    it('properly REJECTS nice score < 0', async () => {
      const result = await executeCLI(['-b', '100', '-r', '20', '-f', '5', '-n', '-1']);
      
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain('-n/--nice-score must be between 0 and 10');
    });
    
    it('properly REJECTS nice score > 10', async () => {
      const result = await executeCLI(['-b', '100', '-r', '20', '-f', '5', '-n', '15']);
      
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain('-n/--nice-score must be between 0 and 10');
    });
    
    it('properly REJECTS decimals > 10', async () => {
      const result = await executeCLI(['-b', '100', '-r', '20', '-f', '5', '-n', '5', '-d', '15']);
      
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain('-d/--decimals must be between 0 and 10');
    });
    
    it('properly REJECTS negative decimals', async () => {
      const result = await executeCLI(['-b', '100', '-r', '20', '-f', '5', '-n', '5', '-d', '-1']);
      
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain('-d/--decimals must be between 0 and 10');
    });
  });

  describe('CLI Budget Validation (Working Correctly)', () => {
    it('properly REJECTS negative budget amount', async () => {
      const result = await executeCLI(['budget', 'add', '-500', '2024-12-01', '2024-12-31']);
      
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain('Amount must be a positive number');
    });
    
    it('properly REJECTS invalid dates', async () => {
      const result = await executeCLI(['budget', 'add', '1000', '2024-15-01', '2024-12-31']);
      
      expect(result.code).not.toBe(0);
      expect(result.stdout).toContain('From date error: Invalid date');
    });
  });

  describe('CLI Naughty List Validation (Working Correctly)', () => {
    it('properly REJECTS empty name', async () => {
      const result = await executeCLI(['naughty-list', '']);
      
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain('No name provided to add to naughty list');
    });
    
    it('properly REJECTS whitespace-only name', async () => {
      const result = await executeCLI(['naughty-list', '   ']);
      
      expect(result.code).not.toBe(0);
      expect(result.stdout).toContain('Name cannot be empty');
    });
  });
});