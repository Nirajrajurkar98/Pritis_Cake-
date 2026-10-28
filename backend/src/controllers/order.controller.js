const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cake = require('../models/Cake');
const ShopSettings = require('../models/ShopSettings');
const {
  DELIVERY_TIME_SLOTS,
  MAX_CAKE_MESSAGE_LENGTH,
  MAX_SPECIAL_INSTRUCTIONS_LENGTH
} = require('../constants/order.constants');

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
    const {
      items,
      phone,
      deliveryAddress,
      deliveryDate,
      deliveryTimeSlot,
      cakeMessage,
      specialInstructions
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No order items' });
    }

    if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    const cleanPhone = phone.trim();
    if (cleanPhone.length < 8 || cleanPhone.length > 15 || !/^[0-9+\-\s()]+$/.test(cleanPhone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format' });
    }

    if (!deliveryAddress || typeof deliveryAddress !== 'string' || deliveryAddress.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Delivery address is required' });
    }
    const cleanAddress = deliveryAddress.trim();
    if (cleanAddress.length > 500) {
      return res.status(400).json({ success: false, message: 'Delivery address is too long' });
    }

    // Delivery date validation
    let cleanDeliveryDate = null;
    if (deliveryDate !== undefined && deliveryDate !== null && deliveryDate !== '') {
      if (typeof deliveryDate !== 'string') {
        return res.status(400).json({ success: false, message: 'Delivery date must be a string' });
      }

      const trimmedDate = deliveryDate.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
        return res.status(400).json({ success: false, message: 'Delivery date must be in YYYY-MM-DD format' });
      }

      const [yearStr, monthStr, dayStr] = trimmedDate.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);

      const parsedDate = new Date(Date.UTC(year, month - 1, day));
      if (
        parsedDate.getUTCFullYear() !== year ||
        parsedDate.getUTCMonth() !== month - 1 ||
        parsedDate.getUTCDate() !== day
      ) {
        return res.status(400).json({ success: false, message: 'Invalid calendar delivery date' });
      }

      const now = new Date();
      const todayYear = now.getFullYear();
      const todayMonth = String(now.getMonth() + 1).padStart(2, '0');
      const todayDay = String(now.getDate()).padStart(2, '0');
      const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;

      if (trimmedDate < todayStr) {
        return res.status(400).json({ success: false, message: 'Delivery date cannot be earlier than today' });
      }

      cleanDeliveryDate = trimmedDate;
    }

    // Delivery time slot validation
    let cleanDeliveryTimeSlot = null;
    if (deliveryTimeSlot !== undefined && deliveryTimeSlot !== null && deliveryTimeSlot !== '') {
      if (typeof deliveryTimeSlot !== 'string') {
        return res.status(400).json({ success: false, message: 'Delivery time slot must be a string' });
      }

      const trimmedSlot = deliveryTimeSlot.trim();
      if (!DELIVERY_TIME_SLOTS.includes(trimmedSlot)) {
        return res.status(400).json({
          success: false,
          message: `Invalid delivery time slot. Allowed slots: ${DELIVERY_TIME_SLOTS.join(', ')}`
        });
      }

      cleanDeliveryTimeSlot = trimmedSlot;
    }

    // Cake message validation
    let cleanCakeMessage = '';
    if (cakeMessage !== undefined && cakeMessage !== null) {
      if (typeof cakeMessage !== 'string') {
        return res.status(400).json({ success: false, message: 'Cake message must be a string' });
      }
      cleanCakeMessage = cakeMessage.trim();
      if (cleanCakeMessage.length > MAX_CAKE_MESSAGE_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `Cake message cannot exceed ${MAX_CAKE_MESSAGE_LENGTH} characters`
        });
      }
    }

    // Special instructions validation
    let cleanSpecialInstructions = '';
    if (specialInstructions !== undefined && specialInstructions !== null) {
      if (typeof specialInstructions !== 'string') {
        return res.status(400).json({ success: false, message: 'Special instructions must be a string' });
      }
      cleanSpecialInstructions = specialInstructions.trim();
      if (cleanSpecialInstructions.length > MAX_SPECIAL_INSTRUCTIONS_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `Special instructions cannot exceed ${MAX_SPECIAL_INSTRUCTIONS_LENGTH} characters`
        });
      }
    }

    const orderItems = [];
    let subtotal = 0;

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

      subtotal += (cake.price * qty);
    }
    
    const settings = await ShopSettings.findOne({ key: 'main' });
    const minimumOrderAmount = (settings && typeof settings.minimumOrderAmount === 'number' && settings.minimumOrderAmount >= 0)
      ? settings.minimumOrderAmount
      : 0;

    if (minimumOrderAmount > 0 && subtotal < minimumOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Order subtotal of ₹${subtotal} is below the minimum order amount of ₹${minimumOrderAmount}`
      });
    }

    const deliveryCharge = (settings && typeof settings.deliveryCharge === 'number' && settings.deliveryCharge >= 0)
      ? settings.deliveryCharge
      : 50;
    const total = subtotal + deliveryCharge;

    const order = new Order({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      phone: cleanPhone,
      deliveryAddress: cleanAddress,
      items: orderItems,
      deliveryCharge: deliveryCharge,
      total: total,
      status: 'Pending',
      deliveryDate: cleanDeliveryDate,
      deliveryTimeSlot: cleanDeliveryTimeSlot,
      cakeMessage: cleanCakeMessage,
      specialInstructions: cleanSpecialInstructions
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
