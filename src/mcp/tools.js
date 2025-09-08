/**
 * MCP Tool Definitions
 * These tools reuse existing gift-calc core functions following KISS principles
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
  parseLogEntry
} from '../core.js';

// Import server utilities
import { loadConfig, getConfigPath, getLogPath } from './server.js';

/**
 * Register all MCP tools with the provided server instance
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
        currency: {
          type: 'string',
          description: 'Currency code (e.g., SEK, USD, EUR)',
          default: 'SEK'
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
        currency = config.currency || 'SEK',
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

      const output = formatOutput(giftAmount, currency, recipientName) + notes;

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
    description: 'Get current gift-calc configuration settings including base value, variation, currency, and decimals.',
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
        currency: config.currency || 'SEK',
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
💰 Amount: ${budget.totalAmount} (currency from config)
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
        currency = 'SEK',
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
        currency,
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
}