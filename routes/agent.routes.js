const express = require('express');
const router = express.Router();

const upload = require('../utils/multer'); 
const cloudinary = require('../utils/cloudinary');

const {
  createAgent,
  getAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
} = require('../controllers/agent.controller');

const verifyToken = require('../utils/verifyUser');

function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

// Middleware to handle images upload and Cloudinary upload before controller
async function uploadAgentImagesMiddleware(req, res, next) {
  try {
    if (!req.files) return next();

    const avatarFile = req.files['avatar']?.[0];
    const posterFile = req.files['poster']?.[0];

    if (avatarFile) {
      const avatarResult = await uploadToCloudinary(avatarFile.buffer, 'agents');
      req.body.avatar = avatarResult.secure_url;
    }

    if (posterFile) {
      const posterResult = await uploadToCloudinary(posterFile.buffer, 'agents');
      req.body.poster = posterResult.secure_url;
    }

    next();
  } catch (error) {
    next(error);
  }
}

// Routes
router.post(
  '/create',
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'poster', maxCount: 1 },
  ]),
  uploadAgentImagesMiddleware,
  createAgent
);

router.put(
  '/:id',
  verifyToken,
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'poster', maxCount: 1 },
  ]),
  uploadAgentImagesMiddleware,
  updateAgent
);

router.get('/', getAgents);
router.get('/:id', getAgentById);
router.delete('/:id', verifyToken, deleteAgent);

module.exports = router;
