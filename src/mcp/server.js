/**
 * @fileoverview MCP (Model Context Protocol) Server implementation
 *
 * Core MCP server that provides AI assistants with safe access to gift-calc
 * functionality through standardized JSON-RPC 2.0 protocol over STDIO transport.
 * Implements the 2025-06-18 MCP specification with full protocol compliance.
 *
 * Key features:
 * - JSON-RPC 2.0 protocol handling with proper error responses
 * - STDIO transport for secure AI assistant communication
 * - Tool registration and schema validation
 * - Read-only and read-write tool categorization for safety
 * - Comprehensive error handling and logging
 * - Session management and cleanup
 *
 * The server exposes gift-calc functionality as MCP tools that AI assistants
 * can safely invoke, enabling natural language interaction with the gift
 * calculation system while maintaining security boundaries.
 *
 * @module mcp/server
 * @version 1.0.0
 * @requires node:fs
 * @requires node:path
 * @requires node:process
 * @see {@link module:mcp/tools} Tool implementations
 * @see {@link module:mcp/protocol} Protocol utilities
 * @see {@link module:types} MCP type definitions
 * @example
 * // Start MCP server (typically called from bin/mcp-server.js)
 * const server = new MCPServer();
 * await server.start();
 *
 * Protocol: JSON-RPC 2.0 over STDIO transport
 * Version: 2025-06-18 MCP specification
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { validateToolArguments as validateToolArgumentsProtocol } from './protocol.js';

// MCP Server Configuration
export const SERVER_INFO = {
  name: "gift-calc-mcp",
  version: "1.0.0",
  protocolVersion: "2025-06-18"
};

// Server capabilities
export const SERVER_CAPABILITIES = {
  tools: {} // We provide tools capability
};

// Registered tools storage
const registeredTools = new Map();

// Helper functions
export function getConfigPath() {
  // Use process.env.HOME if available (important for tests), otherwise fall back to os.homedir()
  const homeDir = process.env.HOME || os.homedir();
  const configDir = path.join(homeDir, '.config', 'gift-calc');
  return path.join(configDir, '.config.json');
}

export function getLogPath() {
  // Use process.env.HOME if available (important for tests), otherwise fall back to os.homedir()
  const homeDir = process.env.HOME || os.homedir();
  return path.join(homeDir, '.config', 'gift-calc', 'gift-calc.log');
}

export function loadConfig() {
  const config = {};
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      Object.assign(config, configData);
    }
  } catch (error) {
    // If config is corrupted, fall back to defaults
  }
  
  return config;
}

/**
 * JSON-RPC 2.0 Message Handler
 */
export class MCPServer {
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
      } else {
        this.sendError(message.id, -32600, 'Invalid Request: missing method or result/error');
      }
    } catch (error) {
      this.sendError(null, -32700, 'Parse error: Invalid JSON', error.message);
    }
  }

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
          this.sendError(id, -32601, `Method '${method}' not found`);
      }
    } catch (error) {
      this.sendError(id, -32603, 'Internal error', error.message);
    }
  }

  async handleNotification(message) {
    const { method, params = {} } = message;

    try {
      switch (method) {
        case 'initialized':
          this.handleInitialized(params);
          break;
        default:
          // Notifications that we don't recognize are silently ignored
          this.logDebug(`Unknown notification method: ${method}`);
      }
    } catch (error) {
      this.logDebug(`Error handling notification ${method}:`, error.message);
    }
  }

  async handleInitialize(id, params) {
    const { protocolVersion, capabilities = {} } = params;

    if (protocolVersion !== SERVER_INFO.protocolVersion) {
      this.sendError(id, -32602, `Unsupported protocol version: ${protocolVersion}. Expected: ${SERVER_INFO.protocolVersion}`);
      return;
    }

    // Store client capabilities for future use if needed
    this.clientCapabilities = capabilities;

    this.sendResponse(id, {
      protocolVersion: SERVER_INFO.protocolVersion,
      capabilities: SERVER_CAPABILITIES,
      serverInfo: {
        name: SERVER_INFO.name,
        version: SERVER_INFO.version
      }
    });
  }

  handleInitialized(params) {
    this.initialized = true;
    this.logDebug('MCP server initialized');
  }

  async handleToolsList(id, params) {
    const tools = Array.from(registeredTools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));
    
    this.sendResponse(id, { tools });
  }

  async handleToolsCall(id, params) {
    const { name, arguments: args = {} } = params;

    const tool = registeredTools.get(name);
    if (!tool) {
      this.sendError(id, -32602, `Tool '${name}' not found`);
      return;
    }

    // Validate arguments against schema
    if (tool.inputSchema) {
      const validation = this.validateToolArgumentsLocal(args, tool.inputSchema);
      if (!validation.isValid) {
        this.sendError(id, -32602, `Invalid arguments: ${validation.error}`);
        return;
      }
    }

    try {
      const result = await tool.handler(args);
      this.sendResponse(id, result);
    } catch (error) {
      this.sendError(id, -32603, `Tool execution failed: ${error.message}`);
    }
  }

  validateToolArgumentsLocal(args, schema) {
    return validateToolArgumentsProtocol(args, schema);
  }

  registerTool(name, toolDefinition) {
    registeredTools.set(name, {
      name,
      description: toolDefinition.description,
      inputSchema: toolDefinition.inputSchema,
      handler: toolDefinition.handler
    });
  }

  /**
   * Execute a tool directly (for testing purposes)
   */
  async executeTool(toolName, args) {
    const tool = registeredTools.get(toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found`);
    }

    // Validate arguments if schema is provided
    if (tool.inputSchema) {
      const validation = validateToolArgumentsProtocol(args, tool.inputSchema);
      if (!validation.isValid) {
        throw new Error(`Invalid arguments: ${validation.error}`);
      }
    }

    // Execute the tool handler
    return await tool.handler(args);
  }

  sendResponse(id, result) {
    const response = {
      jsonrpc: '2.0',
      id,
      result
    };
    
    this.sendMessage(response);
  }

  sendError(id, code, message, data = null) {
    const response = {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message
      }
    };
    
    if (data !== null) {
      response.error.data = data;
    }
    
    this.sendMessage(response);
  }

  sendMessage(message) {
    const jsonStr = JSON.stringify(message);
    process.stdout.write(jsonStr + '\n');
  }

  logDebug(...args) {
    // Debug messages go to stderr so they don't interfere with STDIO transport
    console.error('[DEBUG]', ...args);
  }

  shutdown() {
    this.logDebug('Server shutting down');
    process.exit(0);
  }
}