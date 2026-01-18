/**
 * Notification Routes
 */

const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead
} = require('../controllers/notification.controller');
const verifyToken = require('../utils/verifyUser');

/**
 * @route GET /api/notifications
 * @desc Get all notifications for authenticated user
 * @access Private
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 20)
 * @query {string} type - Filter by notification type
 * @query {boolean} isRead - Filter by read status
 * @query {string} priority - Filter by priority
 * @returns {Object} Notifications with pagination
 */
router.get('/', verifyToken, getNotifications);

/**
 * @route GET /api/notifications/unread-count
 * @desc Get unread notification count
 * @access Private
 * @returns {Object} Unread count
 */
router.get('/unread-count', verifyToken, getUnreadCount);

/**
 * @route PATCH /api/notifications/:notificationId/read
 * @desc Mark a notification as read
 * @access Private
 * @returns {Object} Updated notification
 */
router.patch('/:notificationId/read', verifyToken, markAsRead);

/**
 * @route PATCH /api/notifications/read-all
 * @desc Mark all notifications as read
 * @access Private
 * @returns {Object} Update result
 */
router.patch('/read-all', verifyToken, markAllAsRead);

/**
 * @route DELETE /api/notifications/:notificationId
 * @desc Delete a notification
 * @access Private
 * @returns {Object} Success message
 */
router.delete('/:notificationId', verifyToken, deleteNotification);

/**
 * @route DELETE /api/notifications/read-all
 * @desc Delete all read notifications
 * @access Private
 * @returns {Object} Delete result
 */
router.delete('/read-all', verifyToken, deleteAllRead);

module.exports = router;

