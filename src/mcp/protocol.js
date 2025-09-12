/**
 * JSON-RPC 2.0 Protocol Utilities
 * Constants, error codes, and validation utilities for MCP protocol compliance
 */

/**
 * Standard JSON-RPC 2.0 Error Codes
 * As defined in the JSON-RPC 2.0 specification
 */
export const JSON_RPC_ERROR_CODES = {
  // Standard errors
  PARSE_ERROR: -32700,         // Invalid JSON was received
  INVALID_REQUEST: -32600,     // The JSON sent is not a valid Request object
  METHOD_NOT_FOUND: -32601,    // The method does not exist / is not available
  INVALID_PARAMS: -32602,      // Invalid method parameter(s)
  INTERNAL_ERROR: -32603,      // Internal JSON-RPC error
  
  // Implementation defined server errors
  SERVER_ERROR_START: -32099,  // Start of server error range
  SERVER_ERROR_END: -32000     // End of server error range
};

/**
 * Standard JSON-RPC 2.0 Error Messages
 */
export const JSON_RPC_ERROR_MESSAGES = {
  [JSON_RPC_ERROR_CODES.PARSE_ERROR]: 'Parse error',
  [JSON_RPC_ERROR_CODES.INVALID_REQUEST]: 'Invalid Request',
  [JSON_RPC_ERROR_CODES.METHOD_NOT_FOUND]: 'Method not found',
  [JSON_RPC_ERROR_CODES.INVALID_PARAMS]: 'Invalid params',
  [JSON_RPC_ERROR_CODES.INTERNAL_ERROR]: 'Internal error'
};

/**
 * MCP Protocol Version
 */
export const MCP_PROTOCOL_VERSION = '2025-06-18';

/**
 * Validate JSON-RPC 2.0 message structure
 */
export function validateJsonRpcMessage(message) {
  if (typeof message !== 'object' || message === null) {
    return { valid: false, error: 'Message must be an object' };
  }

  if (message.jsonrpc !== '2.0') {
    return { valid: false, error: 'Invalid or missing jsonrpc version' };
  }

  // Check if it's a request
  if (message.method !== undefined) {
    if (typeof message.method !== 'string') {
      return { valid: false, error: 'Method must be a string' };
    }
    // Request can have id (request) or no id (notification)
    return { valid: true, type: message.id !== undefined ? 'request' : 'notification' };
  }

  // Check if it's a response
  if (message.result !== undefined || message.error !== undefined) {
    if (message.id === undefined) {
      return { valid: false, error: 'Response must have an id' };
    }
    
    // Must have either result OR error, not both
    if (message.result !== undefined && message.error !== undefined) {
      return { valid: false, error: 'Response cannot have both result and error' };
    }
    
    return { valid: true, type: 'response' };
  }

  return { valid: false, error: 'Message must have either method (request/notification) or result/error (response)' };
}

/**
 * Validate MCP tool arguments against JSON schema
 */
export function validateToolArguments(args, schema) {
  if (!schema) {
    return { isValid: true };
  }

  // Basic object type validation
  if (schema.type === 'object') {
    if (typeof args !== 'object' || args === null) {
      return { isValid: false, error: 'Arguments must be an object' };
    }

    // Handle anyOf validation (for mutually exclusive arguments)
    if (schema.anyOf && Array.isArray(schema.anyOf)) {
      let anyOfValid = false;
      let anyOfErrors = [];
      
      for (const anyOfSchema of schema.anyOf) {
        const result = validateToolArguments(args, anyOfSchema);
        if (result.isValid) {
          anyOfValid = true;
          break;
        } else {
          anyOfErrors.push(result.error);
        }
      }
      
      if (!anyOfValid) {
        return { isValid: false, error: `Must satisfy one of: ${anyOfErrors.join(', or ')}` };
      }
    }

    // Check required fields (if not using anyOf)
    if (schema.required && Array.isArray(schema.required) && !schema.anyOf) {
      for (const field of schema.required) {
        if (args[field] === undefined || args[field] === null) {
          return { isValid: false, error: `Missing required field: ${field}` };
        }
      }
    }

    // Basic property validation
    if (schema.properties) {
      for (const [key, value] of Object.entries(args)) {
        const propSchema = schema.properties[key];
        if (propSchema) {
          const propValidation = validateProperty(value, propSchema, key);
          if (!propValidation.isValid) {
            return propValidation;
          }
        }
      }
    }
  }

  return { isValid: true };
}

/**
 * Validate individual property against its schema
 */
function validateProperty(value, propSchema, fieldName) {
  // Type validation
  if (propSchema.type) {
    const actualType = typeof value;
    const expectedType = propSchema.type;

    if (expectedType === 'integer') {
      if (!Number.isInteger(value)) {
        return { isValid: false, error: `Field '${fieldName}' must be an integer` };
      }
    } else if (expectedType === 'number') {
      if (typeof value !== 'number' || isNaN(value)) {
        return { isValid: false, error: `Field '${fieldName}' must be a number` };
      }
    } else if (actualType !== expectedType) {
      return { isValid: false, error: `Field '${fieldName}' must be of type ${expectedType}` };
    }
  }

  // Minimum/maximum validation for numbers
  if (typeof value === 'number') {
    if (propSchema.minimum !== undefined && value < propSchema.minimum) {
      return { isValid: false, error: `Field '${fieldName}' must be >= ${propSchema.minimum}` };
    }
    if (propSchema.maximum !== undefined && value > propSchema.maximum) {
      return { isValid: false, error: `Field '${fieldName}' must be <= ${propSchema.maximum}` };
    }
  }

  // String length validation
  if (typeof value === 'string') {
    if (propSchema.minLength !== undefined && value.length < propSchema.minLength) {
      return { isValid: false, error: `Field '${fieldName}' must be at least ${propSchema.minLength} characters` };
    }
    if (propSchema.maxLength !== undefined && value.length > propSchema.maxLength) {
      return { isValid: false, error: `Field '${fieldName}' must be at most ${propSchema.maxLength} characters` };
    }
    if (propSchema.pattern !== undefined) {
      const regex = new RegExp(propSchema.pattern);
      if (!regex.test(value)) {
        return { isValid: false, error: `Field '${fieldName}' does not match required pattern` };
      }
    }
  }

  return { isValid: true };
}

/**
 * Create a JSON-RPC 2.0 response object
 */
export function createJsonRpcResponse(id, result) {
  return {
    jsonrpc: '2.0',
    id,
    result
  };
}

/**
 * Create a JSON-RPC 2.0 error response object
 */
export function createJsonRpcError(id, code, message, data = null) {
  const error = {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message
    }
  };

  if (data !== null) {
    error.error.data = data;
  }

  return error;
}

/**
 * Create a JSON-RPC 2.0 request object
 */
export function createJsonRpcRequest(id, method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id,
    method
  };

  if (Object.keys(params).length > 0) {
    request.params = params;
  }

  return request;
}

/**
 * Create a JSON-RPC 2.0 notification object
 */
export function createJsonRpcNotification(method, params = {}) {
  const notification = {
    jsonrpc: '2.0',
    method
  };

  if (Object.keys(params).length > 0) {
    notification.params = params;
  }

  return notification;
}