// Preuves de paiement Wave (capture d'écran ou PDF) : réception et envoi vers Cloudinary.
// Utilisé par les précommandes NFC et par le checkout (abonnement, réabonnement, upgrade).
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// Type réel du fichier d'après ses premiers octets (le type annoncé par le navigateur ne suffit pas)
function sniffMime(buf) {
  if (!buf || buf.length < 12) return null;
  const hex = buf.subarray(0, 12).toString('hex');
  if (hex.startsWith('ffd8ff')) return 'image/jpeg';
  if (hex.startsWith('89504e47')) return 'image/png';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  if (buf.subarray(0, 4).toString('latin1') === '%PDF') return 'application/pdf';
  return null;
}

// Middleware multer : un seul fichier, champ « file », 8 Mo max
const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
}).single('file');

// Enveloppe multer pour renvoyer des erreurs JSON lisibles
function receiveProof(req, res, next) {
  proofUpload(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Fichier trop lourd (8 Mo maximum).'
        : 'Fichier invalide.';
      return res.status(422).json({ error: message });
    }
    next();
  });
}

function validateProofFile(file) {
  if (!file || !file.buffer || !file.buffer.length) {
    const e = new Error('Ajoutez la capture d\'écran de votre paiement Wave.');
    e.status = 422;
    throw e;
  }
  const mime = sniffMime(file.buffer);
  if (!mime || !ALLOWED.includes(mime)) {
    const e = new Error('Format non accepté : envoyez une image (JPG, PNG, WebP) ou un PDF.');
    e.status = 422;
    throw e;
  }
  return mime;
}

async function uploadProof(file, { folder = 'preuves_paiement', publicIdPrefix = 'preuve' } = {}) {
  const mime = validateProofFile(file);
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    const e = new Error('Envoi de fichiers indisponible pour le moment. Réessayez plus tard.');
    e.status = 503;
    throw e;
  }
  const dataUri = `data:${mime};base64,${file.buffer.toString('base64')}`;
  const safePrefix = String(publicIdPrefix).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40);
  try {
    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: mime === 'application/pdf' ? 'raw' : 'image',
      public_id: `${safePrefix}_${Date.now()}${mime === 'application/pdf' ? '.pdf' : ''}`,
      overwrite: false,
    });
    return result.secure_url;
  } catch (err) {
    console.error('paymentProof: envoi Cloudinary échoué', (err && (err.message || (err.error && err.error.code))) || err);
    const e = new Error('Envoi de la capture impossible pour le moment, réessayez dans quelques instants.');
    e.status = 502;
    throw e;
  }
}

module.exports = { receiveProof, uploadProof, validateProofFile, sniffMime, MAX_BYTES };
