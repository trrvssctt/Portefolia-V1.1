// Surveillance de la plateforme : détecte les nouveaux événements dans la base (quel que soit le
// chemin qui les a produits) et les transmet à n8n, qui prévient l'administrateur par e-mail.
//   user.registered        nouveau compte
//   business.created       nouveau compte Business
//   payment.submitted      paiement Wave déclaré, à valider
//   payment.succeeded      paiement réussi (abonnement, réabonnement, upgrade, carte NFC…)
//   payment.rejected       paiement refusé
//   upgrade.requested      demande de changement de formule
//   subscription.expired   abonnement expiré
//   contact.message        nouveau message du formulaire de contact
const { pool } = require('../db');
const notifier = require('./platformNotifier');

const SCAN_EVERY_MS = 2 * 60 * 1000;
const MAX_PER_SCAN = 50;

function front() { return notifier.frontendUrl(); }
function fullName(r, p = '') { return [r[`${p}prenom`], r[`${p}nom`]].filter(Boolean).join(' ').trim() || r[`${p}email`] || '—'; }

async function getState(cle) {
  const [[r]] = await pool.query('SELECT valeur FROM platform_watch_state WHERE cle = ?', [cle]);
  return r ? r.valeur : null;
}
async function setState(cle, valeur) {
  await pool.query(
    'INSERT INTO platform_watch_state (cle, valeur) VALUES (?, ?) ON DUPLICATE KEY UPDATE valeur = VALUES(valeur)',
    [cle, String(valeur)]
  );
}

// Première mise en service : on part de l'état actuel (pas d'alerte pour l'historique)
async function ensureBaseline() {
  if (await getState('since')) return;
  const [[now]] = await pool.query("SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s') AS d");
  for (const [cle, table] of [['users.last_id', 'utilisateurs'], ['business.last_id', 'business_accounts'],
    ['upgrades.last_id', 'upgrades'], ['contacts.last_id', 'contact_messages']]) {
    const [[m]] = await pool.query(`SELECT COALESCE(MAX(id), 0) AS m FROM ${table}`).catch(() => [[{ m: 0 }]]);
    await setState(cle, m.m);
  }
  await setState('since', now.d);
  console.log(`[surveillance] mise en service : alertes à partir du ${now.d}`);
}

// Marque un élément comme notifié ; false s'il l'était déjà
async function markOnce(entity, id, kind) {
  const [r] = await pool.query('INSERT IGNORE INTO platform_notified (entity, entity_id, kind) VALUES (?, ?, ?)', [entity, id, kind]);
  return r.affectedRows === 1;
}

// Nouveaux éléments d'une table, au-delà du dernier id vu
async function newRows(stateKey, sql) {
  const last = Number(await getState(stateKey)) || 0;
  const [rows] = await pool.query(sql, [last, MAX_PER_SCAN]);
  if (rows.length) await setState(stateKey, rows[rows.length - 1].id);
  return rows;
}

