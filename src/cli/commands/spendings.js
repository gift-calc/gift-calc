import fs from 'node:fs';
import {
  validateDate,
  calculateRelativeDate,
  getSpendingsBetweenDates,
  formatSpendingsOutput
} from '../../core.js';
import { getLogPath } from '../config.js';

/**
 * Handle spendings command
 * @param {Object} config - Parsed configuration
 */
export function handleSpendingsCommand(config) {
  // Check if parsing succeeded
  if (!config.success) {
    console.error('Error:', config.error);
    console.error('');
    console.error('Usage:');
    console.error('  gift-calc spendings -f <from-date> -t <to-date>        # Absolute date range');
    console.error('  gift-calc spendings --from 2024-01-01 --to 2024-12-31  # Absolute date range');
    console.error('  gift-calc spendings --days 30                          # Last 30 days');
    console.error('  gift-calc spendings --weeks 4                          # Last 4 weeks');
    console.error('  gift-calc spendings --months 3                         # Last 3 months');
    console.error('  gift-calc spendings --years 1                          # Last year');
    console.error('  gcalc spendings --days 30                               # Short form');
    console.error('  gcalc s --weeks 8                                       # Short alias');
    process.exit(1);
  }

  const logPath = getLogPath();
  let fromDate, toDate;

  // Calculate date range
  if (config.fromDate && config.toDate) {
    // Absolute dates
    const fromValidation = validateDate(config.fromDate);
    const toValidation = validateDate(config.toDate);

    if (!fromValidation.valid) {
      console.error('Error:', fromValidation.error);
      process.exit(1);
    }

    if (!toValidation.valid) {
      console.error('Error:', toValidation.error);
      process.exit(1);
    }

    if (fromValidation.date > toValidation.date) {
      console.error('Error: From date must be before or equal to to date');
      process.exit(1);
    }

    fromDate = config.fromDate;
    toDate = config.toDate;
  } else {
    // Relative dates
    let timeUnit, timeValue;

    if (config.days) {
      timeUnit = 'days';
      timeValue = config.days;
    } else if (config.weeks) {
      timeUnit = 'weeks';
      timeValue = config.weeks;
    } else if (config.months) {
      timeUnit = 'months';
      timeValue = config.months;
    } else if (config.years) {
      timeUnit = 'years';
      timeValue = config.years;
    }

    fromDate = calculateRelativeDate(timeUnit, timeValue);
    toDate = new Date().toISOString().split('T')[0]; // Today
  }

  // Get spending data
  const spendingsData = getSpendingsBetweenDates(logPath, fromDate, toDate, fs);

  // Format and display output
  const output = formatSpendingsOutput(spendingsData, fromDate, toDate);
  console.log(output);
}