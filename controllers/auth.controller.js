const User = require('../models/user.model.js');
const bcryptjs = require('bcryptjs');
const errorHandler = require('../utils/error.js');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { sendOtpEmail } = require('../utils/email');
const getJWTSecret = require('../utils/jwtSecret');

const signup = async (req, res, next) => {
  const { 
    username, 
    username_ar,
    email, 
    password, 
    role, 
    phone, 
    whatsapp, 
    company, 
    company_ar,
    job, 
    job_ar,
    agentName,
    description,
    description_ar,
    position,
    position_ar,
    officeNumber,
    officeAddress,
    officeAddress_ar,
    location,
    location_ar,
    city,
    facebook,
    instagram,
    linkedin,
    avatar
  } = req.body;
  const hashedPassword = bcryptjs.hashSync(password, 10);
  
  // Validate admin requirements
  if (role === 'admin') {
    if (!phone || phone.trim().length === 0) {
      return next(errorHandler(400, 'Phone number is required for admin users'));
    }
    if (!whatsapp || whatsapp.trim().length === 0) {
      return next(errorHandler(400, 'WhatsApp number is required for admin users'));
    }
    if (!agentName || agentName.trim().length === 0) {
      return next(errorHandler(400, 'Agent name is required for admin users'));
    }
  }
  
  // Validate agent requirements
  if (role === 'agent') {
    if (!agentName || agentName.trim().length === 0) {
      return next(errorHandler(400, 'Agent name is required for agent users'));
    }
  }
  
  // Build user object with optional agent fields
  const userData = { 
    username, 
    email, 
    password: hashedPassword, 
    role,
    isTrial: role === 'admin' ? false : true, // Admins don't need trial
    hasUnlimitedPoints: role === 'admin' ? true : false // Admins get unlimited points
  };
  
  // Add optional fields that may be provided
  if (username_ar) userData.username_ar = username_ar.trim();
  if (description) userData.description = description.trim();
  if (description_ar) userData.description_ar = description_ar.trim();
  if (location) userData.location = location.trim();
  if (location_ar) userData.location_ar = location_ar.trim();
  if (city) userData.city = city.trim();
  if (facebook) userData.facebook = facebook.trim();
  if (instagram) userData.instagram = instagram.trim();
  if (linkedin) userData.linkedin = linkedin.trim();
  if (avatar) userData.avatar = avatar.trim();
  
  // Add admin-specific fields if role is admin
  if (role === 'admin') {
    userData.phone = phone.trim();
    userData.whatsapp = whatsapp.trim();
    userData.agentName = agentName.trim();
    if (company) userData.company = company.trim();
    if (company_ar) userData.company_ar = company_ar.trim();
    if (position) userData.position = position.trim();
    if (position_ar) userData.position_ar = position_ar.trim();
    if (officeNumber) userData.officeNumber = officeNumber.trim();
    if (officeAddress) userData.officeAddress = officeAddress.trim();
    if (officeAddress_ar) userData.officeAddress_ar = officeAddress_ar.trim();
    if (job) userData.job = job.trim();
    if (job_ar) userData.job_ar = job_ar.trim();
    userData.isBlocked = false; // Admins are not blocked
  }
  
  // Add agent-specific fields if role is agent
  if (role === 'agent') {
    userData.agentName = agentName.trim();
    if (phone) userData.phone = phone.trim();
    if (whatsapp) userData.whatsapp = whatsapp.trim();
    if (company) userData.company = company.trim();
    if (company_ar) userData.company_ar = company_ar.trim();
    if (job) userData.job = job.trim();
    if (job_ar) userData.job_ar = job_ar.trim();
    if (position) userData.position = position.trim();
    if (position_ar) userData.position_ar = position_ar.trim();
    if (officeNumber) userData.officeNumber = officeNumber.trim();
    if (officeAddress) userData.officeAddress = officeAddress.trim();
    if (officeAddress_ar) userData.officeAddress_ar = officeAddress_ar.trim();
    // Set new agents as blocked by default until admin verification
    userData.isBlocked = true;
    userData.blockedReason = 'Pending admin verification';
  }
  
  const newUser = new User(userData);
  try {
    await newUser.save();
    res.status(201).json({
      success: true,
      message: 'User created successfully!',
      user: newUser
    });
  } catch (error) {
    // Handle duplicate key errors specifically
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      return res.status(400).json({
        success: false,
        message: `${field} '${value}' already exists. Please use a different ${field}.`,
        error: 'DUPLICATE_KEY_ERROR'
      });
    }
    // Handle other validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors,
        error: 'VALIDATION_ERROR'
      });
    }
    // Handle other errors
    next(error);
  }
};

