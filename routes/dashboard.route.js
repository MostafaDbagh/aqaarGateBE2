const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getDashboardAnalytics,
  getDashboardNotifications
} = require('../controllers/dashboard.controller');
const verifyToken = require('../utils/verifyUser');

// All dashboard routes require authentication
router.use(verifyToken);

/**
 * @route GET /api/dashboard/stats
 * @desc Get comprehensive dashboard statistics
 * @access Private
 * @returns {Object} Dashboard statistics including balance, listings, favorites, reviews, messages
 */
router.get('/stats', getDashboardStats);

/**
 * @route GET /api/dashboard/analytics
 * @desc Get detailed dashboard analytics with charts data
 * @access Private
 * @query {string} period - Time period for analytics (7d, 30d, 90d, 1y)
 * @returns {Object} Analytics data with charts, trends, and performance metrics
 */
router.get('/analytics', getDashboardAnalytics);

/**
 * @route GET /api/dashboard/notifications
 * @desc Get dashboard notifications and alerts
 * @access Private
 * @returns {Object} Notifications including unread messages, pending listings, alerts
 */
router.get('/notifications', getDashboardNotifications);

/**
 * @route GET /api/dashboard/health
 * @desc Get dashboard health status
 * @access Private
 * @returns {Object} Health status of dashboard services
 */
router.get('/health', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Quick health checks
    const healthChecks = await Promise.allSettled([
      // Check database connectivity
      require('../models/user.model').findById(userId).select('_id').lean(),
      
      // Check if user has any data
      Promise.all([
        require('../models/listing.model').countDocuments({ agentId: userId }),
        require('../models/favorite.model').countDocuments({ userId: userId }),
        require('../models/message.model').countDocuments({ recipientId: userId })
      ])
    ]);

    const isHealthy = healthChecks.every(check => check.status === 'fulfilled');
    
    res.json({
      success: true,
      message: 'Dashboard health check completed',
      data: {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        checks: {
          database: healthChecks[0].status === 'fulfilled' ? 'ok' : 'error',
          dataAccess: healthChecks[1].status === 'fulfilled' ? 'ok' : 'error'
        },
        userId: userId
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Dashboard health check failed',
      error: error.message
    });
  }
});

module.exports = router;
