// Export pour l'imprimeur local (impression UV à Dakar) : un PDF, une page par face à imprimer.
// Page = carte ISO ID-1 (85,6 × 54 mm) + 3 mm de fond perdu + 5 mm de marge pour les traits de coupe
// et la légende (référence, code de la carte) : aucune inversion possible entre carte et client.
const fs = require('fs');
const { CARD_BASE_URL } = require('../services/nfcCardService');

const CARD_W = 85.6;
const CARD_H = 54;
const BLEED = 3;
const MARGIN = 5;
const PAGE_W = CARD_W + 2 * (BLEED + MARGIN);
const PAGE_H = CARD_H + 2 * (BLEED + MARGIN);

const SYSTEM_BROWSERS = [
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium',
  '/usr/bin/google-chrome-stable', '/usr/bin/google-chrome',
];

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Faces à imprimer pour une carte : face infos seule (logo Portefolia imprimé en usine) ou les deux
function facesFor(item) {
  const faces = [];
  if (item.print_faces === 'both') faces.push({ face: 'Face logo (recto)', url: item.print_front_url });
  faces.push({ face: 'Face infos (verso)', url: item.print_back_url });
  return faces;
}

function buildHtml(items, { title }) {
  const pages = [];
  for (const it of items) {
    const code = it.card_code || '— à attribuer —';
    for (const f of facesFor(it)) {
      pages.push(`
<section class="page">
  <div class="caption top">${esc(it.reference)} · Carte ${esc(it.offer_name || '')} · ${esc(it.position)}/${esc(it.quantity)} · ${esc(f.face)}</div>
  <div class="bleed">${f.url ? `<img src="${esc(f.url)}" alt="">` : '<div class="missing">Visuel manquant</div>'}</div>
  <div class="trim"></div>
  ${['tl', 'tr', 'bl', 'br'].map((c) => `<i class="crop ${c}h"></i><i class="crop ${c}v"></i>`).join('')}
  <div class="caption bottom">CODE <b>${esc(code)}</b> · ${esc(it.stock_type === 'blank' ? 'carte vierge' : 'carte logo imprimé')} · ${esc(it.holder_name)}</div>
</section>`);
    }
  }
  const o = BLEED + MARGIN;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { size: ${PAGE_W}mm ${PAGE_H}mm; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; }
  .page { position: relative; width: ${PAGE_W}mm; height: ${PAGE_H}mm; page-break-after: always; overflow: hidden; }
  .bleed { position: absolute; left: ${MARGIN}mm; top: ${MARGIN}mm; width: ${CARD_W + 2 * BLEED}mm; height: ${CARD_H + 2 * BLEED}mm; }
  .bleed img { width: 100%; height: 100%; display: block; object-fit: fill; }
  .missing { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #fee2e2; color: #b91c1c; font-weight: bold; }
  .trim { position: absolute; left: ${o}mm; top: ${o}mm; width: ${CARD_W}mm; height: ${CARD_H}mm; outline: 0.1mm dashed rgba(255,0,0,0.0); }
  .crop { position: absolute; background: #000; }
  .tlh, .trh, .blh, .brh { height: 0.15mm; width: ${MARGIN - 1}mm; }
  .tlv, .trv, .blv, .brv { width: 0.15mm; height: ${MARGIN - 1}mm; }
  .tlh { left: 0; top: ${o}mm; } .tlv { left: ${o}mm; top: 0; }
  .trh { right: 0; top: ${o}mm; } .trv { right: ${o}mm; top: 0; }
  .blh { left: 0; bottom: ${o}mm; } .blv { left: ${o}mm; bottom: 0; }
  .brh { right: 0; bottom: ${o}mm; } .brv { right: ${o}mm; bottom: 0; }
  .caption { position: absolute; left: ${MARGIN + 6}mm; right: ${MARGIN + 6}mm; font-size: 2.1mm; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .caption.top { top: 1mm; } .caption.bottom { bottom: 1mm; }
</style></head><body>${pages.join('')}</body></html>`;
}

async function launchBrowser() {
  const puppeteer = require('puppeteer');
  const args = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'];
  const candidates = [process.env.PUPPETEER_EXECUTABLE_PATH, undefined, ...SYSTEM_BROWSERS.filter((f) => fs.existsSync(f))]
    .filter((v, i, a) => a.indexOf(v) === i);
  const errors = [];
  for (const executablePath of candidates) {
    if (executablePath === null) continue;
    try {
      return await puppeteer.launch({ headless: true, args, ...(executablePath ? { executablePath } : {}) });
    } catch (e) {
      errors.push(`${executablePath || 'chrome puppeteer'} → ${String(e.message).split('\n')[0]}`);
    }
  }
  throw new Error(`aucun navigateur utilisable pour le PDF : ${errors.join(' | ')}`);
}

async function renderPrintSheet(items, { title = 'Lot d\'impression Portefolia' } = {}) {
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(buildHtml(items, { title }), { waitUntil: 'networkidle0', timeout: 90000 });
    const pdf = await page.pdf({ width: `${PAGE_W}mm`, height: `${PAGE_H}mm`, printBackground: true, preferCSSPageSize: true });
    return Buffer.from(pdf);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

// Récapitulatif CSV (une ligne par carte) pour vérifier le lot avant / après impression
function printSheetCsv(items) {
  const cell = (v) => {
    const s = String(v ?? '');
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ['Référence', 'Offre', 'Carte', 'Titulaire', 'E-mail', 'Code carte', 'URL de la puce', 'Type de carte', 'Faces à imprimer', 'Statut'];
  const lines = items.map((it) => [
    it.reference, it.offer_name, `${it.position}/${it.quantity}`, it.holder_name, it.holder_email, it.card_code || '',
    it.card_code ? `${CARD_BASE_URL}${it.card_code}` : '', it.stock_type === 'blank' ? 'Vierge' : 'Logo imprimé',
    it.print_faces === 'both' ? 'Recto + verso' : 'Face infos', it.status,
  ].map(cell).join(';'));
  return '﻿' + [head.join(';'), ...lines].join('\r\n');
}

module.exports = { buildHtml, renderPrintSheet, printSheetCsv, facesFor, PAGE_W, PAGE_H };
