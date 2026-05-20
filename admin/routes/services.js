const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const { del } = require('@vercel/blob');

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

    // Delete old blob if the image is being changed
    if (oldImage && oldImage !== newImage && oldImage.includes('public.blob.vercel-storage.com')) {
      try {
        await del(oldImage);
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
    if (service && service.image && service.image.includes('public.blob.vercel-storage.com')) {
      try {
        await del(service.image);
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