const mongoose = require('mongoose');

const heroImageSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
});

module.exports = mongoose.model('HeroImage', heroImageSchema);