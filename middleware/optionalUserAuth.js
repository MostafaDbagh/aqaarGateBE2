const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const getJWTSecret = require('../utils/jwtSecret');

// Optional user authentication middleware - adds req.user if token is valid
const optionalUserAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.access_token || 
                  req.headers?.authorization?.replace('Bearer ', '') ||
                  req.headers?.authorization;

    if (!token) {
      // No token provided, continue without user
      return next();
    }

    let jwtSecret;
    try {
      jwtSecret = getJWTSecret();
    } catch (error) {
      // If JWT secret error, continue without user
      return next();
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      const user = await User.findById(decoded.id);

      if (user && user.role === 'user') {
        req.user = {
          id: user._id.toString(),
          email: user.email,
          role: user.role
        };
      }
    } catch (error) {
      // Invalid token, continue without user
    }

    next();
  } catch (error) {
    // Continue without user on any error
    next();
  }
};

module.exports = optionalUserAuth;

