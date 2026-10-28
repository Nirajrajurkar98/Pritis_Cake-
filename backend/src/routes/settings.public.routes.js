const express = require('express');
const { getPublicSettings } = require('../controllers/settings.controller');

const router = express.Router();

router.route('/')
  .get(getPublicSettings);

module.exports = router;

