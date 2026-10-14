const svc = require('../services/nfcOrderService');
const { listOffers, updateOffer } = require('../models/nfcOfferModel');
const { uploadAsset } = require('../utils/nfcAssets');
const { getNfcConfig, buildWaveLink } = require('../utils/nfcConfig');

function handleError(res, err, label) {
  if (err.status) return res.status(err.status).json({ error: err.message, ...(err.extra || {}) });
  console.error(`nfcOrder.${label} error:`, err);
  return res.status(500).json({ error: 'Erreur serveur, veuillez réessayer.' });
}

// ── Public ────────────────────────────────────────────────────────────────────

async function offers(req, res) {
  try { return res.json(await svc.publicOffers()); } catch (err) { return handleError(res, err, 'offers'); }
}

// ── Client connecté ───────────────────────────────────────────────────────────

async function uploadOrderAsset(req, res) {
  try {
    const kind = (req.body || {}).kind === 'logo' ? 'logo' : 'photo';
    const url = await uploadAsset(req.file, kind, { folder: `nfc/${kind}s`, prefix: `u${req.userId}_${kind}` });
    return res.json({ url });
  } catch (err) { return handleError(res, err, 'uploadOrderAsset'); }
}

async function create(req, res) {
  try {
    const { order, token, tracking_url } = await svc.createCardOrder({ userId: req.userId, body: req.body || {}, files: req.files || {} });
    const cfg = await getNfcConfig();
    return res.status(201).json({
      reference: order.reference,
      token,
      status: order.status,
      offer: { code: order.offer_code, name: order.offer_name },
      total_amount: Number(order.total_amount),
      currency: order.currency,
      payment: { wave_number: cfg.wave_number, wave_link: buildWaveLink(cfg, order.total_amount) },
      tracking_url,
    });
  } catch (err) { return handleError(res, err, 'create'); }
}

async function myOrders(req, res) {
  try { return res.json({ orders: await svc.myOrders(req.userId) }); } catch (err) { return handleError(res, err, 'myOrders'); }
}

async function myCards(req, res) {
  try { return res.json(await svc.myCards(req.userId)); } catch (err) { return handleError(res, err, 'myCards'); }
}

async function setMyCardPortfolio(req, res) {
  try { return res.json(await svc.setMyCardPortfolio(req.userId, Number(req.params.id), (req.body || {}).portfolio_id)); }
  catch (err) { return handleError(res, err, 'setMyCardPortfolio'); }
}

async function declareLost(req, res) {
  try { return res.json(await svc.declareMyCardLost(req.userId, Number(req.params.id), (req.body || {}).reason)); }
  catch (err) { return handleError(res, err, 'declareLost'); }
}

// ── Admin : offres ────────────────────────────────────────────────────────────

async function adminOffers(req, res) {
  try { return res.json({ offers: await listOffers({ activeOnly: false }) }); } catch (err) { return handleError(res, err, 'adminOffers'); }
}

async function adminUpdateOffer(req, res) {
  try { return res.json({ offer: await updateOffer(Number(req.params.id), req.body || {}, req.userId) }); }
  catch (err) { return handleError(res, err, 'adminUpdateOffer'); }
}

module.exports = {
  offers, uploadOrderAsset, create, myOrders, myCards, setMyCardPortfolio, declareLost,
  adminOffers, adminUpdateOffer,
};
