const mongoose = require('mongoose');
const Cake = require('../models/Cake');

// @desc    Create a cake
// @route   POST /api/admin/cakes
// @access  Private/Admin
const createCake = async (req, res) => {
  try {
    const { name, category, price, emoji, image, desc, rating, reviews, weight, time, serves, tag } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({ message: 'Name, category, and price are required' });
    }

    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ message: 'Price must be a non-negative number' });
    }

    const cake = await Cake.create({
      name,
      category,
      price,
      emoji,
      image,
      desc,
      rating,
      reviews,
      weight,
      time,
      serves,
      tag
    });

    res.status(201).json(cake);
  } catch (error) {
    console.error(`Error creating cake: ${error.message}`);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Get all cakes
// @route   GET /api/admin/cakes
// @access  Private/Admin
const getCakes = async (req, res) => {
  try {
    const cakes = await Cake.find({});
    res.status(200).json(cakes);
  } catch (error) {
    console.error(`Error fetching cakes: ${error.message}`);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Get single cake
// @route   GET /api/admin/cakes/:id
// @access  Private/Admin
const getCakeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid cake ID' });
    }

    const cake = await Cake.findById(id);

    if (!cake) {
      return res.status(404).json({ message: 'Cake not found' });
    }

    res.status(200).json(cake);
  } catch (error) {
    console.error(`Error fetching cake: ${error.message}`);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Update a cake
// @route   PUT /api/admin/cakes/:id
// @access  Private/Admin
const updateCake = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price, emoji, image, desc, rating, reviews, weight, time, serves, tag } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid cake ID' });
    }

    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      return res.status(400).json({ message: 'Price must be a non-negative number' });
    }

    const cake = await Cake.findById(id);

    if (!cake) {
      return res.status(404).json({ message: 'Cake not found' });
    }

    if (name !== undefined) cake.name = name;
    if (category !== undefined) cake.category = category;
    if (price !== undefined) cake.price = price;
    if (emoji !== undefined) cake.emoji = emoji;
    if (image !== undefined) cake.image = image;
    if (desc !== undefined) cake.desc = desc;
    if (rating !== undefined) cake.rating = rating;
    if (reviews !== undefined) cake.reviews = reviews;
    if (weight !== undefined) cake.weight = weight;
    if (time !== undefined) cake.time = time;
    if (serves !== undefined) cake.serves = serves;
    if (tag !== undefined) cake.tag = tag;

    const updatedCake = await cake.save();
    res.status(200).json(updatedCake);
  } catch (error) {
    console.error(`Error updating cake: ${error.message}`);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Delete a cake
// @route   DELETE /api/admin/cakes/:id
// @access  Private/Admin
const deleteCake = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid cake ID' });
    }

    const cake = await Cake.findByIdAndDelete(id);

    if (!cake) {
      return res.status(404).json({ message: 'Cake not found' });
    }

    res.status(200).json({ message: 'Cake removed' });
  } catch (error) {
    console.error(`Error deleting cake: ${error.message}`);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createCake,
  getCakes,
  getCakeById,
  updateCake,
  deleteCake
};
