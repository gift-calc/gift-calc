import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  getBudgetPath,
  addBudget,
  editBudget,
  listBudgets,
  getBudgetStatus,
  formatBudgetAmount
} from '../../core.js';
import { loadConfig } from '../config.js';

/**
 * Handle budget command
 * @param {Object} config - Parsed configuration
 */
export function handleBudgetCommand(config) {
  // Check if parsing succeeded
  if (!config.success) {
    console.error('Error:', config.error);
    console.log('\nUsage:');
    console.log('  gift-calc budget add <amount> <from-date> <to-date> [description]  # Add new budget');
    console.log('  gift-calc budget list                                            # List all budgets');
    console.log('  gift-calc budget status                                          # Show current budget status');
    console.log('  gift-calc budget edit <id> [--amount X] [--from-date X] [--to-date X] [--description X]  # Edit budget');
    console.log('  gcalc b add 5000 2024-12-01 2024-12-31 "Christmas gifts"       # Add budget (short form)');
    console.log('  gcalc b list                                                     # List budgets (short)');
    console.log('  gcalc b status                                                   # Show status (short)');
    console.log('  gcalc b edit 1 --amount 6000 --description "Updated Christmas" # Edit budget (short)');
    process.exit(1);
  }

  // Get budget file path
  const budgetPath = getBudgetPath(path, os);

  // Load config for currency formatting
  const configDefaults = loadConfig();
  const currency = configDefaults.currency || 'SEK';

  // Handle different actions
  switch (config.action) {
    case 'help':
      console.log('Budget Management Commands:');
      console.log('');
      console.log('  gift-calc budget add <amount> <from-date> <to-date> [description]');
      console.log('    Add a new budget for a specific period');
      console.log('    Example: gift-calc budget add 5000 2024-12-01 2024-12-31 "Christmas gifts"');
      console.log('');
      console.log('  gift-calc budget list');
      console.log('    List all budgets with their status (ACTIVE, FUTURE, EXPIRED)');
      console.log('');
      console.log('  gift-calc budget status');
      console.log('    Show current active budget and remaining days');
      console.log('');
      console.log('  gift-calc budget edit <id> [options]');
      console.log('    Edit an existing budget');
      console.log('    Options: --amount X, --from-date YYYY-MM-DD, --to-date YYYY-MM-DD, --description "text"');
      console.log('    Example: gift-calc budget edit 1 --amount 6000 --description "Updated Christmas"');
      console.log('');
      console.log('Short form: Use "gcalc b" instead of "gift-calc budget"');
      console.log('');
      console.log('Notes:');
      console.log('  - Dates must be in YYYY-MM-DD format');
      console.log('  - Budget periods cannot overlap');
      console.log('  - Amounts are displayed using your configured currency');
      break;

    case 'add':
      const addResult = addBudget(
        config.amount,
        config.fromDate,
        config.toDate,
        config.description,
        budgetPath,
        fs,
        path
      );
      console.log(addResult.message);
      if (!addResult.success) {
        process.exit(1);
      }
      break;

    case 'edit':
      const editResult = editBudget(
        config.budgetId,
        config.updates,
        budgetPath,
        fs,
        path
      );
      console.log(editResult.message);
      break;

    case 'list':
      const budgetList = listBudgets(budgetPath, fs);
      if (budgetList.length === 0) {
        console.log('No budgets configured. Use "budget add" to create one.');
      } else {
        console.log('Budgets:');
        budgetList.forEach(entry => {
          // Format amounts with currency - extract amount and add currency
          const entryWithCurrency = entry.replace(/: (\d+(?:\.\d+)?) \(/g, (match, amount) => `: ${formatBudgetAmount(amount, currency)} (`);
          console.log(`  ${entryWithCurrency}`);
        });
      }
      break;

    case 'status':
      const status = getBudgetStatus(budgetPath, fs);
      if (!status.hasActiveBudget) {
        console.log(status.message);
        console.log('');
        console.log('Available commands:');
        console.log('  gift-calc budget add <amount> <from-date> <to-date> [description]  # Add new budget');
        console.log('  gift-calc budget list                                            # List all budgets');
        console.log('  gift-calc budget --help                                          # Show detailed help');
      } else {
        const budget = status.budget;
        console.log(`Current Budget: ${budget.description}`);
        console.log(`Total: ${formatBudgetAmount(budget.totalAmount, currency)} | Days Left: ${status.remainingDays}`);
        console.log(`Period: ${budget.fromDate} to ${budget.toDate}`);
      }
      break;

    default:
      console.error('Unknown action:', config.action);
      process.exit(1);
  }
}