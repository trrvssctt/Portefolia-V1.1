// Tests unitaires des notifications plateforme (sans base de données) : node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.INTERNAL_API_KEY = 'cle-de-test';
const watcher = require('../src/services/platformWatcher');
const relances = require('../src/services/platformRelanceService');

test('classement des statuts de paiement', () => {
  for (const s of ['Réussi', 'RÉUSSI', 'reussi', 'confirmed', 'paid', 'succeeded']) assert.equal(watcher.statusKind(s), 'succeeded', s);
  for (const s of ['Échoué', 'failed', 'refusé', 'rejected']) assert.equal(watcher.statusKind(s), 'rejected', s);
  assert.equal(watcher.statusKind('refunded'), 'refunded');
  assert.equal(watcher.statusKind('Remboursé'), 'refunded');
  // Paiements en cours : pas d'alerte « reçu » (les paiements Wave à valider sont suivis sur les abonnements)
  for (const s of ['pending', 'pending_admin', 'En_attente', '', null]) assert.equal(watcher.statusKind(s), null, String(s));
});

test('relances : une étape par fenêtre de jours après l\'expiration', () => {
  const step = (d) => (relances.stepFor(d) || {}).step || null;
  assert.equal(step(0), null);
  assert.equal(step(2), null);
  assert.equal(step(3), 'J+3');
  assert.equal(step(9), 'J+3');
  assert.equal(step(10), 'J+10');
  assert.equal(step(29), 'J+10');
  assert.equal(step(30), 'J+30');
  assert.equal(step(59), 'J+30');
  assert.equal(step(60), 'J+60');
  assert.equal(step(179), 'J+60');
  assert.equal(step(180), null); // au-delà de 6 mois : plus de relance
});

test('lien de désinscription signé', () => {
  const t = relances.unsubscribeToken(42);
  assert.match(t, /^[0-9a-f]{32}$/);
  assert.equal(relances.checkUnsubscribeToken(42, t), true);
  assert.equal(relances.checkUnsubscribeToken(43, t), false);
  assert.equal(relances.checkUnsubscribeToken(42, t.slice(0, 31) + (t[31] === 'a' ? 'b' : 'a')), false);
  assert.equal(relances.checkUnsubscribeToken(42, ''), false);
});
