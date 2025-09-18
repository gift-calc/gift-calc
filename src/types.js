/**
 * @fileoverview Type definitions for gift-calc CLI application
 *
 * This file contains comprehensive JSDoc type definitions for all major
 * data structures used throughout the gift-calc application. These types
 * support the modular architecture with domain separation and provide
 * clear contracts for all functions and modules.
 *
 * @module types
 * @version 1.0.0
 * @author gift-calc team
 */

/**
 * Exit codes used throughout the CLI application
 * @constant {Object} EXIT_CODES
 * @property {number} SUCCESS - Command completed successfully (0)
 * @property {number} ERROR - General error condition (1)
 * @property {number} VALIDATION_ERROR - Input validation failed (1)
 * @property {number} FILE_ERROR - File system operation failed (1)
 * @property {number} NETWORK_ERROR - Currency conversion network error (1)
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  ERROR: 1,
  VALIDATION_ERROR: 1,
  FILE_ERROR: 1,
  NETWORK_ERROR: 1
};

/**
 * Main configuration object for gift calculations
 * Configuration Loading Priority (highest to lowest):
 * 1. CLI arguments (--basevalue, --currency, etc.)
 * 2. Person-specific config file (~/.config/gift-calc/person-config.json)
 * 3. Global config file (~/.config/gift-calc/.config.json)
 * 4. Environment variables (GIFT_CALC_*)
 * 5. Built-in defaults
 *
 * @typedef {Object} GiftConfig
 * @property {number} baseValue - Base gift amount (must be positive, default: 70)
 * @property {number} variation - Variation percentage (0-100, default: 20)
 * @property {number} friendScore - Friend score affecting bias (1-10, default: 5)
 * @property {number} niceScore - Nice score affecting calculation (0-10, default: 5, 0=no gift)
 * @property {string} baseCurrency - Base currency code (e.g., 'SEK', 'USD', 'EUR')
 * @property {string|null} displayCurrency - Display currency for conversion (null = use baseCurrency)
 * @property {string} currency - Backwards compatibility alias for baseCurrency
 * @property {number} decimals - Decimal places for rounding (0-10, default: 2)
 * @property {string|null} recipientName - Gift recipient name
 * @property {boolean} logToFile - Enable file logging (default: true)
 * @property {boolean} copyToClipboard - Copy result to clipboard (default: false)
 * @property {boolean} showHelp - Show help message (default: false)
 * @property {boolean} useMaximum - Force maximum amount (baseValue * 1.2)
 * @property {boolean} useMinimum - Force minimum amount (baseValue * 0.8)
 * @property {string|null} command - CLI command being executed
 * @property {boolean} matchPreviousGift - Match previous gift amount (default: false)
 * @property {string|null} matchRecipientName - Recipient name for matching
 * @property {boolean} dryRun - Preview mode without logging (default: false)
 */

/**
 * Result of CLI argument parsing
 * @typedef {Object} ParsedArguments
 * @property {GiftConfig} config - Parsed configuration object
 * @property {string[]} errors - Array of validation error messages
 * @property {boolean} valid - Whether parsing was successful
 * @property {string|null} helpText - Help text to display (if requested)
 */

/**
 * Entry in the naughty list with metadata
 * @typedef {Object} NaughtyListEntry
 * @property {string} name - Person's name (trimmed, case-sensitive storage)
 * @property {string} addedAt - ISO timestamp when added to list
 */

/**
 * Configuration for naughty list operations
 * @typedef {Object} NaughtyListConfig
 * @property {string} command - Always 'naughty-list'
 * @property {('add'|'remove'|'list'|'search'|null)} action - Action to perform
 * @property {string|null} name - Name for add/remove operations
 * @property {string|null} searchTerm - Search term for search operations
 * @property {boolean} remove - Flag indicating remove operation
 * @property {boolean} success - Whether configuration parsing succeeded
 * @property {string|null} error - Error message if parsing failed
 */

/**
 * Result of naughty list operations
 * @typedef {Object} NaughtyListResult
 * @property {boolean} success - Whether operation succeeded
 * @property {string} message - Human-readable result message
 * @property {boolean} [existing] - Whether entry already existed (for add operations)
 * @property {boolean} [found] - Whether entry was found (for remove operations)
 * @property {boolean} [added] - Whether entry was successfully added
 * @property {boolean} [removed] - Whether entry was successfully removed
 * @property {NaughtyListEntry} [entry] - The entry that was added/removed
 * @property {NaughtyListEntry} [existingEntry] - Existing entry (for duplicate adds)
 */

/**
 * Budget entry for tracking spending
 * @typedef {Object} BudgetEntry
 * @property {string} id - Unique budget identifier
 * @property {number} amount - Budget amount
 * @property {string} startDate - Start date (ISO format)
 * @property {string} endDate - End date (ISO format)
 * @property {string} description - Budget description
 * @property {number} spent - Amount already spent
 * @property {string} createdAt - Creation timestamp (ISO format)
 * @property {string} updatedAt - Last update timestamp (ISO format)
 */

