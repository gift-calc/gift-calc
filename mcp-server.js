#!/usr/bin/env node

/**
 * MCP (Model Context Protocol) Server for gift-calc
 * Enables gift-calc to be used directly from LLMs and AI assistants
 * 
 * Protocol: JSON-RPC 2.0 over STDIO transport
 * Version: 2025-06-18 MCP specification
 * 
 * This server reuses all existing logic from src/core.js following KISS principles
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createReadLine } from 'node:readline';

// Import all the core gift-calc functions
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
  formatMatchedGift
} from './src/core.js';

// MCP Server Configuration
const SERVER_INFO = {
  name: "gift-calc-mcp",
  version: "1.0.0",
  protocolVersion: "2025-06-18"
};

// Server capabilities
const SERVER_CAPABILITIES = {
  tools: {} // We provide tools capability
};

// Registered tools storage
const registeredTools = new Map();

// Utility functions for config and logging
function getConfigPath() {
  const configDir = path.join(os.homedir(), '.config', 'gift-calc');
  return path.join(configDir, '.config.json');
}

function getLogPath() {
  return path.join(os.homedir(), '.config', 'gift-calc', 'gift-calc.log');
}

function loadConfig() {
  const config = {};
  const configPath = getConfigPath();
  
  if (fs.existsSync(configPath)) {
    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      Object.assign(config, JSON.parse(configData));
    } catch (error) {
      // Silent fallback to defaults
    }
  }
  
  return config;
}

/**
 * JSON-RPC 2.0 Message Handler
 */
class MCPServer {
  constructor() {
    this.initialized = false;
    this.setupStdio();
  }

  setupStdio() {
    // Set up stdin to read JSON-RPC messages
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (data) => {
      const lines = data.toString().trim().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          this.handleMessage(line.trim());
        }
      }
    });

    // Handle process termination
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  /**
   * Handle incoming JSON-RPC message
   */
  async handleMessage(messageStr) {
    try {
      const message = JSON.parse(messageStr);
      
      // Validate JSON-RPC 2.0 format
      if (message.jsonrpc !== '2.0') {
        this.sendError(message.id, -32600, 'Invalid Request: jsonrpc must be "2.0"');
        return;
      }

      // Handle different message types
      if (message.method) {
        if (message.id !== undefined) {
          // Request - needs response
          await this.handleRequest(message);
        } else {
          // Notification - no response needed
          await this.handleNotification(message);
        }
      } else if (message.result !== undefined || message.error !== undefined) {
        // Response - we don't expect these as a server, log for debugging
        this.logDebug('Received unexpected response message', message);
      }
    } catch (error) {
      // Invalid JSON
      this.sendError(null, -32700, 'Parse error', { error: error.message });
    }
  }

  /**
   * Handle JSON-RPC request (requires response)
   */
  async handleRequest(message) {
    const { id, method, params = {} } = message;

    try {
      switch (method) {
        case 'initialize':
          await this.handleInitialize(id, params);
          break;

        case 'tools/list':
          await this.handleToolsList(id, params);
          break;

        case 'tools/call':
          await this.handleToolsCall(id, params);
          break;

        default:
          this.sendError(id, -32601, `Method not found: ${method}`);
      }
    } catch (error) {
      this.sendError(id, -32603, 'Internal error', { 
        error: error.message,
        stack: error.stack 
      });
    }
  }

  /**
   * Handle JSON-RPC notification (no response)
   */
  async handleNotification(message) {
    const { method, params = {} } = message;

    try {
      switch (method) {
        case 'initialized':
          this.handleInitialized(params);
          break;

        default:
          this.logDebug(`Unknown notification method: ${method}`);
      }
    } catch (error) {
      this.logDebug(`Error handling notification ${method}:`, error);
    }
  }

  /**
   * Handle initialize request
   */
  async handleInitialize(id, params) {
    const { protocolVersion, capabilities = {}, clientInfo = {} } = params;

    // Validate protocol version
    if (protocolVersion !== SERVER_INFO.protocolVersion) {
      this.sendError(id, -32602, 
        `Unsupported protocol version: ${protocolVersion}. Expected: ${SERVER_INFO.protocolVersion}`);
      return;
    }

    // Send successful initialization response
    this.sendResponse(id, {
      protocolVersion: SERVER_INFO.protocolVersion,
      capabilities: SERVER_CAPABILITIES,
      serverInfo: {
        name: SERVER_INFO.name,
        version: SERVER_INFO.version
      }
    });

    this.logDebug(`Initialized with client: ${clientInfo.name || 'unknown'}`);
  }

  /**
   * Handle initialized notification
   */
  handleInitialized(params) {
    this.initialized = true;
    this.logDebug('Server initialization completed');
  }

  /**
   * Handle tools/list request
   */
  async handleToolsList(id, params) {
    const tools = Array.from(registeredTools.values());
    this.sendResponse(id, { tools });
  }

  /**
   * Handle tools/call request
   */
  async handleToolsCall(id, params) {
    const { name, arguments: toolArgs = {} } = params;

    if (!registeredTools.has(name)) {
      this.sendError(id, -32602, `Tool not found: ${name}`);
      return;
    }

    const tool = registeredTools.get(name);

    try {
      // Validate arguments against schema if provided
      if (tool.inputSchema) {
        this.validateToolArguments(toolArgs, tool.inputSchema);
      }

      // Execute the tool
      const result = await tool.handler(toolArgs);
      this.sendResponse(id, result);

    } catch (error) {
      this.sendError(id, -32603, `Tool execution error: ${error.message}`, {
        tool: name,
        error: error.message
      });
    }
  }

  /**
   * Basic JSON Schema validation for tool arguments
   */
  validateToolArguments(args, schema) {
    if (schema.type === 'object' && schema.required) {
      for (const field of schema.required) {
        if (args[field] === undefined || args[field] === null) {
          throw new Error(`Required field '${field}' is missing`);
        }
      }
    }
  }

  /**
   * Register a tool with the MCP server
   */
  registerTool(name, toolDefinition) {
    registeredTools.set(name, {
      name,
      description: toolDefinition.description,
      inputSchema: toolDefinition.inputSchema,
      handler: toolDefinition.handler
    });
  }

  /**
   * Send JSON-RPC response
   */
  sendResponse(id, result) {
    const response = {
      jsonrpc: '2.0',
      id,
      result
    };
    this.sendMessage(response);
  }

  /**
   * Send JSON-RPC error
   */
  sendError(id, code, message, data = null) {
    const response = {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        ...(data && { data })
      }
    };
    this.sendMessage(response);
  }

  /**
   * Send message to stdout
   */
  sendMessage(message) {
    const messageStr = JSON.stringify(message);
    process.stdout.write(messageStr + '\n');
  }

  /**
   * Log debug messages to stderr
   */
  logDebug(...args) {
    console.error('[MCP DEBUG]', ...args);
  }

  /**
   * Shutdown server gracefully
   */
  shutdown() {
    this.logDebug('Server shutting down');
    process.exit(0);
  }
}

/**
 * Tool Definitions
 * These tools reuse existing gift-calc core functions
 */

// Create server instance
const server = new MCPServer();

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

// Start the server
server.logDebug('gift-calc MCP server starting...');
server.logDebug(`Protocol version: ${SERVER_INFO.protocolVersion}`);
server.logDebug(`Tools registered: ${registeredTools.size}`);