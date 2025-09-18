import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Show version information
 */
export function showVersion() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const packageJsonPath = path.join(__dirname, '../../../package.json');
    const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log(`gift-calc v${packageData.version}`);
  } catch (error) {
    console.error('Error reading version information');
    process.exit(1);
  }
}