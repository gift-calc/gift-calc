#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test files to run
const testFiles = [
  'core.test.js',
  'algorithm.test.js', 
  'config.test.js'
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

console.log('🎁 Gift Calculator Test Suite');
console.log('=============================\n');

// Function to run a single test file
function runTestFile(testFile) {
  return new Promise((resolve) => {
    const testPath = path.join(__dirname, testFile);
    console.log(`📋 Running ${testFile}...`);
    
    const child = spawn('node', ['--test', testPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      // Parse test results from Node.js test runner output
      const lines = stdout.split('\n');
      let fileTests = 0;
      let filePassed = 0;
      let fileFailed = 0;
      
      // Look for summary lines from Node.js test runner  
      for (const line of lines) {
        // Check for final summary statistics first
        if (line.includes('# pass ')) {
          const match = line.match(/# pass (\d+)/);
          if (match) {
            filePassed = parseInt(match[1]);
          }
        } else if (line.includes('# fail ')) {
          const match = line.match(/# fail (\d+)/);
          if (match) {
            fileFailed = parseInt(match[1]);
          }
        }
      }
      
      // Calculate total tests
      fileTests = filePassed + fileFailed;
      
      totalTests += fileTests;
      passedTests += filePassed;
      failedTests += fileFailed;
      
      if (code === 0 && fileFailed === 0) {
        console.log(`  ✅ ${filePassed} tests passed`);
      } else {
        console.log(`  ❌ ${fileFailed} tests failed, ${filePassed} passed`);
        if (stderr) {
          console.log(`  Error output: ${stderr.substring(0, 200)}...`);
        }
      }
      
      // Show detailed output for failures
      if ((code !== 0 || fileFailed > 0) && process.env.VERBOSE) {
        console.log(`\nDetailed output for ${testFile}:`);
        console.log(stdout);
        if (stderr) {
          console.log('Errors:');
          console.log(stderr);
        }
      }
      
      console.log('');
      resolve(code);
    });
  });
}

// Run all tests sequentially
async function runAllTests() {
  const results = [];
  
  for (const testFile of testFiles) {
    const result = await runTestFile(testFile);
    results.push(result);
  }
  
  // Summary
  console.log('📊 Test Summary');
  console.log('===============');
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ${failedTests > 0 ? '❌' : ''}`);
  console.log(`Success rate: ${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%`);
  
  const allPassed = results.every(code => code === 0);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed!');
    console.log('Run with VERBOSE=1 for detailed output');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log('Usage: node run-tests.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help     Show this help message');
  console.log('');
  console.log('Environment variables:');
  console.log('  VERBOSE=1  Show detailed output for failed tests');
  process.exit(0);
}

runAllTests().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});