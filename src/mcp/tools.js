/**
 * @fileoverview MCP tool definitions and registration
 *
 * Defines all available MCP tools that AI assistants can invoke to interact
 * with gift-calc functionality. These tools reuse existing gift-calc core
 * functions following KISS principles and provide safe, structured access
 * to the application's capabilities.
 *
 * Key features:
 * - Tool registration with JSON schema validation
 * - Read-only vs read-write tool classification for safety
 * - Comprehensive tool schemas with parameter validation
 * - Integration with existing domain modules
 * - Error handling and result formatting
 * - Tool discovery and metadata management
 *
 * All tools are designed to be stateless and safe for AI assistant use,
 * with clear boundaries between read-only and potentially destructive operations.
 *
 * @module mcp/tools
 * @version 1.0.0
 * @requires node:fs
 * @requires node:path
 * @requires node:os
 * @see {@link module:mcp/tools/core-calculation} Core calculation tools
 * @see {@link module:mcp/tools/naughty-list} Naughty list tools
 * @see {@link module:types} MCP type definitions
 * @example
 * // Register all tools with MCP server
 * await registerAllTools(server);
 *
 * // Get available tools for discovery
 * const tools = getAllToolSchemas();
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Import all core functions
import { 
  calculateFinalAmount, 
  parseArguments,
  formatOutput,
  getNaughtyListPath,
  isOnNaughtyList,
  addToNaughtyList,
  removeFromNaughtyList,
  listNaughtyList,
  searchNaughtyList,
  getBudgetPath,
  getBudgetStatus,
  addBudget,
  listBudgets,
  findLastGiftFromLog,
  findLastGiftForRecipientFromLog,
  formatMatchedGift,
  parseLogEntry,
  parseSpendingsArguments,
  calculateRelativeDate,
  getSpendingsBetweenDates,
  formatSpendingsOutput,
  validateDate,
  getToplistData,
  formatToplistOutput,
  getPersonConfigPath
} from '../core.js';

// Import server utilities
import { loadConfig, getConfigPath, getLogPath } from './server.js';

/**
 * Register all MCP tools with the provided server instance
 *
 * Registers all available gift-calc tools with the MCP server, including
 * both read-only and read-write tools with proper schema validation and
 * safety classification. This function serves as the central tool registry
 * for the MCP server implementation.
 *
 * Registered tools include:
 * - calculate_gift_amount: Core gift calculation (read-only)
 * - list_naughty_list: List people on naughty list (read-only)
 * - add_to_naughty_list: Add person to naughty list (read-write)
 * - remove_from_naughty_list: Remove person from naughty list (read-write)
 * - search_naughty_list: Search naughty list by prefix (read-only)
 * - check_naughty_list: Check if person is on naughty list (read-only)
 *
 * Each tool includes comprehensive JSON schema validation and proper
 * error handling to ensure safe operation when invoked by AI assistants.
 *
 * @param {MCPServer} server - MCP server instance to register tools with
 * @returns {void} Tools are registered synchronously
 * @throws {Error} When tool registration fails or server is invalid
 * @example
 * // Register all tools with MCP server
 * const server = new MCPServer();
 * registerAllTools(server);
 *
 * // Tools are now available for AI assistant invocation
 * const result = await server.invokeTool('calculate_gift_amount', {
 *   baseValue: 100,
 *   variation: 20,
 *   friendScore: 8,
 *   niceScore: 7,
 *   decimals: 2
 * });
 *
 * @since 1.0.0
 * @see {@link MCPServer} MCP server implementation
 * @see {@link module:types} MCP type definitions
 */
