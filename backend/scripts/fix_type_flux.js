/**
 * Script de migration ponctuelle : fix_type_flux.js
 *
 * Corrige les données existantes :
 *   1. Renseigne paiements.type_flux (NULL ou 'AUTRE') depuis le contexte
 *   2. Recalcule abonnements.montant_mensuel_equivalent pour tous les ACTIVE
 *
 * Usage :
 *   node scripts/fix_type_flux.js --dry-run   # simulation (aucune écriture)
 *   node scripts/fix_type_flux.js --apply      # application réelle
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../src/db');

const DRY_RUN = process.argv.includes('--dry-run') || !process.argv.includes('--apply');

if (DRY_RUN) {
  console.log('\n[DRY-RUN] Aucune écriture — passez --apply pour appliquer.\n');
} else {
  console.log('\n[APPLY] Écriture en base activée.\n');
}

async function exec(sql, params = []) {
  if (DRY_RUN) return { affectedRows: 0 };
  const [result] = await pool.query(sql, params);
  return result;
}

// ─── 1. Corriger type_flux des paiements ─────────────────────────────────────

async function fixTypeFluxAbonnements() {
  // Paiements liés à un abonnement sans type_flux valide
  const [rows] = await pool.query(
    `SELECT p.id, p.abonnement_id, p.duree_mois,
            a.plan_id, a.duree_mois AS abo_duree, a.montant_paye, a.montant,
            a.utilisateur_id,
            (SELECT COUNT(*) FROM abonnements prev
             WHERE prev.utilisateur_id = a.utilisateur_id
               AND prev.id < a.id
               AND prev.statut_v2 IN ('ACTIVE','EXPIRED','SUSPENDED')
            ) AS nb_precedents
     FROM paiements p
     JOIN abonnements a ON a.id = p.abonnement_id
     WHERE (p.type_flux IS NULL OR p.type_flux = 'AUTRE')
       AND p.abonnement_id IS NOT NULL`
  );

  let corrigesAbo = 0;
  for (const row of rows) {
    const typeFlux    = row.nb_precedents > 0 ? 'REABONNEMENT' : 'ABONNEMENT';
    const duree       = row.duree_mois ?? row.abo_duree ?? 1;
    console.log(`  paiement #${row.id} → type_flux=${typeFlux}, duree_mois=${duree}, plan_id=${row.plan_id ?? '—'}`);
    await exec(
      `UPDATE paiements SET type_flux = ?, duree_mois = ?, plan_id = ? WHERE id = ?`,
      [typeFlux, duree, row.plan_id ?? null, row.id]
    );
    corrigesAbo++;
  }
  return corrigesAbo;
}

async function fixTypeFluxCommandes() {
  // Paiements liés à une commande NFC sans type_flux
  const [rows] = await pool.query(
    `SELECT p.id, p.commande_id
     FROM paiements p
     WHERE (p.type_flux IS NULL OR p.type_flux = 'AUTRE')
       AND p.commande_id IS NOT NULL`
  );

  let corrigesNfc = 0;
  for (const row of rows) {
    console.log(`  paiement #${row.id} → type_flux=NFC (commande #${row.commande_id})`);
    await exec(`UPDATE paiements SET type_flux = 'NFC' WHERE id = ?`, [row.id]);
    corrigesNfc++;
  }
  return corrigesNfc;
}

async function fixTypeFluxUpgrades() {
  // Paiements liés à un upgrade via la table upgrades
  const [rows] = await pool.query(
    `SELECT p.id, u.id AS upgrade_id, u.plan_cible_id
     FROM paiements p
     JOIN upgrades u ON u.paiement_id = p.id
     WHERE (p.type_flux IS NULL OR p.type_flux = 'AUTRE')`
  );

  let corrigesUpgrade = 0;
  for (const row of rows) {
    console.log(`  paiement #${row.id} → type_flux=UPGRADE (upgrade #${row.upgrade_id})`);
    await exec(
      `UPDATE paiements SET type_flux = 'UPGRADE', plan_id = ? WHERE id = ?`,
      [row.plan_cible_id, row.id]
    );
    corrigesUpgrade++;
  }
  return corrigesUpgrade;
}

async function fixRemainingAutre() {
  // Paiements orphelins (sans abonnement, commande ni upgrade) → garder AUTRE
  const [[{ nb }]] = await pool.query(
    `SELECT COUNT(*) AS nb FROM paiements
     WHERE (type_flux IS NULL OR type_flux = 'AUTRE')
       AND abonnement_id IS NULL
       AND commande_id IS NULL`
  );
  console.log(`  ${nb} paiement(s) restent AUTRE (pas de contexte déductible)`);
  if (nb > 0 && !DRY_RUN) {
    await pool.query(
      `UPDATE paiements SET type_flux = 'AUTRE' WHERE type_flux IS NULL`
    );
  }
  return Number(nb);
}

// ─── 2. Recalculer montant_mensuel_equivalent ─────────────────────────────────

async function fixMontantMensuel() {
  const [rows] = await pool.query(
    `SELECT id, montant_paye, montant, duree_mois
     FROM abonnements
     WHERE statut_v2 IN ('ACTIVE', 'PENDING_PAYMENT', 'GRACE_PERIOD')
       AND (montant_mensuel_equivalent IS NULL OR montant_mensuel_equivalent = 0)`
  );

  let recalcules = 0;
  for (const row of rows) {
    const montant = Number(row.montant_paye ?? row.montant ?? 0);
    const duree   = Number(row.duree_mois ?? 1);
    if (montant <= 0) continue;
    const mme = duree > 0 ? montant / duree : montant;
    console.log(`  abonnement #${row.id} → montant_mensuel_equivalent=${mme.toFixed(2)} (${montant}/${duree})`);
    await exec(
      `UPDATE abonnements SET montant_mensuel_equivalent = ? WHERE id = ?`,
      [mme, row.id]
    );
    recalcules++;
  }
  return recalcules;
}

// ─── 3. Mettre à jour abonnements.type (INITIAL/RENOUVELLEMENT) ───────────────

async function fixTypeAbonnement() {
  const [rows] = await pool.query(
    `SELECT a.id, a.utilisateur_id,
            (SELECT COUNT(*) FROM abonnements prev
             WHERE prev.utilisateur_id = a.utilisateur_id
               AND prev.id < a.id
               AND prev.statut_v2 IN ('ACTIVE','EXPIRED','SUSPENDED')
            ) AS nb_precedents
     FROM abonnements a
     WHERE a.type NOT IN ('INITIAL','RENOUVELLEMENT')
        OR a.type IS NULL`
  );

  let fixedType = 0;
  for (const row of rows) {
    const typeAbo = row.nb_precedents > 0 ? 'RENOUVELLEMENT' : 'INITIAL';
    console.log(`  abonnement #${row.id} → type=${typeAbo}`);
    await exec(
      `UPDATE abonnements SET type = ? WHERE id = ?`,
      [typeAbo, row.id]
    );
    fixedType++;
  }
  return fixedType;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  try {
    console.log('='.repeat(60));
    console.log('FIX TYPE FLUX — Portefolia');
    console.log('='.repeat(60));

    console.log('\n[1/5] Correction type_flux — abonnements...');
    const nbAbo = await fixTypeFluxAbonnements();

    console.log('\n[2/5] Correction type_flux — commandes NFC...');
    const nbNfc = await fixTypeFluxCommandes();

    console.log('\n[3/5] Correction type_flux — upgrades...');
    const nbUpgrade = await fixTypeFluxUpgrades();

    console.log('\n[4/5] Marquage résiduel AUTRE...');
    const nbAutre = await fixRemainingAutre();

    console.log('\n[5/5] Correction abonnements.type (INITIAL/RENOUVELLEMENT)...');
    const nbType = await fixTypeAbonnement();

    console.log('\n[6/6] Recalcul montant_mensuel_equivalent...');
    const nbMme = await fixMontantMensuel();

    console.log('\n' + '='.repeat(60));
    console.log('RAPPORT FINAL' + (DRY_RUN ? ' [DRY-RUN — rien écrit]' : ' [APPLIQUÉ]'));
    console.log('='.repeat(60));
    console.log(`  Paiements type_flux corrigés :`);
    console.log(`    → Abonnements/Réabonnements : ${nbAbo}`);
    console.log(`    → NFC                        : ${nbNfc}`);
    console.log(`    → Upgrades                   : ${nbUpgrade}`);
    console.log(`    → Restent AUTRE              : ${nbAutre}`);
    console.log(`  Abonnements.type corrigés      : ${nbType}`);
    console.log(`  MRR recalculés (MME)           : ${nbMme}`);
    console.log('='.repeat(60));

    if (DRY_RUN) {
      console.log('\nRelancez avec --apply pour écrire ces changements.\n');
    } else {
      console.log('\nMigration terminée avec succès.\n');
    }
  } catch (err) {
    console.error('\nErreur fatale :', err.message || err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