const signin = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const validUser = await User.findOne({ email });
    if (!validUser) return next(errorHandler(404, 'User not found!'));
    const validPassword = bcryptjs.compareSync(password, validUser.password);
    if (!validPassword) return next(errorHandler(401, 'Wrong credentials!'));
    
    let jwtSecret;
    try {
      jwtSecret = getJWTSecret();
    } catch (error) {
      return next(errorHandler(500, 'Server configuration error: ' + error.message));
    }
    
    const token = jwt.sign({ id: validUser._id }, jwtSecret);
    const { password: pass, ...rest } = validUser._doc;
    res
      .cookie('access_token', token, { httpOnly: true })
      .status(200)
      .json({
        success: true,
        message: 'Login successful',
        token: token,
        user: rest
      });
  } catch (error) {
    next(error);
  }
};

const google = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      let jwtSecret;
      try {
        jwtSecret = getJWTSecret();
      } catch (error) {
        return next(errorHandler(500, 'Server configuration error: ' + error.message));
      }
      
      const token = jwt.sign({ id: user._id }, jwtSecret);
      const { password: pass, ...rest } = user._doc;
      res
        .cookie('access_token', token, { httpOnly: true })
        .status(200)
        .json({
          success: true,
          message: 'Google login successful',
          token: token,
          user: rest
        });
    } else {
      const generatedPassword =
        Math.random().toString(36).slice(-8) +
        Math.random().toString(36).slice(-8);
      const hashedPassword = bcryptjs.hashSync(generatedPassword, 10);
      const newUser = new User({
        username:
          req.body.name.split(' ').join('').toLowerCase() +
          Math.random().toString(36).slice(-4),
        email: req.body.email,
        password: hashedPassword,
        avatar: req.body.photo,
      });
      await newUser.save();
      
      let jwtSecret;
      try {
        jwtSecret = getJWTSecret();
      } catch (error) {
        return next(errorHandler(500, 'Server configuration error: ' + error.message));
      }
      
      const token = jwt.sign({ id: newUser._id }, jwtSecret);
      const { password: pass, ...rest } = newUser._doc;
      res
        .cookie('access_token', token, { httpOnly: true })
        .status(200)
        .json({
          success: true,
          message: 'Google signup and login successful',
          token: token,
          user: rest
        });
    }
  } catch (error) {
    next(error);
  }
};

const signOut = async (req, res, next) => {
  try {
    res.clearCookie('access_token');
    res.status(200).json('User has been logged out!');
  } catch (error) {
    next(error);
  }
};

// OTP Functions
const sendOTP = async (req, res, next) => {
  const startTime = Date.now();
  logger.info('sendOTP request received', { email: req.body.email, type: req.body.type });
  
  try {
    const { email, type = 'signup' } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
        error: 'MISSING_EMAIL'
      });
    }

    if (!type || !['signup', 'forgot_password'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP type. Must be "signup" or "forgot_password"',
        error: 'INVALID_OTP_TYPE'
      });
    }

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.trim().toLowerCase();
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        error: 'INVALID_EMAIL_FORMAT'
      });
    }

    // For forgot password, check if user exists
    if (type === 'forgot_password') {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        // Don't reveal if user exists or not for security (prevent email enumeration)
        // Return success message but don't send OTP
        logger.warn('Password reset requested for non-existent email', { email: normalizedEmail });
        return res.status(200).json({
          success: true,
          message: 'If an account exists with this email, a reset code has been sent.',
          email: normalizedEmail,
          type: type
        });
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in memory (in production, use Redis or database)
    if (!global.otpStore) {
      global.otpStore = new Map();
    }
    
    // Delete any existing OTP for this email/type before creating new one
    const otpKey = `${normalizedEmail}_${type}`;
    if (global.otpStore.has(otpKey)) {
      global.otpStore.delete(otpKey);
    }
    
    global.otpStore.set(otpKey, {
      otp: otp,
      type: type,
      timestamp: Date.now(),
      attempts: 0
    });

    // Send response immediately, then send email in background (non-blocking)
    const responseTime = Date.now() - startTime;
    logger.info('sendOTP response sent', { email, type, responseTime: `${responseTime}ms` });
    
    res.status(200).json({
      success: true,
      message: `OTP sent successfully for ${type === 'signup' ? 'email verification' : 'password reset'}`,
      email: normalizedEmail,
      type: type,
      ...(process.env.NODE_ENV !== 'production' ? { otp } : {})
    });

    // Send email in background (non-blocking) - don't await
    // Add retry mechanism for better reliability
    const sendEmailWithRetry = async (retries = 2) => {
      for (let i = 0; i <= retries; i++) {
        try {
          await sendOtpEmail({
            to: normalizedEmail,
            otp,
            type,
          });
          // Always log email success (not just in dev)
          logger.error('[EMAIL_SUCCESS] OTP email sent successfully', { email: normalizedEmail, type, attempt: i + 1 });
          return; // Success, exit retry loop
        } catch (emailError) {
          const isLastAttempt = i === retries;
          logger.error(`Failed to send OTP email (attempt ${i + 1}/${retries + 1})`, {
            email: normalizedEmail,
            type,
            attempt: i + 1,
            error: emailError.message,
            stack: isLastAttempt ? emailError.stack : undefined // Only log stack on final attempt
          });
          
          // Try SendGrid as fallback if SMTP fails (for restricted regions like Syria)
          if (isLastAttempt && process.env.SENDGRID_API_KEY) {
            try {
              const { sendOtpEmailSendGrid } = require('../utils/email-sendgrid');
              await sendOtpEmailSendGrid({ to: normalizedEmail, otp, type });
              logger.error('[EMAIL_SUCCESS] SendGrid fallback email sent successfully', { email: normalizedEmail, type });
              return; // SendGrid succeeded
            } catch (sendGridError) {
              logger.error('SendGrid fallback also failed:', {
                email: normalizedEmail,
                type,
                error: sendGridError.message
              });
            }
          }
          
          if (isLastAttempt) {
            // All retries failed - but KEEP OTP in store for manual verification
            // Don't delete it so support can help users in restricted regions
            logger.error('OTP email failed after all retries - OTP kept in store for manual verification', {
              email: normalizedEmail,
              type,
              otp: process.env.NODE_ENV !== 'production' ? otp : '***' // Only log OTP in dev
            });
          } else {
            // Wait before retry (exponential backoff: 1s, 2s)
            await new Promise(resolve => setTimeout(resolve, (i + 1) * 1000));
          }
        }
      }
    };
    
    // Start email sending in background
    sendEmailWithRetry().catch((finalError) => {
      logger.error('Email retry mechanism failed completely', {
        email: normalizedEmail,
        type,
        error: finalError.message
      });
      // Keep OTP in store even if email fails - for manual verification in restricted regions
      // Support can help users get their OTP if email delivery fails
    });
  } catch (error) {
    next(error);
  }
};

