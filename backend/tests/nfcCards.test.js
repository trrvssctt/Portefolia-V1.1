// Tests unitaires des cartes NFC physiques (sans base de données) : node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.FRONTEND_URL = 'https://portefolia.tech';
const cards = require('../src/services/nfcCardService');

test('codes : 6 caractères, sans 0/O ni 1/I/L', () => {
  const seen = new Set();
  for (let i = 0; i < 5000; i++) {
    const c = cards.generateCode();
    assert.match(c, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    assert.doesNotMatch(c, /[01OIL]/);
    seen.add(c);
  }
  // Collisions quasi impossibles sur 5000 tirages parmi 31^6 ≈ 887 millions
  assert.ok(seen.size > 4990);
});

test('normalizeCode : minuscules, espaces, tirets acceptés ; caractères ambigus refusés', () => {
  assert.equal(cards.normalizeCode('a7k2q9'), 'A7K2Q9');
  assert.equal(cards.normalizeCode(' A7K-2Q9 '), 'A7K2Q9');
  assert.equal(cards.normalizeCode('A7K2Q'), null);
  assert.equal(cards.normalizeCode('A7K2Q0'), null); // 0 exclu
  assert.equal(cards.normalizeCode('A7K2QL'), null); // L exclu
  assert.equal(cards.normalizeCode(''), null);
});

test('URL encodée dans la puce : fixe et définitive', () => {
  assert.equal(cards.CARD_BASE_URL, 'https://portefolia.tech/c/');
  assert.equal(cards.cardUrl('A7K2Q9'), 'https://portefolia.tech/c/A7K2Q9');
  assert.ok(cards.cardUrl('A7K2Q9').length <= 40); // tient largement dans une NTAG213
});

test('redirection selon l\'état de la carte', () => {
  assert.equal(cards.redirectUrlFor({ state: 'ok', code: 'A7K2Q9', slug: 'awa-diop' }),
    'https://portefolia.tech/portfolio/awa-diop?src=nfc&card=A7K2Q9');
  assert.equal(cards.redirectUrlFor({ state: 'non_activee', code: 'A7K2Q9' }), 'https://portefolia.tech/carte/non-activee?code=A7K2Q9');
  assert.equal(cards.redirectUrlFor({ state: 'preparation', code: 'A7K2Q9' }), 'https://portefolia.tech/carte/en-preparation?code=A7K2Q9');
  assert.equal(cards.redirectUrlFor({ state: 'desactivee', code: 'A7K2Q9' }), 'https://portefolia.tech/carte/desactivee?code=A7K2Q9');
  assert.equal(cards.redirectUrlFor({ state: 'inconnue', code: null }), 'https://portefolia.tech/carte/non-activee');
});

test('commande par offre : infos et design filtrés selon l\'offre', () => {
  process.env.CLOUDINARY_CLOUD_NAME = 'demo';
  const orders = require('../src/services/nfcOrderService');
  const account = { prenom: 'Awa', nom: 'Diop', email: 'AWA@example.sn', phone: '771234567' };
  const info = orders.validateInfo('{}', account);
  assert.deepEqual(info, { name: 'Awa Diop', title: '', phone: '+221771234567', email: 'awa@example.sn' });
  assert.throws(() => orders.validateInfo(JSON.stringify({ phone: '123' }), account), (e) => e.status === 422);

  const standard = { options: { allow_templates: false, allow_colors: false, allow_photo: false, allow_logo: false, allow_notes: false } };
  const perso = { options: { allow_templates: true, allow_colors: true, allow_photo: true } };
  const premium = { options: { allow_colors: true, allow_logo: true, allow_notes: true } };
  const own = 'https://res.cloudinary.com/demo/image/upload/a.png';

  // Standard : gabarit et couleurs imposés, même si le client en envoie d'autres
  assert.deepEqual(orders.validateDesign({ template: 'photo', colors: { bg: '#000000', text: '#ffffff', accent: '#00ff00' } }, standard),
    { template: 'classique', finish: 'noir' });
  // Personnalisée : gabarit photo exige une photo de notre Cloudinary
  assert.throws(() => orders.validateDesign({ template: 'photo' }, perso), (e) => e.status === 422);
  assert.throws(() => orders.validateDesign({ template: 'photo', photo_url: 'https://evil.example/a.png' }, perso), (e) => e.status === 422);
  assert.equal(orders.validateDesign({ template: 'photo', photo_url: own }, perso).photo_url, own);
  assert.throws(() => orders.validateDesign({ colors: { bg: 'red', text: '#fff', accent: '#000' } }, perso), (e) => e.status === 422);
  // Premium : logo obligatoire, notes conservées
  assert.throws(() => orders.validateDesign({}, premium), (e) => e.status === 422);
  const d = orders.validateDesign({ logo_url: own, notes: '  Charte bleue  ' }, premium);
  assert.equal(d.logo_url, own);
  assert.equal(d.notes, 'Charte bleue');
});

test('images de commande : PNG, SVG et taille minimale du logo', () => {
  const { validateAsset, pngSize } = require('../src/utils/nfcAssets');
  const png = (w, h) => {
    const b = Buffer.alloc(33);
    Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').copy(b, 0);
    b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20);
    return b;
  };
  assert.deepEqual(pngSize(png(1200, 800)), { width: 1200, height: 800 });
  assert.equal(validateAsset({ buffer: png(1200, 800) }, 'logo'), 'image/png');
  assert.throws(() => validateAsset({ buffer: png(200, 100) }, 'logo'), (e) => e.status === 422 && /trop petit/.test(e.message));
  assert.equal(validateAsset({ buffer: Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>') }, 'logo'), 'image/svg+xml');
  // Un SVG n'est pas accepté comme photo, un HTML jamais
  assert.throws(() => validateAsset({ buffer: Buffer.from('<svg></svg>') }, 'photo'), (e) => e.status === 422);
  assert.throws(() => validateAsset({ buffer: Buffer.from('<html><script></script></html>') }, 'logo'), (e) => e.status === 422);
});

test('devis : dates SQL et expiration', () => {
  const q = require('../src/services/nfcQuoteService');
  assert.equal(q.dateOnly(new Date(2026, 10, 13)), '2026-11-13');
  assert.equal(q.dateOnly('2026-11-13'), '2026-11-13');
  assert.equal(q.dateOnly('n importe quoi'), null);
  assert.equal(q.isExpired(new Date(2020, 0, 1)), true);
  assert.equal(q.isExpired(new Date(Date.now() + 86400000)), false);
  assert.equal(q.isExpired(null), false);
});
