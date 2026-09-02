const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Cake = require('../models/Cake');

// Helper to delete an image file
const deleteImage = (imagePath) => {
  if (imagePath && typeof imagePath === 'string') {
    const fullPath = path.join(__dirname, '../../', imagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
};

// @desc    Create a cake
// @route   POST /api/admin/cakes
// @access  Private/Admin
const createCake = async (req, res) => {
  try {
    const { name, category, price, emoji, desc, rating, reviews, weight, time, serves, tag } = req.body;
    let image = req.body.image; // fallback if passed directly

    if (req.file) {
      image = `/uploads/cakes/${req.file.filename}`;
    }

    if (!name || !category || price === undefined) {
      if (req.file) deleteImage(`/uploads/cakes/${req.file.filename}`);
      return res.status(400).json({ message: 'Name, category, and price are required' });
    }

    const parsedPrice = Number(price);

    if (isNaN(parsedPrice) || parsedPrice < 0) {
      if (req.file) deleteImage(`/uploads/cakes/${req.file.filename}`);
      return res.status(400).json({ message: 'Price must be a non-negative number' });
    }

    const cake = await Cake.create({
      name,
      category,
      price: parsedPrice,
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
    if (req.file) deleteImage(`/uploads/cakes/${req.file.filename}`);
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
    const { name, category, price, emoji, desc, rating, reviews, weight, time, serves, tag } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      if (req.file) deleteImage(`/uploads/cakes/${req.file.filename}`);
      return res.status(400).json({ message: 'Invalid cake ID' });
    }

    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        if (req.file) deleteImage(`/uploads/cakes/${req.file.filename}`);
        return res.status(400).json({ message: 'Price must be a non-negative number' });
      }
    }

    const cake = await Cake.findById(id);

    if (!cake) {
      if (req.file) deleteImage(`/uploads/cakes/${req.file.filename}`);
      return res.status(404).json({ message: 'Cake not found' });
    }

    let oldImage = null;
    if (req.file) {
      oldImage = cake.image;
      cake.image = `/uploads/cakes/${req.file.filename}`;
    }

    if (name !== undefined) cake.name = name;
    if (category !== undefined) cake.category = category;
    if (price !== undefined) cake.price = Number(price);
    if (emoji !== undefined) cake.emoji = emoji;
    if (desc !== undefined) cake.desc = desc;
    if (rating !== undefined) cake.rating = rating;
    if (reviews !== undefined) cake.reviews = reviews;
    if (weight !== undefined) cake.weight = weight;
    if (time !== undefined) cake.time = time;
    if (serves !== undefined) cake.serves = serves;
    if (tag !== undefined) cake.tag = tag;

    const updatedCake = await cake.save();
    
    // Cleanup old image if a new one was uploaded
    if (oldImage && oldImage.startsWith('/uploads/')) {
      deleteImage(oldImage);
    }

    res.status(200).json(updatedCake);
  } catch (error) {
    if (req.file) deleteImage(`/uploads/cakes/${req.file.filename}`);
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

    const cake = await Cake.findById(id);

    if (!cake) {
      return res.status(404).json({ message: 'Cake not found' });
    }
    
    const imagePath = cake.image;
    await cake.deleteOne();

    if (imagePath && imagePath.startsWith('/uploads/')) {
      deleteImage(imagePath);
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
