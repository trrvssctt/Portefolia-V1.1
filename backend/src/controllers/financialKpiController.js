const {
  getRevenusReels,
  getMRR,
  getEvolutionMensuelle,
  getPipelineEnAttente,
  getRevenusPrevisionnels,
  getChurnStats,
  getKpiNFC,
  getKpiUpgrades,
} = require('../models/financialKpiModel');
const { pool } = require('../db');

// ── Helpers ────────────────────────────────────────────────────────────────

function periodeToRange(periode) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed

  if (periode === 'mois_precedent') {
    const first = new Date(y, m - 1, 1);
    const last  = new Date(y, m, 0, 23, 59, 59);
    return { date_debut: first.toISOString(), date_fin: last.toISOString() };
  }
  if (periode === 'trimestre') {
    const first = new Date(y, m - 2, 1);
    const last  = new Date(y, m + 1, 0, 23, 59, 59);
    return { date_debut: first.toISOString(), date_fin: last.toISOString() };
  }
  if (periode === 'annee') {
    return {
      date_debut: new Date(y, 0, 1).toISOString(),
      date_fin:   new Date(y, 11, 31, 23, 59, 59).toISOString(),
    };
  }
  // défaut : mois en cours
  const first = new Date(y, m, 1);
  const last  = new Date(y, m + 1, 0, 23, 59, 59);
  return { date_debut: first.toISOString(), date_fin: last.toISOString() };
}

function variation(current, previous) {
  if (!previous) return null;
  return Number(((current - previous) / previous * 100).toFixed(2));
}

const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin',
                 'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function formatMoisFr(yyyymm) {
  const [y, m] = yyyymm.split('-');
  return `${MOIS_FR[parseInt(m, 10) - 1]} ${y}`;
}

function pipelineParFluxToObj(parFluxArray) {
  const obj = { abonnement: 0, reabonnement: 0, upgrade: 0, nfc: 0 };
  for (const r of parFluxArray) {
    const key = (r.type_flux || '').toLowerCase();
    if (key in obj) obj[key] = Number(r.total_attendu) || 0;
  }
  return obj;
}

// ── ENDPOINT 1 : GET /api/admin/kpi/dashboard ──────────────────────────────

async function getDashboard(req, res) {
  try {
    const moisCourant = new Date().toISOString().slice(0, 7);
    const rangeMois   = periodeToRange('mois');
    const rangePrev   = periodeToRange('mois_precedent');

    const [mrr, revMois, revPrev, pipeline, churn, kpiNFC, kpiUpgrades] =
      await Promise.all([
        getMRR(),
        getRevenusReels(rangeMois),
        getRevenusReels(rangePrev),
        getPipelineEnAttente(),
        getChurnStats({ mois: moisCourant }),
        getKpiNFC(),
        getKpiUpgrades(),
      ]);

    res.json({
      timestamp: new Date().toISOString(),
      mrr: {
        valeur:                      mrr.mrr,
        arr:                         mrr.arr,
        arpu:                        mrr.arpu,
        abonnes_actifs:              mrr.abonnes_actifs,
        variation_vs_mois_precedent: variation(mrr.mrr, revPrev.total_global),
      },
      revenus_mois: {
        total:                       revMois.total_global,
        par_flux:                    revMois.par_flux,
        nb_transactions:             revMois.nb_transactions,
        montant_moyen:               revMois.montant_moyen,
        variation_vs_mois_precedent: variation(revMois.total_global, revPrev.total_global),
      },
      pipeline: {
        total_attendu:   pipeline.total_attendu_global,
        nb_transactions: pipeline.nb_en_attente_total,
        par_flux:        pipelineParFluxToObj(pipeline.par_flux),
        plus_anciens:    pipeline.plus_anciens.map(r => ({
          id:              r.id,
          utilisateur_nom: `${r.prenom || ''} ${r.nom || ''}`.trim(),
          montant:         r.montant,
          type_flux:       r.type_flux,
          heures_attente:  r.heures_attente,
        })),
      },
      churn: {
        taux:           churn.churn_rate,
        comptes_perdus: churn.expires_ce_mois,
        revenu_perdu:   churn.revenu_perdu,
      },
      nfc: {
        commandes_payees:     kpiNFC.commandes_payees,
        commandes_en_attente: kpiNFC.commandes_en_attente,
        ca_valide:            kpiNFC.ca_nfc_valide,
        ca_attendu:           kpiNFC.ca_nfc_attendu,
        panier_moyen:         kpiNFC.panier_moyen_nfc,
      },
      upgrades: {
        valides_ce_mois:        kpiUpgrades.upgrades_valides,
        en_attente:             kpiUpgrades.upgrades_en_attente,
        ca_upgrades:            kpiUpgrades.ca_upgrades,
        chemin_le_plus_frequent:
          kpiUpgrades.plan_source_populaire && kpiUpgrades.plan_cible_populaire
            ? `${kpiUpgrades.plan_source_populaire} → ${kpiUpgrades.plan_cible_populaire}`
            : null,
      },
    });
  } catch (err) {
    console.error('kpi.getDashboard error:', err);
    res.status(500).json({ error: 'Erreur serveur KPI dashboard' });
  }
}

