const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const requireBusinessAdmin = require('../middlewares/requireBusinessAdmin');
const requireBusinessAccess = require('../middlewares/requireBusinessAccess');
const ctrl = require('../controllers/businessController');
const analyticsCtrl = require('../controllers/businessAnalyticsController');

// ─── Routes publiques (pas de token requis) ───────────────────────────────────
// Vérifier un token d'invitation
router.get('/invite/:token', ctrl.checkInviteToken);

// Accepter une invitation et créer son compte
router.post('/invite/accept', ctrl.acceptInvite);

// ─── Routes communes (tout utilisateur Business) ──────────────────────────────
// Contexte Business du user connecté (account + member info + branding)
router.get('/me', authMiddleware, requireBusinessAccess, ctrl.getMyBusinessContext);

// Vérifier la limite portfolio
router.get('/portfolio-limit', authMiddleware, requireBusinessAccess, ctrl.checkPortfolioLimit);

// ─── Routes Admin Business uniquement ────────────────────────────────────────
// Récupérer le compte complet (membres inclus)
router.get('/account', authMiddleware, requireBusinessAdmin, ctrl.getMyAccount);

// Mettre à jour le branding / settings
router.put('/account/settings', authMiddleware, requireBusinessAdmin, ctrl.updateSettings);

// Inviter un membre
router.post('/members/invite', authMiddleware, requireBusinessAdmin, ctrl.inviteMember);

// Lister les membres
router.get('/members', authMiddleware, requireBusinessAdmin, ctrl.listMembers);

// Suspendre / réactiver un membre
router.patch('/members/:memberId/toggle', authMiddleware, requireBusinessAdmin, ctrl.toggleMemberStatus);

// Supprimer un membre
router.delete('/members/:memberId', authMiddleware, requireBusinessAdmin, ctrl.removeMember);

// Profil complet d'un membre (portfolios inclus)
router.get('/members/:memberId/profile', authMiddleware, requireBusinessAdmin, ctrl.getMemberProfileAdmin);

// Historique des paiements du compte Business
router.get('/payments', authMiddleware, requireBusinessAdmin, ctrl.getBusinessPayments);

// ─── Analytics Business (admin + membres) ────────────────────────────────────
router.get('/analytics', authMiddleware, requireBusinessAccess, analyticsCtrl.getAnalytics);

module.exports = router;
