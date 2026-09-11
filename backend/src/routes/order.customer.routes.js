const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const {
  createCustomerOrder,
  getMyOrders
} = require('../controllers/order.controller');

const router = express.Router();

router.route('/')
  .post(protect, createCustomerOrder);

router.route('/myorders')
  .get(protect, getMyOrders);

module.exports = router;
