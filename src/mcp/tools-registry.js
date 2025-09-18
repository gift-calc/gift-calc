/**
 * Modular MCP Tools Registry
 * Demonstrates the new domain-driven MCP tools architecture
 * Replaces the monolithic tools.js with focused domain modules
 */

// Import domain-specific tool registrations
import { registerNaughtyListTools } from './tools/naughty-list.js';
import { registerCoreCalculationTools } from './tools/core-calculation.js';

// Future domain tool imports would go here:
// import { registerBudgetTools } from './tools/budget.js';
// import { registerSpendingsTools } from './tools/spendings.js';
// import { registerPersonTools } from './tools/person.js';
// import { registerToplistTools } from './tools/toplist.js';
// import { registerConfigTools } from './tools/config.js';

/**
 * Register all MCP tools with the provided server instance
 * @param {Object} server - MCP server instance
 */
export function registerAllTools(server) {
  // Register tools by domain for better organization
  registerCoreCalculationTools(server);
  registerNaughtyListTools(server);

  // Future registrations would follow the same pattern:
  // registerBudgetTools(server);
  // registerSpendingsTools(server);
  // registerPersonTools(server);
  // registerToplistTools(server);
  // registerConfigTools(server);

  console.log('All MCP tools registered successfully with modular architecture');
}