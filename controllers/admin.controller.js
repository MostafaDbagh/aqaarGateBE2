const Listing = require('../models/listing.model');
const Contact = require('../models/contact.model');
const PropertyRental = require('../models/propertyRental.model');
const User = require('../models/user.model');
const errorHandler = require('../utils/error');
const logger = require('../utils/logger');

// ==================== PROPERTIES ====================

// Get all properties with filters and pagination
const getAllProperties = async (req, res, next) => {
  try {
    const {
      status,
      approvalStatus,
      propertyType,
      city,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query - exclude deleted and sold listings
    // Sold listings should only appear in /admin/sold-properties
    const query = { 
      isDeleted: { $ne: true },
      isSold: { $ne: true } // Exclude sold listings from admin properties page
    };
    
    if (status) query.status = status;
    if (approvalStatus) query.approvalStatus = approvalStatus;
    if (propertyType) query.propertyType = propertyType;
    if (city) query.city = new RegExp(city, 'i');
    
    if (search) {
      query.$or = [
        { propertyKeyword: new RegExp(search, 'i') },
        { address: new RegExp(search, 'i') },
        { city: new RegExp(search, 'i') },
        { propertyDesc: new RegExp(search, 'i') }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [properties, total] = await Promise.all([
      Listing.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('agentId', 'username email isBlocked blockedReason')
        .lean(),
      Listing.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: properties,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('[ADMIN_GET_PROPERTIES_ERROR]', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

// Approve/Reject property
const updatePropertyApproval = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approvalStatus, notes } = req.body;

    if (!['pending', 'approved', 'rejected', 'closed'].includes(approvalStatus)) {
      return next(errorHandler(400, 'Invalid approval status'));
    }

    const property = await Listing.findById(id);
    if (!property) {
      return next(errorHandler(404, 'Property not found'));
    }

    // Check if trying to approve a property with a blocked agent
    if (approvalStatus === 'approved' && property.agentId) {
      const agent = await User.findById(property.agentId);
      if (agent && agent.isBlocked) {
        return next(errorHandler(400, `Cannot approve property. The agent (${agent.username || agent.email}) is blocked. Please unblock the agent first.`));
      }
    }

    const oldApprovalStatus = property.approvalStatus;
    // Normalize approvalStatus to lowercase before saving
    property.approvalStatus = approvalStatus.toLowerCase().trim();
    if (notes) property.notes = notes;
    
    await property.save();
    
    // Reload from database to verify the change
    const savedProperty = await Listing.findById(id);
    
    logger.info('[ADMIN_PROPERTY_APPROVAL]', {
      propertyId: id,
      propertyKeyword: property.propertyKeyword,
      oldApprovalStatus,
      newApprovalStatus: approvalStatus,
      savedApprovalStatus: savedProperty?.approvalStatus,
      adminId: req.user.id,
      agentId: property.agentId?.toString()
    });

    res.status(200).json({
      success: true,
      message: `Property ${approvalStatus} successfully`,
      data: property
    });
  } catch (error) {
    logger.error('[ADMIN_UPDATE_PROPERTY_APPROVAL_ERROR]', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

// Delete property
const deleteProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deletedReason } = req.body;

    const property = await Listing.findById(id);
    if (!property) {
      return next(errorHandler(404, 'Property not found'));
    }

    property.isDeleted = true;
    property.deletedReason = deletedReason || 'Deleted by admin';
    property.deletedAt = new Date();
    await property.save();

    logger.info('[ADMIN_DELETE_PROPERTY]', {
      propertyId: id,
      adminId: req.user.id,
      deletedReason: property.deletedReason
    });

    res.status(200).json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    logger.error('[ADMIN_DELETE_PROPERTY_ERROR]', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

// Get all deleted properties with filters and pagination
const getDeletedProperties = async (req, res, next) => {
  try {
    const {
      search,
      propertyType,
      city,
      agentId,
      page = 1,
      limit = 20,
      sortBy = 'deletedAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query - only deleted properties
    const query = { 
      isDeleted: true
    };
    
    if (propertyType) query.propertyType = propertyType;
    if (city) query.city = new RegExp(city, 'i');
    if (agentId) {
      query.$or = [
        { agentId: agentId },
        { agent: agentId }
      ];
    }
    
    if (search) {
      query.$or = [
        { propertyKeyword: new RegExp(search, 'i') },
        { address: new RegExp(search, 'i') },
        { city: new RegExp(search, 'i') },
        { propertyDesc: new RegExp(search, 'i') },
        { deletedReason: new RegExp(search, 'i') }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [properties, total] = await Promise.all([
      Listing.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('agentId', 'username email isBlocked blockedReason')
        .lean(),
      Listing.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: properties,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('[ADMIN_GET_DELETED_PROPERTIES_ERROR]', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

// Get all sold properties with filters and pagination
const getSoldProperties = async (req, res, next) => {
  try {
    const {
      search,
      propertyType,
      city,
      agentId,
      page = 1,
      limit = 20,
      sortBy = 'soldDate',
      sortOrder = 'desc'
    } = req.query;

    // Build query - only sold properties
    const query = { 
      isDeleted: { $ne: true },
      isSold: true
    };
    
    if (propertyType) query.propertyType = propertyType;
    if (city) query.city = new RegExp(city, 'i');
    if (agentId) {
      query.$or = [
        { agentId: agentId },
        { agent: agentId }
      ];
    }
    
    if (search) {
      query.$or = [
        { propertyKeyword: new RegExp(search, 'i') },
        { address: new RegExp(search, 'i') },
        { city: new RegExp(search, 'i') },
        { propertyDesc: new RegExp(search, 'i') }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [properties, total] = await Promise.all([
      Listing.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('agentId', 'username email isBlocked blockedReason')
        .lean(),
      Listing.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: properties,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('[ADMIN_GET_SOLD_PROPERTIES_ERROR]', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

// Update sold property charges
const updateSoldPropertyCharges = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { soldCharges } = req.body;

    if (soldCharges === undefined || soldCharges === null) {
      return next(errorHandler(400, 'soldCharges is required'));
    }

    const charges = parseFloat(soldCharges);
    if (isNaN(charges) || charges < 0) {
      return next(errorHandler(400, 'soldCharges must be a positive number'));
    }

    const property = await Listing.findById(id);
    if (!property) {
      return next(errorHandler(404, 'Property not found'));
    }

    if (!property.isSold) {
      return next(errorHandler(400, 'Property is not marked as sold'));
    }

    property.soldCharges = charges;
    if (!property.soldDate) {
      property.soldDate = new Date();
    }
    await property.save();

    logger.info('[ADMIN_UPDATE_SOLD_CHARGES]', {
      propertyId: id,
      soldCharges: charges,
      adminId: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Sold property charges updated successfully',
      data: property
    });
  } catch (error) {
    logger.error('[ADMIN_UPDATE_SOLD_CHARGES_ERROR]', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

// ==================== CONTACT US ====================

// Get all contact requests
const getAllContacts = async (req, res, next) => {
  try {
    const {
      search,
      interest,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (interest) query.interest = interest;
    
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { message: new RegExp(search, 'i') }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [contacts, total] = await Promise.all([
      Contact.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Contact.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: contacts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('[ADMIN_GET_CONTACTS_ERROR]', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

// Delete contact request
const deleteContact = async (req, res, next) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findByIdAndDelete(id);
    if (!contact) {
      return next(errorHandler(404, 'Contact request not found'));
    }

    logger.info('[ADMIN_DELETE_CONTACT]', {
      contactId: id,
      adminId: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Contact request deleted successfully'
    });
  } catch (error) {
    logger.error('[ADMIN_DELETE_CONTACT_ERROR]', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

// ==================== RENTAL SERVICES ====================

// Get all rental service requests (already exists in propertyRental.controller.js, but we'll add admin-specific version)
const getAllRentalServices = async (req, res, next) => {
  try {
    const {
      status,
      propertyType,
      ownerEmail,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (status) query.status = status;
    if (propertyType) query.propertyType = propertyType;
    if (ownerEmail) query.ownerEmail = ownerEmail.toLowerCase();
    
    if (search) {
      query.$or = [
        { ownerName: new RegExp(search, 'i') },
        { ownerEmail: new RegExp(search, 'i') },
        { ownerPhone: new RegExp(search, 'i') },
        { location: new RegExp(search, 'i') },
        { features: new RegExp(search, 'i') }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [requests, total] = await Promise.all([
      PropertyRental.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      PropertyRental.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('[ADMIN_GET_RENTAL_SERVICES_ERROR]', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

// Update rental service request
const updateRentalService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const request = await PropertyRental.findById(id);
    if (!request) {
      return next(errorHandler(404, 'Rental service request not found'));
    }

    // Validate status if provided
    if (updateData.status && !['pending', 'under_review', 'inspected', 'agreement_sent', 'agreed', 'rejected'].includes(updateData.status)) {
      return next(errorHandler(400, 'Invalid status value'));
    }

    const updatedRequest = await PropertyRental.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    logger.info('[ADMIN_UPDATE_RENTAL_SERVICE]', {
      requestId: id,
      updatedFields: Object.keys(updateData),
      adminId: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Rental service request updated successfully',
      data: updatedRequest
    });
  } catch (error) {
    logger.error('[ADMIN_UPDATE_RENTAL_SERVICE_ERROR]', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

// Delete rental service request
const deleteRentalService = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await PropertyRental.findByIdAndDelete(id);
    if (!request) {
      return next(errorHandler(404, 'Rental service request not found'));
    }

    logger.info('[ADMIN_DELETE_RENTAL_SERVICE]', {
      requestId: id,
      adminId: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Rental service request deleted successfully'
    });
  } catch (error) {
    logger.error('[ADMIN_DELETE_RENTAL_SERVICE_ERROR]', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

// ==================== DASHBOARD STATS ====================

const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalProperties,
      pendingProperties,
      approvedProperties,
      rejectedProperties,
      soldProperties,
      deletedProperties,
      totalContacts,
      totalRentalServices,
      pendingRentalServices,
      totalAgents,
      blockedAgents
    ] = await Promise.all([
      // Total properties: not deleted and not sold (using $ne for cleaner query)
      Listing.countDocuments({ 
        isDeleted: { $ne: true },
        isSold: { $ne: true }
      }),
      // Pending properties: not deleted, not sold, and pending
      Listing.countDocuments({ 
        isDeleted: { $ne: true },
        isSold: { $ne: true },
        approvalStatus: 'pending'
      }),
      // Approved properties: not deleted, not sold, and approved
      Listing.countDocuments({ 
        isDeleted: { $ne: true },
        isSold: { $ne: true },
        approvalStatus: 'approved'
      }),
      // Rejected properties: not deleted, not sold, and rejected
      Listing.countDocuments({ 
        isDeleted: { $ne: true },
        isSold: { $ne: true },
        approvalStatus: 'rejected'
      }),
      // Sold properties: not deleted and sold (must check isSold explicitly)
      Listing.countDocuments({ 
        isDeleted: { $ne: true },
        isSold: true
      }),
      // Deleted properties: deleted (must check isDeleted explicitly)
      Listing.countDocuments({ isDeleted: true }),
      Contact.countDocuments(),
      PropertyRental.countDocuments(),
      PropertyRental.countDocuments({ status: 'pending' }),
      User.countDocuments({ role: 'agent' }),
      User.countDocuments({ role: 'agent', isBlocked: true })
    ]);

    // Log for debugging
    logger.info('[ADMIN_DASHBOARD_STATS]', {
      totalAgents,
      blockedAgents,
      totalProperties,
      pendingProperties,
      approvedProperties,
      rejectedProperties,
      soldProperties,
      deletedProperties,
      totalContacts,
      totalRentalServices,
      pendingRentalServices
    });
    
    // Additional verification: count all listings to verify totals
    const allListingsCount = await Listing.countDocuments({});
    const allSoldCount = await Listing.countDocuments({ isSold: true });
    const allDeletedCount = await Listing.countDocuments({ isDeleted: true });
    
    logger.info('[ADMIN_DASHBOARD_STATS_VERIFICATION]', {
      allListingsCount,
      allSoldCount,
      allDeletedCount,
      calculatedSold: soldProperties,
      calculatedDeleted: deletedProperties
    });

    res.status(200).json({
      success: true,
      data: {
        properties: {
          total: totalProperties,
          pending: pendingProperties,
          approved: approvedProperties,
          rejected: rejectedProperties,
          sold: soldProperties,
          deleted: deletedProperties
        },
        contacts: {
          total: totalContacts
        },
        rentalServices: {
          total: totalRentalServices,
          pending: pendingRentalServices
        },
        agents: {
          total: totalAgents,
          blocked: blockedAgents
        }
      }
    });
  } catch (error) {
    logger.error('[ADMIN_DASHBOARD_STATS_ERROR]', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

// ==================== USERS ====================

// Get all users (read-only)
const getAllUsers = async (req, res, next) => {
  try {
    const {
      search,
      role,
      isBlocked,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (role) {
      query.role = role;
    }
    
    if (isBlocked !== undefined) {
      query.isBlocked = isBlocked === 'true';
    }
    
    if (search) {
      query.$or = [
        { username: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query - exclude password field
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -__v')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('[ADMIN_GET_USERS_ERROR]', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

// ==================== AGENTS ====================

// Get all agents
const getAllAgents = async (req, res, next) => {
  try {
    const {
      search,
      isBlocked,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { role: 'agent' };
    
    if (isBlocked !== undefined) {
      query.isBlocked = isBlocked === 'true';
    }
    
    if (search) {
      query.$or = [
        { username: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { company: new RegExp(search, 'i') }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [agents, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    // Get listing counts for each agent
    const agentsWithCounts = await Promise.all(
      agents.map(async (agent) => {
        const listingCount = await Listing.countDocuments({
          $or: [
            { agent: agent._id.toString() },
            { agentId: agent._id }
          ],
          isDeleted: { $ne: true }
        });
        return {
          ...agent,
          listingCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: agentsWithCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('[ADMIN_GET_AGENTS_ERROR]', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

// Block/Delete agent
const blockAgent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const agent = await User.findById(id);
    if (!agent) {
      return next(errorHandler(404, 'Agent not found'));
    }

    if (agent.role !== 'agent') {
      return next(errorHandler(400, 'User is not an agent'));
    }

    // Block the agent
    agent.isBlocked = true;
    agent.blockedAt = new Date();
    agent.blockedReason = reason || 'Blocked by admin';
    await agent.save();

    // Update all agent's listings to pending status
    await Listing.updateMany(
      {
        $or: [
          { agent: agent._id.toString() },
          { agentId: agent._id }
        ],
        isDeleted: { $ne: true }
      },
      {
        $set: {
          approvalStatus: 'pending'
        }
      }
    );

    logger.info('[ADMIN_BLOCK_AGENT]', {
      agentId: id,
      reason: agent.blockedReason,
      adminId: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Agent blocked successfully. All their listings have been set to pending.',
      data: agent
    });
  } catch (error) {
    logger.error('[ADMIN_BLOCK_AGENT_ERROR]', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

// Unblock agent
const unblockAgent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const agent = await User.findById(id);
    if (!agent) {
      return next(errorHandler(404, 'Agent not found'));
    }

    if (agent.role !== 'agent') {
      return next(errorHandler(400, 'User is not an agent'));
    }

    // Unblock the agent
    agent.isBlocked = false;
    agent.blockedAt = null;
    agent.blockedReason = '';
    await agent.save();

    logger.info('[ADMIN_UNBLOCK_AGENT]', {
      agentId: id,
      adminId: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Agent unblocked successfully',
      data: agent
    });
  } catch (error) {
    logger.error('[ADMIN_UNBLOCK_AGENT_ERROR]', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

module.exports = {
  // Properties
  getAllProperties,
  updatePropertyApproval,
  deleteProperty,
  getSoldProperties,
  updateSoldPropertyCharges,
  getDeletedProperties,
  // Contacts
  getAllContacts,
  deleteContact,
  // Rental Services
  getAllRentalServices,
  updateRentalService,
  deleteRentalService,
  // Users
  getAllUsers,
  // Agents
  getAllAgents,
  blockAgent,
  unblockAgent,
  // Dashboard
  getDashboardStats
};

