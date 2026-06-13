const businessModel = require('../models/businessAccountModel');
const userModel = require('../models/userModel');
const planModel = require('../models/planModel');
const sendEmail = require('../utils/sendEmail');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 30);
const FRONTEND_BASE = process.env.FRONTEND_BASE || 'http://localhost:5173';

// Retourne le compte Business existant, ou le crée automatiquement (pour les
// utilisateurs ayant payé avant que le webhook n'initialise le record).
async function findOrCreateAccount(userId) {
  let account = await businessModel.findAccountByAdminId(userId);
  if (!account) {
    const user = await userModel.findById(userId);
    account = await businessModel.createAccount({
      admin_user_id: userId,
      company_name: user?.prenom || user?.email || 'Mon Entreprise',
      plan_id: null,
    });
  }
  return account;
}

// ─── Admin : récupère son compte Business ────────────────────────────────────
async function getMyAccount(req, res) {
  try {
    const account = await findOrCreateAccount(req.userId);

    const memberCount = await businessModel.countActiveMembers(account.id);
    const members = await businessModel.listMembers(account.id);

    return res.json({ account: { ...account, member_count: memberCount }, members });
  } catch (err) {
    console.error('businessController.getMyAccount', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ─── Membre/Admin : récupère les infos du compte auquel il appartient ───────
async function getMyBusinessContext(req, res) {
  try {
    // Try admin first (owns the account), then member (belongs to an account)
    let account = await businessModel.findAccountByAdminId(req.userId);
    let isAdmin = !!account;

    if (!account) {
      account = await businessModel.findAccountByUserId(req.userId);
    }

    // Still not found — auto-create (user paid but webhook didn't init the record)
    if (!account) {
      account = await findOrCreateAccount(req.userId);
      isAdmin = true;
    }

    const member = isAdmin ? null : await businessModel.getMemberByUserId(req.userId, account.id);

    return res.json({
      account: {
        id: account.id,
        company_name: account.company_name,
        company_logo_url: account.company_logo_url,
        primary_color: account.primary_color,
        secondary_color: account.secondary_color,
        accent_color: account.accent_color,
        font_family: account.font_family,
      },
      member: member ? {
        id: member.id,
        role: member.role,
        portfolio_limit: member.portfolio_limit,
        status: member.status,
      } : null,
      is_admin: isAdmin,
    });
  } catch (err) {
    console.error('businessController.getMyBusinessContext', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ─── Admin : mise à jour du branding/settings ────────────────────────────────
async function updateSettings(req, res) {
  try {
    const account = await findOrCreateAccount(req.userId);

    const { company_name, company_logo_url, primary_color, secondary_color, accent_color, font_family, website_url, description, address, phone } = req.body;

    // Validation couleurs hex basique
    const hexReg = /^#[0-9A-Fa-f]{6}$/;
    if (primary_color && !hexReg.test(primary_color)) return res.status(400).json({ error: 'primary_color doit être au format #RRGGBB' });
    if (secondary_color && !hexReg.test(secondary_color)) return res.status(400).json({ error: 'secondary_color doit être au format #RRGGBB' });
    if (accent_color && !hexReg.test(accent_color)) return res.status(400).json({ error: 'accent_color doit être au format #RRGGBB' });

    const updated = await businessModel.updateAccountSettings(account.id, {
      company_name, company_logo_url, primary_color, secondary_color, accent_color, font_family,
      website_url, description, address, phone,
    });

    return res.json({ ok: true, account: updated });
  } catch (err) {
    console.error('businessController.updateSettings', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ─── Admin : inviter un membre par email ─────────────────────────────────────
async function inviteMember(req, res) {
  try {
    const account = await businessModel.findAccountByAdminId(req.userId);
    if (!account) return res.status(404).json({ error: 'Compte Business introuvable' });
    if (account.status !== 'active') return res.status(403).json({ error: 'Compte Business inactif' });

    const { email, poste } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis' });

    const normalizedEmail = email.trim().toLowerCase();

    // Vérifier limite membres
    const activeCount = await businessModel.countActiveMembers(account.id);
    if (activeCount >= account.max_members) {
      return res.status(403).json({ error: `Limite de ${account.max_members} membres atteinte` });
    }

    // Vérifier invitation déjà envoyée
    const existing = await businessModel.getMemberByEmail(normalizedEmail, account.id);
    if (existing) return res.status(409).json({ error: 'Cet email a déjà été invité' });

    const { id: member_id, invitation_token } = await businessModel.inviteMember({
      business_account_id: account.id,
      invitation_email: normalizedEmail,
      invited_by: req.userId,
      poste: poste ? poste.trim() : null,
    });

    const inviteUrl = `${FRONTEND_BASE}/business/join?token=${invitation_token}`;

    try {
      const primary = account.primary_color || '#1a1a2e';
      const secondary = account.secondary_color || '#16213e';
      // Les data URIs (base64) ne sont pas supportés par les clients mail — on utilise les initiales à la place
      const isDataUri = (account.company_logo_url || '').startsWith('data:');
      const initial = (account.company_name || 'B').charAt(0).toUpperCase();
      const logoHtml = (account.company_logo_url && !isDataUri)
        ? `<img src="${account.company_logo_url}" alt="${account.company_name}" style="max-height:56px;max-width:180px;object-fit:contain;display:block;margin:0 auto 12px;" />`
        : `<div style="width:60px;height:60px;border-radius:14px;background:${primary};display:block;margin:0 auto 12px;font-size:28px;font-weight:700;color:#ffffff;text-align:center;line-height:60px;">${initial}</div>`;

      await sendEmail({
        to: normalizedEmail,
        subject: `🎁 Vous êtes invité(e) à rejoindre ${account.company_name} sur Portefolia`,
        html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Invitation Portefolia</title></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;">

        <!-- Header band -->
        <tr><td style="background:linear-gradient(135deg,${primary} 0%,${secondary} 100%);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
          <p style="margin:0 0 4px;color:rgba(255,255,255,0.7);font-size:12px;letter-spacing:2px;text-transform:uppercase;">Invitation exclusive</p>
          <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Vous êtes invité(e) 🎁</h1>
        </td></tr>

        <!-- White card -->
        <tr><td style="background:#ffffff;padding:40px 40px 32px;border-left:1px solid #e8eaed;border-right:1px solid #e8eaed;">

          <!-- Company logo + name -->
          <div style="text-align:center;margin-bottom:28px;">
            ${logoHtml}
            <h2 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#111827;">${account.company_name}</h2>
            <p style="margin:0;font-size:13px;color:#6b7280;">vous invite à rejoindre son espace professionnel</p>
          </div>

          <!-- Divider -->
          <hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 28px;" />

          <!-- Body text -->
          <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
            Bonjour,
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            <strong>${account.company_name}</strong> vous a sélectionné(e) pour rejoindre son espace Business sur <strong>Portefolia</strong> — la plateforme de portfolios professionnels.
          </p>

          <!-- Features -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td style="padding:10px 14px;background:#f9fafb;border-radius:10px;margin-bottom:8px;">
                <table><tr>
                  <td style="font-size:20px;padding-right:12px;">📁</td>
                  <td>
                    <p style="margin:0;font-size:13px;font-weight:600;color:#111827;">Portfolios Business</p>
                    <p style="margin:0;font-size:12px;color:#6b7280;">Créez jusqu'à 10 portfolios aux couleurs de l'entreprise</p>
                  </td>
                </tr></table>
              </td>
            </tr>
            <tr><td style="height:8px;"></td></tr>
            <tr>
              <td style="padding:10px 14px;background:#f9fafb;border-radius:10px;">
                <table><tr>
                  <td style="font-size:20px;padding-right:12px;">🎨</td>
                  <td>
                    <p style="margin:0;font-size:13px;font-weight:600;color:#111827;">Branding personnalisé</p>
                    <p style="margin:0;font-size:12px;color:#6b7280;">Logo, couleurs et polices aux standards de ${account.company_name}</p>
                  </td>
                </tr></table>
              </td>
            </tr>
            <tr><td style="height:8px;"></td></tr>
            <tr>
              <td style="padding:10px 14px;background:#f9fafb;border-radius:10px;">
                <table><tr>
                  <td style="font-size:20px;padding-right:12px;">🌍</td>
                  <td>
                    <p style="margin:0;font-size:13px;font-weight:600;color:#111827;">Visibilité professionnelle</p>
                    <p style="margin:0;font-size:12px;color:#6b7280;">Partagez votre profil avec un lien unique et élégant</p>
                  </td>
                </tr></table>
              </td>
            </tr>
          </table>

          <!-- CTA Button -->
          <div style="text-align:center;margin:32px 0 8px;">
            <a href="${inviteUrl}"
               style="display:inline-block;background:linear-gradient(135deg,${primary} 0%,${secondary} 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:50px;letter-spacing:0.3px;box-shadow:0 4px 15px ${primary}44;">
              Rejoindre ${account.company_name} →
            </a>
          </div>

          <!-- Expiry note -->
          <p style="margin:20px 0 0;text-align:center;font-size:12px;color:#9ca3af;">
            ⏳ Ce lien expire dans <strong>7 jours</strong>
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border:1px solid #e8eaed;border-top:none;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
          <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;">
            Si vous n'attendiez pas cette invitation, ignorez simplement cet email.
          </p>
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            Propulsé par <strong style="color:#374151;">Portefolia</strong> — Plateforme de portfolios professionnels
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`,
      });
    } catch (emailErr) {
      console.warn('businessController.inviteMember: email send failed', emailErr.message);
    }

    return res.status(201).json({ ok: true, member_id, message: 'Invitation envoyée' });
  } catch (err) {
    console.error('businessController.inviteMember', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ─── Public : vérifier un token d'invitation ─────────────────────────────────
async function checkInviteToken(req, res) {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ error: 'Token manquant' });

    const member = await businessModel.findMemberByToken(token);
    if (!member) return res.status(404).json({ error: 'Invitation invalide ou expirée' });
    if (member.status !== 'pending') return res.status(409).json({ error: 'Invitation déjà utilisée' });

    const account = await businessModel.findAccountById(member.business_account_id);

    const existingUser = await userModel.findByEmail(member.invitation_email);

    return res.json({
      valid: true,
      email: member.invitation_email,
      has_existing_account: !!existingUser,
      company_name: account?.company_name || '',
      company_logo_url: account?.company_logo_url || null,
      primary_color: account?.primary_color || '#1a1a2e',
      secondary_color: account?.secondary_color || '#16213e',
      accent_color: account?.accent_color || '#0f3460',
      font_family: account?.font_family || null,
    });
  } catch (err) {
    console.error('businessController.checkInviteToken', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ─── Public : accepter une invitation ────────────────────────────────────────
// Deux cas selon que l'invité a déjà un compte ou non :
//   Compte existant : { token, password }            → vérifie le mdp, lie le compte
//   Nouveau compte  : { token, nom, prenom, password } → crée le compte et lie
async function acceptInvite(req, res) {
  try {
    const { token, password, nom, prenom } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'token et password requis' });
    }

    const member = await businessModel.findMemberByToken(token);
    if (!member) return res.status(404).json({ error: 'Invitation invalide ou expirée' });
    if (member.status !== 'pending') return res.status(409).json({ error: 'Invitation déjà utilisée' });

    const account = await businessModel.findAccountById(member.business_account_id);
    if (!account || account.status !== 'active') {
      return res.status(403).json({ error: 'Compte Business inactif' });
    }

    const { pool } = require('../db');
    const refreshTokenModel = require('../models/refreshTokenModel');

    const issueTokens = async (userId, email, role) => {
      const accessToken = jwt.sign({ sub: userId, role, email }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
      const refreshToken = crypto.randomBytes(40).toString('hex');
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
      await refreshTokenModel.createRefreshToken({
        utilisateur_id: userId, token: refreshToken,
        user_agent: req.headers['user-agent'] || null, ip: req.ip, expires_at: expiresAt,
      });
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
        maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
        path: '/',
      });
      return accessToken;
    };

    // ── Cas 1 : l'invité a déjà un compte ────────────────────────────────────
    const existingUser = await userModel.findByEmail(member.invitation_email);
    if (existingUser) {
      const validPassword = await bcrypt.compare(password, existingUser.mot_de_passe);
      if (!validPassword) {
        return res.status(401).json({ error: 'Mot de passe incorrect. Saisissez le mot de passe de votre compte Portefolia existant.' });
      }

      await businessModel.activateMember(member.id, existingUser.id);
      await pool.query(
        'UPDATE utilisateurs SET business_account_id = ?, role = ? WHERE id = ?',
        [account.id, 'BUSINESS_MEMBER', existingUser.id]
      );

      const accessToken = await issueTokens(existingUser.id, existingUser.email, 'BUSINESS_MEMBER');
      return res.json({ ok: true, accessToken, upgraded: true, message: 'Compte lié à votre espace Business' });
    }

    // ── Cas 2 : nouveau compte ────────────────────────────────────────────────
    if (!nom || !prenom) {
      return res.status(400).json({ error: 'nom et prenom requis pour créer un nouveau compte' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Mot de passe : 8 caractères minimum' });
    }

    const hash = await bcrypt.hash(password, 12);
    const newUser = await userModel.createUser({
      nom, prenom,
      email: member.invitation_email,
      mot_de_passe: hash,
      role: 'BUSINESS_MEMBER',
      is_active: true,
      verified: true,
    });

    await pool.query('UPDATE utilisateurs SET business_account_id = ? WHERE id = ?', [account.id, newUser.id]);
    await businessModel.activateMember(member.id, newUser.id);

    const accessToken = await issueTokens(newUser.id, newUser.email, 'BUSINESS_MEMBER');
    return res.status(201).json({ ok: true, accessToken, upgraded: false, message: 'Compte créé avec succès' });
  } catch (err) {
    console.error('businessController.acceptInvite', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ─── Admin : liste des membres ────────────────────────────────────────────────
async function listMembers(req, res) {
  try {
    const account = await businessModel.findAccountByAdminId(req.userId);
    if (!account) return res.status(404).json({ error: 'Compte Business introuvable' });

    const members = await businessModel.listMembers(account.id);
    return res.json({ members });
  } catch (err) {
    console.error('businessController.listMembers', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ─── Admin : suspendre / réactiver un membre ──────────────────────────────────
async function toggleMemberStatus(req, res) {
  try {
    const account = await businessModel.findAccountByAdminId(req.userId);
    if (!account) return res.status(404).json({ error: 'Compte Business introuvable' });

    const member_id = Number(req.params.memberId);
    const members = await businessModel.listMembers(account.id);
    const target = members.find(m => m.id === member_id);
    if (!target) return res.status(404).json({ error: 'Membre introuvable' });

    const newStatus = target.status === 'active' ? 'suspended' : 'active';
    await businessModel.updateMemberStatus(member_id, newStatus);

    // Sync is_active sur l'utilisateur
    if (target.user_id) {
      await require('../db').pool.query(
        'UPDATE utilisateurs SET is_active = ? WHERE id = ?',
        [newStatus === 'active' ? 1 : 0, target.user_id]
      );
    }

    return res.json({ ok: true, status: newStatus });
  } catch (err) {
    console.error('businessController.toggleMemberStatus', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ─── Admin : supprimer un membre ──────────────────────────────────────────────
async function removeMember(req, res) {
  try {
    const account = await businessModel.findAccountByAdminId(req.userId);
    if (!account) return res.status(404).json({ error: 'Compte Business introuvable' });

    const member_id = Number(req.params.memberId);
    const members = await businessModel.listMembers(account.id);
    const target = members.find(m => m.id === member_id);
    if (!target) return res.status(404).json({ error: 'Membre introuvable' });

    await businessModel.removeMember(member_id);

    // Rétrograder le rôle de l'utilisateur si existant
    if (target.user_id) {
      await require('../db').pool.query(
        "UPDATE utilisateurs SET role = 'USER', business_account_id = NULL WHERE id = ?",
        [target.user_id]
      );
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('businessController.removeMember', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ─── Membre : vérifie ses limites portfolio ───────────────────────────────────
async function checkPortfolioLimit(req, res) {
  try {
    const count = await businessModel.countBusinessPortfolios(req.userId);
    const account = await businessModel.findAccountByUserId(req.userId);
    const member = account ? await businessModel.getMemberByUserId(req.userId, account.id) : null;
    const limit = member?.portfolio_limit ?? 10;

    return res.json({ count, limit, can_create: count < limit });
  } catch (err) {
    console.error('businessController.checkPortfolioLimit', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ─── Admin : historique des paiements du compte Business ─────────────────────
async function getBusinessPayments(req, res) {
  try {
    const { pool } = require('../db');
    const [rows] = await pool.query(`
      SELECT p.id, p.montant, p.statut, p.moyen_paiement, p.reference_transaction,
             p.created_at, p.updated_at,
             a.statut AS abonnement_statut,
             pl.name AS plan_name, pl.slug AS plan_slug,
             c.token AS checkout_token
      FROM paiements p
      LEFT JOIN abonnements a ON a.id = p.abonnement_id
      LEFT JOIN plans pl ON pl.id = a.plan_id
      LEFT JOIN checkouts c ON c.paiement_id = p.id
      WHERE a.utilisateur_id = ?
      ORDER BY p.created_at DESC
      LIMIT 100
    `, [req.userId]);
    return res.json({ paiements: rows });
  } catch (err) {
    console.error('getBusinessPayments:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ─── Admin : profil complet d'un membre ──────────────────────────────────────
async function getMemberProfileAdmin(req, res) {
  try {
    const account = await businessModel.findAccountByAdminId(req.userId);
    if (!account) return res.status(404).json({ error: 'Compte Business introuvable' });

    const member_id = Number(req.params.memberId);
    const data = await businessModel.getMemberProfile(member_id, account.id);
    if (!data.member) return res.status(404).json({ error: 'Membre introuvable' });

    return res.json(data);
  } catch (err) {
    console.error('getMemberProfileAdmin:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = {
  getMyAccount,
  getMyBusinessContext,
  updateSettings,
  inviteMember,
  checkInviteToken,
  acceptInvite,
  listMembers,
  toggleMemberStatus,
  removeMember,
  checkPortfolioLimit,
  getBusinessPayments,
  getMemberProfileAdmin,
};
