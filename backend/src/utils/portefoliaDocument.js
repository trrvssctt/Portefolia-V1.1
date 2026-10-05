'use strict';

// Gabarit commun facture / reçu Portefolia (mise en page de assets/template_facture.pdf).
// Le reçu est la même facture avec un tampon « PAYÉ ».

const fs = require('fs');
const path = require('path');

const FRONTEND = process.env.FRONTEND_BASE || 'https://portefolia.tech';
const COMPANY = {
  name: 'Portefolia',
  address: process.env.COMPANY_ADDRESS || 'Dakar, Sénégal',
  phone: process.env.COMPANY_PHONE || '',
  email: process.env.COMPANY_EMAIL || 'contact@portefolia.tech',
  site: FRONTEND.replace(/^https?:\/\//, 'www.').replace(/^www\.www\./, 'www.'),
};

// Logo intégré au document (pas de requête réseau pendant la génération PDF)
const LOGO_SRC = (() => {
  const candidates = [
    path.join(__dirname, '../../../public/nfc-card/logo-portefolia.webp'),
    path.join(__dirname, '../../../public/logo_portefolia.png'),
  ];
  for (const f of candidates) {
    try {
      const mime = f.endsWith('.webp') ? 'image/webp' : 'image/png';
      return `data:${mime};base64,${fs.readFileSync(f).toString('base64')}`;
    } catch { /* fichier absent : candidat suivant */ }
  }
  return `${FRONTEND}/lovable-uploads/logo_portefolia_remove_bg.png`;
})();

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtNum(n) {
  return Math.round(Number(n) || 0).toLocaleString('fr-FR').replace(/ | /g, ' ');
}

function fmtDateLong(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtDateShort(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function moyenLabel(m) {
  if (!m) return 'Mobile Money';
  const s = String(m).toLowerCase();
  if (s.includes('wave')) return 'Wave';
  if (s.includes('orange')) return 'Orange Money';
  if (s.includes('stripe') || s.includes('card') || s.includes('carte')) return 'Carte bancaire';
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

/**
 * @param {object} d
 * @param {'facture'|'recu'} d.kind
 * @param {string} d.number            N° du document
 * @param {Date|string} d.date         date d'émission
 * @param {string} d.typeLabel         ligne « Type : … »
 * @param {{name:string,email?:string,company?:string}} d.client
 * @param {{designation:string,detail?:string,code?:string,qty:number,pu:number}[]} d.items
 * @param {{date:Date|string,moyen?:string,reference?:string,amount:number}[]} d.payments
 * @param {string} [d.currency]        'FCFA' par défaut
 * @param {Date|string|null} [d.validUntil]  fin d'abonnement
 */
function renderDocument(d) {
  const isRecu = d.kind === 'recu';
  const cur = d.currency || 'FCFA';
  const items = d.items || [];
  const payments = d.payments || [];
  const total = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.pu) || 0), 0);
  const paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const rest = Math.max(0, total - paid);
  const isPaid = rest === 0 && paid > 0;
  const title = isRecu ? 'REÇU DE PAIEMENT' : 'FACTURE';
  const generatedAt = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Dakar' });

  const rows = items.map((it, i) => `
        <tr>
          <td class="c">${i + 1}</td>
          <td>${esc(it.designation)}${it.detail ? `<div class="detail">${esc(it.detail)}</div>` : ''}</td>
          <td class="c muted">${esc(it.code || '—')}</td>
          <td class="c">${fmtNum(it.qty)}</td>
          <td class="r">${fmtNum(it.pu)}</td>
          <td class="r">${fmtNum((Number(it.qty) || 0) * (Number(it.pu) || 0))}</td>
        </tr>`).join('');

  const payRows = payments.map(p => `
        <tr class="sum">
          <td colspan="5" class="r">VERSEMENT DU ${fmtDateShort(p.date)} (${esc(moyenLabel(p.moyen))})${p.reference ? `<div class="ref">Réf. ${esc(p.reference)}</div>` : ''}</td>
          <td class="r">${fmtNum(p.amount)} ${cur}</td>
        </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${title} ${esc(d.number)}</title>
<style>
  @page{size:A4;margin:0}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1f2937;font-size:12.5px;background:#fff}
  .page{width:794px;height:1122px;padding:44px 62px 0;position:relative;overflow:hidden}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start}
  .co h1{font-size:27px;font-weight:700;color:#1B5E20;margin-bottom:12px}
  .co p{font-size:12.5px;color:#374151;line-height:1.65}
  .logo{height:78px;width:auto;margin-top:-4px}
  .rule{height:2px;background:#2E7D32;margin:16px 0 30px}
  .title{text-align:center;font-size:25px;font-weight:700;letter-spacing:.5px;color:#111827;margin-bottom:30px}
  .meta{display:flex;justify-content:space-between;font-size:13px;margin-bottom:10px}
  .meta b{font-weight:700}
  .line{font-size:12.5px;color:#374151;margin-bottom:8px}
  .line b{font-weight:700;color:#111827}
  .ok{color:#15803d;font-weight:700}
  .due{color:#b45309;font-weight:700}
  .band{background:#eceef1;padding:8px 12px;font-size:12px;font-weight:700;letter-spacing:.4px;color:#374151;margin:18px 0 16px}
  .client h2{font-size:16px;font-weight:700;color:#111827;text-transform:uppercase;margin-bottom:4px}
  .client p{font-size:12.5px;color:#4b5563;line-height:1.6}
  table{width:100%;border-collapse:separate;border-spacing:0 3px;margin-top:20px}
  th{background:#2E7D32;color:#fff;font-weight:700;font-size:12.5px;padding:9px 8px;text-align:center}
  th:nth-child(2){text-align:center}
  td{padding:9px 8px;background:#f6f7f8;font-size:12.5px;vertical-align:top}
  td.c{text-align:center} td.r{text-align:right;white-space:nowrap} td.muted{color:#6b7280}
  .detail{font-size:11px;color:#6b7280;margin-top:3px}
  tr.sum td{background:#eef0f3;font-weight:700;color:#1f2937}
  tr.sum td:last-child{font-weight:400}
  tr.total td{background:#e3e7ec;font-weight:800;font-size:13.5px}
  tr.total td:last-child{font-weight:800}
  tr.rest td{background:#e3e7ec;font-weight:800;font-size:13.5px}
  .ref{font-size:10.5px;font-weight:400;color:#6b7280;margin-top:2px}
  .note{margin-top:18px;font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;padding:10px 14px}
  .sealwrap{display:flex;justify-content:flex-end;align-items:center;gap:40px;margin-top:34px;padding-right:6px}
  .seal{width:150px;height:78px;border:2px solid #2E7D32;border-radius:6px;
    display:flex;flex-direction:column;align-items:center;justify-content:center;color:#2E7D32;transform:rotate(-3deg);opacity:.85}
  .seal b{font-size:14px;letter-spacing:.5px} .seal span{font-size:9.5px;margin-top:2px}
  .paid{margin-right:auto;margin-left:150px;transform:rotate(-12deg);
    border:6px double #c62828;color:#c62828;border-radius:12px;padding:8px 30px 10px;text-align:center;opacity:.82;
    font-weight:900;letter-spacing:7px}
  .paid .big{font-size:64px;line-height:1}
  .paid .small{font-size:15px;letter-spacing:3px;margin-top:4px;font-weight:700}
  .ftr{position:absolute;bottom:34px;left:0;right:0;text-align:center;font-size:11px;font-style:italic;color:#9ca3af}
</style>
</head>
<body>
<div class="page">
  <div class="hdr">
    <div class="co">
      <h1>${COMPANY.name}</h1>
      <p>${esc(COMPANY.address)}</p>
      ${COMPANY.phone ? `<p>Tél : ${esc(COMPANY.phone)}</p>` : ''}
      <p>Email : ${esc(COMPANY.email)}</p>
      <p>${esc(COMPANY.site)}</p>
    </div>
    <img class="logo" src="${LOGO_SRC}" alt="Portefolia">
  </div>
  <div class="rule"></div>

  <div class="title">${title}</div>

  <div class="meta">
    <b>N° ${esc(d.number)}</b>
    <span>Date : <b>${fmtDateLong(d.date)}</b></span>
  </div>
  <p class="line">Type : ${esc(d.typeLabel || (isRecu ? 'Reçu de paiement' : 'Facture'))}</p>
  <p class="line">Paiement : ${isPaid ? '<span class="ok">PAYÉ</span>' : `<span class="due">EN ATTENTE</span>`}${d.validUntil ? ` — Abonnement actif jusqu'au <b>${fmtDateLong(d.validUntil)}</b>` : ''}</p>

  <div class="band">CLIENT</div>
  <div class="client">
    <h2>${esc(d.client?.company || d.client?.name || '—')}</h2>
    ${d.client?.company && d.client?.name ? `<p>${esc(d.client.name)}</p>` : ''}
    ${d.client?.email ? `<p>Email : ${esc(d.client.email)}</p>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:44px">N°</th>
        <th>Désignation</th>
        <th style="width:96px">Code</th>
        <th style="width:52px">Qté</th>
        <th style="width:102px">P.U. (${cur})</th>
        <th style="width:118px">Total (${cur})</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total"><td colspan="5" class="r">TOTAL</td><td class="r">${fmtNum(total)} ${cur}</td></tr>
      ${payRows}
      ${payments.length ? `<tr class="sum"><td colspan="5" class="r">TOTAL PAYÉ</td><td class="r">${fmtNum(paid)} ${cur}</td></tr>` : ''}
      <tr class="rest"><td colspan="5" class="r">RESTE À PAYER</td><td class="r">${fmtNum(rest)} ${cur}</td></tr>
    </tbody>
  </table>

  ${isRecu ? `
  <div class="sealwrap">
    <div class="paid"><div class="big">PAYÉ</div><div class="small">${fmtDateShort(payments[payments.length - 1]?.date || d.date)}</div></div>
    <div class="seal"><b>PORTEFOLIA</b><span>${esc(COMPANY.address)}</span><span>${esc(COMPANY.site)}</span></div>
  </div>` : ''}

  <div class="ftr">${COMPANY.name} — Document généré le ${esc(generatedAt)}</div>
</div>
</body>
</html>`;
}

async function htmlToPdf(html) {
  let browser;
  try {
    const puppeteer = require('puppeteer');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 20000 });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    return Buffer.from(pdf);
  } catch (e) {
    console.error('htmlToPdf error:', e.message);
    return null;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = { renderDocument, htmlToPdf, moyenLabel };
