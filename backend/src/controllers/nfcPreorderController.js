const svc = require('../services/nfcPreorderService');
const { getNfcConfig, updateNfcConfig, buildWaveLink } = require('../utils/nfcConfig');
const { trackingUrl, iso } = require('../utils/nfcPreorderPayload');
const { uploadProof } = require('../utils/paymentProof');

function handleError(res, err, label) {
  if (err instanceof svc.PreorderError || err.status) {
    return res.status(err.status).json({ error: err.message, ...(err.extra || {}) });
  }
  console.error(`nfcPreorder.${label} error:`, err);
  return res.status(500).json({ error: 'Erreur serveur, veuillez réessayer.' });
}

function adminCtx(req) {
  return {
    adminId: req.userId || null,
    ip: req.headers['x-forwarded-for'] || req.ip || '',
    userAgent: req.headers['user-agent'] || '',
  };
}

function paymentInfo(cfg, amount) {
  return { wave_number: cfg.wave_number, wave_link: buildWaveLink(cfg, amount) };
}

// ── Public ────────────────────────────────────────────────────────────────────

async function getPublicConfig(req, res) {
  try {
    const cfg = await getNfcConfig();
    return res.json({
      unit_price: cfg.unit_price,
      currency: cfg.currency,
      max_quantity: cfg.max_quantity,
      wave_number: cfg.wave_number,
      wave_link_available: !!cfg.wave_link,
      expiry_hours: cfg.expiry_hours,
    });
  } catch (err) { return handleError(res, err, 'getPublicConfig'); }
}

// Visuels de la commande (première carte) pour la page de suivi
async function previewsFor(orderId) {
  const items = await require('../services/nfcOrderService').orderItems(orderId).catch(() => []);
  const i = items[0];
  return i ? { front: i.preview_front_url || null, back: i.preview_back_url || null } : null;
}

async function getPublic(req, res) {
  try {
    const p = await svc.findByReferenceAndToken(req.params.reference, req.query.t);
    const cfg = await getNfcConfig();
    return res.json({
      reference: p.reference,
      status: p.status,
      full_name: p.full_name,
      card_name: p.card_name,
      quantity: Number(p.quantity),
      unit_price: Number(p.unit_price),
      total_amount: Number(p.total_amount),
      currency: p.currency,
      offer_code: p.offer_code || 'standard',
      offer_name: p.offer_name || 'Standard',
      previews: await previewsFor(p.id),
      bat_comment: p.bat_comment || null,
      bat_revision: Number(p.bat_revision || 0),
      wave_transaction_id: p.wave_transaction_id,
      has_proof: !!p.payment_proof_url,
      rejection_reason: p.rejection_reason,
      created_at: iso(p.created_at),
      payment_submitted_at: iso(p.payment_submitted_at),
      paid_at: iso(p.paid_at),
      expiry_hours: cfg.expiry_hours,
      payment: paymentInfo(cfg, p.total_amount),
    });
  } catch (err) { return handleError(res, err, 'getPublic'); }
}

async function submitProof(req, res) {
  try {
    const token = (req.body || {}).token;
    // Vérifier la précommande AVANT d'envoyer le fichier sur Cloudinary
    const p = await svc.findByReferenceAndToken(req.params.reference, token);
    const url = await uploadProof(req.file, { folder: 'preuves_paiement/nfc', publicIdPrefix: p.reference });
    return res.json(await svc.attachProof(p.reference, token, url));
  } catch (err) { return handleError(res, err, 'submitProof'); }
}

async function submitPayment(req, res) {
  try {
    const body = req.body || {};
    const r = await svc.submitPayment(req.params.reference, body.token, body);
    return res.json(r);
  } catch (err) { return handleError(res, err, 'submitPayment'); }
}

async function checkContact(req, res) {
  try { return res.json(await svc.checkContact(req.body || {})); } catch (err) { return handleError(res, err, 'checkContact'); }
}

async function resendLink(req, res) {
  try { return res.json(await svc.resendTrackingLink(req.body || {})); } catch (err) { return handleError(res, err, 'resendLink'); }
}

// ── Admin ─────────────────────────────────────────────────────────────────────

async function adminList(req, res) {
  try { return res.json(await svc.list(req.query)); } catch (err) { return handleError(res, err, 'adminList'); }
}

async function adminStats(req, res) {
  try { return res.json(await svc.getStats()); } catch (err) { return handleError(res, err, 'adminStats'); }
}

async function adminDetail(req, res) {
  try { return res.json(await svc.getDetail(Number(req.params.id))); } catch (err) { return handleError(res, err, 'adminDetail'); }
}

async function adminValidate(req, res) {
  try { return res.json({ preorder: await svc.validatePayment(Number(req.params.id), adminCtx(req)) }); }
  catch (err) { return handleError(res, err, 'adminValidate'); }
}

async function adminReject(req, res) {
  try { return res.json({ preorder: await svc.rejectPayment(Number(req.params.id), (req.body || {}).reason, adminCtx(req)) }); }
  catch (err) { return handleError(res, err, 'adminReject'); }
}

async function adminCancel(req, res) {
  try { return res.json({ preorder: await svc.cancelPreorder(Number(req.params.id), (req.body || {}).reason, adminCtx(req)) }); }
  catch (err) { return handleError(res, err, 'adminCancel'); }
}

