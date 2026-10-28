const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');

// @desc    Get all customers
// @route   GET /api/admin/customers
// @access  Private/Admin
const getCustomers = async (req, res, next) => {
  try {
    const { search } = req.query;
    
    let query = { role: 'customer' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const customers = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json(customers);
  } catch (error) {
    console.error(`Error fetching customers: ${error.message}`);
    next(error);
  }
};

// @desc    Get single customer
// @route   GET /api/admin/customers/:id
// @access  Private/Admin
const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID' });
    }

    const customer = await User.findOne({ _id: id, role: 'customer' }).select('-password');

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.status(200).json(customer);
  } catch (error) {
    console.error(`Error fetching customer: ${error.message}`);
    next(error);
  }
};

// @desc    Get single customer's orders
// @route   GET /api/admin/customers/:id/orders
// @access  Private/Admin
const getCustomerOrders = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID' });
    }

    // Verify the user exists and is a customer
    const customer = await User.findOne({ _id: id, role: 'customer' }).select('-password');

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const orders = await Order.find({ user: id }).sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    console.error(`Error fetching customer orders: ${error.message}`);
    next(error);
  }
};

// @desc    Block customer account
// @route   PATCH /api/admin/customers/:id/block
// @access  Private/Admin
const blockCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID' });
    }

    if (req.user && req.user._id.toString() === id.toString()) {
      return res.status(400).json({ success: false, message: 'Administrators cannot block their own account' });
    }

    const customer = await User.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (customer.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot block an administrator account' });
    }

    customer.isBlocked = true;
    await customer.save();

    const customerData = {
      _id: customer._id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      role: customer.role,
      isBlocked: customer.isBlocked,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt
    };

    res.status(200).json({
      success: true,
      message: 'Customer has been blocked successfully',
      isBlocked: customer.isBlocked,
      customer: customerData,
      data: customerData
    });
  } catch (error) {
    console.error(`Error blocking customer: ${error.message}`);
    next(error);
  }
};

// @desc    Unblock customer account
// @route   PATCH /api/admin/customers/:id/unblock
// @access  Private/Admin
const unblockCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID' });
    }

    const customer = await User.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    customer.isBlocked = false;
    await customer.save();

    const customerData = {
      _id: customer._id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      role: customer.role,
      isBlocked: customer.isBlocked,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt
    };

    res.status(200).json({
      success: true,
      message: 'Customer has been unblocked successfully',
      isBlocked: customer.isBlocked,
      customer: customerData,
      data: customerData
    });
  } catch (error) {
    console.error(`Error unblocking customer: ${error.message}`);
    next(error);
  }
};

// @desc    Update customer block status
// @route   PATCH /api/admin/customers/:id
// @access  Private/Admin
const updateCustomerBlock = async (req, res, next) => {
  if (req.body.isBlocked === true || req.body.isBlocked === 'true' || req.body.action === 'block') {
    return blockCustomer(req, res, next);
  } else if (req.body.isBlocked === false || req.body.isBlocked === 'false' || req.body.action === 'unblock') {
    return unblockCustomer(req, res, next);
  } else {
    return res.status(400).json({ success: false, message: 'Please specify isBlocked (true or false) or valid action' });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  getCustomerOrders,
  blockCustomer,
  unblockCustomer,
  updateCustomerBlock
};
