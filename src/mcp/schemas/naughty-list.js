/**
 * MCP JSON Schemas for Naughty List Tools
 * Extracted schemas for better organization and reusability
 */

export const checkNaughtyListSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'Name of person to check'
    }
  },
  required: ['name']
};

export const addToNaughtyListSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'Name of person to add to naughty list',
      minLength: 1
    }
  },
  required: ['name']
};

export const removeFromNaughtyListSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'Name of person to remove from naughty list',
      minLength: 1
    }
  },
  required: ['name']
};