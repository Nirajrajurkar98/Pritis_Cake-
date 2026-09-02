const express = require('express');
const { protect, adminOnly } = require('../middleware/auth.middleware');
const {
  getCustomers,
  getCustomerById,
  getCustomerOrders
} = require('../controllers/customer.controller');

const router = express.Router();

router.route('/')
  .get(protect, adminOnly, getCustomers);

router.route('/:id')
  .get(protect, adminOnly, getCustomerById);

router.route('/:id/orders')
  .get(protect, adminOnly, getCustomerOrders);

module.exports = router;
