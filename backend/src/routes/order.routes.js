const express = require('express');
const { protect, adminOnly } = require('../middleware/auth.middleware');
const {
  getOrders,
  getOrderById,
  updateOrderStatus
} = require('../controllers/order.controller');

const router = express.Router();

router.route('/')
  .get(protect, adminOnly, getOrders);

router.route('/:id')
  .get(protect, adminOnly, getOrderById);

router.route('/:id/status')
  .put(protect, adminOnly, updateOrderStatus);

module.exports = router;
