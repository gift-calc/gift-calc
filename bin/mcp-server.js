#!/usr/bin/env node

/**
 * @fileoverview MCP (Model Context Protocol) Server entry point
 *
 * Main executable that starts the gift-calc MCP server, enabling AI assistants
 * and LLMs to interact with gift-calc functionality through the standardized
 * Model Context Protocol over STDIO transport.
 *
 * This binary orchestrates the modular MCP implementation, initializing the
 * server with proper tool registration, protocol handling, and safety measures.
 * It serves as the bridge between AI assistants and the gift-calc application.
 *
 * Key responsibilities:
 * - Initialize and start the MCP server
 * - Register all available tools with proper schemas
 * - Handle graceful shutdown and cleanup
 * - Provide proper error handling and logging
 * - Ensure protocol compliance with MCP 2025-06-18 specification
 *
 * @module bin/mcp-server
 * @version 1.0.0
 * @requires node:process
 * @see {@link module:mcp/server} Core MCP server implementation
 * @see {@link module:mcp/tools} Available MCP tools
 * @example
 * // Start the MCP server (typically called by AI assistant)
 * $ node bin/mcp-server.js
 *
 * // Or installed globally as:
 * $ gift-calc-mcp
 *
 * @exitcode {0} Success - server started and running
 * @exitcode {1} Error - server initialization failed
 */

import { MCPServer, SERVER_INFO } from '../src/mcp/server.js';
import { registerAllTools } from '../src/mcp/tools.js';

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