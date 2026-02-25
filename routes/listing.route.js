const express = require('express');
const router = express.Router();
const ListingController = require('../controllers/listing.controller.js');
const verifyToken = require('../utils/verifyUser');
const filterListings = require('../middleware/listing.js');
const {uploadListingImages, uploadListingImagesMiddleware, handleMulterError} = require('../utils/uploadListingImages.js');
const { 
  checkAndDeductPoints, 
  deductPointsAfterListing, 
  refundPointsOnListingDelete 
} = require('../middleware/pointDeduction.js');
const upload = require('../utils/multer');

// Multer automatically parses form fields into req.body for multipart/form-data
// But we need to ensure it's available before other middleware

router.get('/search', filterListings, ListingController.getFilteredListings);
// AI-powered natural language search endpoint - Available for all users (no authentication required)
// All roles can use this: user, agent, admin, and anonymous users
router.post('/ai-search', ListingController.aiSearch);
// Multer parses both files and form fields automatically
// Middleware order: verifyToken -> multer (parses files + fields) -> error handler -> upload to Cloudinary -> check points -> create listing
router.post('/create', verifyToken, uploadListingImages, handleMulterError, uploadListingImagesMiddleware, checkAndDeductPoints, ListingController.createListing, deductPointsAfterListing);
router.get('/stateCount',ListingController.getEachStateListing);
// Specific routes must come before parameterized routes (/:id, /:agentId, etc.)
router.get('/export', verifyToken, ListingController.exportProperties);
router.post('/import', verifyToken, upload.single('csvFile'), ListingController.importProperties);
router.delete('/delete/:id', verifyToken, refundPointsOnListingDelete, ListingController.deleteListing);
router.post('/update/:id/images', verifyToken, uploadListingImages, handleMulterError, uploadListingImagesMiddleware, ListingController.updateListingImages);
router.post('/update/:id', verifyToken, ListingController.updateListing);
router.patch('/:id/featured', verifyToken, ListingController.setListingFeatured);
router.get('/agent/:agentId', ListingController.getListingsByAgent);
router.get('/agent/:agentId/mostVisited', ListingController.getMostVisitedListings);
router.get('/:id/images', ListingController.getListingImages);
router.post('/:id/visit', ListingController.incrementVisitCount);
router.get('/:id', ListingController.getListingById);

module.exports = router;