/**
 * Budget operation configuration
 * @typedef {Object} BudgetConfig
 * @property {string} command - Always 'budget'
 * @property {('add'|'remove'|'list'|'status'|null)} action - Budget action
 * @property {number} [amount] - Budget amount for add operations
 * @property {string} [startDate] - Start date for add operations
 * @property {string} [endDate] - End date for add operations
 * @property {string} [description] - Budget description
 * @property {string} [budgetId] - Budget ID for remove operations
 * @property {boolean} success - Whether parsing succeeded
 * @property {string|null} error - Error message if parsing failed
 */

/**
 * Person-specific configuration override
 * @typedef {Object} PersonConfig
 * @property {string} name - Person's name
 * @property {number} [baseValue] - Override base value
 * @property {number} [niceScore] - Override nice score
 * @property {number} [friendScore] - Override friend score
 * @property {string} [currency] - Override currency
 * @property {string} createdAt - Creation timestamp (ISO format)
 * @property {string} updatedAt - Last update timestamp (ISO format)
 */

/**
 * Person command configuration
 * @typedef {Object} PersonCommandConfig
 * @property {string} command - Always 'person'
 * @property {('add'|'remove'|'list'|'update'|null)} action - Person action
 * @property {string|null} name - Person name
 * @property {PersonConfig} [config] - Person configuration
 * @property {boolean} success - Whether parsing succeeded
 * @property {string|null} error - Error message if parsing failed
 */

/**
 * Currency conversion data
 * @typedef {Object} CurrencyConversion
 * @property {string} from - Source currency code
 * @property {string} to - Target currency code
 * @property {number} rate - Exchange rate
 * @property {string} timestamp - Rate timestamp (ISO format)
 * @property {boolean} cached - Whether rate was retrieved from cache
 */

/**
 * Currency conversion result
 * @typedef {Object} CurrencyResult
 * @property {number} amount - Converted amount
 * @property {string} currency - Target currency code
 * @property {CurrencyConversion} conversion - Conversion metadata
 * @property {boolean} success - Whether conversion succeeded
 * @property {string|null} error - Error message if conversion failed
 */

/**
 * Log entry for gift calculations
 * @typedef {Object} LogEntry
 * @property {string} timestamp - Log timestamp (ISO format)
 * @property {string|null} recipientName - Recipient name
 * @property {number} baseValue - Base amount used
 * @property {number} variation - Variation percentage used
 * @property {number} friendScore - Friend score used
 * @property {number} niceScore - Nice score used
 * @property {number} calculatedAmount - Final calculated amount
 * @property {string} baseCurrency - Base currency used
 * @property {string|null} displayCurrency - Display currency (if converted)
 * @property {number|null} convertedAmount - Converted amount (if applicable)
 * @property {boolean} useMaximum - Whether maximum was forced
 * @property {boolean} useMinimum - Whether minimum was forced
 * @property {boolean} isOnNaughtyList - Whether recipient was on naughty list
 */

/**
 * MCP (Model Context Protocol) tool schema
 * @typedef {Object} MCPToolSchema
 * @property {string} name - Tool name
 * @property {string} description - Tool description
 * @property {Object} inputSchema - JSON schema for tool input
 * @property {boolean} isReadOnly - Whether tool is read-only (safe)
 */

/**
 * MCP tool execution context
 * @typedef {Object} MCPToolContext
 * @property {string} toolName - Name of tool being executed
 * @property {Object} arguments - Tool arguments
 * @property {boolean} isReadOnly - Whether operation is read-only
 * @property {string} sessionId - MCP session identifier
 */

/**
 * MCP tool execution result
 * @typedef {Object} MCPToolResult
 * @property {boolean} success - Whether execution succeeded
 * @property {*} data - Tool result data (varies by tool)
 * @property {string|null} error - Error message if execution failed
 * @property {Object} [metadata] - Additional metadata about execution
 */

/**
 * CLI router configuration for command handling
 * @typedef {Object} CLIRouterConfig
 * @property {string} command - Command being routed
 * @property {string[]} args - Command arguments
 * @property {GiftConfig} config - Base configuration
 * @property {boolean} dryRun - Whether to run in preview mode
 */

/**
 * CLI command execution result
 * @typedef {Object} CLIResult
 * @property {number} exitCode - Process exit code (0 = success, 1 = error)
 * @property {string|null} output - Command output to display
 * @property {string|null} error - Error message if command failed
 * @property {boolean} shouldExit - Whether process should exit immediately
 */

/**
 * Validation result for any input validation
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string[]} errors - Array of validation error messages
 * @property {string[]} warnings - Array of validation warnings
 * @property {*} [sanitized] - Sanitized version of input (if applicable)
 */

/**
 * File operation result for configuration and data files
 * @typedef {Object} FileOperationResult
 * @property {boolean} success - Whether file operation succeeded
 * @property {string|null} path - File path that was operated on
 * @property {string|null} error - Error message if operation failed
 * @property {*} [data] - Data read from file (for read operations)
 * @property {boolean} [created] - Whether file was created (for write operations)
 */