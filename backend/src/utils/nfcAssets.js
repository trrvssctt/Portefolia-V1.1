// Images des commandes de cartes NFC : photo, logo client, visuels recto/verso (aperçu et impression).
// Type réel vérifié sur le contenu ; les SVG ne sont jamais servis tels quels (convertis en PNG par Cloudinary).
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { sniffMime } = require('./paymentProof');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_BYTES = 8 * 1024 * 1024;
const MIN_LOGO_PX = 500;

function assetError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function isSvg(buf) {
  const head = buf.subarray(0, 1024).toString('utf8').replace(/^﻿/, '').trimStart().toLowerCase();
  return (head.startsWith('<?xml') || head.startsWith('<svg') || head.startsWith('<!--')) && head.includes('<svg');
}

function detectMime(buf) {
  return sniffMime(buf) || (isSvg(buf) ? 'image/svg+xml' : null);
}

// Largeur / hauteur d'un PNG (en-tête IHDR)
function pngSize(buf) {
  if (!buf || buf.length < 24 || buf.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// Règles par type d'image
const KINDS = {
  photo: { mimes: ['image/jpeg', 'image/png', 'image/webp'], label: 'une photo JPG, PNG ou WebP' },
  logo: { mimes: ['image/png', 'image/svg+xml'], label: 'un logo PNG ou SVG' },
  visual: { mimes: ['image/png'], label: 'une image PNG' },
};

function validateAsset(file, kind) {
  const rule = KINDS[kind];
  if (!rule) throw assetError(422, 'Type d\'image inconnu.');
  if (!file || !file.buffer || !file.buffer.length) throw assetError(422, 'Fichier manquant.');
  if (file.buffer.length > MAX_BYTES) throw assetError(422, 'Fichier trop lourd (8 Mo maximum).');
  const mime = detectMime(file.buffer);
  if (!mime || !rule.mimes.includes(mime)) throw assetError(422, `Format non accepté : envoyez ${rule.label}.`);
  if (kind === 'logo' && mime === 'image/png') {
    const size = pngSize(file.buffer);
    if (!size || Math.max(size.width, size.height) < MIN_LOGO_PX) {
      throw assetError(422, `Logo trop petit pour l'impression : au moins ${MIN_LOGO_PX} px de large (idéalement 1000 px ou un SVG).`);
    }
  }
  return mime;
}

async function uploadAsset(file, kind, { folder = 'nfc/commandes', prefix = 'asset' } = {}) {
  const mime = validateAsset(file, kind);
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw assetError(503, 'Envoi de fichiers indisponible pour le moment. Réessayez plus tard.');
  }
  const safePrefix = String(prefix).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40);
  try {
    const result = await cloudinary.uploader.upload(`data:${mime};base64,${file.buffer.toString('base64')}`, {
      folder,
      resource_type: 'image',
      public_id: `${safePrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      overwrite: false,
      // Les SVG sont stockés convertis : aucun SVG n'est jamais servi aux navigateurs
      ...(mime === 'image/svg+xml' ? { format: 'png' } : {}),
    });
    return result.secure_url;
  } catch (err) {
    console.error('nfcAssets: envoi Cloudinary échoué', (err && (err.message || (err.error && err.error.code))) || err);
    throw assetError(502, 'Envoi de l\'image impossible pour le moment, réessayez dans quelques instants.');
  }
}

// URL d'image acceptée dans une commande : uniquement notre compte Cloudinary
function isOwnAssetUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    return u.protocol === 'https:' && u.hostname === 'res.cloudinary.com' && (!cloud || u.pathname.startsWith(`/${cloud}/`));
  } catch {
    return false;
  }
}

// Multer : un fichier « file » (photo / logo)
const singleAsset = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1 } }).single('file');

// Multer : visuels de la commande (aperçu + impression, recto et verso)
const VISUAL_FIELDS = ['preview_front', 'preview_back', 'print_front', 'print_back'];
const orderVisuals = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 4 } })
  .fields(VISUAL_FIELDS.map((name) => ({ name, maxCount: 1 })));

function wrap(mw) {
  return (req, res, next) => mw(req, res, (err) => {
    if (err) {
      return res.status(422).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Fichier trop lourd (8 Mo maximum).' : 'Fichier invalide.' });
    }
    next();
  });
}

module.exports = {
  validateAsset, uploadAsset, isOwnAssetUrl, pngSize, detectMime, VISUAL_FIELDS,
  receiveAsset: wrap(singleAsset),
  receiveOrderVisuals: wrap(orderVisuals),
};