function statusKind(raw) {
  const s = String(raw || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  if (/reuss|confirm|paid|success|succeed|complet/.test(s)) return 'succeeded';
  if (/rembours|refund/.test(s)) return 'refunded';
  if (/echou|echec|fail|refus|reject/.test(s)) return 'rejected';
  return null;
}

const FLUX_LABELS = {
  ABONNEMENT: 'Abonnement', REABONNEMENT: 'Réabonnement', UPGRADE: 'Changement de formule', NFC: 'Carte NFC', AUTRE: 'Paiement',
};

async function scan() {
  await ensureBaseline();
  const since = await getState('since');
  const ids = [];

  // Nouveaux comptes
  const users = await newRows('users.last_id',
    `SELECT u.id, u.prenom, u.nom, u.email, u.phone, u.role, u.verified,
            COALESCE(u.created_at, u.date_inscription) AS created_at, ba.company_name
     FROM utilisateurs u LEFT JOIN business_accounts ba ON ba.id = u.business_account_id
     WHERE u.id > ? ORDER BY u.id ASC LIMIT ?`);
  for (const u of users) {
    const [[count]] = await pool.query(
      "SELECT COUNT(*) AS n FROM utilisateurs WHERE deleted_at IS NULL OR deleted_at = '0000-00-00 00:00:00'"
    );
    ids.push(await notifier.emit(null, 'user.registered', {
      user: {
        id: u.id, name: fullName(u), email: u.email, phone: u.phone || null, role: u.role,
        company: u.company_name || null, verified: !!u.verified,
        source: u.role === 'GUEST' ? 'Compte invité (commande de carte)' : u.role === 'BUSINESS_MEMBER' ? 'Membre invité par un compte Business' : 'Inscription sur le site',
      },
      stats: { total_users: Number(count.n) },
      links: { admin_url: `${front()}/admin/users/${u.id}` },
    }));
  }

  // Nouveaux comptes Business
  const businesses = await newRows('business.last_id',
    `SELECT ba.id, ba.company_name, ba.max_members, u.prenom, u.nom, u.email, u.phone, p.name AS plan_name
     FROM business_accounts ba LEFT JOIN utilisateurs u ON u.id = ba.admin_user_id LEFT JOIN plans p ON p.id = ba.plan_id
     WHERE ba.id > ? ORDER BY ba.id ASC LIMIT ?`);
  for (const b of businesses) {
    ids.push(await notifier.emit(null, 'business.created', {
      business: { id: b.id, company: b.company_name, admin_name: fullName(b), email: b.email, phone: b.phone || null, plan: b.plan_name || null, max_members: b.max_members },
      links: { admin_url: `${front()}/admin/clients` },
    }));
  }

  // Demandes de changement de formule
  const upgrades = await newRows('upgrades.last_id',
    `SELECT g.id, g.montant_delta, g.duree_mois, g.statut, u.prenom, u.nom, u.email,
            ps.name AS plan_source, pc.name AS plan_cible
     FROM upgrades g JOIN utilisateurs u ON u.id = g.utilisateur_id
     LEFT JOIN plans ps ON ps.id = g.plan_source_id LEFT JOIN plans pc ON pc.id = g.plan_cible_id
     WHERE g.id > ? ORDER BY g.id ASC LIMIT ?`);
  for (const g of upgrades) {
    ids.push(await notifier.emit(null, 'upgrade.requested', {
      upgrade: { id: g.id, name: fullName(g), email: g.email, from: g.plan_source, to: g.plan_cible, amount: Number(g.montant_delta) || 0, months: g.duree_mois },
      links: { admin_url: `${front()}/admin/upgrades` },
    }));
  }

  // Messages du formulaire de contact
  const contacts = await newRows('contacts.last_id',
    'SELECT id, nom, email, sujet, message FROM contact_messages WHERE id > ? ORDER BY id ASC LIMIT ?');
  for (const c of contacts) {
    ids.push(await notifier.emit(null, 'contact.message', {
      contact: { id: c.id, name: c.nom, email: c.email, subject: c.sujet, message: String(c.message || '').slice(0, 1500) },
      links: { admin_url: `${front()}/admin/contact-messages` },
    }));
  }

  // Paiements réussis / refusés / remboursés (toutes origines)
  const [payments] = await pool.query(
    `SELECT p.id, p.statut, p.montant, p.moyen_paiement, p.reference_transaction, p.type_flux, p.type_paiement,
            COALESCE(uc.prenom, ua.prenom, uk.prenom) AS prenom, COALESCE(uc.nom, ua.nom, uk.nom) AS nom,
            COALESCE(uc.email, ua.email, uk.email) AS email, COALESCE(uc.id, ua.id, uk.id) AS user_id,
            COALESCE(pl.name, pl2.name) AS plan_name, c.numero_commande
     FROM paiements p
     LEFT JOIN commandes c ON c.id = p.commande_id
     LEFT JOIN utilisateurs uc ON uc.id = c.utilisateur_id
     LEFT JOIN abonnements a ON a.id = p.abonnement_id
     LEFT JOIN utilisateurs ua ON ua.id = a.utilisateur_id
     LEFT JOIN plans pl ON pl.id = a.plan_id
     LEFT JOIN checkouts ck ON ck.paiement_id = p.id
     LEFT JOIN utilisateurs uk ON uk.id = ck.utilisateur_id
     LEFT JOIN plans pl2 ON pl2.id = ck.plan_id
     WHERE GREATEST(p.created_at, COALESCE(p.updated_at, p.created_at)) >= ?
     ORDER BY p.id ASC LIMIT 200`, [since]
  );
  for (const p of payments) {
    const kind = statusKind(p.statut);
    if (!kind || !(await markOnce('paiement', p.id, kind))) continue;
    const flux = String(p.type_flux || '').toUpperCase();
    ids.push(await notifier.emit(null, `payment.${kind}`, {
      payment: {
        id: p.id, amount: Number(p.montant) || 0, status: p.statut, method: p.moyen_paiement || 'wave',
        reference: p.reference_transaction || null,
        type: FLUX_LABELS[flux] || (p.type_paiement === 'commande_nfc' ? 'Carte NFC' : 'Paiement'),
        plan: p.plan_name || (p.type_paiement === 'commande_nfc' ? 'Carte NFC Portefolia' : null),
        order: p.numero_commande || null,
        customer: { id: p.user_id, name: fullName(p), email: p.email || null },
      },
      links: { admin_url: `${front()}/admin/paiements` },
    }));
  }

  // Paiements Wave d'abonnement déclarés (à valider) et abonnements expirés
  const [subs] = await pool.query(
    `SELECT a.id, a.statut_v2, a.montant, a.montant_paye, a.duree_mois, a.reference_wave, a.preuve_paiement, a.motif_refus,
            a.date_echeance, u.id AS user_id, u.prenom, u.nom, u.email, u.role, p.name AS plan_name
     FROM abonnements a JOIN utilisateurs u ON u.id = a.utilisateur_id LEFT JOIN plans p ON p.id = a.plan_id
     WHERE GREATEST(a.created_at, COALESCE(a.updated_at, a.created_at)) >= ?
     ORDER BY a.id ASC LIMIT 200`, [since]
  );
  for (const a of subs) {
    const customer = { id: a.user_id, name: fullName(a), email: a.email };
    if (a.statut_v2 === 'PENDING_PAYMENT' && a.reference_wave && await markOnce('abonnement', a.id, 'submitted')) {
      ids.push(await notifier.emit(null, 'payment.submitted', {
        payment: {
          id: a.id, amount: Number(a.montant_paye || a.montant) || 0, method: 'wave', reference: a.reference_wave,
          type: 'Abonnement', plan: a.plan_name || null, months: a.duree_mois || null, proof_url: a.preuve_paiement || null, customer,
        },
        links: { admin_url: `${front()}/admin/wave-validation` },
      }));
    }
    if (a.statut_v2 === 'EXPIRED' && a.role !== 'BUSINESS_MEMBER' && await markOnce('abonnement', a.id, 'expired')) {
      ids.push(await notifier.emit(null, 'subscription.expired', {
        subscription: { id: a.id, plan: a.plan_name || null, expired_on: a.date_echeance || null, customer },
        links: { admin_url: `${front()}/admin/users/${a.user_id}` },
      }));
    }
  }

  notifier.flush(ids);
  return ids.length;
}

let timer = null;
let running = false;
function start() {
  if (timer) return;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await scan(); } catch (err) { console.warn('[surveillance] scan:', err.message); } finally { running = false; }
  };
  timer = setInterval(tick, SCAN_EVERY_MS);
  if (timer.unref) timer.unref();
  setTimeout(tick, 15 * 1000).unref?.();
}

module.exports = { scan, start, statusKind, ensureBaseline };
