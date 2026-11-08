const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Quotation = require('../models/Quotation');

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret';

const verifyAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization required' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin privileges required' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session' });
  }
};

// Generate next reference number JVQ-YYYY-XXXX
async function generateRefNo() {
  const year = new Date().getFullYear();
  const prefix = `JVQ-${year}-`;
  const count = await Quotation.countDocuments({ refNo: new RegExp(`^${prefix}`) });
  const nextNum = String(count + 1).padStart(4, '0');
  return `${prefix}${nextNum}`;
}

// Get all quotations / orders
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const quotations = await Quotation.find().sort({ createdAt: -1 });
    res.json(quotations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single quotation by ID
router.get('/:id', verifyAdmin, async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
    res.json(quotation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new quotation
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.refNo || !data.refNo.trim()) {
      data.refNo = await generateRefNo();
    }

    // Compute financial totals
    const items = Array.isArray(data.items) ? data.items : [];
    const subtotal = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    const advancePercent = Number(data.advancePercent) >= 0 ? Number(data.advancePercent) : 40;
    const advanceAmount = Math.round(subtotal * (advancePercent / 100));
    const balancePayable = subtotal - advanceAmount;

    data.items = items;
    data.subtotal = subtotal;
    data.advancePercent = advancePercent;
    data.advanceAmount = advanceAmount;
    data.balancePayable = balancePayable;

    const quotation = new Quotation(data);
    const saved = await quotation.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update quotation (status or full data)
router.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    if (Array.isArray(data.items)) {
      const subtotal = data.items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
      const advancePercent = Number(data.advancePercent) >= 0 ? Number(data.advancePercent) : 40;
      data.subtotal = subtotal;
      data.advancePercent = advancePercent;
      data.advanceAmount = Math.round(subtotal * (advancePercent / 100));
      data.balancePayable = subtotal - data.advanceAmount;
    }

    const updated = await Quotation.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!updated) return res.status(404).json({ message: 'Quotation not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete quotation
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const deleted = await Quotation.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Quotation not found' });
    res.json({ message: 'Quotation deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

