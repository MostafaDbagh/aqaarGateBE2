const express = require('express');
const router = express.Router();
const {
  createContact,
  getContacts,
  getContact,
  deleteContact,
} = require('../controllers/contact.controller');

router.post('/contact', createContact);
router.get('/', getContacts);
router.get('/:id', getContact);
router.delete('/:id', deleteContact);

module.exports = router;