export function registerAllTools(server) {
  // Register core gift calculation tool
  server.registerTool('calculate_gift_amount', {
    description: 'Calculate gift amount with variation, friend score, and nice score influences',
    inputSchema: {
      type: 'object',
      properties: {
        baseValue: {
          type: 'number',
          description: 'Base value for gift calculation',
          minimum: 0
        },
        variation: {
          type: 'number',
          description: 'Variation percentage (0-100)',
          minimum: 0,
          maximum: 100
        },
        friendScore: {
          type: 'number',
          description: 'Friend score affecting gift amount bias (1-10)',
          minimum: 1,
          maximum: 10
        },
        niceScore: {
          type: 'number',
          description: 'Nice score affecting gift amount bias (0-10). 0=no gift, 1-3=fixed reductions',
          minimum: 0,
          maximum: 10
        },
        displayCurrency: {
          type: 'string',
          description: 'Display currency code for conversion (e.g., SEK, USD, EUR). If not provided, uses base currency.',
          default: null
        },
        decimals: {
          type: 'integer',
          description: 'Number of decimal places (0-10)',
          minimum: 0,
          maximum: 10,
          default: 2
        },
        recipientName: {
          type: 'string',
          description: 'Name of gift recipient (optional)'
        },
        useMaximum: {
          type: 'boolean',
          description: 'Force maximum amount (baseValue + 20%)',
          default: false
        },
        useMinimum: {
          type: 'boolean',
          description: 'Force minimum amount (baseValue - 20%)',
          default: false
        }
      },
      required: ['baseValue', 'variation', 'friendScore', 'niceScore']
    },
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
        notes = ' (on naughty list!)';
      } else {
        giftAmount = calculateFinalAmount(baseValue, variation, friendScore, niceScore, decimals, useMaximum, useMinimum);
      }

      // Use new async currency conversion formatting
      const baseCurrency = config.baseCurrency || config.currency || 'SEK';
      const { formatCurrencyOutput } = await import('../currency.js');
      const output = await formatCurrencyOutput(giftAmount, baseCurrency, displayCurrency, recipientName, decimals) + notes;

      return {
        content: [
          {
            type: 'text',
            text: output
          }
        ],
        isReadOnly: true
      };
    }
  });

  // Register match previous gift tool
  server.registerTool('match_previous_gift', {
    description: 'Match previous gift amount from calculation history. Can match by recipient name or get the last gift overall.',
    inputSchema: {
      type: 'object',
      properties: {
        recipientName: {
          type: 'string',
          description: 'Name of recipient to match previous gift for (optional). If not provided, matches last gift overall.'
        }
      }
    },
    handler: async (args) => {
      const { recipientName = null } = args;
      const logPath = getLogPath();
      
      let matchedGift;
      
      if (recipientName) {
        matchedGift = findLastGiftForRecipientFromLog(recipientName, logPath, fs);
        if (!matchedGift) {
          return {
            content: [
              {
                type: 'text',
                text: `No previous gift found for ${recipientName}`
              }
            ],
            isReadOnly: true
          };
        }
      } else {
        matchedGift = findLastGiftFromLog(logPath, fs);
        if (!matchedGift) {
          return {
            content: [
              {
                type: 'text',
                text: 'No previous gifts found in calculation history'
              }
            ],
            isReadOnly: true
          };
        }
      }
      
      const matchText = formatMatchedGift(matchedGift);
      const output = formatOutput(matchedGift.amount, matchedGift.currency, matchedGift.recipient);
      
      return {
        content: [
          {
            type: 'text',
            text: `${output}\n${matchText}`
          }
        ],
        isReadOnly: true
      };
    }
  });

  // Register check naughty list tool
  server.registerTool('check_naughty_list', {
    description: 'Check if a person is on the naughty list. Returns true if they are naughty, false if they are nice.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of person to check'
        }
      },
      required: ['name']
    },
    handler: async (args) => {
      const { name } = args;
      const naughtyListPath = getNaughtyListPath(path, os);
      const isNaughty = isOnNaughtyList(name, naughtyListPath, fs);
      
      return {
        content: [
          {
            type: 'text',
            text: `${name} is ${isNaughty ? 'on the naughty list 😈' : 'nice 😇'}`
          }
        ],
        isReadOnly: true
      };
    }
  });

  // Register get config tool
  server.registerTool('get_config', {
    description: 'Get current gift-calc configuration settings including base value, variation, base currency, and decimals.',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    handler: async (args) => {
      const config = loadConfig();
      
      // Provide defaults for missing config values
      const effectiveConfig = {
        baseValue: config.baseValue || 70,
        variation: config.variation || 20,
        baseCurrency: config.baseCurrency || config.currency || 'SEK',
        decimals: config.decimals !== undefined ? config.decimals : 2,
        friendScore: config.friendScore || 5,
        niceScore: config.niceScore || 5,
        ...config
      };
      
      const configText = Object.entries(effectiveConfig)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
      
      return {
        content: [
          {
            type: 'text',
            text: `Current gift-calc configuration:\n\n${configText}`
          }
        ],
        isReadOnly: true
      };
    }
  });

  // Register budget management tools
  server.registerTool('set_budget', {
    description: 'Add a new budget for gift spending tracking. Budgets cannot overlap in time.',
    inputSchema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Budget amount (must be positive)',
          minimum: 0.01
        },
        fromDate: {
          type: 'string',
          description: 'Budget start date in YYYY-MM-DD format',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$'
        },
        toDate: {
          type: 'string',
          description: 'Budget end date in YYYY-MM-DD format',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$'
        },
        description: {
          type: 'string',
          description: 'Budget description (optional)'
        }
      },
      required: ['amount', 'fromDate', 'toDate']
    },
    handler: async (args) => {
      const { amount, fromDate, toDate, description = '' } = args;
      const budgetPath = getBudgetPath(path, os);
      
      const result = addBudget(amount, fromDate, toDate, description, budgetPath, fs, path);
      
      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `✅ ${result.message}`
            }
          ],
          isReadOnly: false
        };
      } else {
        throw new Error(result.message);
      }
    }
  });

  server.registerTool('get_budget_status', {
    description: 'Get current active budget status showing spending progress and remaining amounts.',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    handler: async (args) => {
      const budgetPath = getBudgetPath(path, os);
      const status = getBudgetStatus(budgetPath, fs);
      
      if (!status.hasActiveBudget) {
        return {
          content: [
            {
              type: 'text',
              text: `📊 ${status.message}`
            }
          ],
          isReadOnly: true
        };
      }
      
      const budget = status.budget;
      const statusText = `📊 Active Budget: "${budget.description}"
💰 Amount: ${budget.totalAmount} (in base currency)
📅 Period: ${budget.fromDate} to ${budget.toDate}
⏰ Remaining: ${status.remainingDays} day${status.remainingDays === 1 ? '' : 's'}
📈 Total days: ${status.totalDays}`;
      
      return {
        content: [
          {
            type: 'text',
            text: statusText
          }
        ],
        isReadOnly: true
      };
    }
  });

  // Register naughty list management tools
  server.registerTool('add_to_naughty_list', {
    description: 'Add a person to the naughty list. People on the naughty list always get 0 gift amount.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of person to add to naughty list',
          minLength: 1
        }
      },
      required: ['name']
    },
    handler: async (args) => {
      const { name } = args;
      const naughtyListPath = getNaughtyListPath(path, os);
      
      const result = addToNaughtyList(name, naughtyListPath, fs, path);
      
      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `😈 ${result.message}`
            }
          ],
          isReadOnly: false
        };
      } else {
        if (result.existing) {
          return {
            content: [
              {
                type: 'text',
                text: `ℹ️ ${result.message}`
              }
            ],
            isReadOnly: false
          };
        } else {
          throw new Error(result.message);
        }
      }
    }
  });

  server.registerTool('remove_from_naughty_list', {
    description: 'Remove a person from the naughty list, allowing them to receive gifts again.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of person to remove from naughty list',
          minLength: 1
        }
      },
      required: ['name']
    },
    handler: async (args) => {
      const { name } = args;
      const naughtyListPath = getNaughtyListPath(path, os);
      
      const result = removeFromNaughtyList(name, naughtyListPath, fs, path);
      
      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `😇 ${result.message}`
            }
          ],
          isReadOnly: false
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `ℹ️ ${result.message}`
            }
          ],
          isReadOnly: false
        };
      }
    }
  });

  // Register init config tool (non-interactive version)
  server.registerTool('init_config', {
    description: 'Initialize or update gift-calc configuration with specified values. Creates config file with provided settings.',
    inputSchema: {
      type: 'object',
      properties: {
        baseValue: {
          type: 'number',
          description: 'Default base value for gift calculations',
          minimum: 0,
          default: 70
        },
        variation: {
          type: 'number',
          description: 'Default variation percentage (0-100)',
          minimum: 0,
          maximum: 100,
          default: 20
        },
        currency: {
          type: 'string',
          description: 'Default currency code (e.g., SEK, USD, EUR)',
          default: 'SEK'
        },
        decimals: {
          type: 'integer',
          description: 'Default number of decimal places (0-10)',
          minimum: 0,
          maximum: 10,
          default: 2
        }
      }
    },
    handler: async (args) => {
      const {
        baseValue = 70,
        variation = 20,
        baseCurrency = 'SEK',
        decimals = 2
      } = args;

      const configPath = getConfigPath();
      const configDir = path.dirname(configPath);

      // Ensure config directory exists
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Create configuration object
      const config = {
        baseValue,
        variation,
        baseCurrency,
        decimals
      };

      try {
        // Write config file
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        const configText = Object.entries(config)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `✅ Configuration saved to ${configPath}\n\nConfiguration:\n${configText}`
            }
          ],
          isReadOnly: false
        };
      } catch (error) {
        throw new Error(`Failed to save configuration: ${error.message}`);
      }
    }
  });

  // Register calculation history tool
  server.registerTool('get_calculation_history', {
    description: 'Get recent gift calculation history from the log file. Shows the last gift calculations with details.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          description: 'Maximum number of recent entries to return (1-50)',
          minimum: 1,
          maximum: 50,
          default: 10
        },
        recipientFilter: {
          type: 'string',
          description: 'Filter results to only show gifts for this recipient (optional)'
        }
      }
    },
    handler: async (args) => {
      const { limit = 10, recipientFilter = null } = args;
      const logPath = getLogPath();

      // Check if log file exists
      if (!fs.existsSync(logPath)) {
        return {
          content: [
            {
              type: 'text',
              text: '📝 No calculation history found. The log file will be created after the first gift calculation.'
            }
          ],
          isReadOnly: true
        };
      }

      let logContent;
      try {
        logContent = fs.readFileSync(logPath, 'utf8');
      } catch (error) {
        throw new Error(`Could not read log file: ${error.message}`);
      }

      const lines = logContent.split('\n').filter(line => line.trim());
      const entries = [];

      // Parse entries from most recent backwards
      for (let i = lines.length - 1; i >= 0 && entries.length < limit; i--) {
        const entry = parseLogEntry(lines[i]);
        if (entry) {
          // Apply recipient filter if specified
          if (recipientFilter) {
            if (entry.recipient && entry.recipient.toLowerCase().includes(recipientFilter.toLowerCase())) {
              entries.push(entry);
            }
          } else {
            entries.push(entry);
          }
        }
      }

      if (entries.length === 0) {
        const filterText = recipientFilter ? ` for "${recipientFilter}"` : '';
        return {
          content: [
            {
              type: 'text',
              text: `📝 No calculation history found${filterText}.`
            }
          ],
          isReadOnly: true
        };
      }

      // Format entries for display
      const historyText = entries.map((entry, index) => {
        const date = entry.timestamp.toLocaleDateString();
        const time = entry.timestamp.toLocaleTimeString();
        const recipientText = entry.recipient ? ` for ${entry.recipient}` : '';
        
        return `${index + 1}. ${entry.amount} ${entry.currency}${recipientText} (${date} ${time})`;
      }).join('\n');

      const totalText = recipientFilter ? ` matching "${recipientFilter}"` : '';
      
      return {
        content: [
          {
            type: 'text',
            text: `📝 Recent Gift Calculation History (${entries.length} entries${totalText}):\n\n${historyText}`
          }
        ],
        isReadOnly: true
      };
    }
  });

  // Register spending tracking tool
  server.registerTool('get_spendings', {
    description: 'Get spending analysis for specified time periods with multi-currency support',
    inputSchema: {
      type: 'object',
      properties: {
        fromDate: {
          type: 'string',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          description: 'Start date in YYYY-MM-DD format'
        },
        toDate: {
          type: 'string', 
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          description: 'End date in YYYY-MM-DD format'
        },
        days: {
          type: 'integer',
          minimum: 1,
          maximum: 3650,
          description: 'Number of days from today (mutually exclusive with fromDate/toDate)'
        },
        weeks: {
          type: 'integer',
          minimum: 1,
          maximum: 520,
          description: 'Number of weeks from today'
        },
        months: {
          type: 'integer', 
          minimum: 1,
          maximum: 120,
          description: 'Number of months from today'
        },
        years: {
          type: 'integer',
          minimum: 1,
          maximum: 10,
          description: 'Number of years from today'
        },
        format: {
          type: 'string',
          enum: ['detailed', 'summary'],
          default: 'detailed',
          description: 'Output format: detailed shows all transactions, summary shows totals only'
        }
      },
      anyOf: [
        { required: ['fromDate', 'toDate'] },
        { required: ['days'] },
        { required: ['weeks'] }, 
        { required: ['months'] },
        { required: ['years'] }
      ]
    },
    handler: async (args) => {
      const {
        fromDate = null,
        toDate = null,
        days = null,
        weeks = null,
        months = null,
        years = null,
        format = 'detailed'
      } = args;

      // Validate argument combinations using core logic
      const argsArray = [];
      if (fromDate) argsArray.push('--from', fromDate);
      if (toDate) argsArray.push('--to', toDate);
      if (days) argsArray.push('--days', days.toString());
      if (weeks) argsArray.push('--weeks', weeks.toString());
      if (months) argsArray.push('--months', months.toString());
      if (years) argsArray.push('--years', years.toString());

      const config = parseSpendingsArguments(argsArray);
      if (!config.success) {
        throw new Error(config.error);
      }

      // Get actual date range
      let actualFromDate, actualToDate;
      if (config.fromDate && config.toDate) {
        actualFromDate = config.fromDate;
        actualToDate = config.toDate;
      } else {
        // Calculate relative dates using mapping approach
        const timeUnits = ['days', 'weeks', 'months', 'years'];
        const [timeUnit, timeValue] = timeUnits
          .map(unit => [unit, config[unit]])
          .find(([, value]) => value !== undefined) || [];
        
        actualFromDate = calculateRelativeDate(timeUnit, timeValue);
        const today = new Date();
        actualToDate = today.toISOString().split('T')[0];
      }

      // Validate dates
      const fromValidation = validateDate(actualFromDate);
      if (!fromValidation.valid) {
        throw new Error(`Invalid from date: ${fromValidation.error}`);
      }
      
      const toValidation = validateDate(actualToDate);
      if (!toValidation.valid) {
        throw new Error(`Invalid to date: ${toValidation.error}`);
      }

      // Check date order
      if (fromValidation.date > toValidation.date) {
        throw new Error('From date must be before or equal to to date');
      }

      // Get spending data
      const logPath = getLogPath();
      const spendingsData = getSpendingsBetweenDates(logPath, actualFromDate, actualToDate, fs);

      // Format output
      if (format === 'summary') {
        if (spendingsData.errorMessage) {
          return {
            content: [
              {
                type: 'text',
                text: `📊 Spending Summary (${actualFromDate} to ${actualToDate})\n💰 No data found for the specified period`
              }
            ],
            isReadOnly: true
          };
        }

        // Create summary output
        const currencies = Object.keys(spendingsData.currencyTotals);
        let summary = `📊 Spending Summary (${actualFromDate} to ${actualToDate})\n💰 `;
        
        if (currencies.length === 0) {
          summary += 'No spending data found';
        } else if (currencies.length === 1) {
          const currency = currencies[0];
          const total = spendingsData.currencyTotals[currency];
          summary += `Total: ${total} ${currency}`;
        } else {
          summary += 'Total: ';
          const totals = currencies.map(currency => 
            `${spendingsData.currencyTotals[currency]} ${currency}`
          ).join(' | ');
          summary += totals;
        }

        // Add transaction count
        if (spendingsData.entries.length > 0) {
          summary += `\n📈 ${spendingsData.entries.length} gift${spendingsData.entries.length === 1 ? '' : 's'} across ${currencies.length} currency${currencies.length === 1 ? '' : 'ies'}`;
        }

        return {
          content: [
            {
              type: 'text',
              text: summary
            }
          ],
          isReadOnly: true
        };
      } else {
        // Detailed format
        let output = `📊 Spending Analysis (${actualFromDate} to ${actualToDate})\n\n`;
        
        if (spendingsData.errorMessage) {
          output += spendingsData.errorMessage;
        } else {
          // Add currency totals
          const currencies = Object.keys(spendingsData.currencyTotals);
          if (currencies.length > 0) {
            output += '💰 Total Spending:\n';
            for (const currency of currencies.sort()) {
              const total = spendingsData.currencyTotals[currency];
              output += `  ${total} ${currency}\n`;
            }
            output += '\n';
          }

          // Add transaction details if we have data
          if (spendingsData.entries.length > 0) {
            output += '📝 Transaction Details:\n';
            
            // Group by currency for display
            const entriesByCurrency = {};
            for (const entry of spendingsData.entries) {
              if (!entriesByCurrency[entry.currency]) {
                entriesByCurrency[entry.currency] = [];
              }
              entriesByCurrency[entry.currency].push(entry);
            }

            // Display entries grouped by currency
            for (const currency of currencies.sort()) {
              if (currencies.length > 1) {
                output += `${currency}:\n`;
              }
              for (const entry of entriesByCurrency[currency]) {
                const date = entry.timestamp.toISOString().split('T')[0];
                const recipientPart = entry.recipient ? ` for ${entry.recipient}` : '';
                output += `${date}  ${entry.amount} ${currency}${recipientPart}\n`;
              }
              if (currencies.length > 1) {
                output += '\n';
              }
            }
          } else {
            output += '📝 No transactions found for the specified period';
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: output.trim()
            }
          ],
          isReadOnly: true
        };
      }
    }
  });

  // Register toplist tool for ranking persons
  server.registerTool('toplist_persons', {
    description: 'Get ranked list of persons by total gifts received, nice score, friend score, or gift count with optional currency filtering',
    inputSchema: {
      type: 'object',
      properties: {
        sortBy: {
          type: 'string',
          enum: ['total', 'nice-score', 'friend-score', 'gift-count'],
          default: 'total',
          description: 'Sort criteria: total (gift amount), nice-score, friend-score, or gift-count'
        },
        length: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 10,
          description: 'Number of results to show (default: 10)'
        },
        currency: {
          type: 'string',
          description: 'Filter by specific currency (e.g., SEK, USD, EUR). If not specified, shows all currencies.'
        },
        listCurrencies: {
          type: 'boolean',
          default: false,
          description: 'If true, returns list of available currencies instead of toplist'
        }
      }
    },
    handler: async (args) => {
      const { sortBy = 'total', length = 10, currency = null, listCurrencies = false } = args;

      // Note: currency parameter is kept for backward compatibility but simplified toplist doesn't use it

      // Get file paths
      const personConfigPath = getPersonConfigPath(path, os);
      const logPath = getLogPath();

      // Get toplist data (simplified for base currency)
      const toplistData = getToplistData(personConfigPath, logPath, fs);

      if (toplistData.errorMessage) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Error: ${toplistData.errorMessage}`
            }
          ],
          isReadOnly: true
        };
      }

      // Handle list currencies request
      if (listCurrencies) {
        if (toplistData.currencies.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: '💱 No currencies found in gift history.'
              }
            ],
            isReadOnly: true
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `💱 Available currencies: ${toplistData.currencies.join(', ')}`
              }
            ],
            isReadOnly: true
          };
        }
      }

      // Validate currency filter if specified
      if (currency && toplistData.currencies.length > 0 && !toplistData.currencies.includes(currency)) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Currency '${currency}' not found. Available currencies: ${toplistData.currencies.join(', ')}`
            }
          ],
          isReadOnly: true
        };
      }

      // Format output
      const output = formatToplistOutput(
        toplistData.persons,
        sortBy,
        length,
        toplistData.currencies,
        currency
      );

      return {
        content: [
          {
            type: 'text',
            text: `🏆 ${output}`
          }
        ],
        isReadOnly: true
      };
    }
  });
}