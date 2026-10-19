const mongoose = require('mongoose');

const clientGallerySchema = new mongoose.Schema({
  clientName: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  photos: [
    {
      url: { type: String, required: true },
      title: { type: String, default: '' },
      caption: { type: String, default: '' },
      uploadedAt: { type: Date, default: Date.now },
      downloadCount: { type: Number, default: 0 }
    }
  ],
  expiryDate: { type: Date },
  downloadCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  allowBulkDownload: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ClientGallery', clientGallerySchema);
