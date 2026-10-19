const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const ClientGallery = require('../models/ClientGallery');
const Admin = require('../models/Admin');

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret';

// Middleware to authenticate admin requests
const verifyAdmin = async (req, res, next) => {
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

// Middleware to allow direct open access to client gallery without password
const verifyClientAccess = (req, res, next) => {
  next();
};

// ============================================
// PUBLIC / CLIENT ENDPOINTS
// ============================================

// List public active client galleries
router.get('/public/all', async (req, res) => {
  try {
    const galleries = await ClientGallery.find({ isActive: true })
      .select('clientName title slug coverImage photos createdAt expiryDate password')
      .sort({ createdAt: -1 });

    const formatted = galleries.map(g => ({
      id: g._id,
      clientName: g.clientName,
      title: g.title,
      slug: g.slug,
      coverImage: g.coverImage || (g.photos && g.photos.length > 0 ? g.photos[0].url : ''),
      photoCount: g.photos ? g.photos.length : 0,
      hasPassword: !!(g.password && g.password.length > 0),
      createdAt: g.createdAt
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Seed sample client collections for demonstration
router.get('/seed-samples', async (req, res) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash('1234', salt);

    const albums = [
      {
        clientName: 'Aarav & Ananya',
        title: 'Royal Wedding Collection',
        slug: 'aarav-ananya-wedding',
        password: passHash,
        coverImage: '/images/hero-wedding-procession.jpg',
        photos: [
          { url: '/images/hero-wedding-procession.jpg', title: 'Royal Procession Ceremony' },
          { url: '/images/hero-wedding-full.jpg', title: 'The Wedding Mandap' },
          { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200', title: 'Ceremonial Rings' }
        ]
      },
      {
        clientName: 'Rohan & Sneha',
        title: 'Sangeet & Celebration Gala',
        slug: 'rohan-sneha-sangeet',
        password: passHash,
        coverImage: 'https://eirqqruk7b7wvpxl.public.blob.vercel-storage.com/1779303737207-inbound68847337225248897-QNbFMMOKtdJbvVi7sXQGpXQ7mTbwBs.jpg',
        photos: [
          { url: 'https://eirqqruk7b7wvpxl.public.blob.vercel-storage.com/1779303737207-inbound68847337225248897-QNbFMMOKtdJbvVi7sXQGpXQ7mTbwBs.jpg', title: 'Sangeet Details & Attire' },
          { url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1200', title: 'Celebration Rhythm' }
        ]
      },
      {
        clientName: 'Kabir & Tara',
        title: 'Editorial Outdoor & Portraits',
        slug: 'kabir-tara-portraits',
        password: passHash,
        coverImage: '/images/category-portrait.jpg',
        photos: [
          { url: '/images/category-portrait.jpg', title: 'Natural Outdoor Bridal Glow' },
          { url: 'https://eirqqruk7b7wvpxl.public.blob.vercel-storage.com/1779303384600-inbound5453411842163420357-8nvbbboH85DIfSUhTiBBSjvvPkR2v6.jpg', title: 'Editorial Makeup Close-up' },
          { url: 'https://eirqqruk7b7wvpxl.public.blob.vercel-storage.com/1779305044028-120047-B1XRqzfge2jXvIlaggc3Hkvp4RaVoC.jpg', title: 'Golden Hour Silhouette' }
        ]
      }
    ];

    for (const a of albums) {
      await ClientGallery.findOneAndUpdate({ slug: a.slug }, a, { upsert: true, returnDocument: 'after' });
    }

    res.json({ message: 'Sample albums seeded successfully! Default password for all is 1234' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Unlock specific album collection with password
router.post('/unlock', async (req, res) => {
  const { slug, password } = req.body;
  if (!slug) {
    return res.status(400).json({ message: 'Album identifier is required' });
  }

  try {
    const gallery = await ClientGallery.findOne({ slug: slug.toLowerCase().trim() });
    if (!gallery) {
      return res.status(404).json({ message: 'Album collection not found.' });
    }

    if (!gallery.isActive) {
      return res.status(403).json({ message: 'This collection is currently inactive.' });
    }

    if (gallery.expiryDate && new Date() > new Date(gallery.expiryDate)) {
      return res.status(403).json({ message: 'Access to this collection has expired.' });
    }

    // Verify password if album has password set
    if (gallery.password && gallery.password.trim().length > 0) {
      if (!password) {
        return res.status(401).json({ message: 'Please enter the access password.' });
      }
      const isMatch = await bcrypt.compare(password, gallery.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Incorrect password. Please try again.' });
      }
    }

    res.json({
      success: true,
      gallery: {
        id: gallery._id,
        clientName: gallery.clientName,
        title: gallery.title,
        slug: gallery.slug,
        coverImage: gallery.coverImage,
        photos: gallery.photos,
        allowBulkDownload: gallery.allowBulkDownload,
        expiryDate: gallery.expiryDate,
        createdAt: gallery.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Direct access or verify endpoint (no password required)
router.post('/verify', async (req, res) => {
  const { slug } = req.body;
  if (!slug) {
    return res.status(400).json({ message: 'Gallery identifier is required' });
  }

  try {
    const gallery = await ClientGallery.findOne({ slug: slug.toLowerCase().trim() });
    if (!gallery) {
      return res.status(404).json({ message: 'Gallery not found. Please check your gallery link.' });
    }

    if (!gallery.isActive) {
      return res.status(403).json({ message: 'This gallery has been archived or temporarily disabled.' });
    }

    if (gallery.expiryDate && new Date() > new Date(gallery.expiryDate)) {
      return res.status(403).json({ 
        message: `This gallery access expired on ${new Date(gallery.expiryDate).toLocaleDateString()}. Contact the photographer to renew access.` 
      });
    }

    res.json({
      token: 'open-client-access',
      gallery: {
        id: gallery._id,
        clientName: gallery.clientName,
        title: gallery.title,
        slug: gallery.slug,
        coverImage: gallery.coverImage,
        photoCount: gallery.photos.length,
        allowBulkDownload: gallery.allowBulkDownload,
        expiryDate: gallery.expiryDate,
        createdAt: gallery.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get latest client gallery or list of active galleries directly
router.get('/', async (req, res) => {
  try {
    const galleries = await ClientGallery.find({ isActive: true })
      .sort({ createdAt: -1 });

    if (!galleries || galleries.length === 0) {
      return res.json({ galleries: [], current: null });
    }

    res.json({
      galleries: galleries.map(g => ({
        id: g._id,
        clientName: g.clientName,
        title: g.title,
        slug: g.slug,
        photoCount: g.photos.length,
        coverImage: g.coverImage || (g.photos[0] ? g.photos[0].url : '')
      })),
      current: galleries[0]
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get gallery content directly (no password needed)
router.get('/:slug', async (req, res) => {
  try {
    const gallery = await ClientGallery.findOne({ slug: req.params.slug.toLowerCase().trim() });
    if (!gallery) {
      return res.status(404).json({ message: 'Gallery not found' });
    }

    if (!gallery.isActive) {
      return res.status(403).json({ message: 'This gallery is inactive' });
    }

    if (gallery.expiryDate && new Date() > new Date(gallery.expiryDate)) {
      return res.status(403).json({ message: 'Gallery access has expired' });
    }

    res.json({
      id: gallery._id,
      clientName: gallery.clientName,
      title: gallery.title,
      slug: gallery.slug,
      coverImage: gallery.coverImage,
      photos: gallery.photos,
      allowBulkDownload: gallery.allowBulkDownload,
      expiryDate: gallery.expiryDate,
      downloadCount: gallery.downloadCount,
      createdAt: gallery.createdAt
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Single photo download streaming proxy (supports both local files and remote URLs)
router.get('/:slug/download/:photoId', verifyClientAccess, async (req, res) => {
  try {
    const gallery = await ClientGallery.findOne({ slug: req.params.slug });
    if (!gallery) return res.status(404).json({ message: 'Gallery not found' });

    const photo = gallery.photos.id(req.params.photoId);
    if (!photo) return res.status(404).json({ message: 'Photo not found' });

    // Track download metric
    photo.downloadCount = (photo.downloadCount || 0) + 1;
    gallery.downloadCount = (gallery.downloadCount || 0) + 1;
    await gallery.save();

    const imageUrl = photo.url;
    const extension = imageUrl.split('.').pop().split('?')[0] || 'jpg';
    const filename = `${gallery.slug}-${(photo.title || 'photo').replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.${extension}`;

    // Handle local file paths
    if (imageUrl.startsWith('/')) {
      const p1 = path.join(__dirname, '../../frontend', imageUrl.replace(/^\//, ''));
      const p2 = path.join(__dirname, '../frontend', imageUrl.replace(/^\//, ''));
      const localFile = fs.existsSync(p1) ? p1 : (fs.existsSync(p2) ? p2 : null);
      if (localFile) {
        return res.download(localFile, filename);
      }
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'image/jpeg');

    const client = imageUrl.startsWith('https') ? https : http;
    client.get(imageUrl, (stream) => {
      stream.pipe(res);
    }).on('error', (err) => {
      res.status(500).json({ message: 'Failed to download image: ' + err.message });
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Zip Bulk Download (supports both local files and remote URLs)
router.get('/:slug/download-all', verifyClientAccess, async (req, res) => {
  try {
    const gallery = await ClientGallery.findOne({ slug: req.params.slug });
    if (!gallery) return res.status(404).json({ message: 'Gallery not found' });

    if (!gallery.allowBulkDownload && !req.isAdmin) {
      return res.status(403).json({ message: 'Bulk download is disabled for this gallery.' });
    }

    if (!gallery.photos || gallery.photos.length === 0) {
      return res.status(400).json({ message: 'No photos to download.' });
    }

    // Increment overall gallery download
    gallery.downloadCount = (gallery.downloadCount || 0) + 1;
    await gallery.save();

    const archiverModule = await import('archiver');
    const archiver = archiverModule.default || archiverModule;
    const archive = typeof archiver === 'function'
      ? archiver('zip', { zlib: { level: 6 } })
      : (archiver.ZipArchive ? new archiver.ZipArchive({ zlib: { level: 6 } }) : new archiver.Archiver('zip', { zlib: { level: 6 } }));
    const zipName = `${gallery.slug}-collection.zip`;

    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
    res.setHeader('Content-Type', 'application/zip');

    archive.pipe(res);

    archive.on('error', (err) => {
      console.error('Archiver error:', err);
      if (!res.headersSent) res.status(500).json({ message: err.message });
    });

    // Fetch and append each photo asynchronously
    const fetchPromises = gallery.photos.map((photo, index) => {
      return new Promise((resolve) => {
        const extension = photo.url.split('.').pop().split('?')[0] || 'jpg';
        const entryName = `${index + 1}_${(photo.title || 'photo').replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;

        if (photo.url.startsWith('/')) {
          const p1 = path.join(__dirname, '../../frontend', photo.url.replace(/^\//, ''));
          const p2 = path.join(__dirname, '../frontend', photo.url.replace(/^\//, ''));
          const localFile = fs.existsSync(p1) ? p1 : (fs.existsSync(p2) ? p2 : null);
          if (localFile) {
            archive.file(localFile, { name: entryName });
            return resolve();
          }
        }

        const client = photo.url.startsWith('https') ? https : http;
        client.get(photo.url, (stream) => {
          archive.append(stream, { name: entryName });
          stream.on('end', () => resolve());
          stream.on('error', () => resolve()); // Continue on individual photo error
        }).on('error', () => resolve());
      });
    });

    await Promise.all(fetchPromises);
    await archive.finalize();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================
// OWNER / ADMIN MANAGEMENT ENDPOINTS
// ============================================

// List all client galleries for owner dashboard
router.get('/admin/all', verifyAdmin, async (req, res) => {
  try {
    const galleries = await ClientGallery.find()
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(galleries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new client gallery
router.post('/admin/create', verifyAdmin, async (req, res) => {
  const { clientName, title, slug, password, coverImage, expiryDate, allowBulkDownload, photos } = req.body;

  if (!clientName || !title) {
    return res.status(400).json({ message: 'Client name and album title are required' });
  }

  try {
    let cleanSlug = (slug || `${clientName}-${title}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const existing = await ClientGallery.findOne({ slug: cleanSlug });
    if (existing) {
      cleanSlug = `${cleanSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    let hashedPassword = '';
    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const newGallery = new ClientGallery({
      clientName,
      title,
      slug: cleanSlug,
      password: hashedPassword,
      coverImage: coverImage || (photos && photos.length > 0 ? photos[0].url : ''),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      allowBulkDownload: allowBulkDownload !== undefined ? allowBulkDownload : true,
      photos: photos || []
    });

    await newGallery.save();
    
    const responseData = newGallery.toObject();
    delete responseData.password;
    res.status(201).json(responseData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update client gallery details or password
router.put('/admin/:id', verifyAdmin, async (req, res) => {
  try {
    const gallery = await ClientGallery.findById(req.params.id);
    if (!gallery) return res.status(404).json({ message: 'Gallery not found' });

    const updates = { ...req.body };

    // If updating password, hash it securely
    if (updates.password && updates.password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    } else {
      delete updates.password;
    }

    if (updates.slug) {
      updates.slug = updates.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    }

    const updatedGallery = await ClientGallery.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    ).select('-password');

    res.json(updatedGallery);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add photos to client gallery
router.post('/admin/:id/photos', verifyAdmin, async (req, res) => {
  const { photos } = req.body; // Array of { url, title, caption }
  if (!photos || !Array.isArray(photos)) {
    return res.status(400).json({ message: 'Photos array is required' });
  }

  try {
    const gallery = await ClientGallery.findById(req.params.id);
    if (!gallery) return res.status(404).json({ message: 'Gallery not found' });

    gallery.photos.push(...photos);
    if (!gallery.coverImage && gallery.photos.length > 0) {
      gallery.coverImage = gallery.photos[0].url;
    }

    await gallery.save();
    res.json({ message: 'Photos added successfully', photosCount: gallery.photos.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete individual photo from gallery
router.delete('/admin/:id/photos/:photoId', verifyAdmin, async (req, res) => {
  try {
    const gallery = await ClientGallery.findById(req.params.id);
    if (!gallery) return res.status(404).json({ message: 'Gallery not found' });

    gallery.photos.pull({ _id: req.params.photoId });
    await gallery.save();
    res.json({ message: 'Photo removed', photosCount: gallery.photos.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete client gallery
router.delete('/admin/:id', verifyAdmin, async (req, res) => {
  try {
    await ClientGallery.findByIdAndDelete(req.params.id);
    res.json({ message: 'Gallery deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
