const express = require('express');
const router = express.Router();
const {
  createFutureBuyer,
  getFutureBuyers,
  getFutureBuyer,
  deleteFutureBuyer,
  recalculateMatches
} = require('../controllers/futureBuyer.controller');
const adminAuth = require('../middleware/adminAuth');
const optionalUserAuth = require('../middleware/optionalUserAuth');

// Public route - anyone can submit interest, but optional auth for limit checking
router.post('/', optionalUserAuth, createFutureBuyer);

// Admin routes - require authentication and admin role
router.get('/', adminAuth, getFutureBuyers);
router.get('/:id', adminAuth, getFutureBuyer);
router.delete('/:id', adminAuth, deleteFutureBuyer);
router.post('/:id/recalculate-matches', adminAuth, recalculateMatches);

module.exports = router;

