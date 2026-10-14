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
