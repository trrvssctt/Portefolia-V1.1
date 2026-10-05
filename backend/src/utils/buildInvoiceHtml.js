'use strict';

// Facture : gabarit de assets/template_facture.pdf, sans tampon « PAYÉ ».
const { renderDocument } = require('./portefoliaDocument');

function buildInvoiceHtml({ invoiceNumber, client = {}, planName, montant, currency, reference, date_paiement, date_echeance, moyen_paiement, paid = true, entreprise }) {
  const cur = currency === 'XOF' || !currency ? 'FCFA' : currency;
  const amount = Number(montant) || 0;

  return renderDocument({
    kind: 'facture',
    number: invoiceNumber,
    date: date_paiement || new Date(),
    typeLabel: 'Facture — abonnement',
    currency: cur,
    client: {
      name: `${client.prenom || ''} ${client.nom || ''}`.trim(),
      email: client.email || '',
      company: entreprise || '',
    },
    items: [{
      designation: `Abonnement ${planName || 'Portefolia'}`,
      detail: 'Accès complet à la plateforme Portefolia',
      code: 'ABO',
      qty: 1,
      pu: amount,
    }],
    payments: paid ? [{ date: date_paiement || new Date(), moyen: moyen_paiement, reference: reference || '', amount }] : [],
    validUntil: date_echeance || null,
  });
}

module.exports = { buildInvoiceHtml };
