const Listing = require('../models/listing.model');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

/**
 * Get city statistics (counts for each city)
 * OPTIMIZED: Uses single aggregation query + caching for much better performance
 * Handles both city and state fields for backward compatibility
 */
const getCityStats = async (req, res, next) => {
  try {
    const startTime = Date.now();
    const language = req.language || 'en';
    const cacheKey = `city_stats_${language}`;
    
    // Check cache first (5 minute TTL)
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      logger.info(`City stats served from cache (${Date.now() - startTime}ms)`);
      
      // Set cache headers for HTTP caching
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
      res.set('X-Cache', 'HIT');
      
      return res.status(200).json(cachedData);
    }
    
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
    
    // Single optimized aggregation query
    // Handles both city and state fields, normalizes city names
    const cityStats = await Listing.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          isSold: { $ne: true },
          $or: [
            { approvalStatus: 'approved' },
            { approvalStatus: { $regex: /^approved$/i } }
          ],
          // Ensure we have a valid city or state
          $or: [
            { city: { $exists: true, $ne: null, $ne: '' } },
            { state: { $exists: true, $ne: null, $ne: '' } }
          ]
        }
      },
      {
        $project: {
          // Use city if available, fallback to state
          cityName: {
            $cond: {
              if: { $and: [{ $ne: ['$city', null] }, { $ne: ['$city', ''] }] },
              then: { $trim: { input: '$city' } },
              else: { $trim: { input: '$state' } }
            }
          }
        }
      },
      {
        $match: {
          cityName: { $exists: true, $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: {
            $toLower: { $trim: { input: '$cityName' } }
          },
          count: { $sum: 1 },
          // Keep original case for display
          originalName: { $first: '$cityName' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $project: {
          _id: 0,
          city: '$originalName',
          count: 1
        }
      }
    ]);
    
    // Get total count from the same query
    const totalCount = cityStats.reduce((sum, stat) => sum + stat.count, 0);
    
    // Map city names to images
    const cityImageMap = {
      'aleppo': '/images/cities/aleppo.jpg',
      'damascus': '/images/cities/damascus.jpg',
      'daraa': '/images/cities/daraa.webp',
      'deir ez-zur': '/images/cities/Deir ez-Zur.jpg',
      'deir ez zur': '/images/cities/Deir ez-Zur.jpg',
      'hama': '/images/cities/hama.jpg',
      'homs': '/images/cities/Homs.jpg',
      'idlib': '/images/cities/idlib.jpg',
      'latakia': '/images/cities/latakia.jpeg',
      'tartus': '/images/cities/tartous.jpg',
      'tartous': '/images/cities/tartous.jpg'
    };
    
    // Add image paths and normalize city names
    const citiesWithImages = cityStats.map(city => {
      const cityLower = city.city.toLowerCase().trim();
      const imageKey = Object.keys(cityImageMap).find(key => 
        cityLower === key || cityLower.includes(key) || key.includes(cityLower)
      );
      
      return {
        city: city.city,
        displayName: city.city,
        count: city.count,
        imageSrc: imageKey ? cityImageMap[imageKey] : '/images/cities/SY.webp'
      };
    });
    
    const queryTime = Date.now() - startTime;
    logger.info(`City stats fetched in ${queryTime}ms: ${citiesWithImages.length} cities, total: ${totalCount} listings`);
    
    // Translate cities if translation function is available
    const { translateCities } = require('../utils/translateData');
    const translatedCities = req.t ? translateCities(citiesWithImages, req.t) : citiesWithImages;
    
    const response = {
      success: true,
      message: req.t ? req.t('city.fetch_success') : 'Cities retrieved successfully',
      data: {
        cities: translatedCities,
        total: totalCount,
        timestamp: new Date().toISOString()
      }
    };
    
    // Cache the response for 5 minutes (300 seconds)
    cache.set(cacheKey, response, 300);
    
    // Set cache headers
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes HTTP cache
    res.set('X-Cache', 'MISS');
    res.set('X-Query-Time', `${queryTime}ms`);
    
    res.status(200).json(response);
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
    
    // Get count for specific city (case-insensitive) - only approved, not sold
    // Try exact match first, fallback to case-insensitive regex
    let count = await Listing.countDocuments({
      $or: [
        { city: { $regex: new RegExp(`^${cityName}$`, 'i') } },
        { state: { $regex: new RegExp(`^${cityName}$`, 'i') } } // Fallback to state for backward compatibility
      ],
      isDeleted: { $ne: true },
      isSold: { $ne: true },
      approvalStatus: 'approved'
    });
    
    if (count === 0) {
      count = await Listing.countDocuments({
        $or: [
          { city: { $regex: new RegExp(`^${cityName}$`, 'i') } },
          { state: { $regex: new RegExp(`^${cityName}$`, 'i') } }
        ],
        isDeleted: { $ne: true },
        isSold: { $ne: true },
        approvalStatus: { $regex: /^approved$/i }
      });
    }
    
    // Get average price for this city
    const avgPriceResult = await Listing.aggregate([
      {
        $match: {
          $or: [
            { city: { $regex: new RegExp(`^${cityName}$`, 'i') } },
            { state: { $regex: new RegExp(`^${cityName}$`, 'i') } }
          ],
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
    
    // Translate city name if translation function is available
    let translatedCityName = cityName;
    if (req.t) {
      const cityKey = `cities.${cityName}`;
      const translated = req.t(cityKey);
      if (translated && translated !== cityKey) {
        translatedCityName = translated;
      }
    }
    
    res.status(200).json({
      success: true,
      message: req.t ? req.t('city.fetch_one_success') : 'City details retrieved successfully',
      data: {
        city: translatedCityName,
        cityOriginal: cityName, // Keep original for filtering
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
    // Get distinct cities from database (only approved, not sold)
    // Try exact match first, fallback to case-insensitive regex
    let cities = await Listing.distinct('city', {
      isDeleted: { $ne: true },
      isSold: { $ne: true },
      approvalStatus: 'approved',
      city: { $exists: true, $ne: null, $ne: '' }
    });
    
    if (cities.length === 0) {
      cities = await Listing.distinct('city', {
        isDeleted: { $ne: true },
        isSold: { $ne: true },
        approvalStatus: { $regex: /^approved$/i },
        city: { $exists: true, $ne: null, $ne: '' }
      });
    }
    
    // Also get distinct states for backward compatibility (only approved, not sold)
    let states = await Listing.distinct('state', {
      isDeleted: { $ne: true },
      isSold: { $ne: true },
      approvalStatus: 'approved',
      state: { $exists: true, $ne: null, $ne: '' }
    });
    
    if (states.length === 0) {
      states = await Listing.distinct('state', {
        isDeleted: { $ne: true },
        isSold: { $ne: true },
        approvalStatus: { $regex: /^approved$/i },
        state: { $exists: true, $ne: null, $ne: '' }
      });
    }
    
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

/**
 * Clear city stats cache (useful when listings are added/updated/deleted)
 */
const clearCityCache = async (req, res, next) => {
  try {
    const cache = require('../utils/cache');
    cache.delete('city_stats_en');
    cache.delete('city_stats_ar');
    // Clear all city-related cache keys
    cache.cleanExpired();
    
    logger.info('City stats cache cleared');
    
    res.status(200).json({
      success: true,
      message: 'City cache cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing city cache:', error);
    next(error);
  }
};

module.exports = {
  getCityStats,
  getCityDetails,
  getAllCities,
  clearCityCache
};

