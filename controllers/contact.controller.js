const Contact = require('../models/contact.model');
const errorHandler = require('../utils/error');
const logger = require('../utils/logger');

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 5; // Maximum 5 requests per window

// Helper function to get client IP (handles proxies and load balancers)
const getClientIp = (req) => {
  // Check x-forwarded-for header (for proxies/load balancers)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, get the first one (original client)
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0] || 'unknown';
  }
  
  // Check x-real-ip header (common in nginx)
  if (req.headers['x-real-ip']) {
    return req.headers['x-real-ip'];
  }
  
  // Fallback to Express req.ip (requires trust proxy to be set)
  if (req.ip && req.ip !== '::1' && req.ip !== '127.0.0.1') {
    return req.ip;
  }
  
  // Last resort: connection remote address
  return req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
};

const createContact = async (req, res, next) => {
  try {
    const { email, phone } = req.body;
    const clientIp = getClientIp(req);
    
    // Normalize email for rate limiting
    const normalizedEmail = email ? email.trim().toLowerCase() : null;
    const normalizedPhone = phone ? phone.trim().replace(/\s+/g, '') : null;
    
    // Calculate time window start
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW);
    
    // Check rate limit by email
    if (normalizedEmail) {
      const recentContactsByEmail = await Contact.countDocuments({
        email: normalizedEmail,
        createdAt: { $gte: windowStart }
      });
      
      if (recentContactsByEmail >= RATE_LIMIT_MAX_REQUESTS) {
        logger.warn('Contact form rate limit exceeded by email', { email: normalizedEmail, count: recentContactsByEmail });
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again later.',
          error: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000) // seconds
        });
      }
    }
    
    // Check rate limit by phone
    if (normalizedPhone) {
      const recentContactsByPhone = await Contact.countDocuments({
        phone: normalizedPhone,
        createdAt: { $gte: windowStart }
      });
      
      if (recentContactsByPhone >= RATE_LIMIT_MAX_REQUESTS) {
        logger.warn('Contact form rate limit exceeded by phone', { phone: normalizedPhone, count: recentContactsByPhone });
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again later.',
          error: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000) // seconds
        });
      }
    }
    
    // Check rate limit by IP (additional protection)
    const recentContactsByIp = await Contact.countDocuments({
      'metadata.ip': clientIp,
      createdAt: { $gte: windowStart }
    });
    
    if (recentContactsByIp >= RATE_LIMIT_MAX_REQUESTS * 2) { // Allow more per IP (10 requests)
      logger.warn('Contact form rate limit exceeded by IP', { ip: clientIp, count: recentContactsByIp });
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        error: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000) // seconds
      });
    }
    
    // Create contact with metadata
    const contactData = {
      ...req.body,
      email: normalizedEmail || req.body.email,
      phone: normalizedPhone || req.body.phone,
      metadata: {
        ip: clientIp,
        userAgent: req.headers['user-agent'] || 'unknown'
      }
    };
    
    const contact = await Contact.create(contactData);
    logger.info('Contact form submission successful', { 
      email: normalizedEmail, 
      phone: normalizedPhone ? 'provided' : 'not provided',
      ip: clientIp 
    });
    
    res.status(201).json({ success: true, data: contact });
  } catch (error) {
    next(error);
  }
};

const getContacts = async (req, res, next) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: contacts });
  } catch (error) {
    next(error);
  }
};

const getContact = async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) return next(errorHandler(404, 'Contact not found'));
    res.status(200).json({ success: true, data: contact });
  } catch (error) {
    next(error);
  }
};

const deleteContact = async (req, res, next) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) return next(errorHandler(404, 'Contact not found'));
    res.status(200).json({ success: true, message: 'Contact deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createContact,
  getContacts,
  getContact,
  deleteContact,
};
