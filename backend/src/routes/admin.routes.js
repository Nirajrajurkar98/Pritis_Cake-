const express = require('express');
const { protect, adminOnly } = require('../middleware/auth.middleware');
const { getAdminTest, getDashboardStats, getRevenue } = require('../controllers/admin.controller');

const router = express.Router();

// @desc    Test admin access
// @route   GET /api/admin/test
router.get('/test', protect, adminOnly, getAdminTest);

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
router.get('/stats', protect, adminOnly, getDashboardStats);

// @desc    Get revenue statistics
// @route   GET /api/admin/revenue
router.get('/revenue', protect, adminOnly, getRevenue);

module.exports = router;
