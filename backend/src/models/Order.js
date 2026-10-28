const mongoose = require('mongoose');
const {
  DELIVERY_TIME_SLOTS,
  MAX_CAKE_MESSAGE_LENGTH,
  MAX_SPECIAL_INSTRUCTIONS_LENGTH
} = require('../constants/order.constants');

const orderItemSchema = new mongoose.Schema({
  cakeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cake',
    required: true,
  },
  qty: {
    type: Number,
    required: true,
    min: 1,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  emoji: String,
  image: String,
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    deliveryAddress: {
      type: String,
      required: true,
    },
    items: [orderItemSchema],
    deliveryCharge: {
      type: Number,
      required: true,
      min: 0,
      default: 50,
    },
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },
    deliveryDate: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (v === null || v === undefined || v === '') return true;
          return /^\d{4}-\d{2}-\d{2}$/.test(v);
        },
        message: 'Delivery date must be in YYYY-MM-DD format',
      },
      default: null,
    },
    deliveryTimeSlot: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (v === null || v === undefined || v === '') return true;
          return DELIVERY_TIME_SLOTS.includes(v);
        },
        message: 'Invalid delivery time slot',
      },
      default: null,
    },
    cakeMessage: {
      type: String,
      trim: true,
      maxlength: [MAX_CAKE_MESSAGE_LENGTH, `Cake message cannot exceed ${MAX_CAKE_MESSAGE_LENGTH} characters`],
      default: '',
    },
    specialInstructions: {
      type: String,
      trim: true,
      maxlength: [MAX_SPECIAL_INSTRUCTIONS_LENGTH, `Special instructions cannot exceed ${MAX_SPECIAL_INSTRUCTIONS_LENGTH} characters`],
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
