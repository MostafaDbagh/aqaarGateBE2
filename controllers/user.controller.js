const bcryptjs = require('bcryptjs');
const User = require('../models/user.model.js');
const errorHandler = require('../utils/error.js');
const  Listing = require( '../models/listing.model.js');

const test = (req, res) => {
  res.json({
    message: 'Api route is working!',
  });
};

const updateUser = async (req, res, next) => {
  if (req.user.id !== req.params.id)
    return next(errorHandler(401, 'You can only update your own account!'));
  try {
    // Prepare update object
    const updateData = {};
    
    // Basic fields
    if (req.body.username) updateData.username = req.body.username;
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.avatar) updateData.avatar = req.body.avatar;
    if (req.body.posterImage) updateData.posterImage = req.body.posterImage;
    
    // Profile fields
    if (req.body.username !== undefined) updateData.username = req.body.username;
    if (req.body.username_ar !== undefined) updateData.username_ar = req.body.username_ar;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.description_ar !== undefined) updateData.description_ar = req.body.description_ar;
    if (req.body.company !== undefined) updateData.company = req.body.company;
    if (req.body.company_ar !== undefined) updateData.company_ar = req.body.company_ar;
    if (req.body.position !== undefined) updateData.position = req.body.position;
    if (req.body.position_ar !== undefined) updateData.position_ar = req.body.position_ar;
    if (req.body.officeNumber !== undefined) updateData.officeNumber = req.body.officeNumber;
    if (req.body.officeAddress !== undefined) updateData.officeAddress = req.body.officeAddress;
    if (req.body.officeAddress_ar !== undefined) updateData.officeAddress_ar = req.body.officeAddress_ar;
    if (req.body.job !== undefined) updateData.job = req.body.job;
    if (req.body.job_ar !== undefined) updateData.job_ar = req.body.job_ar;
    if (req.body.phone !== undefined) updateData.phone = req.body.phone;
    if (req.body.location !== undefined) updateData.location = req.body.location;
    if (req.body.location_ar !== undefined) updateData.location_ar = req.body.location_ar;
    if (req.body.city !== undefined) updateData.city = req.body.city;
    
    // Social media fields
    if (req.body.facebook !== undefined) updateData.facebook = req.body.facebook;
    if (req.body.twitter !== undefined) updateData.twitter = req.body.twitter;
    if (req.body.linkedin !== undefined) updateData.linkedin = req.body.linkedin;
    
    // Services & Expertise - handle array
    if (req.body.servicesAndExpertise !== undefined) {
      // Handle both array and comma-separated string
      if (Array.isArray(req.body.servicesAndExpertise)) {
        updateData.servicesAndExpertise = req.body.servicesAndExpertise;
      } else if (typeof req.body.servicesAndExpertise === 'string') {
        updateData.servicesAndExpertise = req.body.servicesAndExpertise.split(',').map(s => s.trim()).filter(s => s);
      } else {
        updateData.servicesAndExpertise = [];
      }
    }
    
    // Response Time
    if (req.body.responseTime !== undefined) updateData.responseTime = req.body.responseTime;
    
    // Availability
    if (req.body.availability !== undefined) updateData.availability = req.body.availability;
    
    // Years Experience
    if (req.body.yearsExperience !== undefined) {
      const years = parseInt(req.body.yearsExperience);
      updateData.yearsExperience = isNaN(years) ? 0 : years;
    }
    
    // Hash password if provided
    if (req.body.password) {
      updateData.password = bcryptjs.hashSync(req.body.password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedUser) {
      return next(errorHandler(404, 'User not found'));
    }

    const { password, ...rest } = updatedUser._doc;

    res.status(200).json(rest);
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  if (req.user.id !== req.params.id)
    return next(errorHandler(401, 'You can only delete your own account!'));
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return next(errorHandler(404, 'User not found!'));
    }

    // Store user email and role before deletion for logging
    const userEmail = user.email;
    const userRole = user.role;

    // If user is an agent, delete all their listings permanently
    if (user.role === 'agent') {
      const Listing = require('../models/listing.model');
      // Permanently delete all listings associated with this agent
      const deleteResult = await Listing.deleteMany({ 
        $or: [
          { agentId: userId },
          { agent: user.email }
        ]
      });
      console.log(`Deleted ${deleteResult.deletedCount} listings for agent ${userEmail} (${userId})`);
    }

    // Permanently delete the user account from database
    // This ensures the user won't appear in agents list and can't login again
    await User.findByIdAndDelete(userId);
    
    // Clear the access token cookie
    res.clearCookie('access_token');
    
    console.log(`User account deleted: ${userEmail} (${userId}), Role: ${userRole}`);
    
    res.status(200).json({
      success: true,
      message: 'User account has been permanently deleted!'
    });
  } catch (error) {
    console.error('Error deleting user account:', error);
    next(error);
  }
};

const getUserListings = async (req, res, next) => {
  if (req.user.id === req.params.id) {
    try {
      const listings = await Listing.find({ userRef: req.params.id });
      res.status(200).json(listings);
    } catch (error) {
      next(error);
    }
  } else {
    return next(errorHandler(401, 'You can only view your own listings!'));
  }
};

const getUser = async (req, res, next) => {
  try {
    
    const user = await User.findById(req.params.id);
  
    if (!user) return next(errorHandler(404, 'User not found!'));
  
    const { password: pass, ...rest } = user._doc;
  
    res.status(200).json(rest);
  } catch (error) {
    next(error);
  }
};
module.exports={
  getUser,
  getUserListings,
  deleteUser,
  updateUser,
  test
}
