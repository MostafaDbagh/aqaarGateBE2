const cloudinary = require('./cloudinary');

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

