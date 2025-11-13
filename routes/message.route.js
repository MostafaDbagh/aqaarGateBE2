const express = require('express');
const {
  getMessagesByAgent,
  getMessageById,
  markAsRead,
  replyToMessage,
  archiveMessage,
  createMessage,
  deleteMessage
} = require('../controllers/message.controller.js');

const router = express.Router();

// Get messages for a specific agent with filtering and pagination
router.get('/agent/:agentId', getMessagesByAgent);

// Get a single message by ID
router.get('/:messageId', getMessageById);

// Create a new message (for contact forms)
router.post('/', createMessage);

// Mark message as read
router.patch('/:messageId/read', markAsRead);

// Reply to a message
router.patch('/:messageId/reply', replyToMessage);

// Archive a message
router.patch('/:messageId/archive', archiveMessage);

// Delete a message
router.delete('/:messageId', deleteMessage);

module.exports = router;
