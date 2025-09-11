export default {
  test: {
    // Test environment
    environment: 'node',
    
    // Make describe, test, expect available globally
    globals: true,
    
    // Test file patterns
    include: ['test/**/*.test.js'],
    
    // Run tests in main thread to avoid process isolation issues in CI
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    // Disable isolation to prevent exit code issues
    isolate: false,
    
    // Timeout for long-running CLI tests
    testTimeout: 10000,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      include: [
        'index.js',
        'src/**/*.js'
      ],
      exclude: [
        'test/**',
        'node_modules/**'
      ],
      reporter: ['text', 'text-summary']
    },
    
    // Clear mocks between tests
    clearMocks: true
  }
};