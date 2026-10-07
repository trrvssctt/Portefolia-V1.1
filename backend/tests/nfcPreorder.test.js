// Tests unitaires des précommandes NFC (sans base de données) : node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.FRONTEND_URL = 'https://portefolia.tech';
const svc = require('../src/services/nfcPreorderService');
const { buildWaveLink, formatFcfa } = require('../src/utils/nfcConfig');
const { buildPreorderPayload } = require('../src/utils/nfcPreorderPayload');
const internalAuth = require('../src/middlewares/internalAuth');

const cfg = {
  unit_price: 12500, currency: 'XOF', max_quantity: 10, batch_threshold: 10, expiry_hours: 72,
  wave_number: '+221 78 131 13 71', wave_link: '', wave_link_supports_amount: false,
};

test('normalizePhone accepte les formats sénégalais courants', () => {
  assert.equal(svc.normalizePhone('77 123 45 67'), '+221771234567');
  assert.equal(svc.normalizePhone('781311371'), '+221781311371');
  assert.equal(svc.normalizePhone('221 70.123.45.67'), '+221701234567');
  assert.equal(svc.normalizePhone('+221-76-123-45-67'), '+221761234567');
  assert.equal(svc.normalizePhone('00221751234567'), '+221751234567');
});

test('normalizePhone refuse les numéros invalides', () => {
  for (const bad of ['', '12345', '33 123 45 67', '+33612345678', '72 123 45 67', '77 123 45 6']) {
    assert.equal(svc.normalizePhone(bad), null, bad);
  }
});

test('validateCreateInput : entrée valide, prix jamais lu depuis le client', () => {
  const r = svc.validateCreateInput({
    full_name: '  Awa   Diop ', email: 'AWA@Example.sn ', phone: '77 123 45 67', quantity: 2,
    unit_price: 1, total_amount: 1,
  }, cfg);
  assert.equal(r.full_name, 'Awa Diop');
  assert.equal(r.card_name, 'Awa Diop');
  assert.equal(r.email, 'awa@example.sn');
  assert.equal(r.phone, '+221771234567');
  assert.equal(r.quantity, 2);
  assert.equal(r.unit_price, undefined);
});

test('validateCreateInput : erreurs 422', () => {
  const base = { full_name: 'Awa Diop', email: 'awa@example.sn', phone: '771234567', quantity: 1 };
  for (const patch of [{ phone: '123' }, { quantity: 0 }, { quantity: 11 }, { quantity: 1.5 }, { email: 'x' }, { full_name: 'A' }]) {
    assert.throws(() => svc.validateCreateInput({ ...base, ...patch }, cfg), (e) => e.status === 422, JSON.stringify(patch));
  }
});

test('normalizeWaveTx', () => {
  assert.equal(svc.normalizeWaveTx(' t_abc123 '), 'T_ABC123');
  assert.equal(svc.normalizeWaveTx('abc'), null);
  assert.equal(svc.normalizeWaveTx('abc 123 def'), null);
});

test('transitions autorisées et refusées', () => {
  const p = (status) => ({ status, reference: 'PF-NFC-0001' });
  assert.doesNotThrow(() => svc.assertTransition(p('pending_payment'), 'payment_submitted'));
  assert.doesNotThrow(() => svc.assertTransition(p('rejected'), 'payment_submitted'));
  assert.doesNotThrow(() => svc.assertTransition(p('payment_submitted'), 'paid'));
  assert.doesNotThrow(() => svc.assertTransition(p('paid'), 'converted'));
  assert.doesNotThrow(() => svc.assertTransition(p('rejected'), 'expired'));
  const refused = [
    ['pending_payment', 'paid'], ['paid', 'paid'], ['paid', 'cancelled'], ['converted', 'cancelled'],
    ['payment_submitted', 'expired'], ['expired', 'payment_submitted'], ['cancelled', 'paid'],
  ];
  for (const [from, to] of refused) {
    assert.throws(() => svc.assertTransition(p(from), to), (e) => e.status === 409, `${from} → ${to}`);
  }
});

test('safeEqual', () => {
  assert.equal(svc.safeEqual('abc', 'abc'), true);
  assert.equal(svc.safeEqual('abc', 'abd'), false);
  assert.equal(svc.safeEqual('abc', 'abcd'), false);
  assert.equal(svc.safeEqual('', ''), false);
  assert.equal(svc.safeEqual(undefined, undefined), false);
});

test('buildPreorderPayload : format attendu par n8n, jeton seulement dans tracking_url', () => {
  const row = {
    id: 7, reference: 'PF-NFC-0007', public_token: 'tok123', full_name: 'Awa Diop', card_name: 'AWA DIOP',
    email: 'awa@example.sn', phone: '+221771234567', city: 'Dakar', quantity: 1, unit_price: 12500,
    total_amount: 12500, currency: 'XOF', status: 'pending_payment', client_reminder_count: 0,
    created_at: new Date('2026-10-07T10:15:00Z'),
  };
  const out = buildPreorderPayload(row, cfg, { paid_count: 3, batch_threshold: 10 });
  assert.equal(out.preorder.first_name, 'Awa');
  assert.equal(out.preorder.total_amount, 12500);
  assert.equal(out.preorder.created_at, '2026-10-07T10:15:00.000Z');
  assert.equal(out.payment.wave_number, '+221 78 131 13 71');
  assert.equal(out.payment.wave_link, null);
  assert.equal(out.links.tracking_url, 'https://portefolia.tech/nfc/precommande/PF-NFC-0007?t=tok123');
  assert.deepEqual(out.stats, { paid_count: 3, batch_threshold: 10 });
  const withoutLinks = JSON.stringify({ ...out, links: null });
  assert.ok(!withoutLinks.includes('tok123'));
});

test('buildWaveLink et formatFcfa', () => {
  assert.equal(buildWaveLink(cfg, 12500), null);
  assert.equal(buildWaveLink({ ...cfg, wave_link: 'https://pay.wave.com/m/X' }, 12500), 'https://pay.wave.com/m/X');
  assert.equal(buildWaveLink({ ...cfg, wave_link: 'https://pay.wave.com/m/X', wave_link_supports_amount: true }, 25000),
    'https://pay.wave.com/m/X?amount=25000');
  assert.equal(formatFcfa(12500), '12 500 F CFA');
  assert.equal(formatFcfa(125000), '125 000 F CFA');
});

test('internalAuth : 401 sans la bonne clé', () => {
  process.env.INTERNAL_API_KEY = 'secret-interne';
  const run = (key) => {
    let status = 200;
    let nextCalled = false;
    const req = { get: (h) => (h === 'X-Internal-Key' ? key : undefined) };
    const res = { status(s) { status = s; return this; }, json() { return this; } };
    internalAuth(req, res, () => { nextCalled = true; });
    return nextCalled ? 200 : status;
  };
  assert.equal(run('secret-interne'), 200);
  assert.equal(run('mauvaise-cle!!'), 401);
  assert.equal(run(undefined), 401);
  process.env.INTERNAL_API_KEY = '';
  assert.equal(run(''), 401);
});

test('submitPayment refuse la référence saisie à la place de l\'identifiant Wave', async () => {
  await assert.rejects(
    svc.submitPayment('PF-NFC-0002', 'tok', { wave_transaction_id: 'pf-nfc-0002' }),
    (e) => e.status === 422 && /référence de votre précommande/.test(e.message)
  );
});
