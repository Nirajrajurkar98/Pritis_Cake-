const express = require('express');
const { protect, adminOnly } = require('../middleware/auth.middleware');
const {
  createCake,
  getCakes,
  getCakeById,
  updateCake,
  deleteCake
} = require('../controllers/cake.controller');

const router = express.Router();

router.route('/')
  .post(protect, adminOnly, createCake)
  .get(protect, adminOnly, getCakes);

router.route('/:id')
  .get(protect, adminOnly, getCakeById)
  .put(protect, adminOnly, updateCake)
  .delete(protect, adminOnly, deleteCake);

module.exports = router;
