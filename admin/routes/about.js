const express = require('express');
const router = express.Router();
const About = require('../models/About');
const fs = require('fs');
const path = require('path');

// Get the current about image
router.get('/', async (req, res) => {
  try {
    const about = await About.findOne();
    res.json(about || { imageUrl: 'your-photo.jpg' }); // default fallback
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update the about image (creates it if it doesn't exist)
router.post('/', async (req, res) => {
  try {
    let about = await About.findOne();
    const newImageUrl = req.body.imageUrl;

    if (about) {
      const oldImageUrl = about.imageUrl;
      
      // Delete old file if it's a local upload and a new one is being provided
      if (oldImageUrl && oldImageUrl !== newImageUrl && oldImageUrl.includes('/uploads/')) {
        try {
          const filename = oldImageUrl.split('/uploads/').pop();
          const filePath = path.join(__dirname, '..', 'public', 'uploads', filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.error("Error deleting old about image:", err);
        }
      }
      about.imageUrl = newImageUrl;
    } else {
      about = new About({ imageUrl: newImageUrl });
    }
    const savedAbout = await about.save();
    res.status(200).json(savedAbout);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;