import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { exec } from 'node:child_process';
import { calculateFinalAmount } from '../../core/calculation.js';
import {
  formatOutput,
  formatOutputWithConversion,
  findLastGiftFromLog,
  findLastGiftForRecipientFromLog,
  parseLogEntry,
  calculateBudgetUsage,
  formatBudgetSummary,
  formatMatchedGift
} from '../../core.js';
import { getNaughtyListPath, isOnNaughtyList } from '../../domains/naughty-list/index.js';
import { getLogPath } from '../config.js';

/**
 * Validate recipient name and clean it
 * @param {string} name - Raw recipient name
 * @returns {string|null} Cleaned name or null if invalid
 */
function validateRecipientName(name) {
  if (!name || typeof name !== 'string') return null;
  const cleaned = name.trim();
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Try to match a previous gift
 * @param {Object} config - Parsed configuration
 * @returns {Object} Match result with found flag and gift data
 */
function tryGiftMatching(config) {
  const logPath = getLogPath();
  let matchedGift = null;

  if (config.matchRecipientName) {
    const recipientName = validateRecipientName(config.matchRecipientName);
    if (recipientName) {
      matchedGift = findLastGiftForRecipientFromLog(recipientName, logPath, fs);
    }
  } else {
    matchedGift = findLastGiftFromLog(logPath, fs);
  }

  return {
    found: matchedGift !== null,
    gift: matchedGift
  };
}

/**
 * Handle case when no previous gift match is found
 * @param {Object} config - Parsed configuration
 */
function handleNoMatchFound(config) {
  if (config.matchRecipientName) {
    const recipientName = validateRecipientName(config.matchRecipientName);
    console.log(`No previous gift found for ${recipientName}.`);
  } else {
    console.log('No previous gifts found.');
  }
  process.exit(0);
}

/**
 * Get match info for display
 * @param {Object} config - Parsed configuration
 * @returns {string} Match info description
 */
function getMatchInfo(config) {
  if (config.matchRecipientName) {
    return `Previous gift for ${config.matchRecipientName}`;
  }
  return 'Previous gift';
}

/**
 * Get naughty list info for display
 * @param {Object} config - Parsed configuration
 * @returns {string} Naughty list info description
 */
function getNaughtyListInfo(config) {
  if (config.recipientName) {
    return `${config.recipientName} is on the naughty list`;
  }
  return 'Recipient is on the naughty list';
}

/**
 * Determine gift amount based on configuration
 * @param {Object} config - Parsed configuration
 * @returns {Object|null} Gift result or null if no match found
 */
function determineGiftAmount(config) {
  // Try gift matching first if requested
  if (config.matchPreviousGift) {
    const matchResult = tryGiftMatching(config);
    if (matchResult.found) {
      // Apply business rules (naughty list) to matched recipient
      const matchedRecipient = matchResult.gift.recipient;
      if (matchedRecipient) {
        const naughtyListPath = getNaughtyListPath(path, os);
        if (isOnNaughtyList(matchedRecipient, naughtyListPath, fs)) {
          // Return result with naughty list override but preserve matched gift info
          return {
            amount: 0,
            currency: matchResult.gift.currency,
            recipient: matchedRecipient,
            isMatched: true,
            matchedGift: matchResult.gift,
            naughtyListOverride: true
          };
        }
      }

      // Return matched gift with preserved currency
      return {
        amount: matchResult.gift.amount,
        currency: matchResult.gift.currency, // Preserve original currency!
        recipient: matchResult.gift.recipient,
        isMatched: true,
        matchedGift: matchResult.gift
      };
    } else {
      // No match found - return special value to indicate this
      return null;
    }
  }

  // Normal calculation path (not matching)
  // Check naughty list for normal calculations
  if (config.recipientName) {
    const recipientName = validateRecipientName(config.recipientName);
    if (recipientName) {
      const naughtyListPath = getNaughtyListPath(path, os);
      if (isOnNaughtyList(recipientName, naughtyListPath, fs)) {
        return {
          amount: 0,
          currency: config.baseCurrency,
          recipient: recipientName,
          isMatched: false,
          naughtyList: true
        };
      }
    }
  }

  // Normal calculation
  const calculatedAmount = calculateFinalAmount(
    config.baseValue,
    config.variation,
    config.friendScore,
    config.niceScore,
    config.decimals,
    config.useMaximum,
    config.useMinimum
  );

  return {
    amount: calculatedAmount,
    currency: config.baseCurrency,
    recipient: config.recipientName,
    isMatched: false
  };
}

/**
 * Display results and handle logging/clipboard
 * @param {Object} result - Gift calculation result
 * @param {Object} config - Parsed configuration
 */
async function displayResults(result, config) {
  const logPath = getLogPath();

  // Create main output (handles currency conversion internally)
  // For matched gifts, preserve original currency regardless of display currency setting
  let output;
  if (config.displayCurrency && config.displayCurrency !== result.currency && !result.isMatched) {
    output = await formatOutputWithConversion(
      result.amount,
      result.currency,
      config.displayCurrency,
      result.recipient,
      config.decimals
    );
  } else {
    output = formatOutput(result.amount, result.currency, result.recipient, config.decimals);
  }

  // Add naughty list indicator to main output if applicable
  if ((result.naughtyList || result.naughtyListOverride) && result.amount === 0) {
    output += ' (on naughty list!)';
  }

  console.log(output);

  // Add context information
  if (result.isMatched && result.matchedGift) {
    const matchInfo = getMatchInfo(config);
    const formattedMatch = formatMatchedGift(result.matchedGift);
    console.log(`${matchInfo}: ${formattedMatch}`);

    if (result.naughtyListOverride) {
      const naughtyInfo = getNaughtyListInfo(config);
      console.log(`Override: ${naughtyInfo} - amount set to 0`);
    }
  } else if (result.naughtyList) {
    const naughtyInfo = getNaughtyListInfo(config);
    console.log(`${naughtyInfo} - amount set to 0`);
  }

  // Copy to clipboard if requested
  if (config.copyToClipboard) {
    exec(`echo "${result.amount} ${result.currency}" | pbcopy`, (error) => {
      if (error) {
        console.error('Failed to copy to clipboard:', error.message);
      } else {
        console.log('Amount copied to clipboard!');
      }
    });
  }

  // Log to file if enabled
  if (config.logToFile) {
    try {
      // Ensure log directory exists
      const logDir = path.dirname(logPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const timestamp = new Date().toISOString();
      const formattedOutput = formatOutput(result.amount, result.currency, result.recipient, config.decimals);
      const logEntry = `${timestamp} ${formattedOutput}`;

      fs.appendFileSync(logPath, logEntry + '\n');

      // Display budget tracking if active budget exists
      try {
        const { getBudgetPath, getBudgetStatus, calculateBudgetUsage, formatBudgetSummary } = await import('../../core.js');
        const budgetPath = getBudgetPath(path, os);
        const budgetStatus = getBudgetStatus(budgetPath, fs);

        if (budgetStatus.hasActiveBudget) {
          const budgetCurrency = config.baseCurrency; // Use base currency for budget calculations

          // Calculate budget usage
          const usage = calculateBudgetUsage(logPath, budgetStatus.budget, fs);

          if (!usage.errorMessage) {
            // Format and display budget summary
            const budgetSummary = formatBudgetSummary(
              usage.totalSpent,
              result.amount,
              budgetStatus.budget.totalAmount,
              budgetStatus.remainingDays,
              budgetStatus.budget.toDate,
              budgetCurrency
            );

            console.log(budgetSummary);
          }
        }
      } catch (budgetError) {
        // Ignore budget errors - not critical for gift calculation
      }
    } catch (error) {
      console.error('Failed to log to file:', error.message);
    }
  }
}

/**
 * Handle main gift calculation command
 * @param {Object} config - Parsed configuration
 */
export async function handleGiftCalculation(config) {
  // Determine gift amount
  const result = determineGiftAmount(config);

  if (result === null) {
    // No match found for matching request
    handleNoMatchFound(config);
    return;
  }

  // Display results
  await displayResults(result, config);
}