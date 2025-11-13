const Review = require('../models/review.model');
const Listing = require('../models/listing.model');
const logger = require('../utils/logger');

const createReview = async (req, res) => {
  try {
    const { name, email, review, rating, userId, propertyId } = req.body;

    if (!name || !email || !review) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingReview = await Review.findOne({ email });
    if (existingReview) {
      return res.status(400).json({ message: 'Review with this email already exists' });
    }

    const newReview = new Review({ 
      name, 
      email, 
      review,
      rating: rating || 5, // Use provided rating or default to 5
      propertyId,
      userId: userId || null // Add userId if provided
    });
    await newReview.save();

    res.status(201).json({ message: 'Review created', review: newReview });
  } catch (error) {
    logger.error('Error creating review:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const likeReview = async (req, res) => {
    try {
      const { reviewId, userId } = req.body; // userId from authenticated user ideally
  
      if (!reviewId || !userId) {
        return res.status(400).json({ message: 'reviewId and userId are required' });
      }
  
      const review = await Review.findById(reviewId);
      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }
  
      // Remove user from dislikedBy if present
      review.dislikedBy = review.dislikedBy.filter(id => id.toString() !== userId);
  
      // Add user to likedBy if not already there
      if (!review.likedBy.some(id => id.toString() === userId)) {
        review.likedBy.push(userId);
      }
  
      await review.save();
  
      res.status(200).json({ message: 'Review liked', likes: review.likedBy.length, dislikes: review.dislikedBy.length });
    } catch (error) {
      logger.error('Error liking review:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
  
  const dislikeReview = async (req, res) => {
    try {
      const { reviewId, userId } = req.body;
  
      if (!reviewId || !userId) {
        return res.status(400).json({ message: 'reviewId and userId are required' });
      }
  
      const review = await Review.findById(reviewId);
      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }
  
      // Remove user from likedBy if present
      review.likedBy = review.likedBy.filter(id => id.toString() !== userId);
  
      // Add user to dislikedBy if not already there
      if (!review.dislikedBy.some(id => id.toString() === userId)) {
        review.dislikedBy.push(userId);
      }
  
      await review.save();
  
      res.status(200).json({ message: 'Review disliked', likes: review.likedBy.length, dislikes: review.dislikedBy.length });
    } catch (error) {
      logger.error('Error disliking review:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };

const getReviews = async (req, res) => {
  try {
    // Get pagination parameters from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalReviews = await Review.countDocuments();
    const totalPages = Math.ceil(totalReviews / limit);

    // Get paginated reviews
    const reviews = await Review.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username email avatar')
      .populate('propertyId', 'propertyKeyword address propertyPrice images');

    res.status(200).json({
      success: true,
      data: reviews,
      pagination: {
        currentPage: page,
        totalPages,
        totalReviews,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    logger.error('Error creating review:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
const getReviewsByProperty = async (req, res) => {
    try {
      const { propertyId } = req.params;
  
      if (!propertyId) {
        return res.status(400).json({ message: 'propertyId is required' });
      }
  
      // Get all reviews for this property (excluding hidden from listing)
      const reviews = await Review.find({ 
        propertyId,
        hiddenFromListing: { $ne: true }
      }).sort({ createdAt: -1 });

      logger.debug(`Found ${reviews.length} reviews for property ${propertyId}`);
  
      res.status(200).json({
        success: true,
        data: reviews
      });
    } catch (error) {
      logger.error('Error deleting review:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };

  const getReviewsByAgent = async (req, res) => {
    try {
      let { agentId } = req.params;
  
      if (!agentId) {
        return res.status(400).json({ 
          success: false,
          message: 'agentId is required' 
        });
      }

      const mongoose = require('mongoose');
      const User = require('../models/user.model');
      const jwt = require('jsonwebtoken');
      
      // Convert to ObjectId
      const isObjectId = mongoose.Types.ObjectId.isValid(agentId);
      let agentIdObj = isObjectId ? new mongoose.Types.ObjectId(agentId) : agentId;
      let finalAgentId = agentIdObj;

      // Check if user is authenticated (optional - don't require auth)
      let authenticatedUserId = null;
      try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') 
          ? authHeader.slice(7)
          : req.cookies?.access_token;
        
        if (token && token !== 'null') {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || '5345jkj5kl34j5kl34j5');
          authenticatedUserId = decoded.id;
          logger.debug('getReviewsByAgent - Authenticated user ID:', authenticatedUserId);
        }
      } catch (err) {
        // Token invalid or missing - that's okay, we'll use mapping logic
        logger.debug('getReviewsByAgent - No valid authentication token');
      }

      // Check if this is an old orphaned agent ID and find the new user account
      // Map of old orphaned agent IDs to new user accounts
      const orphanedToNewMapping = {
        '68ff3cf7cbb96ae0f6c49528': '69011eb4094125c9d18233d2', // Tarek Farouk
        '68ff3cf6cbb96ae0f6c49512': '690124b4e02150e669d14ca1', // Ahmad Al-Hassan
        '68ff3cf6cbb96ae0f6c49515': '690124b6e02150e669d14ca2', // Mohammad Ali
        '68ff3cf6cbb96ae0f6c4951a': '690124b8e02150e669d14ca3', // Omar Mahmoud
        '68ff3cf6cbb96ae0f6c4951d': '690124b9e02150e669d14ca4', // Khalil Abdullah
        '68ff3cf7cbb96ae0f6c49520': '690124bbe02150e669d14ca5', // Youssef Salim
        '68ff3cf7cbb96ae0f6c49522': '690124bce02150e669d14ca6', // Ziad Malek
        '68ff3cf7cbb96ae0f6c49524': '690124bee02150e669d14ca7', // Rami Nasser
        '68ff3cf7cbb96ae0f6c49526': '690124bfe02150e669d14ca8', // Bassam Hamdi
        '68ff3cf6cbb96ae0f6c49518': '68ff97d83bb30c2519e463ae'  // Hassan Ibrahim
      };
      
      try {
        const agentIdStr = agentIdObj.toString();
        
        // Priority 1: If user is authenticated, use their ID
        if (authenticatedUserId) {
          const authUserIdObj = new mongoose.Types.ObjectId(authenticatedUserId);
          const userExists = await User.findById(authUserIdObj);
          if (userExists) {
            logger.debug(`getReviewsByAgent - Using authenticated user ID: ${authenticatedUserId}`);
            finalAgentId = authUserIdObj;
          }
        }
        
        // Priority 2: Check if this is in our mapping
        if (finalAgentId === agentIdObj && orphanedToNewMapping[agentIdStr]) {
          logger.debug(`getReviewsByAgent - Mapping old agent ID ${agentIdStr} to new ID ${orphanedToNewMapping[agentIdStr]}`);
          finalAgentId = new mongoose.Types.ObjectId(orphanedToNewMapping[agentIdStr]);
        } 
        // Priority 3: Check if the agentId is already a valid user ID
        else if (finalAgentId === agentIdObj) {
          const userExists = await User.findById(agentIdObj);
          if (userExists) {
            logger.debug(`getReviewsByAgent - Agent ID ${agentIdStr} is a valid user ID`);
            finalAgentId = agentIdObj;
          } else {
            logger.debug(`getReviewsByAgent - Agent ID ${agentIdStr} not found as user, using original`);
          }
        }
      } catch (err) {
        logger.error('getReviewsByAgent - Error checking for orphaned agent:', err);
      }

      // Get pagination parameters from query
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
  
      // Find properties for this agent (used to include property-based reviews)
      // Use both the original agentId and finalAgentId to find properties
      const properties = await Listing.find({ 
        $or: [
          { agentId: agentIdObj },
          { agentId: finalAgentId }
        ],
        isDeleted: { $ne: true }
      }).select('_id');

      const propertyIds = properties.map(p => p._id);

      logger.debug('getReviewsByAgent - Debug:', {
        originalAgentId: agentId,
        finalAgentId: finalAgentId.toString(),
        propertiesFound: properties.length,
        propertyIds: propertyIds.length
      });

      // Match both direct agentId reviews and reviews tied to the agent's properties
      // Use both original and final agent IDs for matching
      const match = {
        hiddenFromDashboard: { $ne: true },
        $or: [
          { agentId: agentIdObj },
          { agentId: finalAgentId },
          { propertyId: { $in: propertyIds } }
        ]
      };

      // Counts and pagination
      const totalReviews = await Review.countDocuments(match);
      const totalPages = Math.ceil(totalReviews / limit);

      logger.debug('getReviewsByAgent - Match query:', JSON.stringify(match));
      logger.debug('getReviewsByAgent - Total reviews found:', totalReviews);

      const reviews = await Review.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username email avatar')
        .populate('propertyId', 'propertyKeyword address propertyPrice images');

      // Calculate statistics on full set
      const allReviews = await Review.find(match);
      
      const averageRating = allReviews.length > 0
        ? allReviews.reduce((sum, review) => sum + (review.rating || 0), 0) / allReviews.length
        : 0;
  
      logger.debug('getReviewsByAgent - Results:', {
        reviewsReturned: reviews.length,
        totalReviews: allReviews.length,
        averageRating
      });

      res.status(200).json({
        success: true,
        data: reviews,
        stats: {
          totalReviews: allReviews.length,
          averageRating: Math.round(averageRating * 10) / 10,
          totalProperties: properties.length
        },
        pagination: {
          currentPage: page,
          totalPages,
          totalReviews,
          limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      });
    } catch (error) {
      logger.error('Error in getReviewsByAgent:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error',
        error: error.message 
      });
    }
  };

  // Get reviews written BY a specific user
  const getReviewsByUser = async (req, res) => {
    try {
      const { userId } = req.params;
  
      if (!userId) {
        return res.status(400).json({ message: 'userId is required' });
      }
  
      // Find reviews by userId OR email (for backward compatibility)
      const reviews = await Review.find({ 
        $or: [
          { userId: userId },
          { email: req.query.email } // Optional: pass email as query param for legacy data
        ]
      })
      .sort({ createdAt: -1 })
      .populate('userId', 'username email avatar')
      .populate('propertyId', 'propertyKeyword address propertyPrice');
  
      res.status(200).json(reviews);
    } catch (error) {
      logger.error('Error getting reviews:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };

  // Hide review from dashboard
  const hideReviewFromDashboard = async (req, res) => {
    try {
      const { reviewId } = req.params;
      const { hidden } = req.body; // true to hide, false to show

      const review = await Review.findByIdAndUpdate(
        reviewId,
        { hiddenFromDashboard: hidden },
        { new: true }
      );

      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }

      res.status(200).json({
        success: true,
        message: hidden ? 'Review hidden from dashboard' : 'Review shown on dashboard',
        data: review
      });
    } catch (error) {
      logger.error('Error hiding review from dashboard:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };

  // Hide review from listing
  const hideReviewFromListing = async (req, res) => {
    try {
      const { reviewId } = req.params;
      const { hidden } = req.body; // true to hide, false to show

      const review = await Review.findByIdAndUpdate(
        reviewId,
        { hiddenFromListing: hidden },
        { new: true }
      );

      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }

      res.status(200).json({
        success: true,
        message: hidden ? 'Review hidden from listing' : 'Review shown on listing',
        data: review
      });
    } catch (error) {
      logger.error('Error hiding review from listing:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };

  module.exports ={
    getReviews,
    getReviewsByProperty,
    createReview,
    getReviewsByAgent,
    getReviewsByUser,
    likeReview,
    dislikeReview,
    hideReviewFromDashboard,
    hideReviewFromListing
  }
  