const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp, type = 'signup' } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
        error: 'MISSING_PARAMETERS'
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();
    
    // Validate OTP format (must be exactly 6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'OTP must be exactly 6 digits',
        error: 'INVALID_OTP_FORMAT'
      });
    }

    if (!type || !['signup', 'forgot_password'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP type. Must be "signup" or "forgot_password"',
        error: 'INVALID_OTP_TYPE'
      });
    }

    const otpKey = `${normalizedEmail}_${type}`;
    
    // Check if OTP exists in store
    if (!global.otpStore || !global.otpStore.has(otpKey)) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found or expired',
        error: 'OTP_NOT_FOUND'
      });
    }

    const otpData = global.otpStore.get(otpKey);
    
    // Check if OTP is expired (5 minutes)
    const now = Date.now();
    const otpAge = now - otpData.timestamp;
    if (otpAge > 5 * 60 * 1000) { // 5 minutes
      global.otpStore.delete(otpKey);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired',
        error: 'OTP_EXPIRED'
      });
    }

    // Check attempts (max 3 attempts)
    if (otpData.attempts >= 3) {
      global.otpStore.delete(otpKey);
      return res.status(400).json({
        success: false,
        message: 'Too many attempts. Please request a new OTP',
        error: 'TOO_MANY_ATTEMPTS'
      });
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      otpData.attempts++;
      global.otpStore.set(otpKey, otpData);
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
        error: 'INVALID_OTP'
      });
    }

    // OTP is valid
    // For forgot_password, create a verified flag before deleting OTP
    // This allows resetPassword to verify that OTP was checked
    if (type === 'forgot_password') {
      // Create a verified store if it doesn't exist
      if (!global.verifiedStore) {
        global.verifiedStore = new Map();
      }
      // Store verification with expiration (10 minutes to reset password)
      const verifiedKey = `${normalizedEmail}_forgot_password_verified`;
      // Delete any existing verified flag for this email
      if (global.verifiedStore.has(verifiedKey)) {
        global.verifiedStore.delete(verifiedKey);
      }
      global.verifiedStore.set(verifiedKey, {
        email: normalizedEmail,
        timestamp: Date.now(),
        expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
      });
      logger.info('OTP verified for password reset', { email: normalizedEmail });
    }
    
    // Remove OTP from store after verification
    global.otpStore.delete(otpKey);

    res.status(200).json({
      success: true,
      message: `OTP verified successfully for ${type === 'signup' ? 'email verification' : 'password reset'}`,
      email: normalizedEmail,
      type: type
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email and new password are required',
        error: 'MISSING_PARAMETERS'
      });
    }

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.trim().toLowerCase();

    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
        error: 'INVALID_PASSWORD'
      });
    }

    // Check if OTP was verified for this email
    const otpKey = `${normalizedEmail}_forgot_password`;
    const verifiedKey = `${normalizedEmail}_forgot_password_verified`;
    
    // Check if OTP still exists (means it wasn't verified)
    if (global.otpStore && global.otpStore.has(otpKey)) {
      return res.status(400).json({
        success: false,
        message: 'Please verify OTP first before resetting password',
        error: 'OTP_NOT_VERIFIED'
      });
    }

    // Check if email was verified (using verified store)
    if (!global.verifiedStore || !global.verifiedStore.has(verifiedKey)) {
      return res.status(400).json({
        success: false,
        message: 'Please verify OTP first before resetting password',
        error: 'OTP_NOT_VERIFIED'
      });
    }

    // Check if verification is still valid (not expired)
    const verifiedData = global.verifiedStore.get(verifiedKey);
    const now = Date.now();
    if (now > verifiedData.expiresAt) {
      global.verifiedStore.delete(verifiedKey);
      return res.status(400).json({
        success: false,
        message: 'OTP verification has expired. Please request a new OTP',
        error: 'VERIFICATION_EXPIRED'
      });
    }

    // Verification is valid, remove it after password reset
    global.verifiedStore.delete(verifiedKey);

    // Find user and update password
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    // Hash new password
    const hashedPassword = bcryptjs.hashSync(newPassword.trim(), 10);
    
    // Update user password
    await User.findByIdAndUpdate(user._id, { password: hashedPassword });

    logger.info('Password reset successful', { email: normalizedEmail, userId: user._id });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error('Password reset error', { error: error.message, email: req.body.email });
    next(error);
  }
};

