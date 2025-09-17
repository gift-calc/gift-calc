#!/usr/bin/env node

import { parseArguments } from './src/shared/argument-parsing-simple.js';
import { loadConfig } from './src/cli/config.js';
import { routeCommand } from './src/cli/router.js';

// Get command line arguments
const args = process.argv.slice(2);

// First parse to detect person name for config loading
let tempConfig;
try {
  tempConfig = parseArguments(args, {});
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}

// Load config defaults with person-specific overrides if name is provided
const configDefaults = loadConfig(tempConfig.recipientName);

// Parse arguments again with proper defaults
let parsedConfig;
try {
  parsedConfig = parseArguments(args, configDefaults);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}

// Route command to appropriate handler
await routeCommand(parsedConfig);