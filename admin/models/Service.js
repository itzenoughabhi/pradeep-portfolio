const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  link: { type: String },
});

module.exports = mongoose.model('Service', serviceSchema);