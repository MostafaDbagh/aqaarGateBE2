const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const errorHandler = require('../utils/error');

const adminAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.access_token || 
                  req.headers?.authorization?.replace('Bearer ', '') ||
                  req.headers?.authorization;

    if (!token) {
      return next(errorHandler(401, 'Unauthorized - No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || '5345jkj5kl34j5kl34j5');
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

