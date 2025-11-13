const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');


router.post('/', reviewController.createReview);
router.get('/', reviewController.getReviews);
router.get('/property/:propertyId', reviewController.getReviewsByProperty);
router.get('/agent/:agentId', reviewController.getReviewsByAgent);
router.get('/user/:userId', reviewController.getReviewsByUser); // NEW: Get reviews by user
router.post('/like', reviewController.likeReview);
router.post('/dislike', reviewController.dislikeReview);
router.patch('/:reviewId/hideDashboard', reviewController.hideReviewFromDashboard);
router.patch('/:reviewId/hideListing', reviewController.hideReviewFromListing);
router.patch('/:reviewId/hide-dashboard', reviewController.hideReviewFromDashboard);
router.patch('/:reviewId/hide-listing', reviewController.hideReviewFromListing);


module.exports = router;