const makeAgent = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already an agent
    if (user.role === 'agent') {
      return res.status(400).json({
        success: false,
        message: 'User is already an agent'
      });
    }

    // Update user role to agent and set as blocked by default (requires admin verification)
    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { 
        role: 'agent',
        isBlocked: true,
        blockedAt: new Date(),
        blockedReason: 'New agent - pending admin verification'
      }, 
      { new: true }
    );

    logger.info('[MAKE_AGENT]', {
      userId: userId,
      username: updatedUser.username,
      email: updatedUser.email,
      isBlocked: updatedUser.isBlocked
    });

    res.status(200).json({
      success: true,
      message: 'User role updated to agent successfully. Your account is pending admin verification.',
      user: {
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        pointsBalance: updatedUser.pointsBalance,
        packageType: updatedUser.packageType,
        packageExpiry: updatedUser.packageExpiry,
        isBlocked: updatedUser.isBlocked,
        blockedReason: updatedUser.blockedReason
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all agents from Agent collection
const getAgents = async (req, res, next) => {
  try {
    const Agent = require('../models/agent.model');
    const agents = await Agent.find({});

    res.status(200).json({
      success: true,
      data: agents
    });
  } catch (error) {
    next(error);
  }
};

// Get single agent by ID
const getAgentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const agent = await User.findOne({ _id: id, role: 'agent' }).select('-password');
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Transform the data to match the expected format
    const transformedAgent = {
      _id: agent._id,
      username: agent.username,
      username_ar: agent.username_ar || '',
      fullName: agent.username,
      email: agent.email,
      avatar: agent.avatar,
      description: agent.description || '',
      description_ar: agent.description_ar || '',
      company: agent.company || '',
      company_ar: agent.company_ar || '',
      companyName: agent.company,
      position: agent.position || '',
      position_ar: agent.position_ar || '',
      officeNumber: agent.officeNumber || '',
      officeAddress: agent.officeAddress || '',
      officeAddress_ar: agent.officeAddress_ar || '',
      job: agent.job || '',
      job_ar: agent.job_ar || '',
      phone: agent.phone || '',
      location: agent.location || '',
      location_ar: agent.location_ar || '',
      city: agent.city || '',
      facebook: agent.facebook || '',
      instagram: agent.instagram || '',
      linkedin: agent.linkedin || '',
      whatsapp: agent.whatsapp || '',
      servicesAndExpertise: agent.servicesAndExpertise || [],
      responseTime: agent.responseTime || '',
      availability: agent.availability || '',
      yearsExperience: agent.yearsExperience || 0,
      pointsBalance: agent.pointsBalance || 0,
      packageType: agent.packageType || 'basic',
      packageExpiry: agent.packageExpiry || null,
      isTrial: agent.isTrial || false,
      hasUnlimitedPoints: agent.hasUnlimitedPoints || false,
      isBlocked: agent.isBlocked || false,
      blockedReason: agent.blockedReason || '',
      blockedAt: agent.blockedAt || null,
      role: agent.role,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt
    };

    res.status(200).json({
      success: true,
      data: transformedAgent
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  signin,
  google,
  signOut,
  sendOTP,
  verifyOTP,
  resetPassword,
  makeAgent,
  getAgents,
  getAgentById,
};
