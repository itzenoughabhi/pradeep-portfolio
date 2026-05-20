const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const fs = require('fs');
const path = require('path');

// Get all services
router.get('/', async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a new service
router.post('/', async (req, res) => {
  const service = new Service(req.body);
  try {
    const newService = await service.save();
    res.status(201).json(newService);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a service
router.put('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found' });

    const oldImage = service.image;
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
        console.error("Error deleting replaced service image:", err);
      }
    }

    const updatedService = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedService);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a service
router.delete('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (service && service.image && service.image.includes('/uploads/')) {
      try {
        const filename = service.image.split('/uploads/').pop();
        const filePath = path.join(__dirname, '..', 'public', 'uploads', filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Error deleting service image file:", err);
      }
    }
    await Service.findByIdAndDelete(req.params.id);
    res.json({ message: 'Service deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;