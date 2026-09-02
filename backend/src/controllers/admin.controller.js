// @desc    Test admin access
// @route   GET /api/admin/test
// @access  Private/Admin
const getAdminTest = (req, res) => {
  res.status(200).json({ message: 'Admin access granted' });
};

module.exports = {
  getAdminTest,
};
