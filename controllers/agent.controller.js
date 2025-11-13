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
        twitter,
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
        twitter,
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
    const agentUsers = await User.find({ role: 'agent' })
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
    
    res.status(200).json({
      success: true,
      data: agents,
      total: agents.length
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
        // Transform to match expected format
        agent = {
          _id: agent._id,
          email: agent.email,
          username: agent.username,
          fullName: agent.username || agent.fullName || agent.email || 'Agent',
          companyName: agent.companyName || (agent.location ? `${agent.location} Properties` : 'Syrian Properties'),
          position: agent.position || agent.job || 'Real Estate Agent',
          job: agent.job || agent.position || 'Real Estate Agent',
          officeNumber: agent.officeNumber || agent.phone || '',
          officeAddress: agent.officeAddress || agent.location || '',
          avatar: agent.avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
          location: agent.location || '',
          phone: agent.phone || '',
          description: agent.description || '',
          facebook: agent.facebook || '',
          twitter: agent.twitter || '',
          linkedin: agent.linkedin || '',
          role: agent.role,
          pointsBalance: agent.pointsBalance || 0,
          packageType: agent.packageType || 'basic',
          createdAt: agent.createdAt,
          updatedAt: agent.updatedAt
        };
      } else {
        return next(errorHandler(404, 'Agent not found'));
      }
    }
    
    res.status(200).json({
      success: true,
      data: agent
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
