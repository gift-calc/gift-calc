/**
 * MCP Tools for Naughty List Domain
 * Modularized tools following domain-driven architecture
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Import from modularized domain
import {
  getNaughtyListPath,
  isOnNaughtyList,
  addToNaughtyList,
  removeFromNaughtyList
} from '../../domains/naughty-list/index.js';

// Import schemas
import {
  checkNaughtyListSchema,
  addToNaughtyListSchema,
  removeFromNaughtyListSchema
} from '../schemas/naughty-list.js';

/**
 * Register naughty list MCP tools with the provided server instance
 * @param {Object} server - MCP server instance
 */
export function registerNaughtyListTools(server) {
  // Check naughty list tool
  server.registerTool('check_naughty_list', {
    description: 'Check if a person is on the naughty list. Returns true if they are naughty, false if they are nice.',
    inputSchema: checkNaughtyListSchema,
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

  // Add to naughty list tool
  server.registerTool('add_to_naughty_list', {
    description: 'Add a person to the naughty list. People on the naughty list always get 0 gift amount.',
    inputSchema: addToNaughtyListSchema,
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

  // Remove from naughty list tool
  server.registerTool('remove_from_naughty_list', {
    description: 'Remove a person from the naughty list, allowing them to receive gifts again.',
    inputSchema: removeFromNaughtyListSchema,
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
}