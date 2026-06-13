const { pool } = require('../db');

module.exports = async function checkSubscription(req, res, next) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const [rows] = await pool.query(
      'SELECT subscription_status FROM utilisateurs WHERE id = ? LIMIT 1',
      [userId]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const status = user.subscription_status;

    if (status === 'ACTIVE') return next();

    if (status === 'PENDING_PAYMENT') {
      return res.status(403).json({
        code: 'PENDING_VALIDATION',
        message: 'Votre paiement est en cours de validation par notre équipe.',
        redirect: '/pending-validation',
      });
    }

    if (status === 'EXPIRED') {
      return res.status(403).json({
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Votre abonnement a expiré.',
        redirect: '/renouveler',
      });
    }

    if (status === 'SUSPENDED') {
      return res.status(403).json({
        code: 'ACCOUNT_SUSPENDED',
        message: 'Votre compte est suspendu. Contactez le support.',
        redirect: '/support',
      });
    }

    if (status === 'GRACE_PERIOD') {
      const [aboRows] = await pool.query(
        `SELECT id, grace_period_until
         FROM abonnements
         WHERE utilisateur_id = ? AND statut_v2 = 'GRACE_PERIOD'
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      );
      const abo = aboRows[0];

      if (abo && abo.grace_period_until && new Date(abo.grace_period_until) > new Date()) {
        res.setHeader('X-Subscription-Warning', 'validation_pending');
        return next();
      }

      // Période de grâce expirée → transition automatique vers EXPIRED
      await pool.query(
        `UPDATE abonnements
         SET statut_v2 = 'EXPIRED', statut = 'expired', updated_at = CURRENT_TIMESTAMP
         WHERE utilisateur_id = ? AND statut_v2 = 'GRACE_PERIOD'`,
        [userId]
      );
      await pool.query(
        'UPDATE utilisateurs SET subscription_status = \'EXPIRED\' WHERE id = ?',
        [userId]
      );

      return res.status(403).json({
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Votre abonnement a expiré.',
        redirect: '/renouveler',
      });
    }

    // NONE ou statut inconnu
    return res.status(403).json({
      code: 'NO_SUBSCRIPTION',
      message: 'Aucun abonnement actif. Veuillez souscrire à un plan.',
      redirect: '/plans',
    });
  } catch (err) {
    console.error('checkSubscription error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
