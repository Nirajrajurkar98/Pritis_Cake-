const User = require('../models/User');

// @desc    Test admin access
// @route   GET /api/admin/test
// @access  Private/Admin
const getAdminTest = (req, res) => {
  res.status(200).json({ success: true, message: 'Admin access granted' });
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
const getDashboardStats = async (req, res, next) => {
  try {
    const [totalUsers, totalCustomers, totalAdmins] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'admin' }),
    ]);

    res.status(200).json({
      totalUsers,
      totalCustomers,
      totalAdmins
    });
  } catch (error) {
    console.error(`Error fetching dashboard stats: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getAdminTest,
  getDashboardStats,
};
