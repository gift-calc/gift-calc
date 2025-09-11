export default {
  test: {
    // Test environment
    environment: 'node',
    
    // Make describe, test, expect available globally
    globals: true,
    
    // Test file patterns
    include: ['test/**/*.test.js'],
    
    // Use forks pool but with maxForks: 1 to run sequentially
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 1,
        minForks: 1,
        isolate: true
      }
    },
    
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
    clearMocks: true,
    
    // Custom setup to handle process.exit issues
    setupFiles: ['test/setup.js'],
    
    // Handle teardown better
    teardownTimeout: 30000
  }
};