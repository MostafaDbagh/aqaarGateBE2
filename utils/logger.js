/**
 * Logger Utility
 * Centralized logging for production and development
 * Sanitizes sensitive data before logging
 */

const isDevelopment = process.env.NODE_ENV !== 'production';
const LOG_LEVEL = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'error');

// Sensitive fields that should be redacted
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'access_token',
  'jwt',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'cookie',
  'creditCard',
  'credit_card',
  'ssn',
  'socialSecurityNumber'
];

/**
 * Sanitize object to remove sensitive data
 */
const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    
    // Check if this field should be redacted
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Format log message with timestamp and level
 */
const formatLog = (level, ...args) => {
  const timestamp = new Date().toISOString();
  const sanitizedArgs = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      return sanitizeData(arg);
    }
    return arg;
  });
  
  return [`[${timestamp}] [${level.toUpperCase()}]`, ...sanitizedArgs];
};

const logger = {
  /**
   * Log info messages
   * Level: info, debug
   */
  info: (...args) => {
    if (LOG_LEVEL === 'debug' || LOG_LEVEL === 'info' || isDevelopment) {
      console.log(...formatLog('INFO', ...args));
    }
  },

  /**
   * Log debug messages (development only)
   * Level: debug
   */
  debug: (...args) => {
    if (LOG_LEVEL === 'debug' || isDevelopment) {
      console.log(...formatLog('DEBUG', ...args));
    }
  },

  /**
   * Log errors (always logged in production)
   * Level: error, warn, info, debug
   */
  error: (...args) => {
    // Always log errors, but sanitize sensitive data
    console.error(...formatLog('ERROR', ...args));
    // TODO: Integrate with error tracking service (e.g., Sentry)
  },

  /**
   * Log warnings
   * Level: warn, info, debug
   */
  warn: (...args) => {
    if (LOG_LEVEL !== 'error' || isDevelopment) {
      console.warn(...formatLog('WARN', ...args));
    }
  },

  /**
   * Log success messages (development only)
   * Level: debug
   */
  success: (...args) => {
    if (LOG_LEVEL === 'debug' || isDevelopment) {
      console.log(...formatLog('SUCCESS', ...args));
    }
  },

  /**
   * Log database operations (development only)
   * Level: debug
   */
  db: (...args) => {
    if (LOG_LEVEL === 'debug' || isDevelopment) {
      console.log(...formatLog('DB', ...args));
    }
  },

  /**
   * Log API requests (development only)
   * Level: debug
   */
  api: (...args) => {
    if (LOG_LEVEL === 'debug' || isDevelopment) {
      console.log(...formatLog('API', ...args));
    }
  }
};

module.exports = logger;

