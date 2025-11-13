const Point = require('../models/point.model');
const PointTransaction = require('../models/pointTransaction.model');
const User = require('../models/user.model');
const errorHandler = require('../utils/error');

// Calculate points needed for listing based on various factors
const calculateListingPoints = (listingData) => {
  let baseCost = 50; // Base cost for any listing

  // Property type multiplier
  const typeMultiplier = {
    'apartment': 1.0,
    'house': 1.2,
    'villa': 1.5,
    'commercial': 2.0,
    'land': 0.8
  };

  // Parse size if it's a string (from multipart/form-data)
  const size = listingData.size ? parseInt(listingData.size) : 0;
  const bedrooms = listingData.bedrooms ? parseInt(listingData.bedrooms) : 0;

  // Size factor (larger properties cost more)
  let sizeFactor = 1.0;
  if (size > 200) sizeFactor += 0.2;
  if (size > 500) sizeFactor += 0.3;
  if (size > 1000) sizeFactor += 0.5;

  // Bedroom factor
  let bedroomFactor = 1.0;
  if (bedrooms > 3) bedroomFactor += 0.1;
  if (bedrooms > 5) bedroomFactor += 0.2;

  // Amenities factor
  let amenitiesFactor = 1.0;
  let amenitiesLength = 0;
  
  if (listingData.amenities) {
    // Handle both array and comma-separated string
    if (Array.isArray(listingData.amenities)) {
      amenitiesLength = listingData.amenities.length;
    } else if (typeof listingData.amenities === 'string') {
      amenitiesLength = listingData.amenities.split(',').filter(a => a.trim()).length;
    }
  }
  
  if (amenitiesLength > 5) amenitiesFactor += 0.2;
  if (amenitiesLength > 10) amenitiesFactor += 0.3;

  // Images factor (will be calculated later after upload)
  let imagesFactor = 1.0;
  let imagesLength = 0;
  
  if (listingData.images) {
    imagesLength = Array.isArray(listingData.images) ? listingData.images.length : 0;
  } else if (listingData.imageNames) {
    // Handle imageNames from multipart form
    if (Array.isArray(listingData.imageNames)) {
      imagesLength = listingData.imageNames.length;
    } else if (typeof listingData.imageNames === 'string') {
      imagesLength = listingData.imageNames.split(',').filter(n => n.trim()).length;
    }
  }
  
  if (imagesLength > 5) imagesFactor += 0.1;
  if (imagesLength > 10) imagesFactor += 0.2;

  const totalCost = Math.round(
    baseCost * 
    (typeMultiplier[listingData.propertyType] || 1.0) * 
    sizeFactor * 
    bedroomFactor * 
    amenitiesFactor * 
    imagesFactor
  );

  return totalCost;
};

// Middleware to check and deduct points before creating a listing
const checkAndDeductPoints = async (req, res, next) => {
  try {
    const logger = require('../utils/logger');
    logger.debug('checkAndDeductPoints - req.user:', req.user);
    logger.debug('checkAndDeductPoints - req.body keys:', Object.keys(req.body || {}));
    
    // Get userId from req.user - handle both id and _id properties
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    
    logger.debug('checkAndDeductPoints - userId:', userId);
    
    if (!userId) {
      logger.error('checkAndDeductPoints - User ID not found in token. req.user:', req.user);
      return res.status(401).json({
        success: false,
        message: 'User ID not found in token'
      });
    }
    
    const listingData = req.body;
    
    logger.debug('checkAndDeductPoints - req.body keys:', Object.keys(req.body || {}));
    logger.debug('checkAndDeductPoints - req.body:', req.body);
    logger.debug('checkAndDeductPoints - listingData:', listingData);

    // Get user to check trial and unlimited points flags
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Skip point checking if user is on trial OR has unlimited points
    if (user.isTrial === true || user.hasUnlimitedPoints === true) {
      // Store flag to skip deduction later
      req.skipPointDeduction = true;
      return next();
    }

    // Calculate points needed for this listing
    const pointsNeeded = calculateListingPoints(listingData);

    // Get user's point record
    let userPoints = await Point.findOne({ userId });
    if (!userPoints) {
      userPoints = await Point.create({ userId, balance: 0 });
    }

    // Check if user has enough points
    if (userPoints.balance < pointsNeeded) {
      return res.status(400).json({
        success: false,
        message: `Insufficient points. You need ${pointsNeeded} points but only have ${userPoints.balance}`,
        requiredPoints: pointsNeeded,
        currentBalance: userPoints.balance,
        shortfall: pointsNeeded - userPoints.balance
      });
    }

    // Store the points needed in the request for later use
    req.pointsNeeded = pointsNeeded;
    req.userPoints = userPoints;

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to actually deduct points after successful listing creation
const deductPointsAfterListing = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const listingId = req.listingId || res.locals.listingId; // Assuming listing ID is available
    const pointsNeeded = req.pointsNeeded;
    const userPoints = req.userPoints;

    if (!pointsNeeded || !userPoints) {
      return next(); // Skip if points weren't calculated
    }

    // Deduct points
    const newBalance = userPoints.balance - pointsNeeded;
    userPoints.balance = newBalance;
    userPoints.totalUsed += pointsNeeded;
    await userPoints.save();

    // Update user's points balance
    await User.findByIdAndUpdate(userId, { pointsBalance: newBalance });

    // Create transaction record
    await PointTransaction.create({
      userId,
      type: 'deduction',
      amount: pointsNeeded,
      description: `Points deducted for listing publication`,
      listingId,
      balanceAfter: newBalance
    });

    // Add points info to response
    res.locals.pointsDeducted = {
      amount: pointsNeeded,
      newBalance: newBalance
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to refund points when listing is deleted
const refundPointsOnListingDelete = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const listingId = req.params.id;

    // Find the transaction for this listing
    const transaction = await PointTransaction.findOne({
      userId,
      listingId,
      type: 'deduction'
    });

    if (transaction) {
      // Get user's point record
      let userPoints = await Point.findOne({ userId });
      if (!userPoints) {
        userPoints = await Point.create({ userId, balance: 0 });
      }

      // Refund points
      const newBalance = userPoints.balance + transaction.amount;
      userPoints.balance = newBalance;
      await userPoints.save();

      // Update user's points balance
      await User.findByIdAndUpdate(userId, { pointsBalance: newBalance });

      // Create refund transaction record
      await PointTransaction.create({
        userId,
        type: 'refund',
        amount: transaction.amount,
        description: `Points refunded for deleted listing`,
        listingId,
        balanceAfter: newBalance
      });

      res.locals.pointsRefunded = {
        amount: transaction.amount,
        newBalance: newBalance
      };
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  calculateListingPoints,
  checkAndDeductPoints,
  deductPointsAfterListing,
  refundPointsOnListingDelete
};
