const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blog.controller');
const { body } = require('express-validator');

// Validation middleware for creation
const validateBlogCreate = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('content')
    .notEmpty()
    .withMessage('Content is required'),
  body('imageSrc')
    .notEmpty()
    .withMessage('Image is required'),
  body('tag')
    .notEmpty()
    .withMessage('Tag is required')
    .isIn(['Real Estate', 'News', 'Investment', 'Market Updates', 'Buying Tips', 'Interior Inspiration', 'Investment Insights', 'Home Construction', 'Legal Guidance', 'Community Spotlight'])
    .withMessage('Invalid tag'),
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['Property', 'Market', 'Investment', 'Tips', 'News', 'Legal'])
    .withMessage('Invalid category'),
  body('author.name')
    .optional()
    .notEmpty()
    .withMessage('Author name cannot be empty'),
  body('author.email')
    .optional()
    .isEmail()
    .withMessage('Invalid author email')
];

// Validation middleware for updates (optional fields)
const validateBlogUpdate = [
  body('title')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('content')
    .optional(),
  body('imageSrc')
    .optional(),
  body('tag')
    .optional()
    .isIn(['Real Estate', 'News', 'Investment', 'Market Updates', 'Buying Tips', 'Interior Inspiration', 'Investment Insights', 'Home Construction', 'Legal Guidance', 'Community Spotlight'])
    .withMessage('Invalid tag'),
  body('category')
    .optional()
    .isIn(['Property', 'Market', 'Investment', 'Tips', 'News', 'Legal'])
    .withMessage('Invalid category'),
  body('author.name')
    .optional()
    .notEmpty()
    .withMessage('Author name cannot be empty'),
  body('author.email')
    .optional()
    .isEmail()
    .withMessage('Invalid author email')
];

// GET /api/blog - Get all blogs with filtering and pagination
router.get('/', blogController.getAllBlogs);

// GET /api/blog/featured - Get featured blogs
router.get('/featured', blogController.getFeaturedBlogs);

// GET /api/blog/stats - Get blog statistics
router.get('/stats', blogController.getBlogStats);

// GET /api/blog/tag/:tag - Get blogs by tag
router.get('/tag/:tag', blogController.getBlogsByTag);

// GET /api/blog/:id - Get blog by ID
router.get('/:id', blogController.getBlogById);

// POST /api/blog - Create new blog
router.post('/', validateBlogCreate, blogController.createBlog);

// PUT /api/blog/:id - Update blog
router.put('/:id', validateBlogUpdate, blogController.updateBlog);

// DELETE /api/blog/:id - Delete blog
router.delete('/:id', blogController.deleteBlog);

module.exports = router;
