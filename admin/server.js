const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { put, del, list } = require('@vercel/blob');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serverless Resource Management
let isDbConnected = false;

/**
 * Async function to check if the database connection is established.
 * This acts as our "server started" check for serverless environments.
 * If already connected, it prevents unnecessary re-initialization.
 */
async function ensureServerStarted() {
  if (isDbConnected && mongoose.connection.readyState === 1) {
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGO_URI);
    isDbConnected = db.connections[0].readyState === 1;
    console.log('MongoDB connected and server resources ready');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
}

// Middleware to verify server status before handling requests
app.use(async (req, res, next) => {
  try {
    await ensureServerStarted();
    next();
  } catch (err) {
    res.status(500).json({ message: "Server initialization failed" });
  }
});

// Use memory storage for Multer to handle the file buffer
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 4.5 * 1024 * 1024 // Limit file size to 4.5MB (Vercel Hobby plan limit)
  }
});

// Serve static files from the frontend directory with support for clean URLs (e.g. /dashboard works for dashboard.html)
app.use(express.static(path.join(__dirname, '../frontend'), { extensions: ['html', 'htm'] }));

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
app.post('/api/upload', (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File is too large. Maximum size allowed is 4.5MB.' });
      }
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(500).json({ message: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      const filename = `${Date.now()}-${req.file.originalname}`;
      const blob = await put(filename, req.file.buffer, { access: 'public' });
      res.status(201).json({ imageUrl: blob.url });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
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

    // Gather all referenced URLs from DB
    const [about, hero, logo, services, portfolios] = await Promise.all([
      About.findOne(),
      HeroImage.findOne(),
      Logo.findOne(),
      Service.find(),
      Portfolio.find()
    ]);

    if (about?.imageUrl) usedFiles.add(about.imageUrl);
    if (hero?.imageUrl) usedFiles.add(hero.imageUrl);
    if (logo?.type === 'image') usedFiles.add(logo.value);
    services.forEach(s => s.image && usedFiles.add(s.image));
    portfolios.forEach(p => p.image && usedFiles.add(p.image));

    const { blobs } = await list();
    let deletedCount = 0;

    for (const blob of blobs) {
      if (!usedFiles.has(blob.url)) {
        await del(blob.url);
        deletedCount++;
      }
    }

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