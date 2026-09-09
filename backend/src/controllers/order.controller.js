const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cake = require('../models/Cake');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res, next) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No order items' });
    }

    const mergedItems = {};
    for (const item of items) {
      if (!item.cakeId || !mongoose.Types.ObjectId.isValid(item.cakeId)) {
        return res.status(400).json({ success: false, message: `Invalid cake ID: ${item.cakeId}` });
      }
      if (!item.qty || !Number.isInteger(item.qty) || item.qty <= 0) {
        return res.status(400).json({ success: false, message: `Invalid quantity for cake ID: ${item.cakeId}` });
      }
      if (mergedItems[item.cakeId]) {
        mergedItems[item.cakeId] += item.qty;
      } else {
        mergedItems[item.cakeId] = item.qty;
      }
    }

    const orderItems = [];
    let itemsTotal = 0;

    for (const [cakeId, qty] of Object.entries(mergedItems)) {
      const cake = await Cake.findById(cakeId);
      if (!cake) {
        return res.status(404).json({ success: false, message: `Cake not found: ${cakeId}` });
      }
      orderItems.push({
        cakeId: cake._id,
        qty,
        name: cake.name,
        price: cake.price,
        emoji: cake.emoji,
        image: cake.image
      });
      itemsTotal += (cake.price * qty);
    }
    
    // Add standard delivery fee of 50
    const total = itemsTotal + 50;

    const order = new Order({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      items: orderItems,
      total,
      status: 'Pending'
    });

    const createdOrder = await order.save();
    res.status(201).json({ success: true, order: createdOrder });
  } catch (error) {
    console.error(`Error creating order: ${error.message}`);
    next(error);
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/my-orders
// @access  Private
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error(`Error fetching user orders: ${error.message}`);
    next(error);
  }
};

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private/Admin
const getOrders = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) {
      filter.status = status;
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error(`Error fetching orders: ${error.message}`);
    next(error);
  }
};

// @desc    Get single order
// @route   GET /api/admin/orders/:id
// @access  Private/Admin
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error(`Error fetching order: ${error.message}`);
    next(error);
  }
};

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    const validStatuses = ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = status;
    const updatedOrder = await order.save();

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error(`Error updating order status: ${error.message}`);
    next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrders,
  getOrderById,
  updateOrderStatus
};
