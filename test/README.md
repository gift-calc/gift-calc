# Gift Calculator Test Suite

This directory contains comprehensive tests for the gift-calc CLI tool.

## Test Structure

### Test Files

- **`core.test.js`** - Core functionality and CLI integration tests
- **`algorithm.test.js`** - Mathematical calculations and algorithm behavior tests  
- **`config.test.js`** - Configuration loading and file handling tests
- **`run-tests.js`** - Test runner script

### Test Categories

#### Core Functionality Tests
- Basic CLI parameter handling
- Input validation and error cases
- Output formatting
- Command execution
- Help system

#### Algorithm Tests
- Deterministic calculations (--max, --min, special cases)
- Randomness and variation testing
- Bias effects (friend-score, nice-score)
- Mathematical properties and scaling
- Priority and override logic
- Statistical distribution analysis

#### Configuration Tests
- Config file loading and parsing
- Default value handling
- Command line override behavior  
- File system operations
- Error handling for malformed configs
- Logging functionality

## Running Tests

### All Tests
```bash
npm test
```

### Individual Test Files
```bash
npm run test:core      # Core functionality tests
npm run test:algorithm # Algorithm and calculation tests
npm run test:config    # Configuration tests
```

### Verbose Output
```bash
npm run test:verbose   # Show detailed output for failures
```

### Manual Test Runner
```bash
node test/run-tests.js
```

## Test Requirements

- **Node.js**: >= 18.0.0 (for built-in test runner)
- **No external dependencies** - uses only Node.js built-in modules

## Test Coverage

### Features Tested

✅ **Core Parameters**
- Base value (`-b/--basevalue`)
- Variation (`-v/--variation`) 
- Friend score (`-f/--friend-score`)
- Nice score (`-n/--nice-score`)
- Currency (`-c/--currency`)
- Decimals (`-d/--decimals`)
- Name (`--name`)

✅ **Special Features**
- Fixed amounts (`--max`, `--min`)
- Convenience parameters (`--asshole`, `--dickhead`)
- Logging control (`--no-log`)
- Clipboard copy (`-cp/--copy`)

✅ **Commands**
- Help (`--help`)
- Log viewing (`log`)
- Configuration (loading behavior)

✅ **Special Cases**
- Nice score 0-3 override behavior
- Parameter validation and error handling
- Edge cases (very small/large values)
- File system operations

✅ **Mathematical Properties**
- Randomness and distribution
- Bias effects and cumulative impact
- Scaling and proportionality
- Precision and rounding

### Test Statistics

The test suite includes:
- **~100+ individual test cases**
- **Deterministic testing** for fixed calculations
- **Statistical testing** for randomized calculations (200+ samples)
- **Integration testing** via actual CLI execution
- **Error condition testing** for robustness
- **File system testing** for configuration and logging

## Test Strategy

### Unit Testing
- Individual function behavior testing
- Parameter validation testing
- Mathematical calculation testing

### Integration Testing  
- Full CLI command execution
- Configuration file interaction
- Cross-parameter behavior
- Real file system operations

### Statistical Testing
For randomized calculations:
- Run 100-300 iterations per test
- Verify distribution properties
- Check bias effects statistically
- Ensure reasonable variation bounds

### Edge Case Testing
- Boundary values (0, max values)
- Invalid inputs and error conditions
- File system edge cases
- Configuration parsing errors

## Writing New Tests

### Test File Structure
```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('Feature Name', () => {
  test('should do something specific', () => {
    // Test implementation
    assert.strictEqual(actual, expected);
  });
});
```

### CLI Testing Helper
```javascript
function runCLI(args = '', options = {}) {
  try {
    const result = execSync(`node "${CLI_PATH}" ${args}`, {
      encoding: 'utf8',
      timeout: 5000,
      ...options
    });
    return { stdout: result.trim(), success: true };
  } catch (error) {
    return { 
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || error.message,
      success: false 
    };
  }
}
```

### Statistical Testing Helper
```javascript
function getStats(args, iterations = 100) {
  const amounts = [];
  for (let i = 0; i < iterations; i++) {
    amounts.push(getAmount(args));
  }
  
  amounts.sort((a, b) => a - b);
  return {
    min: amounts[0],
    max: amounts[amounts.length - 1],
    avg: amounts.reduce((sum, val) => sum + val, 0) / amounts.length
  };
}
```

## Continuous Integration

Tests are designed to:
- Run quickly (< 30 seconds total)
- Be deterministic where possible
- Handle timing variations gracefully
- Clean up test files automatically
- Work across different environments

## Debugging Tests

### Common Issues
1. **Timeouts** - Increase timeout in execSync options
2. **File permissions** - Tests clean up automatically but may need manual cleanup
3. **Statistical fluctuations** - Increase sample size for flaky statistical tests
4. **Path issues** - Tests use absolute paths to avoid working directory issues

### Debug Commands
```bash
# Run with verbose output
VERBOSE=1 npm test

# Run individual test with Node debugging
node --test --inspect test/core.test.js

# Manual CLI testing
node index.js --help
node index.js -b 100 --no-log
```

## Test Maintenance

- Tests are automatically run before releases
- Statistical tests may occasionally fail due to randomness (< 1% chance)
- Update tests when adding new features or changing behavior
- Keep test files focused on specific areas of functionality