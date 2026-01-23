const cloudinary = require('./cloudinary');
const logger = require('./logger');

// Magic bytes (file signatures) for image validation
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

  return signatures.some(signature => {
    if (buffer.length < signature.length) {
      return false;
    }
    return signature.every((byte, index) => buffer[index] === byte);
  });
}

// Helper function to upload buffer to Cloudinary
function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

// Middleware to handle user avatar upload and Cloudinary upload before controller
async function uploadUserImagesMiddleware(req, res, next) {
  try {
    if (!req.files) return next();

    const avatarFile = req.files['avatar']?.[0];

    if (avatarFile) {
      // Validate file signature to prevent malicious files
      if (!validateFileSignature(avatarFile.buffer, avatarFile.mimetype)) {
        logger.error(`⚠️ Invalid file signature for avatar: ${avatarFile.originalname}`);
        return res.status(400).json({
          success: false,
          message: 'Invalid image file. File signature does not match the declared type.'
        });
      }

      const avatarResult = await uploadToCloudinary(avatarFile.buffer, 'users');
      req.body.avatar = avatarResult.secure_url;
    }

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadUserImagesMiddleware
};

