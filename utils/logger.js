/**
 * Logger Utility
 * Centralized logging for production and development
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = {
  /**
   * Log info messages (development only)
   */
  info: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log debug messages (development only)
   */
  debug: (...args) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Log errors (always logged)
   */
  error: (...args) => {
    const timestamp = new Date().toISOString();
    console.error(`[ERROR ${timestamp}]`, ...args);
    // TODO: Integrate with error tracking service (e.g., Sentry)
  },

  /**
   * Log warnings (development only)
   */
  warn: (...args) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Log success messages (development only)
   */
  success: (...args) => {
    if (isDevelopment) {
      console.log('✅', ...args);
    }
  },

  /**
   * Log database operations (development only)
   */
  db: (...args) => {
    if (isDevelopment) {
      console.log('[DB]', ...args);
    }
  },

  /**
   * Log API requests (development only)
   */
  api: (...args) => {
    if (isDevelopment) {
      console.log('[API]', ...args);
    }
  }
};

module.exports = logger;

