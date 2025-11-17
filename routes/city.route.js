const express = require('express');
const router = express.Router();
const {
  getCityStats,
  getCityDetails,
  getAllCities
} = require('../controllers/city.controller');

/**
 * @route   GET /api/cities
 * @desc    Get statistics (counts) for all cities
 * @access  Public
 * IMPORTANT: This must come BEFORE /:cityName route
 */
router.get('/', getCityStats);

/**
 * @route   GET /api/cities/:cityName
 * @desc    Get detailed information for a specific city
 * @access  Public
 * IMPORTANT: This must come LAST (after /)
 */
router.get('/:cityName', getCityDetails);

module.exports = router;

