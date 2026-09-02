const express = require('express');
const { protect, adminOnly } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const {
  createCake,
  getCakes,
  getCakeById,
  updateCake,
  deleteCake
} = require('../controllers/cake.controller');

const router = express.Router();

router.route('/')
  .post(protect, adminOnly, upload.single('image'), createCake)
  .get(protect, adminOnly, getCakes);

router.route('/:id')
  .get(protect, adminOnly, getCakeById)
  .put(protect, adminOnly, upload.single('image'), updateCake)
  .delete(protect, adminOnly, deleteCake);

// Error handler for multer
router.use((err, req, res, next) => {
  if (err.message === 'Images only! (jpeg, jpg, png, webp)') {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File is too large. Max size is 5MB.' });
  }
  next(err);
});

module.exports = router;
