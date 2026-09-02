const mongoose = require('mongoose');

const shopSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'main',
      unique: true,
      required: true
    },
    shopName: {
      type: String,
      default: "Priti's Cake"
    },
    phone: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    openingTime: {
      type: String,
      default: '10:00'
    },
    closingTime: {
      type: String,
      default: '21:00'
    },
    deliveryCharge: {
      type: Number,
      default: 50,
      min: 0
    },
    minimumOrderAmount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

const ShopSettings = mongoose.model('ShopSettings', shopSettingsSchema);

module.exports = ShopSettings;
