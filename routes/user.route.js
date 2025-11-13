const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyUser');
const upload = require('../utils/multer');
const { uploadUserImagesMiddleware } = require('../utils/uploadUserImages');
const {
  test,
  updateUser,
  deleteUser,
  getUserListings,
  getUser
} = require('../controllers/user.controller');

// Test route
router.get('/test', test);

// Get user listings (protected) - must come before /:id
router.get('/:id/listings', verifyToken, getUserListings);

// Update user profile (protected) with image upload support
router.post('/update/:id', 
  verifyToken, 
  upload.fields([
    { name: 'avatar', maxCount: 1 },
  ]),
  uploadUserImagesMiddleware,
  updateUser
);

// Delete user account (protected)
router.delete('/delete/:id', verifyToken, deleteUser);

// Get user profile (protected) - must come last among GET routes
router.get('/:id', verifyToken, getUser);

module.exports = router;

