const express = require('express');
const { protect, adminOnly } = require('../middleware/auth.middleware');
const {
  createOrder,
  getMyOrders,
  getOrders,
  getOrderById,
  updateOrderStatus
} = require('../controllers/order.controller');

const router = express.Router();

router.route('/my-orders')
  .get(protect, getMyOrders);

router.route('/')
  .post(protect, createOrder)
  .get(protect, adminOnly, getOrders);

router.route('/:id')
  .get(protect, adminOnly, getOrderById);

router.route('/:id/status')
  .put(protect, adminOnly, updateOrderStatus);

module.exports = router;
