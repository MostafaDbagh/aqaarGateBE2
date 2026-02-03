const express = require('express');
const router = express.Router();
const careerController = require('../controllers/career.controller');

// Public routes - no auth required
// GET /api/career - Get all published careers
router.get('/', careerController.getAllCareers);

// GET /api/career/:id - Get career by ID
router.get('/:id', careerController.getCareerById);

module.exports = router;
