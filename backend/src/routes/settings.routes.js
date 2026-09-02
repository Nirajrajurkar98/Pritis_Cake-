const express = require('express');
const { protect, adminOnly } = require('../middleware/auth.middleware');
const { getShopSettings, updateShopSettings } = require('../controllers/settings.controller');

const router = express.Router();

router.route('/')
  .get(protect, adminOnly, getShopSettings)
  .put(protect, adminOnly, updateShopSettings);

module.exports = router;
