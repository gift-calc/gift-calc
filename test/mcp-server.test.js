#!/usr/bin/env node

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPServer, SERVER_INFO, SERVER_CAPABILITIES } from '../src/mcp/server.js';
import { 
  JSON_RPC_ERROR_CODES, 
  validateJsonRpcMessage, 
  validateToolArguments,
  createJsonRpcRequest,
  createJsonRpcResponse,
  createJsonRpcError
} from '../src/mcp/protocol.js';

// Mock process.stdin/stdout for testing
const mockStdin = {
  setEncoding: vi.fn(),
  on: vi.fn()
};

const mockStdout = {
  write: vi.fn()
};

const mockProcess = {
  stdin: mockStdin,
  stdout: mockStdout,
  on: vi.fn(),
  exit: vi.fn()
};

// Mock Node.js modules
vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(() => '{}'),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn()
  }
}));

vi.mock('node:path', () => ({
  default: {
    join: vi.fn((...args) => args.join('/')),
    dirname: vi.fn(() => '/test/dir')
  }
}));

vi.mock('node:os', () => ({
  default: {
    homedir: vi.fn(() => '/test/home')
  }
}));

describe('MCP Server Tests', () => {
  let server;
  let originalProcess;

  beforeEach(() => {
    // Save original process
    originalProcess = global.process;
    
    // Mock process for testing
    global.process = mockProcess;
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create new server instance
    server = new MCPServer();
  });

  afterEach(() => {
    // Restore original process
    global.process = originalProcess;
  });

  describe('Server Initialization', () => {
    test('should initialize with correct defaults', () => {
      expect(server.initialized).toBe(false);
      expect(mockStdin.setEncoding).toHaveBeenCalledWith('utf8');
      expect(mockStdin.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockProcess.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      expect(mockProcess.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    });

    test('should have correct server info', () => {
      expect(SERVER_INFO.name).toBe('gift-calc-mcp');
      expect(SERVER_INFO.protocolVersion).toBe('2025-06-18');
      expect(SERVER_INFO.version).toBe('1.0.0');
    });

    test('should have correct capabilities', () => {
      expect(SERVER_CAPABILITIES).toEqual({ tools: {} });
    });
  });

  describe('Message Handling', () => {
    test('should handle valid JSON-RPC initialize request', async () => {
      const message = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {}
        }
      };

      await server.handleMessage(JSON.stringify(message));

      expect(mockStdout.write).toHaveBeenCalledWith(
        expect.stringContaining('"result"')
      );
    });

    test('should reject invalid JSON-RPC version', async () => {
      const message = {
        jsonrpc: '1.0',
        id: 1,
        method: 'initialize'
      };

      await server.handleMessage(JSON.stringify(message));

      expect(mockStdout.write).toHaveBeenCalledWith(
        expect.stringContaining('"error"')
      );
    });

    test('should handle parse errors gracefully', async () => {
      await server.handleMessage('invalid json');

      expect(mockStdout.write).toHaveBeenCalledWith(
        expect.stringContaining(`"code":${JSON_RPC_ERROR_CODES.PARSE_ERROR}`)
      );
    });

    test('should handle unknown methods', async () => {
      const message = {
        jsonrpc: '2.0',
        id: 1,
        method: 'unknown_method'
      };

      await server.handleMessage(JSON.stringify(message));

      expect(mockStdout.write).toHaveBeenCalledWith(
        expect.stringContaining(`"code":${JSON_RPC_ERROR_CODES.METHOD_NOT_FOUND}`)
      );
    });
  });

  describe('Tool Management', () => {
    test('should register tools correctly', () => {
      const toolDef = {
        description: 'Test tool',
        inputSchema: {
          type: 'object',
          properties: { test: { type: 'string' } },
          required: ['test']
        },
        handler: async () => ({ content: [{ type: 'text', text: 'test' }] })
      };

      server.registerTool('test_tool', toolDef);

      // Test tools/list request
      const listMessage = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      };

      return server.handleMessage(JSON.stringify(listMessage)).then(() => {
        expect(mockStdout.write).toHaveBeenCalledWith(
          expect.stringContaining('test_tool')
        );
      });
    });

    test('should validate tool arguments', () => {
      const schema = {
        type: 'object',
        properties: {
          required_field: { type: 'string' }
        },
        required: ['required_field']
      };

      const validation1 = server.validateToolArguments({ required_field: 'test' }, schema);
      expect(validation1.valid).toBe(true);

      const validation2 = server.validateToolArguments({}, schema);
      expect(validation2.valid).toBe(false);
      expect(validation2.error).toContain('required_field');
    });

    test('should handle tool execution', async () => {
      const toolDef = {
        description: 'Test tool',
        inputSchema: {
          type: 'object',
          properties: { message: { type: 'string' } },
          required: ['message']
        },
        handler: async (args) => ({
          content: [{ type: 'text', text: `Hello ${args.message}` }],
          isReadOnly: true
        })
      };

      server.registerTool('echo_tool', toolDef);

      const callMessage = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'echo_tool',
          arguments: { message: 'world' }
        }
      };

      await server.handleMessage(JSON.stringify(callMessage));

      expect(mockStdout.write).toHaveBeenCalledWith(
        expect.stringContaining('Hello world')
      );
    });

    test('should handle tool call with invalid arguments', async () => {
      const toolDef = {
        description: 'Test tool',
        inputSchema: {
          type: 'object',
          properties: { required: { type: 'string' } },
          required: ['required']
        },
        handler: async () => ({ content: [] })
      };

      server.registerTool('strict_tool', toolDef);

      const callMessage = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'strict_tool',
          arguments: {} // Missing required field
        }
      };

      await server.handleMessage(JSON.stringify(callMessage));

      expect(mockStdout.write).toHaveBeenCalledWith(
        expect.stringContaining(`"code":${JSON_RPC_ERROR_CODES.INVALID_PARAMS}`)
      );
    });

    test('should handle non-existent tool calls', async () => {
      const callMessage = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'non_existent_tool',
          arguments: {}
        }
      };

      await server.handleMessage(JSON.stringify(callMessage));

      expect(mockStdout.write).toHaveBeenCalledWith(
        expect.stringContaining(`"code":${JSON_RPC_ERROR_CODES.INVALID_PARAMS}`)
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle tool execution errors', async () => {
      const toolDef = {
        description: 'Failing tool',
        inputSchema: { type: 'object', properties: {} },
        handler: async () => {
          throw new Error('Tool execution failed');
        }
      };

      server.registerTool('failing_tool', toolDef);

      const callMessage = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'failing_tool',
          arguments: {}
        }
      };

      await server.handleMessage(JSON.stringify(callMessage));

      expect(mockStdout.write).toHaveBeenCalledWith(
        expect.stringContaining(`"code":${JSON_RPC_ERROR_CODES.INTERNAL_ERROR}`)
      );
    });
  });

  describe('Protocol Compliance', () => {
    test('should send properly formatted JSON-RPC responses', async () => {
      const message = {
        jsonrpc: '2.0',
        id: 42,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {}
        }
      };

      await server.handleMessage(JSON.stringify(message));

      const [response] = mockStdout.write.mock.calls[0];
      const parsedResponse = JSON.parse(response);

      expect(parsedResponse.jsonrpc).toBe('2.0');
      expect(parsedResponse.id).toBe(42);
      expect(parsedResponse.result).toBeDefined();
      expect(parsedResponse.result.protocolVersion).toBe('2025-06-18');
    });

    test('should handle notifications without sending responses', async () => {
      const notification = {
        jsonrpc: '2.0',
        method: 'initialized',
        params: {}
      };

      await server.handleMessage(JSON.stringify(notification));

      expect(server.initialized).toBe(true);
      // Should not send any response for notifications
      expect(mockStdout.write).not.toHaveBeenCalled();
    });
  });
});