// ── ENDPOINT 2 : GET /api/admin/kpi/evolution?mois=12 ─────────────────────

async function getEvolution(req, res) {
  try {
    const nb_mois = Math.min(parseInt(req.query.mois) || 12, 36);
    const data    = await getEvolutionMensuelle({ nb_mois });

    const labels  = data.map(r => formatMoisFr(r.mois));
    const series  = {
      abonnement:   data.map(r => r.abonnement),
      reabonnement: data.map(r => r.reabonnement),
      upgrade:      data.map(r => r.upgrade),
      nfc:          data.map(r => r.nfc),
      total:        data.map(r => r.abonnement + r.reabonnement + r.upgrade + r.nfc),
    };

    res.json({ nb_mois, labels, series, raw: data });
  } catch (err) {
    console.error('kpi.getEvolution error:', err);
    res.status(500).json({ error: 'Erreur serveur KPI évolution' });
  }
}

// ── ENDPOINT 3 : GET /api/admin/kpi/previsionnel?horizon=3 ────────────────

async function getPrevisionnel(req, res) {
  try {
    const horizon_mois = Math.min(parseInt(req.query.horizon) || 3, 12);
    const data         = await getRevenusPrevisionnels({ horizon_mois });

    const total_previsionnel = data.reduce((s, r) => s + r.revenu_previsionnel, 0);

    res.json({
      horizon_mois,
      total_previsionnel,
      par_mois: data.map(r => ({
        mois:               formatMoisFr(r.mois_echeance),
        mois_iso:           r.mois_echeance,
        nb_renouvellements: r.nb_renouvellements_attendus,
        montant:            r.revenu_previsionnel,
      })),
    });
  } catch (err) {
    console.error('kpi.getPrevisionnel error:', err);
    res.status(500).json({ error: 'Erreur serveur KPI prévisionnel' });
  }
}

// ── ENDPOINT 4 : GET /api/admin/kpi/flux/:type ────────────────────────────

const FLUX_VALIDES = ['abonnement', 'reabonnement', 'upgrade', 'nfc'];

async function getFluxDetail(req, res) {
  try {
    const type = (req.params.type || '').toLowerCase();
    if (!FLUX_VALIDES.includes(type)) {
      return res.status(400).json({ error: `Type flux invalide. Valeurs : ${FLUX_VALIDES.join(', ')}` });
    }

    const page    = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit   = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset  = (page - 1) * limit;
    const periode = req.query.periode || 'mois';
    const { date_debut, date_fin } = periodeToRange(periode);
    const type_flux = type.toUpperCase();

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM paiements
       WHERE type_flux = ? AND statut = 'RÉUSSI'
         AND created_at BETWEEN ? AND ?`,
      [type_flux, date_debut, date_fin]
    );

    const [rows] = await pool.query(
      `SELECT
         p.id,
         p.montant,
         p.montant_ht,
         p.remise_appliquee,
         p.duree_mois,
         p.statut,
         p.type_flux,
         p.created_at,
         COALESCE(uc.id,  ua.id)    AS utilisateur_id,
         COALESCE(uc.nom, ua.nom)   AS nom,
         COALESCE(uc.prenom, ua.prenom) AS prenom,
         COALESCE(uc.email, ua.email)   AS email
       FROM paiements p
       LEFT JOIN commandes c     ON c.id  = p.commande_id
       LEFT JOIN utilisateurs uc ON uc.id = c.utilisateur_id
       LEFT JOIN abonnements a   ON a.id  = p.abonnement_id
       LEFT JOIN utilisateurs ua ON ua.id = a.utilisateur_id
       WHERE p.type_flux = ? AND p.statut = 'RÉUSSI'
         AND p.created_at BETWEEN ? AND ?
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [type_flux, date_debut, date_fin, limit, offset]
    );

    res.json({
      type_flux,
      periode,
      date_debut,
      date_fin,
      pagination: {
        total: Number(total),
        page,
        limit,
        pages: Math.ceil(Number(total) / limit),
      },
      transactions: rows.map(r => ({
        id:              r.id,
        montant:         r.montant,
        montant_ht:      r.montant_ht,
        remise:          r.remise_appliquee,
        duree_mois:      r.duree_mois,
        statut:          r.statut,
        created_at:      r.created_at,
        utilisateur: {
          id:     r.utilisateur_id,
          nom:    `${r.prenom || ''} ${r.nom || ''}`.trim(),
          email:  r.email,
        },
      })),
    });
  } catch (err) {
    console.error('kpi.getFluxDetail error:', err);
    res.status(500).json({ error: 'Erreur serveur KPI flux détail' });
  }
}

module.exports = { getDashboard, getEvolution, getPrevisionnel, getFluxDetail };
