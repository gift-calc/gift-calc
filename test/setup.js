// Test setup file to handle process.exit issues

// Store original process.exit
const originalExit = process.exit;

// Override process.exit in test environment to prevent vitest errors
if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
  process.exit = function(code) {
    // Instead of actually exiting, throw an error that vitest can handle
    if (code !== 0) {
      throw new Error(`Process would exit with code ${code}`);
    }
    // For exit code 0, just return - don't actually exit
    return;
  };
}

// Cleanup function to restore original behavior
export function cleanup() {
  process.exit = originalExit;
}