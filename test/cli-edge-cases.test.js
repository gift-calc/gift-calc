/**
 * CLI Edge Case Tests
 * Additional edge cases discovered during comprehensive testing
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('CLI Edge Cases', () => {
  let tempDir;
  let originalHome;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gift-calc-cli-edge-test-'));
    originalHome = process.env.HOME;
    process.env.HOME = tempDir;
  });

  afterEach(() => {
    if (originalHome !== undefined) {
      process.env.HOME = originalHome;
    } else {
      delete process.env.HOME;
    }
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Exit Code Validation', () => {
    test('should return exit code 1 on validation errors', async () => {
      const result = await new Promise((resolve) => {
        const cli = spawn('node', ['index.js', '-b', '-50'], {
          cwd: process.cwd()
        });

        cli.on('exit', (code) => {
          resolve(code);
        });
      });

      expect(result).toBe(1);
    });

    test('should return exit code 0 on successful calculations', async () => {
      const result = await new Promise((resolve) => {
        const cli = spawn('node', ['index.js', '-b', '100', '--no-log'], {
          cwd: process.cwd()
        });

        cli.on('exit', (code) => {
          resolve(code);
        });
      });

      expect(result).toBe(0);
    });

    test('should return exit code 1 on budget validation errors', async () => {
      const result = await new Promise((resolve) => {
        const cli = spawn('node', ['index.js', 'budget', 'add', '0', '2024-01-01', '2024-01-02'], {
          cwd: process.cwd()
        });

        let errorOutput = '';
        cli.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        cli.on('exit', (code) => {
          resolve({ code, errorOutput });
        });
      });

      expect(result.code).toBe(1);
      expect(result.errorOutput).toContain('Amount must be a positive number');
    });

    test('should return exit code 1 on naughty list validation errors', async () => {
      const result = await new Promise((resolve) => {
        const cli = spawn('node', ['index.js', 'naughty-list', ''], {
          cwd: process.cwd()
        });

        let errorOutput = '';
        cli.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        cli.on('exit', (code) => {
          resolve({ code, errorOutput });
        });
      });

      expect(result.code).toBe(1);
      expect(result.errorOutput).toContain('No name provided');
    });
  });

  describe('Error Handling Under Load', () => {
    test('should handle rapid sequential calculations without crashes', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        const promise = new Promise((resolve) => {
          const cli = spawn('node', ['index.js', '-b', '100', '--no-log'], {
            cwd: process.cwd()
          });

          let output = '';
          cli.stdout.on('data', (data) => {
            output += data.toString();
          });

          cli.on('exit', (code) => {
            resolve({ code, output });
          });
        });
        
        promises.push(promise);
      }

      const results = await Promise.all(promises);
      
      results.forEach((result) => {
        expect(result.code).toBe(0);
        expect(result.output).toMatch(/\d+(\.\d+)? \w+/);
      });
    });
  });

  describe('Version and Help Commands', () => {
    test('should display version without errors', async () => {
      const result = await new Promise((resolve) => {
        const cli = spawn('node', ['index.js', '--version'], {
          cwd: process.cwd()
        });

        let output = '';
        cli.stdout.on('data', (data) => {
          output += data.toString();
        });

        cli.on('exit', (code) => {
          resolve({ code, output });
        });
      });

      expect(result.code).toBe(0);
      expect(result.output).toMatch(/gift-calc v\d+\.\d+\.\d+/);
    });

    test('should display help without errors', async () => {
      const result = await new Promise((resolve) => {
        const cli = spawn('node', ['index.js', '--help'], {
          cwd: process.cwd()
        });

        let output = '';
        cli.stdout.on('data', (data) => {
          output += data.toString();
        });

        cli.on('exit', (code) => {
          resolve({ code, output });
        });
      });

      expect(result.code).toBe(0);
      expect(result.output).toContain('Gift Calculator - CLI Tool');
      expect(result.output).toContain('USAGE:');
      expect(result.output).toContain('OPTIONS:');
    });
  });

  describe('Configuration Integration', () => {
    test('should work correctly with custom config directory structure', async () => {
      const configDir = path.join(tempDir, '.config', 'gift-calc');
      fs.mkdirSync(configDir, { recursive: true });
      
      fs.writeFileSync(
        path.join(configDir, '.config.json'),
        JSON.stringify({
          baseValue: 150,
          currency: 'USD',
          decimals: 1
        })
      );

      const result = await new Promise((resolve) => {
        const cli = spawn('node', ['index.js', '--no-log'], {
          cwd: process.cwd()
        });

        let output = '';
        cli.stdout.on('data', (data) => {
          output += data.toString();
        });

        cli.on('exit', (code) => {
          resolve({ code, output });
        });
      });

      expect(result.code).toBe(0);
      expect(result.output).toMatch(/\d+\.\d USD/); // Should use 1 decimal from config
    });

    test('should handle deeply nested config directories', async () => {
      const deepConfigDir = path.join(tempDir, '.config', 'gift-calc', 'nested', 'deep');
      fs.mkdirSync(deepConfigDir, { recursive: true });
      
      // CLI should still work even if there are extra directories
      const result = await new Promise((resolve) => {
        const cli = spawn('node', ['index.js', '--no-log'], {
          cwd: process.cwd()
        });

        let output = '';
        cli.stdout.on('data', (data) => {
          output += data.toString();
        });

        cli.on('exit', (code) => {
          resolve({ code, output });
        });
      });

      expect(result.code).toBe(0);
      expect(result.output).toMatch(/\d+(\.\d+)? \w+/);
    });
  });

  describe('Input Sanitization', () => {
    test('should handle extremely long recipient names', async () => {
      const longName = 'A'.repeat(1000);
      const result = await new Promise((resolve) => {
        const cli = spawn('node', ['index.js', '-b', '100', '--name', longName, '--no-log'], {
          cwd: process.cwd()
        });

        let output = '';
        cli.stdout.on('data', (data) => {
          output += data.toString();
        });

        cli.on('exit', (code) => {
          resolve({ code, output });
        });
      });

      expect(result.code).toBe(0);
      expect(result.output).toContain(longName);
    });

    test('should handle special characters in recipient names', async () => {
      const specialName = 'Test User åäö @#$%^&*()';
      const result = await new Promise((resolve) => {
        const cli = spawn('node', ['index.js', '-b', '100', '--name', specialName, '--no-log'], {
          cwd: process.cwd()
        });

        let output = '';
        cli.stdout.on('data', (data) => {
          output += data.toString();
        });

        cli.on('exit', (code) => {
          resolve({ code, output });
        });
      });

      expect(result.code).toBe(0);
      expect(result.output).toContain(specialName);
    });
  });
});