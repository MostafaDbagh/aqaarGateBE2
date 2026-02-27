const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const {
  // Properties
  getAllProperties,
  getPropertiesByAdmin,
  exportAdminProperties,
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
  deleteUser,
  // Agents
  getAllAgents,
  blockAgent,
  unblockAgent,
  deleteAgent,
  // Dashboard
  getDashboardStats
} = require('../controllers/admin.controller');
const careerController = require('../controllers/career.controller');
const blogController = require('../controllers/blog.controller');
const { body } = require('express-validator');

// Admin blog validation (optional fields, at least title or title_ar and content or content_ar checked in controller)
const validateAdminBlog = [
  body('title').optional().isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('title_ar').optional().isLength({ max: 200 }),
  body('content').optional(),
  body('content_ar').optional(),
  body('excerpt').optional().isLength({ max: 500 }),
  body('excerpt_ar').optional().isLength({ max: 500 }),
  body('imageSrc').optional(),
  body('tag').optional().isIn(['Real Estate', 'News', 'Investment', 'Market Updates', 'Buying Tips', 'Interior Inspiration', 'Investment Insights', 'Home Construction', 'Legal Guidance', 'Community Spotlight']),
  body('tag_ar').optional().isLength({ max: 100 }),
  body('category').optional().isIn(['Property', 'Market', 'Investment', 'Tips', 'News', 'Legal']),
  body('category_ar').optional().isLength({ max: 100 }),
  body('author.name').optional(),
  body('author.name_ar').optional(),
  body('author.email').optional().isEmail(),
  body('status').optional().isIn(['draft', 'published', 'archived']),
  body('featured').optional().isBoolean()
];

// All routes require admin authentication
router.use(adminAuth);

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// Properties
router.get('/properties', getAllProperties);
router.get('/properties-by-admin', getPropertiesByAdmin);
router.get('/properties-by-admin/export', exportAdminProperties);
router.put('/properties/:id/approval', updatePropertyApproval);
router.delete('/properties/:id', deleteProperty);

// Sold Properties
router.get('/sold-properties', getSoldProperties);
router.put('/sold-properties/:id/charges', updateSoldPropertyCharges);

// Deleted Properties
router.get('/deleted-properties', getDeletedProperties);

// Contacts
router.get('/contacts', getAllContacts);
router.delete('/contacts/:id', deleteContact);

// Rental Services
router.get('/rental-services', getAllRentalServices);
router.put('/rental-services/:id', updateRentalService);
router.delete('/rental-services/:id', deleteRentalService);

// Users
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);

// Agents
router.get('/agents', getAllAgents);
router.put('/agents/:id/block', blockAgent);
router.put('/agents/:id/unblock', unblockAgent);
router.delete('/agents/:id', deleteAgent);

// Careers (admin CRUD)
router.get('/careers', careerController.getAdminCareers);
router.post('/careers', careerController.createCareer);
router.put('/careers/:id', careerController.updateCareer);
router.delete('/careers/:id', careerController.deleteCareer);

// Blogs (admin CRUD, EN/AR fields)
router.get('/blogs', blogController.getAdminBlogs);
router.post('/blogs', validateAdminBlog, blogController.createBlog);
router.put('/blogs/:id', validateAdminBlog, blogController.updateBlog);
router.delete('/blogs/:id', blogController.deleteBlog);

module.exports = router;

