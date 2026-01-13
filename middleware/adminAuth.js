const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const errorHandler = require('../utils/error');
const getJWTSecret = require('../utils/jwtSecret');

const adminAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.access_token || 
                  req.headers?.authorization?.replace('Bearer ', '') ||
                  req.headers?.authorization;

    if (!token) {
      return next(errorHandler(401, 'Unauthorized - No token provided'));
    }

    let jwtSecret;
    try {
      jwtSecret = getJWTSecret();
    } catch (error) {
      return next(errorHandler(500, 'Server configuration error: ' + error.message));
    }

    const decoded = jwt.verify(token, jwtSecret);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(errorHandler(404, 'User not found'));
    }

    if (user.role !== 'admin') {
      return next(errorHandler(403, 'Forbidden - Admin access required'));
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    next(errorHandler(401, 'Unauthorized - Invalid token'));
  }
};

module.exports = adminAuth;

