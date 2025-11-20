const mongoose = require('mongoose');
const Listing = require('../models/listing.model');
const Favorite = require('../models/favorite.model')
const errorHandler = require('../utils/error');
const jwt = require('jsonwebtoken');

// Helper function to get user ID from token
const getUserIdFromToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || '5345jkj5kl34j5kl34j5');
      return decoded.id;
    } catch (error) {
      return null;
    }
  }
  return null;
};

const addFavorite = async (req, res, next) => {
  try {
    const { propertyId } = req.body;
    // Use req.user.id from middleware (verifyToken sets it)
    const userId = req.user?.id || req.user?._id?.toString() || getUserIdFromToken(req);

    if (!userId) {
      return next(errorHandler(401, 'User not authenticated'));
    }

    if (!propertyId) {
      return next(errorHandler(400, 'Property ID is required'));
    }

    // Convert IDs to ObjectId for proper matching
    const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const propertyIdObj = mongoose.Types.ObjectId.isValid(propertyId) ? new mongoose.Types.ObjectId(propertyId) : propertyId;

    // Check if property exists
    const listing = await Listing.findById(propertyIdObj);
    if (!listing) return next(errorHandler(404, 'Property not found'));

    // Check if favorite already exists (try both formats)
    let existingFavorite = await Favorite.findOne({
      $or: [
        { userId: userIdObj, propertyId: propertyIdObj },
        { userId: userId, propertyId: propertyId }
      ]
    });

    if (existingFavorite) {
      // Already favorited, return existing
      return res.status(200).json({
        success: true,
        message: 'Property already in favorites',
        data: existingFavorite
      });
    }

    // Create new favorite with ObjectId
    const favorite = await Favorite.create({
      userId: userIdObj,
      propertyId: propertyIdObj,
      addedAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Favorite added successfully',
      data: favorite
    });
  } catch (error) {
    // Handle duplicate key error (unique index)
    if (error.code === 11000) {
      try {
        const userIdForError = getUserIdFromToken(req) || req.user?.id || req.user?._id?.toString();
        const propertyIdForError = req.body?.propertyId;
        
        if (userIdForError && propertyIdForError) {
          const userIdObjForError = mongoose.Types.ObjectId.isValid(userIdForError) ? new mongoose.Types.ObjectId(userIdForError) : userIdForError;
          const propertyIdObjForError = mongoose.Types.ObjectId.isValid(propertyIdForError) ? new mongoose.Types.ObjectId(propertyIdForError) : propertyIdForError;
          
          const existingFavorite = await Favorite.findOne({
            $or: [
              { userId: userIdObjForError, propertyId: propertyIdObjForError },
              { userId: userIdForError, propertyId: propertyIdForError }
            ]
          });
          
          if (existingFavorite) {
            return res.status(200).json({
              success: true,
              message: 'Property already in favorites',
              data: existingFavorite
            });
          }
        }
      } catch (err) {
        // If error handling fails, continue to next error handler
      }
    }
    next(error);
  }
};

const removeFavorite = async (req, res, next) => {
  try {
    // Use req.user.id from middleware (verifyToken sets it)
    const userId = req.user?.id || req.user?._id?.toString() || getUserIdFromToken(req);
    const propertyId = req.params.propertyId;

    if (!userId) {
      return next(errorHandler(401, 'User not authenticated'));
    }

    if (!propertyId) {
      return next(errorHandler(400, 'Property ID is required'));
    }

    // Convert IDs to ObjectId for proper matching
    const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const propertyIdObj = mongoose.Types.ObjectId.isValid(propertyId) ? new mongoose.Types.ObjectId(propertyId) : propertyId;
    
    // Try both formats (ObjectId and string)
    const result = await Favorite.findOneAndDelete({ 
      $or: [
        { userId: userIdObj, propertyId: propertyIdObj },
        { userId: userId, propertyId: propertyId }
      ]
    });
    
    if (!result) {
      return next(errorHandler(404, 'Favorite not found'));
    }

    res.status(200).json({ 
      success: true,
      message: 'Favorite removed successfully' 
    });
  } catch (error) {
    next(error);
  }
};

const getFavorites = async (req, res, next) => {
  try {
    // Use req.user.id from middleware (verifyToken sets it)
    const userId = req.user?.id || req.user?._id?.toString() || getUserIdFromToken(req);

    if (!userId) {
      return next(errorHandler(401, 'User not authenticated'));
    }

    // Get pagination parameters from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Convert userId to ObjectId for proper matching
    const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    // Query with $or to match both string and ObjectId formats (for legacy data)
    const favoriteFilter = {
      $or: [
        { userId: userId }, // String format
        { userId: userIdObj } // ObjectId format
      ]
    };

    // Get all favorites first, then filter out deleted listings
    const allFavorites = await Favorite.find(favoriteFilter)
      .populate({
        path: 'propertyId',
        match: { isDeleted: { $ne: true } } // Only populate non-deleted listings
      })
      .sort({ createdAt: -1 });

    // Filter out favorites where propertyId is null (deleted listings)
    const validFavorites = allFavorites.filter(fav => fav.propertyId !== null);

    // Get total count (only non-deleted listings)
    const totalFavorites = validFavorites.length;
    const totalPages = Math.ceil(totalFavorites / limit);

    // Get paginated favorites
    const favorites = validFavorites.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      data: favorites,
      pagination: {
        currentPage: page,
        totalPages,
        totalFavorites,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

const isFavorited = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    // Use req.user.id from middleware (verifyToken sets it)
    const userId = req.user?.id || req.user?._id?.toString() || getUserIdFromToken(req);

    if (!userId) {
      return next(errorHandler(401, 'User not authenticated'));
    }

    if (!propertyId) {
      return next(errorHandler(400, 'Property ID is required'));
    }

    // Convert IDs to ObjectId for proper matching
    const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const propertyIdObj = mongoose.Types.ObjectId.isValid(propertyId) ? new mongoose.Types.ObjectId(propertyId) : propertyId;
    
    // Check if property is favorited - try both formats
    const favorite = await Favorite.findOne({ 
      $or: [
        { userId: userIdObj, propertyId: propertyIdObj },
        { userId: userId, propertyId: propertyId }
      ]
    });
    
    res.status(200).json({
      success: true,
      isFavorited: !!favorite,
      favoriteId: favorite?._id || null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addFavorite,
  removeFavorite,
  getFavorites,
  isFavorited
};
