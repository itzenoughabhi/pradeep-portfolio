const express = require('express');
const router = express.Router();
const Portfolio = require('../models/Portfolio');
const fs = require('fs');
const path = require('path');

// Get all portfolio items
router.get('/', async (req, res) => {
  try {
    const portfolio = await Portfolio.find();
    res.json(portfolio);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a new portfolio item
router.post('/', async (req, res) => {
  const portfolioItem = new Portfolio(req.body);
  try {
    const newPortfolioItem = await portfolioItem.save();
    res.status(201).json(newPortfolioItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a portfolio item
router.put('/:id', async (req, res) => {
  try {
    const item = await Portfolio.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Portfolio item not found' });

    const oldImage = item.image;
    const newImage = req.body.image;

    // Delete old file if it's a local upload and the image is being changed
    if (oldImage && oldImage !== newImage && oldImage.includes('/uploads/')) {
      try {
        const filename = oldImage.split('/uploads/').pop();
        const filePath = path.join(__dirname, '..', 'public', 'uploads', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error("Error deleting replaced portfolio image:", err);
      }
    }

    const updatedPortfolio = await Portfolio.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedPortfolio);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a portfolio item
router.delete('/:id', async (req, res) => {
  try {
    const item = await Portfolio.findById(req.params.id);
    if (item && item.image && item.image.includes('/uploads/')) {
      try {
        const filename = item.image.split('/uploads/').pop();
        const filePath = path.join(__dirname, '..', 'public', 'uploads', filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Error deleting portfolio image file:", err);
      }
    }
    await Portfolio.findByIdAndDelete(req.params.id);
    res.json({ message: 'Portfolio item deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;