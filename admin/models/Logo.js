const mongoose = require('mongoose');

const logoSchema = new mongoose.Schema({
  type: { type: String, enum: ['text', 'image'], default: 'text' },
  value: { type: String, required: true },
});

module.exports = mongoose.model('Logo', logoSchema);