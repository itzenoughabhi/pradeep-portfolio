const express = require('express');
const router = express.Router();
const Logo = require('../models/Logo');
const fs = require('fs');
const path = require('path');

// Get the current logo
router.get('/', async (req, res) => {
  try {
    const logo = await Logo.findOne();
    res.json(logo || { type: 'text', value: 'Jangra<span>.</span>VISUALS' }); // default fallback
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update the logo
router.post('/', async (req, res) => {
  try {
    let logo = await Logo.findOne();
    const newValue = req.body.value;

    if (logo) {
      const oldValue = logo.value;

      // If the old logo was an uploaded image and is being replaced, delete the file
      if (oldValue && oldValue !== newValue && oldValue.includes('/uploads/')) {
        try {
          const filename = oldValue.split('/uploads/').pop();
          const filePath = path.join(__dirname, '..', 'public', 'uploads', filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (err) {
          console.error("Error deleting old logo file:", err);
        }
      }

      logo.type = req.body.type;
      logo.value = newValue;
    } else {
      logo = new Logo({ type: req.body.type, value: newValue });
    }
    const savedLogo = await logo.save();
    res.status(200).json(savedLogo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;