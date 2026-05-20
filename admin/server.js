const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Set up Multer for local image uploads
// Note: Local storage is ephemeral on Vercel. Files will be lost on function restart.
const uploadDir = path.join(__dirname, 'public', 'uploads');
try {
  if (!process.env.VERCEL && !fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  console.warn("Upload directory creation skipped or failed (expected on Vercel)");
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Serve static files from the frontend directory with support for clean URLs (e.g. /dashboard works for dashboard.html)
app.use(express.static(path.join(__dirname, '../frontend'), { extensions: ['html', 'htm'] }));
// Serve uploaded images from the public/uploads directory so they are accessible via /uploads/
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Routes
const serviceRoutes = require('./routes/services');
const portfolioRoutes = require('./routes/portfolio');
const authRoutes = require('./routes/auth');
const aboutRoutes = require('./routes/about');
const reviewRoutes = require('./routes/reviews');
const logoRoutes = require('./routes/logo');
const heroImageRoutes = require('./routes/heroImage');

app.use('/api/services', serviceRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/about', aboutRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/logo', logoRoutes);
app.use('/api/hero-image', heroImageRoutes);

// Image Upload API Route
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  res.status(201).json({ imageUrl: '/uploads/' + req.file.filename });
});

// Admin Cleanup Route - Deletes files not referenced in the database
app.post('/api/cleanup', async (req, res) => {
  try {
    const About = require('./models/About');
    const HeroImage = require('./models/HeroImage');
    const Logo = require('./models/Logo');
    const Service = require('./models/Service');
    const Portfolio = require('./models/Portfolio');

    const usedFiles = new Set();
    const extractFilename = (url) => (url && typeof url === 'string' && url.includes('/uploads/')) ? url.split('/uploads/').pop() : null;

    // Gather all referenced files from DB
    const [about, hero, logo, services, portfolios] = await Promise.all([
      About.findOne(),
      HeroImage.findOne(),
      Logo.findOne(),
      Service.find(),
      Portfolio.find()
    ]);

    if (about) usedFiles.add(extractFilename(about.imageUrl));
    if (hero) usedFiles.add(extractFilename(hero.imageUrl));
    if (logo && logo.type === 'image') usedFiles.add(extractFilename(logo.value));
    services.forEach(s => usedFiles.add(extractFilename(s.image)));
    portfolios.forEach(p => usedFiles.add(extractFilename(p.image)));

    const uploadDir = path.join(__dirname, 'public', 'uploads');
    const filesOnDisk = fs.readdirSync(uploadDir);
    let deletedCount = 0;

    filesOnDisk.forEach(file => {
      if (!usedFiles.has(file)) {
        try { fs.unlinkSync(path.join(uploadDir, file)); deletedCount++; } catch(e) {}
      }
    });

    res.json({ message: `Cleanup complete. Removed ${deletedCount} unused files.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Only listen if not running on Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;