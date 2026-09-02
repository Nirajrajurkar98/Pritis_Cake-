const express = require('express');
const { protect, adminOnly } = require('../middleware/auth.middleware');

const router = express.Router();

// @desc    Test admin access
// @route   GET /api/admin/test
router.get('/test', protect, adminOnly, (req, res) => {
  res.status(200).json({ message: 'Admin access granted' });
});

module.exports = router;
