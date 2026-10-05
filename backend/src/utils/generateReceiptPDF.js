'use strict';

// Reçu de paiement : même gabarit que la facture, avec le tampon « PAYÉ ».
const { renderDocument, htmlToPdf } = require('./portefoliaDocument');

function dureeLabel(m) {
  const n = Number(m) || 1;
  if (n === 12) return '1 an';
  return n === 1 ? '1 mois' : `${n} mois`;
}

function buildReceiptHtml({ receiptNumber, type, client = {}, plan = {}, numero_commande, montant, duree_mois, reference_wave, moyen_paiement, date_paiement, date_echeance, quantite, entreprise }) {
  const isNFC = type === 'commande_nfc';
  const amount = Number(montant) || 0;
  const qty = isNFC ? Math.max(1, Number(quantite) || 1) : 1;

  const item = isNFC
    ? {
        designation: 'Carte NFC Portefolia personnalisée',
        detail: numero_commande ? `Commande N° ${numero_commande}` : '',
        code: 'NFC',
        qty,
        pu: amount / qty,
      }
    : {
        designation: `Abonnement ${plan.name || 'Portefolia'}`,
        detail: `Durée : ${dureeLabel(duree_mois)} — accès complet à la plateforme`,
        code: 'ABO',
        qty: 1,
        pu: amount,
      };

  return renderDocument({
    kind: 'recu',
    number: receiptNumber,
    date: date_paiement || new Date(),
    typeLabel: isNFC ? 'Reçu — commande de carte NFC' : 'Reçu — abonnement',
    client: {
      name: `${client.prenom || ''} ${client.nom || ''}`.trim(),
      email: client.email || '',
      company: entreprise || '',
    },
    items: [item],
    payments: [{ date: date_paiement || new Date(), moyen: moyen_paiement || 'wave', reference: reference_wave || '', amount }],
    validUntil: isNFC ? null : (date_echeance || null),
  });
}

async function generateReceiptPDF(data) {
  return htmlToPdf(buildReceiptHtml(data));
}

module.exports = { generateReceiptPDF, buildReceiptHtml };
