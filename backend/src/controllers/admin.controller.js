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

const Order = require('../models/Order');

// @desc    Get revenue statistics
// @route   GET /api/admin/revenue
// @access  Private/Admin
const getRevenue = async (req, res, next) => {
  try {
    const { period, date, month, year } = req.query;

    if (!['daily', 'monthly', 'yearly'].includes(period)) {
      return res.status(400).json({ success: false, message: 'Invalid period. Must be daily, monthly, or yearly.' });
    }

    let startDate, endDate;

    if (period === 'daily') {
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, message: 'Valid date (YYYY-MM-DD) is required for daily period.' });
      }
      startDate = new Date(`${date}T00:00:00.000Z`);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid date format.' });
      }
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else if (period === 'monthly') {
      if (!month || !year || isNaN(month) || isNaN(year) || month < 1 || month > 12) {
        return res.status(400).json({ success: false, message: 'Valid month (1-12) and year (YYYY) are required for monthly period.' });
      }
      startDate = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, 1));
      endDate = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10), 1));
    } else if (period === 'yearly') {
      if (!year || isNaN(year)) {
        return res.status(400).json({ success: false, message: 'Valid year (YYYY) is required for yearly period.' });
      }
      startDate = new Date(Date.UTC(parseInt(year, 10), 0, 1));
      endDate = new Date(Date.UTC(parseInt(year, 10) + 1, 0, 1));
    }

    const revenueResult = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lt: endDate
          },
          status: { $ne: 'Cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$total' }
        }
      }
    ]);

    const revenue = revenueResult.length > 0 ? revenueResult[0].revenue : 0;

    res.status(200).json({
      success: true,
      period,
      startDate,
      endDate,
      revenue
    });
  } catch (error) {
    console.error(`Error calculating revenue: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getAdminTest,
  getDashboardStats,
  getRevenue,
};
