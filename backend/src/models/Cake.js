const mongoose = require('mongoose');

const cakeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    emoji: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
    },
    desc: {
      type: String,
    },
    rating: {
      type: Number,
      default: 0,
    },
    reviews: {
      type: Number,
      default: 0,
    },
    weight: {
      type: String,
      trim: true,
    },
    time: {
      type: String,
      trim: true,
    },
    serves: {
      type: String,
      trim: true,
    },
    tag: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Cake = mongoose.model('Cake', cakeSchema);

module.exports = Cake;
