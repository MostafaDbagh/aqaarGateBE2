const Agent = require('../models/agent.model');
const User = require('../models/user.model');
const errorHandler = require('../utils/error');

// Create agent
const createAgent = async (req, res, next) => {
    try {
      const {
        fullName,
        description,
        companyName,
        position,
        officeNumber,
        officeAddress,
        job,
        email,
        phone,
        location,
        facebook,
        instagram,
        linkedin,
        avatar,
        poster, 
      } = req.body;
  

      const newAgent = new Agent({
        fullName,
        description,
        companyName,
        position,
        officeNumber,
        officeAddress,
        job,
        email,
        phone,
        location,
        facebook,
        instagram,
        linkedin,
        avatar, 
        poster, 
      });
  
      const savedAgent = await newAgent.save();
  
      res.status(201).json(savedAgent);
    } catch (error) {
      next(error);
    }
  };
  

// Get all agents
const getAgents = async (req, res, next) => {
  try {
    // Get all users with role='agent' from the users collection
    // Exclude blocked agents from public listing
    const agentUsers = await User.find({ 
      role: 'agent',
      isBlocked: { $ne: true } // Exclude blocked agents
    })
      .select('-password -__v') // Don't return password or version field
      .lean();
    
    // Transform to match expected agent format
    const agents = agentUsers.map(user => ({
      _id: user._id,
      email: user.email,
      username: user.username,
      fullName: user.username || user.email, // Use username as fullName for frontend compatibility
      companyName: user.location ? `${user.location} Properties` : 'Syrian Properties', // Create company name from location
      avatar: user.avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
      location: user.location || '',
      phone: user.phone || '',
      description: user.description || '',
      role: user.role,
      pointsBalance: user.pointsBalance || 0,
      packageType: user.packageType || 'basic',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
    
    // Translate agents if translation function is available
    const { translateAgents } = require('../utils/translateAgent');
    const translatedAgents = req.t ? translateAgents(agents, req.t) : agents;
    
    res.status(200).json({
      success: true,
      message: req.t ? req.t('agent.fetch_success') : 'Agents retrieved successfully',
      data: translatedAgents,
      total: translatedAgents.length
    });
  } catch (error) {
    next(error);
  }
};

// Get single agent
const getAgentById = async (req, res, next) => {
  try {
    // First try to find in Agent collection
    let agent = await Agent.findById(req.params.id);
    
    // If not found, try to find in User collection with role='agent'
    if (!agent) {
      agent = await User.findById(req.params.id).select('-password -__v');
      
      if (agent && agent.role === 'agent') {
        // Transform to match expected format - include all fields including Arabic
        agent = {
          _id: agent._id,
          email: agent.email,
          username: agent.username,
          username_ar: agent.username_ar || '',
          fullName: agent.username || agent.fullName || agent.email || 'Agent',
          company: agent.company || '',
          company_ar: agent.company_ar || '',
          companyName: agent.companyName || agent.company || (agent.location ? `${agent.location} Properties` : 'Syrian Properties'),
          position: agent.position || agent.job || 'Real Estate Agent',
          position_ar: agent.position_ar || '',
          job: agent.job || agent.position || 'Real Estate Agent',
          job_ar: agent.job_ar || '',
          officeNumber: agent.officeNumber || agent.phone || '',
          officeAddress: agent.officeAddress || agent.location || '',
          officeAddress_ar: agent.officeAddress_ar || '',
          avatar: agent.avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
          location: agent.location || '',
          location_ar: agent.location_ar || '',
          city: agent.city || '',
          phone: agent.phone || '',
          description: agent.description || '',
          description_ar: agent.description_ar || '',
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
      } else {
        const message = req.t ? req.t('agent.not_found') : 'Agent not found';
        return next(errorHandler(404, message));
      }
    }
    
    // Translate agent if translation function is available
    const { translateAgent } = require('../utils/translateAgent');
    const translatedAgent = req.t ? translateAgent(agent, req.t) : agent;
    
    res.status(200).json({
      success: true,
      message: req.t ? req.t('agent.fetch_one_success') : 'Agent retrieved successfully',
      data: translatedAgent
    });
  } catch (error) {
    next(error);
  }
};

// Update agent
const updateAgent = async (req, res, next) => {
  try {
    const updated = await Agent.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// Delete agent
const deleteAgent = async (req, res, next) => {
  try {
    await Agent.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Agent deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAgent,
  getAgents,
  getAgentById,
  updateAgent,
  deleteAgent
};
