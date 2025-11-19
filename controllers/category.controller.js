const Listing = require('../models/listing.model');
const logger = require('../utils/logger');

/**
 * Get category statistics (counts for each property type)
 * This is much more efficient than fetching all listings
 */
const getCategoryStats = async (req, res, next) => {
  try {
    // Define all property types with flexible matching
    const propertyTypes = [
      { name: 'Apartment', match: ['Apartment', 'apartment'] },
      { name: 'Villa/farms', match: ['Villa/farms', 'Villa', 'villa', 'Farm', 'farm'] },
      { name: 'Office', match: ['Office', 'office'] },
      { name: 'Commercial', match: ['Commercial', 'commercial'] },
      { name: 'Land', match: ['Land', 'land', 'Land/Plot'] },
      { name: 'Holiday Home', match: ['Holiday Home', 'Holiday Homes', 'holiday home', 'holiday homes'] }
    ];
    
    // Get counts for each property type using flexible matching
    const stats = await Promise.all(
      propertyTypes.map(async (typeConfig) => {
        let count = 0;
        
        // Try exact match first (only approved, not sold)
        count = await Listing.countDocuments({
          propertyType: { $in: typeConfig.match },
          isDeleted: { $ne: true },
          isSold: { $ne: true },
          approvalStatus: 'approved'
        });
        
        // If no exact match, try case-insensitive regex for each match pattern (only approved)
        if (count === 0) {
          for (const pattern of typeConfig.match) {
            const regexCount = await Listing.countDocuments({
              propertyType: { $regex: new RegExp(pattern, 'i') },
              isDeleted: { $ne: true },
              isSold: { $ne: true },
              approvalStatus: 'approved'
            });
            if (regexCount > 0) {
              count = regexCount;
              break;
            }
          }
        }
        
        // Special handling for Villa/farms - check if it contains villa or farm (only approved)
        if (typeConfig.name === 'Villa/farms' && count === 0) {
          count = await Listing.countDocuments({
            $or: [
              { propertyType: { $regex: /villa/i } },
              { propertyType: { $regex: /farm/i } }
            ],
            isDeleted: { $ne: true },
            isSold: { $ne: true },
            approvalStatus: 'approved'
          });
        }
        
        return {
          name: typeConfig.name,
          displayName: typeConfig.name === 'Land' ? 'Land/Plot' : typeConfig.name,
          count,
          slug: typeConfig.name.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-')
        };
      })
    );
    
    // Also get total count (only approved, not sold)
    const totalCount = await Listing.countDocuments({
      isDeleted: { $ne: true },
      isSold: { $ne: true },
      approvalStatus: 'approved'
    });
    
    logger.info(`Category stats fetched: ${stats.length} categories, total: ${totalCount} listings`);
    logger.debug('Category stats:', stats);
    
    res.status(200).json({
      success: true,
      data: {
        categories: stats,
        total: totalCount,
        timestamp: new Date().toISOString()
      }
    });
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
    const count = await Listing.countDocuments({
      propertyType: { $regex: new RegExp(`^${propertyType}$`, 'i') },
      isDeleted: { $ne: true },
      isSold: { $ne: true },
      approvalStatus: 'approved'
    });
    
    // Get average price for this category
    const avgPriceResult = await Listing.aggregate([
      {
        $match: {
          propertyType: { $regex: new RegExp(`^${propertyType}$`, 'i') },
          isDeleted: { $ne: true },
          isSold: { $ne: true },
          approvalStatus: 'approved'
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
    const propertyTypes = await Listing.distinct('propertyType', {
      isDeleted: { $ne: true },
      isSold: { $ne: true },
      approvalStatus: 'approved'
    });
    
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

module.exports = {
  getCategoryStats,
  getCategoryDetails,
  getAllPropertyTypes
};

