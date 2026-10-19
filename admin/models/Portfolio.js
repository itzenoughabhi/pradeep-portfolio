const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
  title: { type: String, required: true },
  image: { type: String, required: true },
  category: { type: String, default: 'wedding' }
});

module.exports = mongoose.model('Portfolio', portfolioSchema);