import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { getLogPath } from '../config.js';

/**
 * Display log file contents using less
 */
export function displayLog() {
  const logPath = getLogPath();

  // Check if log file exists
  if (!fs.existsSync(logPath)) {
    console.log('No log file found. Use --log flag to start logging gift calculations.');
    return;
  }

  // Open log file with less using spawnSync for immediate execution
  try {
    const result = spawnSync('less', [logPath], {
      stdio: 'inherit'
    });

    if (result.error) {
      console.error(`Error opening log file with less: ${result.error.message}`);
      console.log(`Log file location: ${logPath}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error opening log file with less: ${error.message}`);
    console.log(`Log file location: ${logPath}`);
    process.exit(1);
  }
}