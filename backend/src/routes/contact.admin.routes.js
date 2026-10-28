const express = require('express');
const { protect, adminOnly } = require('../middleware/auth.middleware');
const {
  getContactMessages,
  updateContactMessageStatus
} = require('../controllers/contact.controller');

const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.get('/', getContactMessages);
router.patch('/:id', updateContactMessageStatus);

module.exports = router;
