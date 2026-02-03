const Career = require('../models/career.model');

// Public: Get all published careers
exports.getAllCareers = async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const filter = { status: 'published' };
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const careers = await Career.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Career.countDocuments(filter);

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.json({
      success: true,
      data: careers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNextPage: skip + parseInt(limit) < total,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching careers',
      error: error.message
    });
  }
};

// Public: Get career by ID (published only)
exports.getCareerById = async (req, res) => {
  try {
    const { id } = req.params;

    const career = await Career.findOne({ _id: id, status: 'published' }).lean();

    if (!career) {
      return res.status(404).json({
        success: false,
        message: 'Career not found'
      });
    }

    res.json({
      success: true,
      data: career
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching career',
      error: error.message
    });
  }
};

// Admin: Get all careers (including drafts)
exports.getAdminCareers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const careers = await Career.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Career.countDocuments(filter);

    res.json({
      success: true,
      data: careers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNextPage: skip + parseInt(limit) < total,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching careers',
      error: error.message
    });
  }
};

// Admin: Create career
exports.createCareer = async (req, res) => {
  try {
    const careerData = req.body;
    const career = new Career(careerData);
    await career.save();

    res.status(201).json({
      success: true,
      message: 'Career created successfully',
      data: career
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating career',
      error: error.message
    });
  }
};

// Admin: Update career
exports.updateCareer = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const career = await Career.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!career) {
      return res.status(404).json({
        success: false,
        message: 'Career not found'
      });
    }

    res.json({
      success: true,
      message: 'Career updated successfully',
      data: career
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating career',
      error: error.message
    });
  }
};

// Admin: Delete career
exports.deleteCareer = async (req, res) => {
  try {
    const { id } = req.params;

    const career = await Career.findByIdAndDelete(id);

    if (!career) {
      return res.status(404).json({
        success: false,
        message: 'Career not found'
      });
    }

    res.json({
      success: true,
      message: 'Career deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting career',
      error: error.message
    });
  }
};
