const ShopSettings = require('../models/ShopSettings');

// Helper for time validation (HH:MM)
const isValidTime = (time) => {
  const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return regex.test(time);
};

// Helper for email validation
const isValidEmail = (email) => {
  if (!email) return true; // allow empty
  const regex = /^\S+@\S+\.\S+$/;
  return regex.test(email);
};

// @desc    Get shop settings
// @route   GET /api/admin/settings
// @access  Private/Admin
const getShopSettings = async (req, res, next) => {
  try {
    let settings = await ShopSettings.findOne({ key: 'main' });

    // If no settings exist yet, return a clean default
    if (!settings) {
      settings = await ShopSettings.create({ key: 'main' });
    }

    res.status(200).json({ settings });
  } catch (error) {
    console.error(`Error fetching settings: ${error.message}`);
    next(error);
  }
};

// @desc    Update shop settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
const updateShopSettings = async (req, res, next) => {
  try {
    const allowedUpdates = [
      'shopName',
      'phone',
      'email',
      'address',
      'description',
      'openingTime',
      'closingTime',
      'deliveryCharge',
      'minimumOrderAmount'
    ];
    
    const updateData = {};

    for (const key of Object.keys(req.body)) {
      if (allowedUpdates.includes(key)) {
        updateData[key] = req.body[key];
      }
    }

    // Validations
    if (updateData.deliveryCharge !== undefined) {
      if (typeof updateData.deliveryCharge !== 'number' || updateData.deliveryCharge < 0) {
        return res.status(400).json({ success: false, message: 'Delivery charge must be a non-negative number' });
      }
    }

    if (updateData.minimumOrderAmount !== undefined) {
      if (typeof updateData.minimumOrderAmount !== 'number' || updateData.minimumOrderAmount < 0) {
        return res.status(400).json({ success: false, message: 'Minimum order amount must be a non-negative number' });
      }
    }

    if (updateData.openingTime !== undefined && !isValidTime(updateData.openingTime)) {
      return res.status(400).json({ success: false, message: 'Invalid openingTime format. Expected HH:MM' });
    }

    if (updateData.closingTime !== undefined && !isValidTime(updateData.closingTime)) {
      return res.status(400).json({ success: false, message: 'Invalid closingTime format. Expected HH:MM' });
    }

    if (updateData.email !== undefined && updateData.email !== '' && !isValidEmail(updateData.email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    // Upsert the singleton
    const settings = await ShopSettings.findOneAndUpdate(
      { key: 'main' },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({ settings });
  } catch (error) {
    console.error(`Error updating settings: ${error.message}`);
    next(error);
  }
};

// @desc    Get public shop settings
// @route   GET /api/settings
// @access  Public
const getPublicSettings = async (req, res, next) => {
  try {
    const settings = await ShopSettings.findOne({ key: 'main' });

    const defaults = {
      shopName: "Priti's Cake",
      phone: '',
      email: '',
      address: '',
      openingTime: '10:00',
      closingTime: '21:00',
      deliveryCharge: 50,
      minimumOrderAmount: 0
    };

    if (!settings) {
      return res.status(200).json({
        success: true,
        settings: defaults
      });
    }

    res.status(200).json({
      success: true,
      settings: {
        shopName: settings.shopName !== undefined ? settings.shopName : defaults.shopName,
        phone: settings.phone !== undefined ? settings.phone : defaults.phone,
        email: settings.email !== undefined ? settings.email : defaults.email,
        address: settings.address !== undefined ? settings.address : defaults.address,
        openingTime: settings.openingTime !== undefined ? settings.openingTime : defaults.openingTime,
        closingTime: settings.closingTime !== undefined ? settings.closingTime : defaults.closingTime,
        deliveryCharge: typeof settings.deliveryCharge === 'number' ? settings.deliveryCharge : defaults.deliveryCharge,
        minimumOrderAmount: typeof settings.minimumOrderAmount === 'number' ? settings.minimumOrderAmount : defaults.minimumOrderAmount
      }
    });
  } catch (error) {
    console.error(`Error fetching public settings: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getShopSettings,
  updateShopSettings,
  getPublicSettings
};
