const jwt = require('jsonwebtoken')
const errorHandler = require('../utils/error')
const getJWTSecret = require('../utils/jwtSecret')

 const verifyToken = (req, res, next) => {

  // Check for token in Authorization header first, then cookies
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) // Remove 'Bearer ' prefix
    : req.cookies?.access_token;

  if (!token || token === 'null') {
    return next(errorHandler(401, 'Unauthorized - No token provided'));
  }

  let jwtSecret;
  try {
    jwtSecret = getJWTSecret();
  } catch (error) {
    return next(errorHandler(500, 'Server configuration error: ' + error.message));
  }
  
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      // Return more specific error messages
      if (err.name === 'TokenExpiredError') {
        return next(errorHandler(401, 'Token expired'));
      }
      if (err.name === 'JsonWebTokenError') {
        return next(errorHandler(401, 'Invalid token'));
      }
      return next(errorHandler(403, 'Forbidden - Token verification failed'));
    }

    req.user = user;
    next();
  });
};

module.exports = verifyToken;
