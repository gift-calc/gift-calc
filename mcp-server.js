#!/usr/bin/env node

/**
 * MCP (Model Context Protocol) Server for gift-calc
 * Enables gift-calc to be used directly from LLMs and AI assistants
 * 
 * This is the main entry point that orchestrates the modular MCP implementation
 */

import { MCPServer, SERVER_INFO } from './src/mcp/server.js';
import { registerAllTools } from './src/mcp/tools.js';

/**
 * Initialize and start the MCP server
 */
function startServer() {
  // Create server instance
  const server = new MCPServer();

  // Register all tools
  registerAllTools(server);

  // Log startup information
  server.logDebug('gift-calc MCP server starting...');
  server.logDebug(`Protocol version: ${SERVER_INFO.protocolVersion}`);
  server.logDebug('Server ready for MCP connections via STDIO');

  return server;
}

// Start the server
const server = startServer();