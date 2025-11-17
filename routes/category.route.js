const express = require('express');
const router = express.Router();
const {
  getCategoryStats,
  getCategoryDetails,
  getAllPropertyTypes
} = require('../controllers/category.controller');

/**
 * @route   GET /api/categories
 * @desc    Get statistics (counts) for all property categories
 * @access  Public
 * IMPORTANT: This must come BEFORE /:propertyType route
 */
router.get('/', getCategoryStats);

/**
 * @route   GET /api/categories/:propertyType
 * @desc    Get detailed information for a specific property type
 * @access  Public
 * IMPORTANT: This must come LAST (after /stats and /)
 */
router.get('/:propertyType', getCategoryDetails);

module.exports = router;

