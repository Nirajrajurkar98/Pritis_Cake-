const express = require('express');
const { getPublicCakes, getPublicCakeById } = require('../controllers/cake.controller');

const router = express.Router();

router.route('/')
  .get(getPublicCakes);

router.route('/:id')
  .get(getPublicCakeById);

module.exports = router;
