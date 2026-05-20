const express = require('express');
const router = express.Router();
const Logo = require('../models/Logo');

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
    if (logo) {
      logo.type = req.body.type;
      logo.value = req.body.value;
    } else {
      logo = new Logo({ type: req.body.type, value: req.body.value });
    }
    const savedLogo = await logo.save();
    res.status(200).json(savedLogo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;