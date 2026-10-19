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

// Quick serverless ping (does not block on DB)
app.get(['/api/ping', '/ping'], (req, res) => {
  res.json({
    status: 'ok',
    server: 'active',
    time: new Date().toISOString(),
    dbConnected: mongoose.connection.readyState === 1
  });
});

// Serverless Resource Management with Global Connection Caching
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://abhishek1432h_db_user:Abhishek.9055@cluster0.fmnyr6j.mongodb.net/test?appName=Cluster0';

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function ensureServerStarted() {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!cached.promise || mongoose.connection.readyState === 0) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
    };
    cached.promise = mongoose.connect(MONGO_URI, opts).then((m) => {
      console.log('MongoDB connected and server resources ready');
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    cached.conn = null;
    console.error('MongoDB connection error:', err.message);
    throw err;
  }
}

// Middleware to verify server status before handling requests
app.use(async (req, res, next) => {
  try {
    await ensureServerStarted();
    next();
  } catch (err) {
    console.error('ensureServerStarted error:', err.message);
    res.status(500).json({
      message: "Database connection failed",
      error: err.message,
      tip: "Please verify that MongoDB Atlas allows access from anywhere (IP 0.0.0.0/0) in Network Access."
    });
  }
});

// Health check endpoint with DB state
app.get(['/api/health', '/health', '/api'], (req, res) => {
  res.json({
    status: 'ok',
    server: 'active',
    db: mongoose.connection.readyState === 1
  });
});

// Use memory storage for Multer to handle the file buffer
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 4.5 * 1024 * 1024 // Limit file size to 4.5MB (Vercel Hobby plan limit)
  }
});

// Serve static files from public and frontend directories
const fs = require('fs');
app.use(express.static(path.join(__dirname, '../public'), { extensions: ['html', 'htm'] }));
app.use(express.static(path.join(__dirname, '../frontend'), { extensions: ['html', 'htm'] }));

// Root homepage route
app.get(['/', '/index', '/index.html'], (req, res) => {
  const p1 = path.join(__dirname, '../public/index.html');
  const p2 = path.join(__dirname, '../frontend/index.html');
  if (fs.existsSync(p1)) return res.sendFile(p1);
  return res.sendFile(p2);
});

// Routes
const serviceRoutes = require('./routes/services');
const portfolioRoutes = require('./routes/portfolio');
const authRoutes = require('./routes/auth');
const aboutRoutes = require('./routes/about');
const reviewRoutes = require('./routes/reviews');
const logoRoutes = require('./routes/logo');
const heroImageRoutes = require('./routes/heroImage');
const clientGalleryRoutes = require('./routes/clientGallery');

['/api/services', '/services'].forEach(p => app.use(p, serviceRoutes));
['/api/portfolio', '/portfolio'].forEach(p => app.use(p, portfolioRoutes));
['/api/auth', '/auth'].forEach(p => app.use(p, authRoutes));
['/api/about', '/about'].forEach(p => app.use(p, aboutRoutes));
['/api/reviews', '/reviews'].forEach(p => app.use(p, reviewRoutes));
['/api/logo', '/logo'].forEach(p => app.use(p, logoRoutes));
['/api/hero-image', '/hero-image'].forEach(p => app.use(p, heroImageRoutes));
['/api/client-gallery', '/client-gallery'].forEach(p => app.use(p, clientGalleryRoutes));

// Image Upload API Route
const uploadHandler = (req, res) => {
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

      // 1. Try uploading to Vercel Blob storage if token is present
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          const filename = `${Date.now()}-${req.file.originalname}`;
          const blob = await put(filename, req.file.buffer, { access: 'public' });
          return res.status(201).json({ imageUrl: blob.url });
        } catch (blobErr) {
          console.warn('Vercel Blob upload failed, falling back to base64 database storage:', blobErr.message);
        }
      }

      // 2. Reliable Database Fallback: Store directly as base64 Data URL
      const mimeType = req.file.mimetype || 'image/jpeg';
      const base64Data = req.file.buffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Data}`;
      res.status(201).json({ imageUrl: dataUrl });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
};

app.post('/api/upload', uploadHandler);
app.post('/upload', uploadHandler);

// Admin Cleanup Route - Deletes files not referenced in the database
app.post('/api/cleanup', async (req, res) => {
  try {
    const About = require('./models/About');
    const HeroImage = require('./models/HeroImage');
    const Logo = require('./models/Logo');
    const Service = require('./models/Service');
    const Portfolio = require('./models/Portfolio');
    const ClientGallery = require('./models/ClientGallery');

    const usedFiles = new Set();

    // Gather all referenced URLs from DB
    const [about, hero, logo, services, portfolios, clientGalleries] = await Promise.all([
      About.findOne(),
      HeroImage.findOne(),
      Logo.findOne(),
      Service.find(),
      Portfolio.find(),
      ClientGallery.find()
    ]);

    if (about?.imageUrl) usedFiles.add(about.imageUrl);
    if (hero?.imageUrl) usedFiles.add(hero.imageUrl);
    if (logo?.type === 'image') usedFiles.add(logo.value);
    services.forEach(s => s.image && usedFiles.add(s.image));
    portfolios.forEach(p => p.image && usedFiles.add(p.image));
    clientGalleries.forEach(cg => {
      if (cg.coverImage) usedFiles.add(cg.coverImage);
      if (Array.isArray(cg.photos)) {
        cg.photos.forEach(p => p.url && usedFiles.add(p.url));
      }
    });

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

// Only listen if run directly as the main process (not imported or in serverless)
if (require.main === module && !process.env.VERCEL) {
  ensureServerStarted().catch(err => console.error('Initial DB connect error:', err.message));
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;