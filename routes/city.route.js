const express = require('express');
const router = express.Router();
const {
  getCityStats,
  getCityDetails,
  getAllCities,
  clearCityCache
} = require('../controllers/city.controller');

/**
 * @route   GET /api/cities
 * @desc    Get statistics (counts) for all cities
 * @access  Public
 * IMPORTANT: This must come BEFORE /:cityName route
 */
router.get('/', getCityStats);

/**
 * @route   POST /api/cities/clear-cache
 * @desc    Clear city stats cache
 * @access  Public (can be restricted to admin if needed)
 */
router.post('/clear-cache', clearCityCache);

/**
 * @route   GET /api/cities/:cityName
 * @desc    Get detailed information for a specific city
 * @access  Public
 * IMPORTANT: This must come LAST (after / and /clear-cache)
 */
router.get('/:cityName', getCityDetails);

module.exports = router;

