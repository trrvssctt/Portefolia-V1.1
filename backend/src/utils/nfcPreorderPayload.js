// Format unique d'une précommande transmise à n8n (webhook et rappels)
const { buildWaveLink, frontendUrl } = require('./nfcConfig');

function iso(d) {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function firstName(fullName) {
  return String(fullName || '').trim().split(/\s+/)[0] || '';
}

function trackingUrl(p) {
  return `${frontendUrl()}/nfc/precommande/${encodeURIComponent(p.reference)}?t=${p.public_token}`;
}

function buildPreorderPayload(p, cfg, stats) {
  const front = frontendUrl();
  const payload = {
    preorder: {
      id: p.id,
      reference: p.reference,
      full_name: p.full_name,
      first_name: firstName(p.full_name),
      card_name: p.card_name,
      email: p.email,
      phone: p.phone,
      city: p.city || null,
      quantity: Number(p.quantity),
      unit_price: Number(p.unit_price),
      total_amount: Number(p.total_amount),
      currency: p.currency,
      status: p.status,
      wave_transaction_id: p.wave_transaction_id || null,
      wave_sender_phone: p.wave_sender_phone || null,
      rejection_reason: p.rejection_reason || null,
      client_reminder_count: Number(p.client_reminder_count || 0),
      payment_submitted_at: iso(p.payment_submitted_at),
      paid_at: iso(p.paid_at),
      created_at: iso(p.created_at),
    },
    payment: {
      method: 'wave',
      wave_number: cfg.wave_number,
      wave_link: buildWaveLink(cfg, p.total_amount),
    },
    links: {
      tracking_url: trackingUrl(p),
      admin_url: `${front}/admin/nfc-preorders?ref=${encodeURIComponent(p.reference)}`,
      admin_list_url: `${front}/admin/nfc-preorders`,
      portfolio_url: `${front}/dashboard`,
      preorder_url: `${front}/nfc-types#precommande`,
    },
  };
  if (stats) payload.stats = stats;
  return payload;
}

module.exports = { buildPreorderPayload, trackingUrl, firstName, iso };
