const express = require('express');
const router = express.Router();
const {
  createPropertyRentalRequest,
  getAllPropertyRentalRequests,
  getPropertyRentalRequestById,
  updatePropertyRentalRequest,
  deletePropertyRentalRequest,
} = require('../controllers/propertyRental.controller');
const optionalUserAuth = require('../middleware/optionalUserAuth');

// GET /api/property-rental - Get all property rental requests (with filters and pagination)
router.get('/', getAllPropertyRentalRequests);

// GET /api/property-rental/:id - Get a single property rental request by ID
router.get('/:id', getPropertyRentalRequestById);

// POST /api/property-rental - Create a new property rental service request
router.post('/', optionalUserAuth, createPropertyRentalRequest);

// PUT /api/property-rental/:id - Update a property rental request
router.put('/:id', updatePropertyRentalRequest);

// DELETE /api/property-rental/:id - Delete a property rental request
router.delete('/:id', deletePropertyRentalRequest);

module.exports = router;

