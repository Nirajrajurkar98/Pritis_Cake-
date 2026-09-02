const express = require('express');
const { protect, adminOnly } = require('../middleware/auth.middleware');
const { getAdminTest } = require('../controllers/admin.controller');

const router = express.Router();

// @desc    Test admin access
// @route   GET /api/admin/test
router.get('/test', protect, adminOnly, getAdminTest);

module.exports = router;
