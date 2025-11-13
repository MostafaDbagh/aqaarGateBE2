const express = require('express');
const router = express.Router();
const {
  getPointBalance,
  chargePoints,
  deductPoints,
  getTransactionHistory,
  calculateListingCost,
  refundPoints
} = require('../controllers/point.controller');
const verifyToken = require('../utils/verifyUser');

// All routes require authentication
router.use(verifyToken);

// Get user's point balance and recent transactions
router.get('/balance', getPointBalance);

// Charge points (purchase points)
router.post('/charge', chargePoints);

// Deduct points (for listing publication)
router.post('/deduct', deductPoints);

// Get transaction history with pagination
router.get('/transactions', getTransactionHistory);

// Calculate points needed for a listing
router.post('/calculateCost', calculateListingCost);

// Refund points (for deleted listings)
router.post('/refund', refundPoints);

module.exports = router;