async function adminResend(req, res) {
  try { return res.json(await svc.resendLastNotification(Number(req.params.id), adminCtx(req))); }
  catch (err) { return handleError(res, err, 'adminResend'); }
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = v instanceof Date ? v.toISOString().replace('T', ' ').slice(0, 19) : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function adminExport(req, res) {
  try {
    const rows = await svc.listAllForExport(req.query);
    const cols = ['reference', 'status', 'full_name', 'card_name', 'email', 'phone', 'city', 'quantity', 'unit_price',
      'total_amount', 'currency', 'wave_transaction_id', 'wave_sender_phone', 'rejection_reason', 'created_at',
      'payment_submitted_at', 'paid_at', 'commande_id'];
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n');
    const date = new Date().toISOString().slice(0, 10);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="nfc-precommandes-${date}.csv"`,
    });
    return res.send('﻿' + csv);
  } catch (err) { return handleError(res, err, 'adminExport'); }
}

async function adminGetSettings(req, res) {
  try { return res.json(await getNfcConfig({ fresh: true })); } catch (err) { return handleError(res, err, 'adminGetSettings'); }
}

async function adminUpdateSettings(req, res) {
  try { return res.json(await updateNfcConfig(req.body || {}, req.userId)); }
  catch (err) { return handleError(res, err, 'adminUpdateSettings'); }
}

// ── Interne (n8n) ─────────────────────────────────────────────────────────────

async function internalExpireStale(req, res) {
  try { return res.json(await svc.expireStale()); } catch (err) { return handleError(res, err, 'internalExpireStale'); }
}

async function internalRemindersDue(req, res) {
  try { return res.json(await svc.claimReminders()); } catch (err) { return handleError(res, err, 'internalRemindersDue'); }
}

async function internalNotification(req, res) {
  try { return res.status(201).json(await svc.recordNotification(req.body || {})); }
  catch (err) { return handleError(res, err, 'internalNotification'); }
}

// ── Production ────────────────────────────────────────────────────────────────

const prod = () => require('../services/nfcProductionService');

async function approveBat(req, res) {
  try { return res.json(await prod().approveBatByClient(req.params.reference, (req.body || {}).token)); }
  catch (err) { return handleError(res, err, 'approveBat'); }
}

async function requestBatChanges(req, res) {
  try {
    const body = req.body || {};
    return res.json(await prod().requestBatChanges(req.params.reference, body.token, body.comment));
  } catch (err) { return handleError(res, err, 'requestBatChanges'); }
}

async function adminStartDesign(req, res) {
  try { return res.json({ preorder: await prod().startDesign(Number(req.params.id), adminCtx(req)) }); }
  catch (err) { return handleError(res, err, 'adminStartDesign'); }
}

async function adminUploadBat(req, res) {
  try { return res.json(await prod().uploadBat(Number(req.params.id), req.files || {}, (req.body || {}).item_id || null, adminCtx(req))); }
  catch (err) { return handleError(res, err, 'adminUploadBat'); }
}

async function adminSendBat(req, res) {
  try { return res.json({ preorder: await prod().sendBat(Number(req.params.id), adminCtx(req)) }); }
  catch (err) { return handleError(res, err, 'adminSendBat'); }
}

async function adminApproveBat(req, res) {
  try { return res.json(await prod().approveBatByAdmin(Number(req.params.id), adminCtx(req))); }
  catch (err) { return handleError(res, err, 'adminApproveBat'); }
}

async function adminAdvance(req, res) {
  try { return res.json({ preorder: await prod().advance(Number(req.params.id), (req.body || {}).to, adminCtx(req)) }); }
  catch (err) { return handleError(res, err, 'adminAdvance'); }
}

function parseIds(raw) {
  return String(raw || '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);
}

function queueStatuses(raw) {
  const allowed = ['bat_valide', 'en_impression'];
  const list = String(raw || '').split(',').filter((s) => allowed.includes(s));
  return list.length ? list : allowed;
}

async function adminPrintQueue(req, res) {
  try {
    return res.json({ items: await prod().printQueue({ statuses: queueStatuses(req.query.status), ids: parseIds(req.query.ids) }) });
  } catch (err) { return handleError(res, err, 'adminPrintQueue'); }
}

async function adminPrintSheet(req, res) {
  try {
    const items = await prod().printQueue({ statuses: queueStatuses(req.query.status), ids: parseIds(req.query.ids) });
    if (!items.length) return res.status(404).json({ error: 'Aucune carte à imprimer.' });
    const date = new Date().toISOString().slice(0, 10);
    const sheet = require('../utils/nfcPrintSheet');
    if (req.query.format === 'csv') {
      res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="lot-impression-${date}.csv"` });
      return res.send(sheet.printSheetCsv(items));
    }
    const pdf = await sheet.renderPrintSheet(items, { title: `Lot d'impression du ${date}` });
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="lot-impression-${date}.pdf"` });
    return res.send(pdf);
  } catch (err) { return handleError(res, err, 'adminPrintSheet'); }
}

async function adminStartPrintBatch(req, res) {
  try { return res.json(await prod().startPrintBatch(parseIds((req.body || {}).ids), adminCtx(req))); }
  catch (err) { return handleError(res, err, 'adminStartPrintBatch'); }
}

module.exports = {
  approveBat, requestBatChanges,
  adminStartDesign, adminUploadBat, adminSendBat, adminApproveBat, adminAdvance,
  adminPrintQueue, adminPrintSheet, adminStartPrintBatch,
  getPublicConfig, getPublic, submitPayment, submitProof, checkContact, resendLink,
  adminList, adminStats, adminDetail, adminValidate, adminReject, adminCancel, adminResend,
  adminExport, adminGetSettings, adminUpdateSettings,
  internalExpireStale, internalRemindersDue, internalNotification,
};
