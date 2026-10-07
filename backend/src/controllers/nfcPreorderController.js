const svc = require('../services/nfcPreorderService');
const { getNfcConfig, updateNfcConfig, buildWaveLink } = require('../utils/nfcConfig');
const { trackingUrl, iso } = require('../utils/nfcPreorderPayload');

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

async function create(req, res) {
  try {
    const body = req.body || {};
    // Honeypot : un robot a rempli le champ caché → réponse factice, rien n'est enregistré
    if (body.website) {
      return res.status(201).json({ reference: 'PF-NFC-0000', token: '', status: 'pending_payment' });
    }
    const { preorder, token, cfg } = await svc.createPreorder(body, { userId: req.userId || null });
    return res.status(201).json({
      reference: preorder.reference,
      token,
      status: preorder.status,
      total_amount: Number(preorder.total_amount),
      currency: preorder.currency,
      payment: paymentInfo(cfg, preorder.total_amount),
      tracking_url: trackingUrl(preorder),
    });
  } catch (err) { return handleError(res, err, 'create'); }
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
      wave_transaction_id: p.wave_transaction_id,
      rejection_reason: p.rejection_reason,
      created_at: iso(p.created_at),
      payment_submitted_at: iso(p.payment_submitted_at),
      paid_at: iso(p.paid_at),
      expiry_hours: cfg.expiry_hours,
      payment: paymentInfo(cfg, p.total_amount),
    });
  } catch (err) { return handleError(res, err, 'getPublic'); }
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

async function adminConvert(req, res) {
  try { return res.json(await svc.convertToCommande(Number(req.params.id), adminCtx(req))); }
  catch (err) { return handleError(res, err, 'adminConvert'); }
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

module.exports = {
  getPublicConfig, create, getPublic, submitPayment, checkContact, resendLink,
  adminList, adminStats, adminDetail, adminValidate, adminReject, adminCancel, adminConvert, adminResend,
  adminExport, adminGetSettings, adminUpdateSettings,
  internalExpireStale, internalRemindersDue, internalNotification,
};
