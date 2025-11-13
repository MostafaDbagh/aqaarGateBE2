const express = require('express');
const router = express.Router();
const {
  subscribeNewsletter,
  unsubscribeNewsletter,
  getAllSubscribers,
  getSubscriptionStats,
  updatePreferences
} = require('../controllers/newsletter.controller');
const verifyToken = require('../utils/verifyUser');

// Simple role check middleware
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }
    
    next();
  };
};

// Public routes
router.post('/subscribe', subscribeNewsletter);
router.post('/unsubscribe', unsubscribeNewsletter);
router.put('/preferences', updatePreferences);

// Admin routes
router.get('/subscribers', verifyToken, authorize(['admin']), getAllSubscribers);
router.get('/stats', verifyToken, authorize(['admin']), getSubscriptionStats);

module.exports = router;
