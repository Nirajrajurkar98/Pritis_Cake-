const express = require('express');
const rateLimit = require('express-rate-limit');
const { submitContactMessage } = require('../controllers/contact.controller');

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skip: (req) => process.env.NODE_ENV !== 'production' && req.headers['x-test-skip-rate-limit'] === 'true',
  message: {
    success: false,
    message: 'Too many inquiries submitted. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', contactLimiter, submitContactMessage);

if (process.env.NODE_ENV !== 'production') {
  router.post('/reset-limiter', (req, res) => {
    if (typeof contactLimiter.resetKey === 'function') {
      contactLimiter.resetKey(req.ip);
    }
    res.status(200).json({ success: true, message: 'Rate limiter reset' });
  });
}

module.exports = router;
