const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cake = require('../models/Cake');

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

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createCustomerOrder = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No order items' });
    }

    const orderItems = [];
    let total = 0;

    for (const item of items) {
      if (!item.cakeId || !mongoose.Types.ObjectId.isValid(item.cakeId)) {
        return res.status(400).json({ success: false, message: 'Invalid cake ID provided' });
      }

      const cake = await Cake.findById(item.cakeId);
      if (!cake) {
        return res.status(404).json({ success: false, message: `Cake not found for ID: ${item.cakeId}` });
      }

      const qty = parseInt(item.qty, 10);
      if (isNaN(qty) || qty < 1) {
        return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
      }

      orderItems.push({
        cakeId: cake._id,
        qty: qty,
        name: cake.name,
        price: cake.price,
        emoji: cake.emoji,
        image: cake.image
      });

      total += (cake.price * qty);
    }
    
    // Add delivery charge if that's standard, wait, the frontend adds 50 for delivery.
    // Let's check `main.js`: `const delivery = subtotal > 0 ? 50 : 0;` and `getCartTotal() + 50`
    // Wait, the prompt says "Calculate the order total on the server from the current database prices."
    // Does the schema have a delivery charge field? No. It just has `total`.
    // I should add the 50 delivery fee as it's hardcoded in the frontend. 
    // Wait, let's keep it exact: `total += 50;` (since delivery fee is standard 50 if order exists).
    total += 50;

    const order = new Order({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      items: orderItems,
      total: total,
      status: 'Pending'
    });

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);
  } catch (error) {
    console.error(`Error creating customer order: ${error.message}`);
    next(error);
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error(`Error fetching customer orders: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getOrders,
  getOrderById,
  updateOrderStatus,
  createCustomerOrder,
  getMyOrders
};
