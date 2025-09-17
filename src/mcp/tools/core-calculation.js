/**
 * MCP Tools for Core Gift Calculation
 * Modularized calculation tools following domain-driven architecture
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Import from modularized modules
import { calculateFinalAmount } from '../../core/calculation.js';
import { getNaughtyListPath, isOnNaughtyList } from '../../domains/naughty-list/index.js';
import { formatOutput } from '../../core.js'; // This would be moved to shared/formatting.js eventually

// Import from config
import { loadConfig } from '../server.js';

// Import schemas
import { calculateGiftAmountSchema } from '../schemas/core-calculation.js';

/**
 * Register core calculation MCP tools with the provided server instance
 * @param {Object} server - MCP server instance
 */
export function registerCoreCalculationTools(server) {
  // Calculate gift amount tool
  server.registerTool('calculate_gift_amount', {
    description: 'Calculate gift amount with variation, friend score, and nice score influences',
    inputSchema: calculateGiftAmountSchema,
    handler: async (args) => {
      const config = loadConfig();
      const {
        baseValue,
        variation,
        friendScore,
        niceScore,
        displayCurrency = null,
        decimals = config.decimals !== undefined ? config.decimals : 2,
        recipientName = null,
        useMaximum = false,
        useMinimum = false
      } = args;

      // Check naughty list first (highest priority)
      const naughtyListPath = getNaughtyListPath(path, os);
      const isNaughty = recipientName ? isOnNaughtyList(recipientName, naughtyListPath, fs) : false;

      let giftAmount;
      let notes = '';

      if (isNaughty) {
        giftAmount = 0;
        notes = ` (${recipientName} is on the naughty list!)`;
      } else {
        // Calculate using modularized function
        giftAmount = calculateFinalAmount(
          baseValue,
          variation,
          friendScore,
          niceScore,
          decimals,
          useMaximum,
          useMinimum
        );
      }

      // Format the base currency output
      const baseCurrency = config.baseCurrency || config.currency || 'SEK';
      const output = formatOutput(giftAmount, baseCurrency, recipientName, decimals);

      return {
        content: [
          {
            type: 'text',
            text: `🎁 ${output}${notes}`
          }
        ],
        isReadOnly: true
      };
    }
  });
}