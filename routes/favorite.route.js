const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyUser');
const {
  addFavorite,
  removeFavorite,
  getFavorites,
  isFavorited
} = require('../controllers/favorite.controller');

// Apply authentication middleware to all routes
router.post('/', verifyToken, addFavorite);
router.delete('/:propertyId', verifyToken, removeFavorite);
router.get('/', verifyToken, getFavorites);
router.get('/check/:propertyId', verifyToken, isFavorited);

module.exports = router;
