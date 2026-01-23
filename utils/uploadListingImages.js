const multer = require('multer');
const cloudinary = require('../utils/cloudinary');
const logger = require('../utils/logger');

// Magic bytes (file signatures) for image validation
// These are the actual bytes at the start of image files
const IMAGE_SIGNATURES = {
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF], // JPEG
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG
  ],
  'image/webp': [
    [0x52, 0x49, 0x46, 0x46], // WebP (RIFF)
  ],
};

// Function to validate file signature (magic bytes)
function validateFileSignature(buffer, mimetype) {
  if (!buffer || buffer.length < 8) {
    return false;
  }

  const signatures = IMAGE_SIGNATURES[mimetype];
  if (!signatures) {
    return false;
  }

  // Check if buffer starts with any of the valid signatures
  return signatures.some(signature => {
    if (buffer.length < signature.length) {
      return false;
    }
    return signature.every((byte, index) => buffer[index] === byte);
  });
}

// Multer config - memory storage for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 7 // Maximum 7 images
  },
  fileFilter: (req, file, cb) => {
    // First check MIME type
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
    }
    
    // Note: At this point, we don't have the buffer yet
    // We'll validate the actual file signature after multer processes it
    // This is done in the uploadListingImages middleware
    cb(null, true);
  }
});

// Multer error handler
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    logger.error('Multer error:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB per image.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 7 images allowed.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`
    });
  }
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next(err);
};

// Cloudinary upload helper
function uploadToCloudinary(buffer, filename) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { 
        folder: 'listings',
        resource_type: 'image'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

// Middleware to parse multipart/form-data (files + form fields)
const uploadListingImages = (req, res, next) => {
  // Ensure req.body is initialized
  if (!req.body) {
    req.body = {};
  }
  
  logger.info('📦 Multer middleware - Processing multipart/form-data');
  logger.info('📦 Content-Type:', req.headers['content-type']);
  
  // Use upload.any() to parse ALL fields (both files and form data)
  // This ensures req.body is populated with all form fields
  const multerMiddleware = upload.any();
  
  multerMiddleware(req, res, (err) => {
    if (err) {
      logger.error('❌ Multer middleware error:', err);
      return next(err);
    }
    
    // Ensure req.body exists after multer processing
    if (!req.body) {
      req.body = {};
    }
    
    // Filter files to only include 'images' field and limit to 7
    if (req.files && Array.isArray(req.files)) {
      req.files = req.files
        .filter(file => file.fieldname === 'images')
        .slice(0, 7); // Limit to 7 images
    } else {
      req.files = [];
    }
    
    logger.info(`✅ Multer parsed ${req.files.length} file(s) and ${Object.keys(req.body || {}).length} form field(s)`);
    
    // Log all parsed fields
    if (req.body && Object.keys(req.body).length > 0) {
      logger.debug('📋 Parsed form fields:', req.body);
      Object.entries(req.body).forEach(([key, value]) => {
        logger.debug(`  - ${key}: ${value} (type: ${typeof value}, isArray: ${Array.isArray(value)})`);
      });
    } else {
      logger.error('❌ req.body is empty after Multer processing!');
      logger.error('Request headers:', req.headers);
      logger.error('Content-Type:', req.headers['content-type']);
    }
    
    if (req.files.length > 0) {
      req.files.forEach((file, index) => {
        logger.debug(`📎 File ${index + 1}: ${file.originalname} (${file.size} bytes, ${file.mimetype})`);
      });
    }
    
    next();
  });
};

// Middleware to upload images to Cloudinary
const uploadListingImagesMiddleware = async (req, res, next) => {
  try {
    logger.info('📸 Starting Cloudinary upload process');
    
    // Ensure req.body exists (multer should populate it, but handle edge cases)
    if (!req.body) {
      req.body = {};
    }
    
    // If no files, skip upload and set empty arrays
    if (!req.files || req.files.length === 0) {
      logger.info('⚠️ No images to upload');
      req.body.images = [];
      req.body.imageNames = [];
      return next();
    }

    const uploadedImages = [];
    const imageNames = [];

    logger.info(`🔄 Processing ${req.files.length} image(s) for Cloudinary upload`);

    // Upload each image to Cloudinary
    for (const file of req.files) {
      try {
        if (!file.buffer) {
          logger.error(`⚠️ File ${file.originalname} has no buffer, skipping`);
          continue;
        }

        // Validate file signature (magic bytes) to ensure it's actually an image
        // This prevents malicious files disguised as images
        if (!validateFileSignature(file.buffer, file.mimetype)) {
          logger.error(`⚠️ Invalid file signature for ${file.originalname}. File may be malicious or corrupted.`);
          return res.status(400).json({
            success: false,
            message: `Invalid image file: ${file.originalname}. File signature does not match the declared type.`
          });
        }

        logger.debug(`📤 Uploading: ${file.originalname} (${file.size} bytes, validated signature)`);
        
        const result = await uploadToCloudinary(file.buffer, file.originalname);
        
        logger.info(`✅ Uploaded: ${result.secure_url}`);
        
        uploadedImages.push({
          publicId: result.public_id,
          url: result.secure_url,
          filename: file.originalname,
          uploadedAt: new Date()
        });

        imageNames.push(file.originalname);
      } catch (uploadError) {
        logger.error(`❌ Error uploading ${file.originalname}:`, uploadError);
        // Continue with other images even if one fails
        continue;
      }
    }

    if (uploadedImages.length === 0) {
      logger.warn('⚠️ No images were successfully uploaded to Cloudinary');
    } else {
      logger.info(`✅ Successfully uploaded ${uploadedImages.length} image(s) to Cloudinary`);
    }

    // Attach uploaded images data to req.body for controller
    req.body.images = uploadedImages;
    req.body.imageNames = imageNames;
    
    next();
  } catch (error) {
    logger.error('❌ Error in uploadListingImagesMiddleware:', error);
    next(error);
  }
};

module.exports = {
  uploadListingImages,
  uploadListingImagesMiddleware,
  handleMulterError,
};
