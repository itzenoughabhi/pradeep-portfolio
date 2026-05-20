const express = require('express');
const router = express.Router();
const HeroImage = require('../models/HeroImage');
const { del } = require('@vercel/blob');

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
    const newImageUrl = req.body.imageUrl;

    if (heroImage) {
      const oldImageUrl = heroImage.imageUrl;

      // Delete old blob if a new one is being provided
      if (oldImageUrl && oldImageUrl !== newImageUrl && oldImageUrl.includes('public.blob.vercel-storage.com')) {
        try {
          await del(oldImageUrl);
        } catch (err) {
          console.error("Error deleting old hero image:", err);
        }
      }
      heroImage.imageUrl = newImageUrl;
    } else {
      heroImage = new HeroImage({ imageUrl: newImageUrl });
    }
    await heroImage.save();
    res.status(200).json({ message: 'Hero image updated' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;