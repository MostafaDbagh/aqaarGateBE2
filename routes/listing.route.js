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

// Multer automatically parses form fields into req.body for multipart/form-data
// But we need to ensure it's available before other middleware

router.get('/search', filterListings, ListingController.getFilteredListings);
// Multer parses both files and form fields automatically
// Middleware order: verifyToken -> multer (parses files + fields) -> error handler -> upload to Cloudinary -> check points -> create listing
router.post('/create', verifyToken, uploadListingImages, handleMulterError, uploadListingImagesMiddleware, checkAndDeductPoints, ListingController.createListing, deductPointsAfterListing);
router.get('/stateCount',ListingController.getEachStateListing);
router.delete('/delete/:id', verifyToken, refundPointsOnListingDelete, ListingController.deleteListing);
router.post('/update/:id', verifyToken, ListingController.updateListing);
router.get('/:id', ListingController.getListingById);
router.get('/:id/images', ListingController.getListingImages);
router.get('/agent/:agentId', ListingController.getListingsByAgent);
router.post('/:id/visit', ListingController.incrementVisitCount);
router.get('/agent/:agentId/mostVisited', ListingController.getMostVisitedListings);

module.exports = router;
