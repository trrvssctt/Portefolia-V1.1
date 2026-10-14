const svc = require('../services/nfcCardService');

function handleError(res, err, label) {
  if (err instanceof svc.CardError || err.status) return res.status(err.status).json({ error: err.message });
  console.error(`nfcCard.${label} error:`, err);
  return res.status(500).json({ error: 'Erreur serveur, veuillez réessayer.' });
}

function adminCtx(req) {
  return {
    adminId: req.userId || null,
    ip: req.headers['x-forwarded-for'] || req.ip || '',
    userAgent: req.headers['user-agent'] || '',
  };
}

// ── Redirection GET /c/:code (racine du site, via Nginx) ──────────────────────

async function redirect(req, res) {
  try {
    const result = await svc.resolveCode(req.params.code);
    res.set('Cache-Control', 'no-store');
    return res.redirect(302, svc.redirectUrlFor(result));
  } catch (err) {
    console.error('nfcCard.redirect error:', err);
    return res.redirect(302, svc.redirectUrlFor({ state: 'indisponible', code: null }));
  }
}

// Même logique pour la route de secours du frontend (/c/:code servi par le SPA)
async function resolvePublic(req, res) {
  try {
    const r = await svc.resolveCode(req.params.code);
    return res.json({ state: r.state, code: r.code, slug: r.slug || null });
  } catch (err) { return handleError(res, err, 'resolvePublic'); }
}

// ── Admin ─────────────────────────────────────────────────────────────────────

async function stock(req, res) {
  try { return res.json(await svc.getStock()); } catch (err) { return handleError(res, err, 'stock'); }
}

async function list(req, res) {
  try { return res.json(await svc.listCards(req.query)); } catch (err) { return handleError(res, err, 'list'); }
}

async function byCode(req, res) {
  try { return res.json({ card: await svc.getByCode(req.params.code) }); } catch (err) { return handleError(res, err, 'byCode'); }
}

async function listBatches(req, res) {
  try { return res.json({ batches: await svc.listBatches() }); } catch (err) { return handleError(res, err, 'listBatches'); }
}

async function createBatch(req, res) {
  try { return res.status(201).json({ batch: await svc.createBatch(req.body || {}, adminCtx(req)) }); }
  catch (err) { return handleError(res, err, 'createBatch'); }
}

async function receiveBatch(req, res) {
  try { return res.json(await svc.receiveBatch(Number(req.params.id), adminCtx(req))); }
  catch (err) { return handleError(res, err, 'receiveBatch'); }
}

function exportName(batch, ext) {
  const date = new Date(batch.created_at).toISOString().slice(0, 10);
  return `portefolia-cartes-lot${batch.id}-${batch.type_stock}-${date}.${ext}`;
}

// Liste des URL à encoder par le fournisseur (CSV ; séparateur « ; » pour Excel en français)
async function exportBatchCsv(req, res) {
  try {
    const batch = await svc.getBatch(Number(req.params.id));
    const rows = await svc.batchCards(batch.id);
    const lines = ['N°;Code;URL a encoder (NTAG213);Type', ...rows.map((r) => `${r.n};${r.code};${r.url};${svc.STOCK_LABELS[r.type_stock]}`)];
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${exportName(batch, 'csv')}"`,
    });
    return res.send('﻿' + lines.join('\r\n'));
  } catch (err) { return handleError(res, err, 'exportBatchCsv'); }
}

async function deactivate(req, res) {
  try { return res.json({ card: await svc.deactivateCard(Number(req.params.id), (req.body || {}).reason, adminCtx(req)) }); }
  catch (err) { return handleError(res, err, 'deactivate'); }
}

async function reactivate(req, res) {
  try { return res.json({ card: await svc.reactivateCard(Number(req.params.id), adminCtx(req)) }); }
  catch (err) { return handleError(res, err, 'reactivate'); }
}

async function assign(req, res) {
  try { return res.json({ card: await svc.assignCard(Number(req.params.id), req.body || {}, adminCtx(req)) }); }
  catch (err) { return handleError(res, err, 'assign'); }
}

async function setStatus(req, res) {
  try { return res.json({ card: await svc.setCardStatus(Number(req.params.id), (req.body || {}).statut, adminCtx(req)) }); }
  catch (err) { return handleError(res, err, 'setStatus'); }
}

module.exports = {
  redirect, resolvePublic,
  stock, list, byCode, listBatches, createBatch, receiveBatch, exportBatchCsv,
  deactivate, reactivate, assign, setStatus,
};
