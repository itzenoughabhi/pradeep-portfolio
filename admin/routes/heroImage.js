const express = require('express');
const router = express.Router();
const HeroImage = require('../models/HeroImage');

// Get the current hero image
router.get('/', async (req, res) => {
  try {
    const heroImage = await HeroImage.findOne();
    res.json(heroImage || { imageUrl: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=1200' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update the hero image (creates if it doesn't exist)
router.post('/', async (req, res) => {
  try {
    let heroImage = await HeroImage.findOne();
    if (heroImage) {
      heroImage.imageUrl = req.body.imageUrl;
    } else {
      heroImage = new HeroImage({ imageUrl: req.body.imageUrl });
    }
    await heroImage.save();
    res.status(200).json({ message: 'Hero image updated' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;