export default {
  test: {
    // Test environment
    environment: 'node',
    
    // Make describe, test, expect available globally
    globals: true,
    
    // Test file patterns
    include: ['test/**/*.test.js'],
    
    // Run tests sequentially to avoid file system conflicts
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
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
    clearMocks: true
  }
};