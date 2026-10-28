const express = require('express');
const { protect, adminOnly } = require('../middleware/auth.middleware');
const {
  getCustomers,
  getCustomerById,
  getCustomerOrders,
  blockCustomer,
  unblockCustomer,
  updateCustomerBlock
} = require('../controllers/customer.controller');

const router = express.Router();

router.route('/')
  .get(protect, adminOnly, getCustomers);

router.route('/:id')
  .get(protect, adminOnly, getCustomerById)
  .patch(protect, adminOnly, updateCustomerBlock)
  .put(protect, adminOnly, updateCustomerBlock);

router.route('/:id/orders')
  .get(protect, adminOnly, getCustomerOrders);

router.route('/:id/block')
  .patch(protect, adminOnly, blockCustomer)
  .put(protect, adminOnly, blockCustomer);

router.route('/:id/unblock')
  .patch(protect, adminOnly, unblockCustomer)
  .put(protect, adminOnly, unblockCustomer);

module.exports = router;
