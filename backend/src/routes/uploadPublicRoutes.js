const express = require('express');
const router = express.Router();
const multer = require('multer');
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

// Détecte le vrai type d'un fichier à partir de ses premiers octets
// (Cloudinary sert les fichiers "raw" sans extension en application/octet-stream)
function sniffMime(buf) {
  if (!buf || buf.length < 4) return null;
  const hex = buf.subarray(0, 8).toString('hex');
  if (buf.subarray(0, 4).toString('latin1') === '%PDF') return 'application/pdf';
  if (hex.startsWith('d0cf11e0a1b11ae1')) return 'application/msword';
  if (hex.startsWith('89504e47')) return 'image/png';
  if (hex.startsWith('ffd8ff')) return 'image/jpeg';
  if (hex.startsWith('504b0304')) {
    // Conteneur ZIP : DOCX / XLSX / ZIP
    const head = buf.subarray(0, Math.min(buf.length, 4000)).toString('latin1');
    if (head.includes('word/')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (head.includes('xl/')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    return 'application/zip';
  }
  return null;
}

// GET /api/uploads/download?url=<cloudinary_url>&name=<filename>
// Proxy sécurisé : récupère le fichier Cloudinary et le sert avec le bon type,
// la bonne extension et un Content-Disposition "attachment" (PC, Android, iOS)
router.get('/download', async (req, res) => {
  try {
    const { url, name } = req.query;
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url requis' });

    // Sécurité : uniquement les URLs Cloudinary en HTTPS
    let parsed;
    try { parsed = new URL(url); } catch { return res.status(400).json({ error: 'URL invalide' }); }
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com') {
      return res.status(400).json({ error: 'URL non autorisée' });
    }

    const upstream = await fetch(parsed.toString(), { redirect: 'follow' });
    if (!upstream.ok) {
      console.error('download proxy upstream status:', upstream.status, url);
      return res.status(upstream.status === 404 ? 404 : 502).json({ error: 'Fichier introuvable' });
    }
    const buf = Buffer.from(await upstream.arrayBuffer());

    const headerType = (upstream.headers.get('content-type') || '').split(';')[0].trim();
    const sniffed = sniffMime(buf);
    const contentType = (headerType && headerType !== 'application/octet-stream' && MIME_TO_EXT[headerType])
      ? headerType
      : (sniffed || headerType || 'application/octet-stream');
    const urlExt = (parsed.pathname.match(/\.([a-z0-9]{2,5})$/i) || [])[1];
    const ext = MIME_TO_EXT[contentType] || (urlExt ? `.${urlExt.toLowerCase()}` : '');

    const safeName = (name || 'fichier').toString().replace(/[^a-zA-Z0-9_\-. ]/g, '_').trim() || 'fichier';
    const filename = ext && safeName.toLowerCase().endsWith(ext) ? safeName : `${safeName}${ext}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Length', buf.length);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.end(buf);
  } catch (err) {
    console.error('download proxy error:', err);
    if (!res.headersSent) res.status(502).json({ error: 'Impossible de récupérer le fichier' });
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
