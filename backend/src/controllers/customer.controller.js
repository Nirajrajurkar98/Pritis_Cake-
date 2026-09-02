const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');

// @desc    Get all customers
// @route   GET /api/admin/customers
// @access  Private/Admin
const getCustomers = async (req, res) => {
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
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Get single customer
// @route   GET /api/admin/customers/:id
// @access  Private/Admin
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid customer ID' });
    }

    const customer = await User.findOne({ _id: id, role: 'customer' }).select('-password');

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.status(200).json(customer);
  } catch (error) {
    console.error(`Error fetching customer: ${error.message}`);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Get single customer's orders
// @route   GET /api/admin/customers/:id/orders
// @access  Private/Admin
const getCustomerOrders = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid customer ID' });
    }

    // Verify the user exists and is a customer
    const customer = await User.findOne({ _id: id, role: 'customer' }).select('-password');

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const orders = await Order.find({ user: id }).sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    console.error(`Error fetching customer orders: ${error.message}`);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  getCustomerOrders
};
