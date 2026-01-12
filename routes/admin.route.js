const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const {
  // Properties
  getAllProperties,
  getPropertiesByAdmin,
  updatePropertyApproval,
  deleteProperty,
  getSoldProperties,
  updateSoldPropertyCharges,
  getDeletedProperties,
  // Contacts
  getAllContacts,
  deleteContact,
  // Rental Services
  getAllRentalServices,
  updateRentalService,
  deleteRentalService,
  // Users
  getAllUsers,
  // Agents
  getAllAgents,
  blockAgent,
  unblockAgent,
  // Dashboard
  getDashboardStats
} = require('../controllers/admin.controller');

// All routes require admin authentication
router.use(adminAuth);

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// Properties
router.get('/properties', getAllProperties);
router.get('/properties-by-admin', getPropertiesByAdmin);
router.put('/properties/:id/approval', updatePropertyApproval);
router.delete('/properties/:id', deleteProperty);

// Sold Properties
router.get('/sold-properties', getSoldProperties);
router.put('/sold-properties/:id/charges', updateSoldPropertyCharges);

// Deleted Properties
router.get('/deleted-properties', getDeletedProperties);

// Contacts
router.get('/contacts', getAllContacts);
router.delete('/contacts/:id', deleteContact);

// Rental Services
router.get('/rental-services', getAllRentalServices);
router.put('/rental-services/:id', updateRentalService);
router.delete('/rental-services/:id', deleteRentalService);

// Users (read-only)
router.get('/users', getAllUsers);

// Agents
router.get('/agents', getAllAgents);
router.put('/agents/:id/block', blockAgent);
router.put('/agents/:id/unblock', unblockAgent);

module.exports = router;

