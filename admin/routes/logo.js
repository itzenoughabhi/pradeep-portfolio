const express = require('express');
const router = express.Router();
const Logo = require('../models/Logo');
const { del } = require('@vercel/blob');

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

      // If the old logo was an uploaded blob and is being replaced, delete it
      if (oldValue && oldValue !== newValue && oldValue.includes('public.blob.vercel-storage.com')) {
        try {
          await del(oldValue);
        } catch (err) {
          console.error("Error deleting old logo blob:", err);
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