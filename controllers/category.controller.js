const Listing = require('../models/listing.model');
const logger = require('../utils/logger');

/**
 * Get category statistics (counts for each property type)
 * OPTIMIZED: Uses single aggregation query for better performance
 * NOTE: Caching removed to always show fresh data
 */
const getCategoryStats = async (req, res, next) => {
  try {
    const startTime = Date.now();
    const language = req.language || 'en';
    
    // Wait for MongoDB connection if not ready
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      // Connection not ready, wait up to 5 seconds
      let attempts = 0;
      while (mongoose.connection.readyState !== 1 && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
          success: false,
          message: 'Database connection not ready. Please try again in a moment.'
        });
      }
    }
    
    // Define property types with normalized matching
    // Using single aggregation query instead of multiple count queries
    const propertyTypeMapping = {
      'Apartment': { patterns: ['apartment'], displayName: 'Apartment' },
      'Villa/farms': { patterns: ['villa', 'farm', 'villa/farms'], displayName: 'Villa/farms' },
      'Building': { patterns: ['building'], displayName: 'Building' },
      'Office': { patterns: ['office'], displayName: 'Office' },
      'Commercial': { patterns: ['commercial'], displayName: 'Commercial' },
      'Land': { patterns: ['land', 'land/plot'], displayName: 'Land/Plot' },
      'Holiday Home': { patterns: ['holiday home', 'holiday homes'], displayName: 'Holiday Home' }
    };
    
    // Single aggregation query to get all counts at once
    // This is MUCH faster than multiple count queries
    const categoryStats = await Listing.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          isSold: { $ne: true },
          $or: [
            { approvalStatus: 'approved' },
            { approvalStatus: { $regex: /^approved$/i } }
          ]
        }
      },
      {
        $group: {
          _id: {
            $toLower: { 
              $trim: { 
                input: { 
                  $ifNull: ['$propertyType', ''] 
                } 
              } 
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Create a map for quick lookup (normalized property types)
    const statsMap = new Map();
    categoryStats.forEach(stat => {
      if (stat._id) {
        const normalizedType = stat._id.toLowerCase().trim();
        // Store both exact match and allow pattern matching
        if (!statsMap.has(normalizedType)) {
          statsMap.set(normalizedType, 0);
        }
        statsMap.set(normalizedType, statsMap.get(normalizedType) + stat.count);
      }
    });
    
    // Map property types to counts using flexible matching
    const stats = Object.entries(propertyTypeMapping).map(([name, config]) => {
      let count = 0;
      const matchedTypes = new Set(); // Track which DB types we've already counted
      
      // Try to find matching property type in stats
      for (const pattern of config.patterns) {
        const patternLower = pattern.toLowerCase();
        for (const [dbType, dbCount] of statsMap.entries()) {
          // Avoid double counting
          if (matchedTypes.has(dbType)) continue;
          
          // Flexible matching: check if pattern matches DB type or vice versa
          if (dbType.includes(patternLower) || patternLower.includes(dbType) || 
              dbType === patternLower) {
            count += dbCount;
            matchedTypes.add(dbType);
          }
        }
      }
      
      // Special handling for Villa/farms - sum villa and farm separately
      if (name === 'Villa/farms') {
        for (const [dbType, dbCount] of statsMap.entries()) {
          if (!matchedTypes.has(dbType) && 
              (dbType.includes('villa') || dbType.includes('farm'))) {
            count += dbCount;
            matchedTypes.add(dbType);
          }
        }
      }
      
      return {
        name,
        displayName: config.displayName,
        count,
        slug: name.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-')
      };
    });
    
    // Get total count from aggregation result
    const totalCount = categoryStats.reduce((sum, stat) => sum + stat.count, 0);
    
    const queryTime = Date.now() - startTime;
    logger.info(`Category stats fetched in ${queryTime}ms: ${stats.length} categories, total: ${totalCount} listings`);
    
    // Translate categories if translation function is available
    const { translateCategories } = require('../utils/translateData');
    const translatedCategories = req.t ? translateCategories(stats, req.t) : stats;
    
    const response = {
      success: true,
      message: req.t ? req.t('category.fetch_success') : 'Categories retrieved successfully',
      data: {
        categories: translatedCategories,
        total: totalCount,
        timestamp: new Date().toISOString()
      }
    };
    
    // No caching - always return fresh data
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('X-Query-Time', `${queryTime}ms`);
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error fetching category stats:', error);
    next(error);
  }
};

/**
 * Get detailed category information with optional filters
 */
const getCategoryDetails = async (req, res, next) => {
  try {
    const { propertyType } = req.params;
    
    if (!propertyType) {
      return res.status(400).json({
        success: false,
        message: 'Property type is required'
      });
    }
    
    // Get count for specific property type (only approved)
    // Try exact match first, fallback to case-insensitive regex
    let count = await Listing.countDocuments({
      propertyType: { $regex: new RegExp(`^${propertyType}$`, 'i') },
      isDeleted: { $ne: true },
      isSold: { $ne: true },
      approvalStatus: 'approved'
    });
    
    if (count === 0) {
      count = await Listing.countDocuments({
        propertyType: { $regex: new RegExp(`^${propertyType}$`, 'i') },
        isDeleted: { $ne: true },
        isSold: { $ne: true },
        approvalStatus: { $regex: /^approved$/i }
      });
    }
    
    // Get average price for this category
    const avgPriceResult = await Listing.aggregate([
      {
        $match: {
          propertyType: { $regex: new RegExp(`^${propertyType}$`, 'i') },
          isDeleted: { $ne: true },
          isSold: { $ne: true },
          $or: [
            { approvalStatus: 'approved' },
            { approvalStatus: { $regex: /^approved$/i } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          avgPrice: { $avg: '$propertyPrice' },
          minPrice: { $min: '$propertyPrice' },
          maxPrice: { $max: '$propertyPrice' }
        }
      }
    ]);
    
    const stats = avgPriceResult[0] || {
      avgPrice: 0,
      minPrice: 0,
      maxPrice: 0
    };
    
    res.status(200).json({
      success: true,
      message: req.t ? req.t('category.fetch_one_success') : 'Category details retrieved successfully',
      data: {
        propertyType,
        count,
        priceStats: {
          average: Math.round(stats.avgPrice || 0),
          min: stats.minPrice || 0,
          max: stats.maxPrice || 0
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error fetching category details:', error);
    next(error);
  }
};

/**
 * Get all available property types (for admin/management)
 */
const getAllPropertyTypes = async (req, res, next) => {
  try {
    // Get distinct property types from database (only approved, not sold)
    // Try exact match first, fallback to case-insensitive regex
    let propertyTypes = await Listing.distinct('propertyType', {
      isDeleted: { $ne: true },
      isSold: { $ne: true },
      approvalStatus: 'approved'
    });
    
    if (propertyTypes.length === 0) {
      propertyTypes = await Listing.distinct('propertyType', {
        isDeleted: { $ne: true },
        isSold: { $ne: true },
        approvalStatus: { $regex: /^approved$/i }
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        propertyTypes: propertyTypes.sort(),
        count: propertyTypes.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error fetching property types:', error);
    next(error);
  }
};

/**
 * Clear category stats cache (deprecated - caching removed)
 * Kept for backward compatibility but does nothing
 */
const clearCategoryCache = async (req, res, next) => {
  try {
    logger.info('Category cache clear requested (caching is disabled)');
    
    res.status(200).json({
      success: true,
      message: 'Caching is disabled - data is always fresh'
    });
  } catch (error) {
    logger.error('Error in clearCategoryCache:', error);
    next(error);
  }
};

module.exports = {
  getCategoryStats,
  getCategoryDetails,
  getAllPropertyTypes,
  clearCategoryCache
};

