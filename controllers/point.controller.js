const User = require('../models/user.model');
const Point = require('../models/point.model');
const PointTransaction = require('../models/pointTransaction.model');
const errorHandler = require('../utils/error');

// Get user's point balance
const getPointBalance = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get or create point record for user
    let userPoints = await Point.findOne({ userId });
    if (!userPoints) {
      userPoints = await Point.create({ userId, balance: 0 });
    }

    // Get recent transactions
    const transactions = await PointTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('listingId', 'propertyKeyword propertyPrice');

    res.status(200).json({
      success: true,
      data: {
        balance: userPoints.balance,
        totalPurchased: userPoints.totalPurchased,
        totalUsed: userPoints.totalUsed,
        recentTransactions: transactions
      }
    });
  } catch (error) {
    next(error);
  }
};

// Charge points (purchase points)
const chargePoints = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount, paymentMethod, paymentReference } = req.body;

    if (!amount || amount <= 0) {
      return next(errorHandler(400, 'Invalid amount'));
    }

    if (!paymentMethod || !paymentReference) {
      return next(errorHandler(400, 'Payment method and reference are required'));
    }

    // Get or create point record for user
    let userPoints = await Point.findOne({ userId });
    if (!userPoints) {
      userPoints = await Point.create({ userId, balance: 0 });
    }

    // Update point balance
    const newBalance = userPoints.balance + amount;
    userPoints.balance = newBalance;
    userPoints.totalPurchased += amount;
    await userPoints.save();

    // Update user's points balance
    await User.findByIdAndUpdate(userId, { pointsBalance: newBalance });

    // Create transaction record
    const transaction = await PointTransaction.create({
      userId,
      type: 'purchase',
      amount,
      description: `Purchased ${amount} points`,
      paymentMethod,
      paymentReference,
      balanceAfter: newBalance
    });

    res.status(200).json({
      success: true,
      message: `Successfully charged ${amount} points`,
      data: {
        newBalance,
        transaction
      }
    });
  } catch (error) {
    next(error);
  }
};

// Deduct points (for listing publication)
const deductPoints = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount, listingId, description } = req.body;

    if (!amount || amount <= 0) {
      return next(errorHandler(400, 'Invalid amount'));
    }

    if (!listingId) {
      return next(errorHandler(400, 'Listing ID is required'));
    }

    // Check if user is on trial or has unlimited points
    const user = await User.findById(userId);
    if (!user) {
      return next(errorHandler(404, 'User not found'));
    }

    // Skip deduction if user is on trial or has unlimited points
    if (user.isTrial === true || user.hasUnlimitedPoints === true) {
      return res.status(200).json({
        success: true,
        message: `Points not deducted. User is on trial or has unlimited points.`,
        data: {
          skipped: true,
          reason: user.isTrial ? 'trial_period' : 'unlimited_points'
        }
      });
    }

    // Get user's point record
    let userPoints = await Point.findOne({ userId });
    if (!userPoints) {
      return next(errorHandler(400, 'No points account found'));
    }

    // Check if user has enough points
    if (userPoints.balance < amount) {
      return next(errorHandler(400, 'Insufficient points balance'));
    }

    // Deduct points
    const newBalance = userPoints.balance - amount;
    userPoints.balance = newBalance;
    userPoints.totalUsed += amount;
    await userPoints.save();

    // Update user's points balance
    await User.findByIdAndUpdate(userId, { pointsBalance: newBalance });

    // Create transaction record
    const transaction = await PointTransaction.create({
      userId,
      type: 'deduction',
      amount,
      description: description || `Points deducted for listing publication`,
      listingId,
      balanceAfter: newBalance
    });

    res.status(200).json({
      success: true,
      message: `Successfully deducted ${amount} points`,
      data: {
        newBalance,
        transaction
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get point transaction history
const getTransactionHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const transactions = await PointTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('listingId', 'propertyKeyword propertyPrice');

    const total = await PointTransaction.countDocuments({ userId });

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Calculate points needed for listing based on factors
const calculateListingCost = async (req, res, next) => {
  try {
    const { propertyType, bedrooms, bathrooms, size, amenities, images } = req.body;

    let baseCost = 50; // Base cost for any listing

    // Property type multiplier
    const typeMultiplier = {
      'apartment': 1.0,
      'house': 1.2,
      'villa': 1.5,
      'commercial': 2.0,
      'land': 0.8
    };

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
    if (amenities && amenities.length > 5) amenitiesFactor += 0.2;
    if (amenities && amenities.length > 10) amenitiesFactor += 0.3;

    // Images factor
    let imagesFactor = 1.0;
    if (images && images.length > 5) imagesFactor += 0.1;
    if (images && images.length > 10) imagesFactor += 0.2;

    const totalCost = Math.round(
      baseCost * 
      (typeMultiplier[propertyType] || 1.0) * 
      sizeFactor * 
      bedroomFactor * 
      amenitiesFactor * 
      imagesFactor
    );

    res.status(200).json({
      success: true,
      data: {
        totalCost,
        breakdown: {
          baseCost,
          typeMultiplier: typeMultiplier[propertyType] || 1.0,
          sizeFactor,
          bedroomFactor,
          amenitiesFactor,
          imagesFactor
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Refund points (for deleted listings)
const refundPoints = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount, listingId, description } = req.body;

    if (!amount || amount <= 0) {
      return next(errorHandler(400, 'Invalid amount'));
    }

    // Get user's point record
    let userPoints = await Point.findOne({ userId });
    if (!userPoints) {
      userPoints = await Point.create({ userId, balance: 0 });
    }

    // Add refunded points
    const newBalance = userPoints.balance + amount;
    userPoints.balance = newBalance;
    await userPoints.save();

    // Update user's points balance
    await User.findByIdAndUpdate(userId, { pointsBalance: newBalance });

    // Create transaction record
    const transaction = await PointTransaction.create({
      userId,
      type: 'refund',
      amount,
      description: description || `Points refunded`,
      listingId,
      balanceAfter: newBalance
    });

    res.status(200).json({
      success: true,
      message: `Successfully refunded ${amount} points`,
      data: {
        newBalance,
        transaction
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPointBalance,
  chargePoints,
  deductPoints,
  getTransactionHistory,
  calculateListingCost,
  refundPoints
};
