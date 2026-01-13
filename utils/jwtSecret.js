/**
 * JWT Secret Utility
 * Ensures JWT_SECRET is always set and never uses fallback values
 */

const logger = require('./logger');

const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret || secret.trim().length === 0) {
    throw new Error(
      'JWT_SECRET environment variable is required but not set. ' +
      'Please set JWT_SECRET in your .env file or environment variables. ' +
      'This is a critical security requirement.'
    );
  }
  
  // Warn if secret is too short (but don't fail - allow existing shorter secrets)
  // Minimum 32 characters is recommended for security
  if (secret.length < 32) {
    logger.warn(
      `JWT_SECRET is only ${secret.length} characters long. ` +
      'For better security, use at least 32 characters. ' +
      'Generate a new secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  
  return secret;
};

module.exports = getJWTSecret;