describe('JSON-RPC Protocol Utilities', () => {
  describe('Message Validation', () => {
    test('should validate valid JSON-RPC requests', () => {
      const request = { jsonrpc: '2.0', id: 1, method: 'test' };
      const result = validateJsonRpcMessage(request);
      
      expect(result.valid).toBe(true);
      expect(result.type).toBe('request');
    });

    test('should validate valid JSON-RPC notifications', () => {
      const notification = { jsonrpc: '2.0', method: 'test' };
      const result = validateJsonRpcMessage(notification);
      
      expect(result.valid).toBe(true);
      expect(result.type).toBe('notification');
    });

    test('should validate valid JSON-RPC responses', () => {
      const response = { jsonrpc: '2.0', id: 1, result: 'success' };
      const result = validateJsonRpcMessage(response);
      
      expect(result.valid).toBe(true);
      expect(result.type).toBe('response');
    });

    test('should reject invalid messages', () => {
      const invalidMessages = [
        null,
        { jsonrpc: '1.0', id: 1, method: 'test' },
        { jsonrpc: '2.0', id: 1 }, // No method, result, or error
        { jsonrpc: '2.0', id: 1, result: 'ok', error: 'fail' }, // Both result and error
        { jsonrpc: '2.0', result: 'ok' }, // Response without id
      ];

      invalidMessages.forEach(msg => {
        const result = validateJsonRpcMessage(msg);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Tool Argument Validation', () => {
    test('should validate arguments against schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          age: { type: 'number', minimum: 0, maximum: 120 },
          active: { type: 'boolean' }
        },
        required: ['name']
      };

      // Valid arguments
      const valid1 = validateToolArguments({ name: 'John', age: 30, active: true }, schema);
      expect(valid1.valid).toBe(true);

      const valid2 = validateToolArguments({ name: 'Jane' }, schema);
      expect(valid2.valid).toBe(true);

      // Invalid arguments
      const invalid1 = validateToolArguments({}, schema);
      expect(invalid1.valid).toBe(false);
      expect(invalid1.error).toContain('name');

      const invalid2 = validateToolArguments({ name: 'John', age: -5 }, schema);
      expect(invalid2.valid).toBe(false);
      expect(invalid2.error).toContain('age');
    });
  });

  describe('Message Creation Utilities', () => {
    test('should create valid JSON-RPC requests', () => {
      const request = createJsonRpcRequest(1, 'test_method', { param: 'value' });
      
      expect(request.jsonrpc).toBe('2.0');
      expect(request.id).toBe(1);
      expect(request.method).toBe('test_method');
      expect(request.params).toEqual({ param: 'value' });
    });

    test('should create valid JSON-RPC responses', () => {
      const response = createJsonRpcResponse(1, { success: true });
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result).toEqual({ success: true });
    });

    test('should create valid JSON-RPC errors', () => {
      const error = createJsonRpcError(1, -32601, 'Method not found', 'additional data');
      
      expect(error.jsonrpc).toBe('2.0');
      expect(error.id).toBe(1);
      expect(error.error.code).toBe(-32601);
      expect(error.error.message).toBe('Method not found');
      expect(error.error.data).toBe('additional data');
    });
  });
});