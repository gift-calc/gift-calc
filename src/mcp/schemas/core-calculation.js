/**
 * MCP JSON Schemas for Core Calculation Tools
 * Extracted schemas for gift calculation tools
 */

export const calculateGiftAmountSchema = {
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
};