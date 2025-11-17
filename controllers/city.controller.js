const Listing = require('../models/listing.model');
const logger = require('../utils/logger');

/**
 * Get city statistics (counts for each city)
 * This is much more efficient than fetching all listings
 */
const getCityStats = async (req, res, next) => {
  try {
    // Use aggregation to get counts for each city
    // This is much faster than fetching all listings and counting manually
    const cityStats = await Listing.aggregate([
      // Match only non-deleted listings
      {
        $match: {
          isDeleted: { $ne: true }
        }
      },
      // Group by city and count
      {
        $group: {
          _id: '$city', // Group by city field
          count: { $sum: 1 }
        }
      },
      // Sort by count descending (cities with most properties first)
      {
        $sort: { count: -1 }
      },
      // Project to clean format
      {
        $project: {
          _id: 0,
          city: '$_id',
          count: 1
        }
      }
    ]);
    
    // Also get total count
    const totalCount = await Listing.countDocuments({
      isDeleted: { $ne: true }
    });
    
    // Map city names to images
    const cityImageMap = {
      'Aleppo': '/images/cities/aleppo.jpg',
      'Damascus': '/images/cities/damascus.jpg',
      'Daraa': '/images/cities/daraa.webp',
      'Der El Zor': '/images/cities/deralzor.jpg',
      'Hama': '/images/cities/hama.jpg',
      'Homs': '/images/cities/Homs.jpg',
      'Idlib': '/images/cities/idlib.jpg',
      'Latakia': '/images/cities/latakia.jpeg',
      'Tartus': '/images/cities/tartous.jpg'
    };
    
    // Add image paths to city stats
    const citiesWithImages = cityStats.map(city => ({
      ...city,
      imageSrc: cityImageMap[city.city] || '/images/cities/SY.webp',
      // Handle both city and state fields for backward compatibility
      displayName: city.city || 'Unknown'
    }));
    
    logger.info(`City stats fetched: ${citiesWithImages.length} cities, total: ${totalCount} listings`);
    logger.debug('City stats:', citiesWithImages);
    
    res.status(200).json({
      success: true,
      data: {
        cities: citiesWithImages,
        total: totalCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error fetching city stats:', error);
    next(error);
  }
};

/**
 * Get detailed information for a specific city
 */
const getCityDetails = async (req, res, next) => {
  try {
    const { cityName } = req.params;
    
    if (!cityName) {
      return res.status(400).json({
        success: false,
        message: 'City name is required'
      });
    }
    
    // Get count for specific city (case-insensitive)
    const count = await Listing.countDocuments({
      $or: [
        { city: { $regex: new RegExp(`^${cityName}$`, 'i') } },
        { state: { $regex: new RegExp(`^${cityName}$`, 'i') } } // Fallback to state for backward compatibility
      ],
      isDeleted: { $ne: true }
    });
    
    // Get average price for this city
    const avgPriceResult = await Listing.aggregate([
      {
        $match: {
          $or: [
            { city: { $regex: new RegExp(`^${cityName}$`, 'i') } },
            { state: { $regex: new RegExp(`^${cityName}$`, 'i') } }
          ],
          isDeleted: { $ne: true }
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
        city: cityName,
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
    logger.error('Error fetching city details:', error);
    next(error);
  }
};

/**
 * Get all available cities (for admin/management)
 */
const getAllCities = async (req, res, next) => {
  try {
    // Get distinct cities from database
    const cities = await Listing.distinct('city', {
      isDeleted: { $ne: true },
      city: { $exists: true, $ne: null, $ne: '' }
    });
    
    // Also get distinct states for backward compatibility
    const states = await Listing.distinct('state', {
      isDeleted: { $ne: true },
      state: { $exists: true, $ne: null, $ne: '' }
    });
    
    // Combine and remove duplicates
    const allLocations = [...new Set([...cities, ...states])].sort();
    
    res.status(200).json({
      success: true,
      data: {
        cities: allLocations,
        count: allLocations.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error fetching cities:', error);
    next(error);
  }
};

module.exports = {
  getCityStats,
  getCityDetails,
  getAllCities
};

