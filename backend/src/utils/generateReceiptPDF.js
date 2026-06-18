'use strict';

const LOGO_URL = 'https://portefolia.tech/lovable-uploads/logo_portefolia_remove_bg.png';
const FRONTEND = 'https://portefolia.tech';

function fmtFcfa(n) {
  return `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function buildReceiptHtml({ receiptNumber, type, client, plan, numero_commande, montant, duree_mois, reference_wave, moyen_paiement, date_paiement, date_echeance }) {
  const isNFC = type === 'commande_nfc';
  const moyenLabel = moyen_paiement
    ? moyen_paiement.charAt(0).toUpperCase() + moyen_paiement.slice(1).replace(/_/g, ' ')
    : 'Mobile Money';
  const dureeLabel = duree_mois === 12 ? '1 an' : duree_mois === 1 ? '1 mois' : `${duree_mois} mois`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Helvetica Neue',Arial,sans-serif;background:#fff;color:#111827;font-size:13px}
  .page{width:794px;min-height:1050px;padding:48px 52px;position:relative;overflow:hidden}
  .watermark{position:absolute;top:42%;left:50%;transform:translate(-50%,-50%) rotate(-28deg);
    font-size:80px;font-weight:900;color:rgba(46,125,50,.05);text-transform:uppercase;
    letter-spacing:10px;white-space:nowrap;user-select:none}
  /* Header */
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}
  .logo{height:56px;width:auto}
  .badge h1{font-size:22px;font-weight:900;color:#1b5e20;letter-spacing:-.5px;text-align:right}
  .badge .num{font-size:12px;color:#6b7280;text-align:right;margin-top:3px}
  .badge .paid{display:inline-block;margin-top:5px;padding:3px 10px;background:#dcfce7;
    color:#15803d;border-radius:99px;font-size:11px;font-weight:700;border:1px solid #86efac}
  /* Divider */
  .div{height:3px;background:linear-gradient(to right,#2E7D32,#1BC29A);border-radius:2px;margin:20px 0 28px}
  /* Grid */
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px}
  .box h3{font-size:9px;text-transform:uppercase;letter-spacing:1.2px;color:#9ca3af;
    font-weight:700;margin-bottom:8px}
  .box p{font-size:13px;font-weight:600;color:#111827;margin-bottom:2px}
  .box .sub{font-size:11px;color:#6b7280;font-weight:400}
  /* Table */
  table.rec{width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;
    box-shadow:0 1px 4px rgba(0,0,0,.08)}
  thead.th tr th{background:#2E7D32;color:#fff;padding:12px 18px;text-align:left;
    font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
  thead.th tr th:last-child{text-align:right}
  tbody tr td{padding:14px 18px;border-top:1px solid #e5e7eb;font-size:13px;background:#f9fafb}
  tbody tr td:last-child{text-align:right;font-weight:700;color:#2E7D32}
  tbody tr.total td{background:#f0fdf4;border-top:2px solid #2E7D32;font-weight:800;font-size:14px}
  tbody tr.total td:last-child{color:#1b5e20;font-size:16px}
  /* Payment pills */
  .pills{display:flex;gap:12px;margin:20px 0}
  .pill{flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 14px}
  .pill label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:1px;
    color:#16a34a;font-weight:700;margin-bottom:5px}
  .pill span{font-size:12px;font-weight:600;color:#15803d;word-break:break-all}
  /* Validity */
  .validity{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin-top:16px}
  .validity p{font-size:12px;color:#92400e;line-height:1.6}
  /* Footer */
  .ftr{position:absolute;bottom:36px;left:52px;right:52px;
    display:flex;justify-content:space-between;align-items:flex-end;
    border-top:1px solid #e5e7eb;padding-top:16px}
  .ftr-l p{font-size:10px;color:#9ca3af;line-height:1.7}
  .stamp{width:72px;height:72px;border:3px solid #2E7D32;border-radius:50%;
    display:flex;align-items:center;justify-content:center;flex-direction:column}
  .stamp span{font-size:7px;font-weight:800;text-transform:uppercase;color:#2E7D32;
    line-height:1.3;text-align:center}
</style>
</head>
<body>
<div class="page">
  <div class="watermark">VALIDÉ</div>

  <!-- Header -->
  <div class="hdr">
    <img class="logo" src="${LOGO_URL}" alt="Portefolia">
    <div class="badge">
      <h1>REÇU DE PAIEMENT</h1>
      <p class="num">N° ${receiptNumber}</p>
      <span class="paid">✓ PAYÉ</span>
    </div>
  </div>
  <div class="div"></div>

  <!-- Parties -->
  <div class="grid">
    <div class="box">
      <h3>Émetteur</h3>
      <p>Portefolia</p>
      <p class="sub">comptabilite@portefolia.tech</p>
      <p class="sub">${FRONTEND}</p>
    </div>
    <div class="box">
      <h3>Client</h3>
      <p>${client.prenom} ${client.nom}</p>
      <p class="sub">${client.email}</p>
      <p class="sub" style="margin-top:8px;font-size:10px;">Date d'émission : ${fmtDate(date_paiement)}</p>
    </div>
  </div>

  <!-- Table -->
  <table class="rec">
    <thead class="th">
      <tr>
        <th style="width:${isNFC ? '70%' : '55%'}">Description</th>
        ${isNFC ? '' : '<th>Durée</th>'}
        <th>Montant HT</th>
        <th>Montant TTC</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          ${isNFC
            ? `<strong>Carte NFC Portefolia</strong><br>
               <span style="font-size:11px;color:#6b7280">Commande N° ${numero_commande || '—'} · Carte NFC personnalisée</span>`
            : `<strong>${plan.name}</strong><br>
               <span style="font-size:11px;color:#6b7280">Accès complet à la plateforme Portefolia</span>`
          }
        </td>
        ${isNFC ? '' : `<td>${dureeLabel}</td>`}
        <td>${fmtFcfa(montant)}</td>
        <td>${fmtFcfa(montant)}</td>
      </tr>
      <tr class="total">
        <td colspan="${isNFC ? '2' : '3'}">Total payé</td>
        <td>${fmtFcfa(montant)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Payment info -->
  <div class="pills">
    <div class="pill">
      <label>Mode de paiement</label>
      <span>${moyenLabel}</span>
    </div>
    <div class="pill">
      <label>Référence transaction</label>
      <span>${reference_wave || '—'}</span>
    </div>
    <div class="pill">
      <label>Date de paiement</label>
      <span>${fmtDate(date_paiement)}</span>
    </div>
  </div>

  ${!isNFC && date_echeance ? `
  <div class="validity">
    <p>Abonnement actif jusqu'au <strong>${fmtDate(date_echeance)}</strong>.
    Renouvelez avant cette date pour conserver l'accès à votre espace.</p>
  </div>` : ''}

  <!-- Footer -->
  <div class="ftr">
    <div class="ftr-l">
      <p>Portefolia · contact@portefolia.tech · ${FRONTEND}</p>
      <p>Ce document est un reçu de paiement officiel. Conservez-le précieusement.</p>
    </div>
    <div class="stamp">
      <span>Payé<br>&amp;<br>Validé</span>
    </div>
  </div>
</div>
</body>
</html>`;
}

async function generateReceiptPDF(data) {
  let browser;
  try {
    const puppeteer = require('puppeteer');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setContent(buildReceiptHtml(data), { waitUntil: 'load', timeout: 20000 });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    return Buffer.from(pdfBuffer);
  } catch (e) {
    console.error('generateReceiptPDF error:', e.message);
    return null;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = { generateReceiptPDF, buildReceiptHtml };
