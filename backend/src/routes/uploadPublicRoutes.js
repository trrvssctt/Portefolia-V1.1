const express = require('express');
const router = express.Router();
const multer = require('multer');
const https = require('https');
const http = require('http');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const uploadController = require('../controllers/uploadController');
const auth = require('../middlewares/authMiddleware');
const requireActive = require('../middlewares/requireActive');

const MIME_TO_EXT = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/csv': '.csv',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

// GET /api/uploads/download?url=<cloudinary_url>&name=<filename>
// Proxy sécurisé : récupère le fichier Cloudinary et le sert avec le bon Content-Disposition
router.get('/download', async (req, res) => {
  try {
    const { url, name } = req.query;
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url requis' });

    // Sécurité : uniquement les URLs Cloudinary
    if (!url.startsWith('https://res.cloudinary.com/')) {
      return res.status(400).json({ error: 'URL non autorisée' });
    }

    const client = url.startsWith('https') ? https : http;
    client.get(url, (upstream) => {
      const contentType = upstream.headers['content-type'] || 'application/octet-stream';
      const baseType = contentType.split(';')[0].trim();
      const ext = MIME_TO_EXT[baseType] || '';
      const safeName = (name || 'fichier').toString().replace(/[^a-zA-Z0-9_\-. ]/g, '_');
      const filename = safeName.endsWith(ext) ? safeName : `${safeName}${ext}`;

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      if (upstream.headers['content-length']) {
        res.setHeader('Content-Length', upstream.headers['content-length']);
      }
      upstream.pipe(res);
    }).on('error', (err) => {
      console.error('download proxy error:', err.message);
      res.status(502).json({ error: 'Impossible de récupérer le fichier' });
    });
  } catch (err) {
    console.error('download proxy error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public upload endpoint for authenticated users (used for CV upload, etc.)
// POST /api/uploads/cloudinary
router.post('/cloudinary', auth, requireActive, upload.single('file'), async (req, res) => {
  return uploadController.uploadToCloudinary(req, res);
});

// Alias for avatar uploads from the frontend profile page
// POST /api/uploads/avatar
router.post('/avatar', auth, requireActive, upload.single('file'), async (req, res) => {
  return uploadController.uploadToCloudinary(req, res);
});

module.exports = router;
