/**
 * emailTemplates.js
 * Tous les templates d'email transactionnels de Portefolia.
 * Chaque fonction retourne { subject, html }.
 *
 * Design commun :
 *   - Table-based layout (compatible tous clients email)
 *   - En-tête vert #2E7D32
 *   - Logo via URL publique Portefolia
 *   - Font Helvetica / Arial (Inter non supporté dans la plupart des clients)
 *   - Footer avec support + mentions légales
 */

const FRONTEND   = process.env.FRONTEND_BASE || 'https://portefolia.tech';
// EMAIL_ASSET_BASE doit pointer vers le domaine public — jamais localhost
const ASSET_BASE = process.env.EMAIL_ASSET_BASE || 'https://portefolia.tech';
const LOGO_URL   = `${ASSET_BASE}/lovable-uploads/logo_portefolia_remove_bg.png`;
const SUPPORT    = 'support@portefolia.tech';
const YEAR       = new Date().getFullYear();

// Durées pour les rappels (optionnel — affiché si montant_mensuel_fcfa fourni)
const DURATIONS = [
  { label: '1 mois',  months: 1,  remise: 0    },
  { label: '3 mois',  months: 3,  remise: 0.15 },
  { label: '1 an',    months: 12, remise: 0.20 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function fmtFcfa(n) {
  return `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
}

// Outer wrapper commun à tous les templates
function wrap({ header, body, accentColor = '#2E7D32', subheader = '' }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>Portefolia</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.09);">

        <!-- ── En-tête ───────────────────────────────────────── -->
        <tr>
          <td style="background:${accentColor};padding:32px 40px 24px;text-align:center;">
            <!--[if !mso]><!-->
            <img src="${LOGO_URL}" alt="Portefolia" width="160" height="auto"
                 style="display:block;margin:0 auto 4px;max-width:160px;width:160px;height:auto;"
                 onerror="this.style.display='none'">
            <!--<![endif]-->
            <!--[if mso]>
            <p style="margin:0 0 8px;font-size:28px;font-weight:900;color:#ffffff;">Portefolia</p>
            <![endif]-->
            ${subheader ? `<p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,.80);">${subheader}</p>` : ''}
          </td>
        </tr>

        <!-- ── Titre section ─────────────────────────────────── -->
        <tr>
          <td style="background:#f8fdf8;border-bottom:1px solid #e8f5e9;padding:18px 40px;text-align:center;">
            <p style="margin:0;font-size:18px;font-weight:700;color:#1b5e20;">${header}</p>
          </td>
        </tr>

        <!-- ── Corps ─────────────────────────────────────────── -->
        <tr>
          <td style="padding:36px 40px;">
            ${body}
          </td>
        </tr>

        <!-- ── Footer ────────────────────────────────────────── -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;">
              Besoin d'aide ?
              <a href="mailto:${SUPPORT}" style="color:#2E7D32;text-decoration:none;font-weight:600;">${SUPPORT}</a>
            </p>
            <p style="margin:0;font-size:11px;color:#cbd5e1;">
              © ${YEAR} Portefolia ·
              <a href="${FRONTEND}/mentions-legales" style="color:#94a3b8;text-decoration:none;">Mentions légales</a>
              ·
              <a href="${FRONTEND}/confidentialite" style="color:#94a3b8;text-decoration:none;">Confidentialité</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// CTA button réutilisable
function ctaButton(label, url, color = '#2E7D32') {
  return `
    <p style="text-align:center;margin:28px 0 12px;">
      <a href="${url}"
         style="display:inline-block;background:${color};color:#ffffff;font-size:15px;
                font-weight:700;padding:14px 40px;border-radius:10px;text-decoration:none;
                letter-spacing:.01em;"
         target="_blank" rel="noopener">
        ${label}
      </a>
    </p>`;
}

// Tableau récapitulatif générique
function recapTable(rows) {
  const cells = rows.map(([label, value, highlight]) => `
    <tr>
      <td style="font-size:13px;color:#64748b;padding:7px 0;border-top:1px solid #e2e8f0;">${label}</td>
      <td align="right" style="font-size:13px;font-weight:700;color:${highlight || '#111827'};padding:7px 0;border-top:1px solid #e2e8f0;">${value}</td>
    </tr>`).join('');

  return `
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:20px 0;">
      <tr><td style="padding:20px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${cells}
        </table>
      </td></tr>
    </table>`;
}

// ─── 1. Confirmation de paiement reçu ────────────────────────────────────────

/**
 * @param {{ prenom, plan_name, montant, duree, reference_wave }} data
 * montant  : nombre en FCFA
 * duree    : string ex. "3 mois" ou nombre de mois
 */
function emailConfirmationPaiement({ prenom, plan_name, montant, duree, reference_wave }) {
  const dureeLabel = typeof duree === 'number'
    ? (duree === 1 ? '1 mois' : duree === 12 ? '1 an' : `${duree} mois`)
    : duree;

  const body = `
    <p style="font-size:16px;color:#111827;margin:0 0 6px;">Bonjour <strong>${prenom}</strong>,</p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">
      Votre paiement de <strong>${fmtFcfa(montant)}</strong> a bien été reçu.
      Notre équipe va vérifier votre référence Wave et activer votre compte
      dans les <strong>24 heures ouvrables</strong> (lundi–samedi, 8h–20h, Dakar).
    </p>

    ${recapTable([
      ['Plan',             plan_name],
      ['Durée',            dureeLabel],
      ['Montant',          fmtFcfa(montant), '#2E7D32'],
      ['Référence Wave',   reference_wave,   '#1d4ed8'],
      ['Date de soumission', fmtDate(new Date())],
    ])}

    <div style="background:#e8f5e9;border-left:4px solid #2E7D32;border-radius:0 8px 8px 0;padding:14px 18px;margin:24px 0;">
      <p style="margin:0;font-size:14px;color:#1b5e20;line-height:1.6;">
        <strong>Prochaine étape :</strong> vous recevrez un second email avec votre
        lien de connexion dès que votre paiement sera validé.
      </p>
    </div>

    ${ctaButton('Contacter le support', `mailto:${SUPPORT}`, '#374151')}

    <p style="font-size:12px;color:#94a3b8;text-align:center;margin:8px 0 0;">
      Conservez votre référence Wave : <strong>${reference_wave}</strong>
    </p>`;

  return {
    subject: '✅ Paiement reçu — Validation en cours | Portefolia',
    html: wrap({
      header: 'Paiement reçu — En attente de validation',
      subheader: 'Nous avons bien reçu votre référence Wave',
      body,
    }),
  };
}

// ─── 2. Accès activé / compte validé ─────────────────────────────────────────

/**
 * @param {{ prenom, plan_name, date_echeance, login_url }} data
 */
function emailAccesValide({ prenom, plan_name, date_echeance, login_url }) {
  const body = `
    <p style="font-size:16px;color:#111827;margin:0 0 6px;">
      Bonjour <strong>${prenom}</strong> 🎉
    </p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">
      Votre compte Portefolia est maintenant <strong>actif</strong> !
      Vous pouvez dès à présent créer et partager votre portfolio professionnel.
    </p>

    ${ctaButton('Accéder à mon dashboard', login_url)}

    ${recapTable([
      ['Plan actif',         plan_name, '#2E7D32'],
      ["Date d'expiration",  fmtDate(date_echeance), '#dc2626'],
    ])}

    <p style="font-size:14px;font-weight:700;color:#111827;margin:28px 0 12px;">
      Pour démarrer en 3 étapes :
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${[
        ['1', 'Connectez-vous à votre dashboard',        'Accédez à votre espace personnel.'],
        ['2', 'Créez votre premier portfolio',           'Choisissez un template et personnalisez votre contenu.'],
        ['3', 'Partagez votre lien unique',              'Envoyez votre portfolio à vos contacts et recruteurs.'],
      ].map(([num, title, desc]) => `
        <tr>
          <td style="width:36px;vertical-align:top;padding:0 12px 16px 0;">
            <div style="width:28px;height:28px;background:#2E7D32;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:800;color:#fff;">${num}</div>
          </td>
          <td style="padding:0 0 16px;">
            <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#111827;">${title}</p>
            <p style="margin:0;font-size:13px;color:#64748b;">${desc}</p>
          </td>
        </tr>`).join('')}
    </table>`;

  return {
    subject: '🎉 Accès activé — Bienvenue sur Portefolia !',
    html: wrap({
      header: 'Votre compte est activé !',
      subheader: `Plan ${plan_name} — actif`,
      body,
    }),
  };
}

// ─── 3. Paiement refusé ───────────────────────────────────────────────────────

/**
 * @param {{ prenom, motif }} data
 */
function emailPaiementRefuse({ prenom, motif }) {
  const paiementUrl = `${FRONTEND}/renouveler`;

  const body = `
    <p style="font-size:16px;color:#111827;margin:0 0 6px;">Bonjour <strong>${prenom}</strong>,</p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">
      Malheureusement, votre paiement Wave n'a pas pu être validé par notre équipe.
    </p>

    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#991b1b;">Motif du refus :</p>
      <p style="margin:0;font-size:14px;color:#7f1d1d;line-height:1.6;">${motif || 'Référence de transaction non trouvée ou montant incorrect.'}</p>
    </div>

    <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 8px;">
      Pour régulariser votre situation, vous pouvez :
    </p>
    <ul style="margin:0 0 24px;padding-left:20px;">
      <li style="font-size:14px;color:#374151;line-height:1.8;">Vérifier la référence de transaction dans l'historique Wave</li>
      <li style="font-size:14px;color:#374151;line-height:1.8;">Vous assurer que le montant exact a bien été envoyé</li>
      <li style="font-size:14px;color:#374151;line-height:1.8;">Soumettre à nouveau avec la bonne référence</li>
    </ul>

    ${ctaButton('Soumettre un nouveau paiement', paiementUrl)}
    ${ctaButton('Contacter le support', `mailto:${SUPPORT}`, '#374151')}

    <p style="font-size:13px;color:#94a3b8;text-align:center;margin:16px 0 0;">
      Notre équipe reste disponible pour vous aider du lundi au samedi, 8h–20h (Dakar).
    </p>`;

  return {
    subject: '⚠️ Paiement non validé — Action requise | Portefolia',
    html: wrap({
      header: 'Votre paiement n\'a pas été validé',
      subheader: 'Une action de votre part est nécessaire',
      accentColor: '#b45309',
      body,
    }),
  };
}

// ─── 4. Rappel d'échéance ─────────────────────────────────────────────────────

/**
 * @param {{ prenom, jours_restants, date_echeance, renouvellement_url, montant_mensuel_fcfa? }} data
 * montant_mensuel_fcfa : optionnel — si fourni, affiche les 3 options tarifaires
 */
function emailRappelEcheance({ prenom, jours_restants, date_echeance, renouvellement_url, montant_mensuel_fcfa = null }) {
  const j = Number(jours_restants);
  const isUrgent = j <= 1;

  const urgencyBlock = isUrgent
    ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;margin:0 0 24px;">
         <p style="margin:0;font-size:15px;font-weight:700;color:#991b1b;">
           ⚠️ ${j === 0 ? "Votre abonnement expire aujourd'hui !" : 'Votre abonnement expire demain !'}
         </p>
       </div>`
    : `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin:0 0 24px;">
         <p style="margin:0;font-size:15px;font-weight:700;color:#92400e;">
           🔔 Il vous reste <strong>${j} jours</strong> avant l'expiration de votre abonnement.
         </p>
       </div>`;

  // Bloc tarifaire (optionnel)
  let pricingBlock = '';
  if (montant_mensuel_fcfa && montant_mensuel_fcfa > 0) {
    const rows = DURATIONS.map(({ label, months, remise }) => {
      const base  = Math.round(montant_mensuel_fcfa * months);
      const final = Math.round(base * (1 - remise));
      const badge = remise > 0 ? ` (−${Math.round(remise * 100)}%)` : '';
      return `
        <tr>
          <td style="font-size:13px;color:#374151;padding:7px 0;border-top:1px solid #e2e8f0;">${label}${badge}</td>
          <td align="right" style="font-size:13px;font-weight:700;color:#2E7D32;padding:7px 0;border-top:1px solid #e2e8f0;">${fmtFcfa(final)}</td>
        </tr>`;
    }).join('');

    pricingBlock = `
      <p style="font-size:14px;font-weight:700;color:#111827;margin:24px 0 8px;">Options de renouvellement :</p>
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
        <tr><td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        </td></tr>
      </table>`;
  }

  const body = `
    <p style="font-size:16px;color:#111827;margin:0 0 16px;">Bonjour <strong>${prenom}</strong>,</p>

    ${urgencyBlock}

    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 4px;">
      Votre abonnement Portefolia arrive à échéance le
      <strong style="color:#dc2626;">${fmtDate(date_echeance)}</strong>.
    </p>
    <p style="font-size:14px;color:#64748b;margin:0 0 24px;">
      Renouvelez maintenant pour ne pas interrompre votre accès à votre portfolio et vos données.
    </p>

    ${pricingBlock}

    ${ctaButton('Renouveler maintenant', renouvellement_url)}

    <p style="font-size:13px;color:#64748b;text-align:center;margin:8px 0 0;">
      Si vous avez déjà renouvelé votre abonnement, ignorez ce message.
    </p>`;

  return {
    subject: `${j === 0 ? "⚠️ Dernier rappel" : `🔔 J-${j}`} — ${j === 0 ? "Votre abonnement expire aujourd'hui" : `${j} jour${j > 1 ? 's' : ''} avant expiration`} | Portefolia`,
    html: wrap({
      header: j <= 1 ? 'Action urgente requise' : `Rappel d'échéance — J-${j}`,
      subheader: `Échéance le ${fmtDate(date_echeance)}`,
      accentColor: j <= 1 ? '#b45309' : '#2E7D32',
      body,
    }),
  };
}

// ─── 5. Compte expiré ─────────────────────────────────────────────────────────

/**
 * @param {{ prenom, renouvellement_url }} data
 */
function emailCompteExpire({ prenom, renouvellement_url }) {
  const body = `
    <p style="font-size:16px;color:#111827;margin:0 0 16px;">Bonjour <strong>${prenom}</strong>,</p>

    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">
      Votre abonnement Portefolia est arrivé à échéance et votre accès au dashboard
      a été temporairement suspendu.
    </p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0;font-size:14px;color:#15803d;line-height:1.6;">
        <strong>Bonne nouvelle :</strong> toutes vos données (portfolios, projets,
        compétences, cartes NFC) sont conservées et resteront accessibles dès la réactivation de votre compte.
      </p>
    </div>

    <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 24px;">
      Renouvelez votre abonnement pour retrouver immédiatement l'accès à votre espace
      et continuer à partager votre portfolio professionnel.
    </p>

    ${ctaButton('Réactiver mon compte', renouvellement_url)}

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 20px;">

    <p style="font-size:13px;color:#64748b;line-height:1.7;margin:0;">
      Des questions sur votre compte ou votre abonnement ?
      Écrivez-nous à
      <a href="mailto:${SUPPORT}" style="color:#2E7D32;text-decoration:none;font-weight:600;">${SUPPORT}</a>
      — notre équipe vous répondra sous 24h.
    </p>`;

  return {
    subject: '🔒 Votre accès Portefolia a expiré',
    html: wrap({
      header: 'Votre accès est temporairement suspendu',
      subheader: 'Réactivez votre compte en quelques clics',
      accentColor: '#374151',
      body,
    }),
  };
}

// ─── 6. Email de bienvenue + vérification ────────────────────────────────────

/**
 * @param {{ prenom, verify_url, plan_type }} data
 * plan_type : 'free' | 'paid'
 */
function emailBienvenueVerification({ prenom, verify_url, plan_type = 'free' }) {
  const isFree = plan_type === 'free';

  const ctaLabel = isFree
    ? 'Vérifier mon email et accéder au dashboard'
    : 'Vérifier mon adresse email';

  const nextStep = isFree
    ? `<div style="background:#e8f5e9;border-left:4px solid #2E7D32;border-radius:0 8px 8px 0;padding:14px 18px;margin:24px 0 0;">
         <p style="margin:0;font-size:14px;color:#1b5e20;line-height:1.6;">
           <strong>Ce que ce lien fait :</strong> il vérifie votre email et vous connecte directement à votre dashboard.
           Il est valable <strong>24 heures</strong> et à usage unique.
         </p>
       </div>`
    : `<div style="background:#fffbeb;border-left:4px solid #d97706;border-radius:0 8px 8px 0;padding:14px 18px;margin:24px 0 0;">
         <p style="margin:0;font-size:14px;color:#92400e;line-height:1.6;">
           <strong>Ce que ce lien fait :</strong> il confirme votre adresse email uniquement.
           Votre accès au dashboard sera activé dès que notre équipe aura validé votre paiement.
         </p>
       </div>`;

  const body = `
    <p style="font-size:16px;color:#111827;margin:0 0 6px;">
      Bonjour <strong>${prenom}</strong> 👋
    </p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">
      Bienvenue sur <strong>Portefolia</strong> ! Votre compte a bien été créé.
      Pour finaliser votre inscription, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous.
    </p>

    ${ctaButton(ctaLabel, verify_url)}

    ${nextStep}

    <p style="font-size:13px;color:#94a3b8;text-align:center;margin:20px 0 0;">
      Si vous n'avez pas créé de compte sur Portefolia, ignorez cet email.
    </p>`;

  return {
    subject: '👋 Bienvenue sur Portefolia — Vérifiez votre email',
    html: wrap({
      header: 'Confirmez votre adresse email',
      subheader: 'Dernière étape avant d\'accéder à votre espace',
      body,
    }),
  };
}

// ─── 7. Notification comptabilité — paiement validé ─────────────────────────

/**
 * @param {{ client_prenom, client_nom, client_email, plan_name, montant, duree_mois, reference_wave, date_validation, login_url }} data
 */
function emailComptabiliteValidation({ client_prenom, client_nom, client_email, plan_name, montant, duree_mois, reference_wave, date_validation, login_url }) {
  const dureeLabel = duree_mois === 1 ? '1 mois' : duree_mois === 12 ? '1 an' : `${duree_mois} mois`;
  const adminUrl   = `${FRONTEND}/admin/sama_connection_page`;

  const body = `
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">
      Un paiement Wave a été <strong style="color:#2E7D32;">validé</strong> par l'équipe admin.
      Le client a reçu son lien d'accès par email.
    </p>

    ${recapTable([
      ['Client',          `${client_prenom} ${client_nom}`],
      ['Email client',    client_email, '#1d4ed8'],
      ['Plan souscrit',   plan_name, '#2E7D32'],
      ['Durée',           dureeLabel],
      ['Montant perçu',   fmtFcfa(montant), '#2E7D32'],
      ['Référence Wave',  reference_wave, '#1d4ed8'],
      ['Date validation', fmtDate(date_validation)],
    ])}

    <div style="background:#f0fdf4;border-left:4px solid #2E7D32;border-radius:0 8px 8px 0;padding:14px 18px;margin:24px 0;">
      <p style="margin:0;font-size:13px;color:#1b5e20;line-height:1.6;">
        <strong>Lien d'accès envoyé au client :</strong><br>
        <a href="${login_url}" style="color:#1d4ed8;word-break:break-all;">${login_url}</a>
      </p>
    </div>

    ${ctaButton('Accéder au panel admin', adminUrl, '#1e293b')}

    <p style="font-size:12px;color:#94a3b8;text-align:center;margin:8px 0 0;">
      Ce mail est généré automatiquement à chaque validation de paiement.
    </p>`;

  return {
    subject: `✅ Paiement validé — ${client_prenom} ${client_nom} · ${plan_name} · ${fmtFcfa(montant)}`,
    html: wrap({
      header: 'Paiement Wave validé',
      subheader: `Notification comptabilité — ${fmtDate(date_validation)}`,
      body,
    }),
  };
}

// ─── Paiement commande NFC validé ─────────────────────────────────────────────
function emailPaiementCommandeValide({ prenom = '', numero_commande, montant, paiement_mode }) {
  const modeLabel = paiement_mode === 'wave' ? 'Wave' : paiement_mode === 'orange_money' ? 'Orange Money' : paiement_mode || 'Mobile Money';
  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">Bonjour <strong>${prenom}</strong>,</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      Bonne nouvelle ! Votre paiement pour la commande
      <strong style="color:#1b5e20;">#${numero_commande}</strong> a été <strong>validé</strong> par notre équipe.
    </p>
    <table cellpadding="0" cellspacing="0" width="100%" style="background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;margin:0 0 28px;padding:20px 24px;">
      <tr>
        <td style="font-size:13px;color:#166534;padding:4px 0;"><strong>N° commande :</strong></td>
        <td style="font-size:13px;color:#166534;padding:4px 0;text-align:right;font-family:monospace;">#${numero_commande}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#166534;padding:4px 0;"><strong>Montant :</strong></td>
        <td style="font-size:13px;color:#166534;padding:4px 0;text-align:right;">${fmtFcfa(montant)}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#166534;padding:4px 0;"><strong>Mode :</strong></td>
        <td style="font-size:13px;color:#166534;padding:4px 0;text-align:right;">${modeLabel}</td>
      </tr>
    </table>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      Votre carte NFC est maintenant en cours de <strong>préparation et gravure</strong>. Vous serez notifié dès qu'elle sera expédiée.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td style="background:#2E7D32;border-radius:10px;padding:14px 32px;text-align:center;">
          <a href="${FRONTEND}/dashboard/nfc-cards" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Suivre ma commande</a>
        </td>
      </tr>
    </table>
  `;
  return {
    subject: `✅ Paiement validé — Commande #${numero_commande}`,
    html: wrap({ header: 'Paiement confirmé 🎉', subheader: 'Votre carte NFC est en préparation', body }),
  };
}

// ─── Commande NFC livrée ───────────────────────────────────────────────────────
function emailCommandeLivree({ prenom = '', numero_commande, montant }) {
  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">Bonjour <strong>${prenom}</strong>,</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      Votre carte NFC Portefolia (commande <strong style="color:#1b5e20;">#${numero_commande}</strong>)
      a été <strong>livrée</strong> avec succès. Elle est maintenant prête à être activée !
    </p>
    <table cellpadding="0" cellspacing="0" width="100%" style="background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;margin:0 0 28px;padding:20px 24px;">
      <tr>
        <td style="font-size:13px;color:#166534;padding:4px 0;"><strong>N° commande :</strong></td>
        <td style="font-size:13px;color:#166534;padding:4px 0;text-align:right;font-family:monospace;">#${numero_commande}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#166534;padding:4px 0;"><strong>Montant réglé :</strong></td>
        <td style="font-size:13px;color:#166534;padding:4px 0;text-align:right;">${fmtFcfa(montant)}</td>
      </tr>
    </table>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      Connectez-vous à votre espace pour <strong>activer votre carte</strong> et commencer à partager votre portfolio d'un simple geste NFC.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td style="background:#2E7D32;border-radius:10px;padding:14px 32px;text-align:center;">
          <a href="${FRONTEND}/dashboard/nfc-cards" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Activer ma carte NFC</a>
        </td>
      </tr>
    </table>
  `;
  return {
    subject: `📦 Carte NFC livrée — Commande #${numero_commande}`,
    html: wrap({ header: 'Votre carte NFC est arrivée !', subheader: 'Activez-la dès maintenant', body }),
  };
}

// ─── Reset mot de passe ──────────────────────────────────────────────────────

function emailResetMotDePasse({ prenom, reset_url }) {
  const body = `
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px">
      Bonjour <strong>${prenom || 'utilisateur'}</strong>,
    </p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px">
      Vous avez demandé à réinitialiser votre mot de passe sur <strong>Portefolia</strong>.<br>
      Cliquez sur le bouton ci-dessous pour vous connecter directement et choisir un nouveau mot de passe dans votre profil.
    </p>

    <div style="background:#E8F5E9;border:1px solid #A5D6A7;border-radius:10px;padding:16px 20px;margin:0 0 24px">
      <p style="font-size:13px;color:#2E7D32;font-weight:700;margin:0 0 4px">⚠️ Lien valable 1 heure</p>
      <p style="font-size:12px;color:#4CAF50;margin:0">Ce lien de connexion est à usage unique et expire dans 60 minutes.</p>
    </div>

    <div style="text-align:center;margin:28px 0">
      <a href="${reset_url}"
        style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#2E7D32,#1BC29A);color:#fff;
               font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;letter-spacing:-.2px">
        Me connecter &amp; changer mon mot de passe →
      </a>
    </div>

    <p style="font-size:12px;color:#9ca3af;line-height:1.6;margin:16px 0 0">
      Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
      Votre mot de passe ne sera pas modifié tant que vous n'avez pas cliqué sur le lien.
    </p>
    <p style="font-size:12px;color:#9ca3af;margin:8px 0 0">
      Problème ? Contactez-nous : <a href="mailto:${SUPPORT}" style="color:#2E7D32">${SUPPORT}</a>
    </p>`;
  return {
    subject: '🔐 Réinitialisation de votre mot de passe — Portefolia',
    html: wrap({ header: 'Réinitialisation du mot de passe', subheader: 'Lien de connexion sécurisé', body }),
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  emailConfirmationPaiement,
  emailAccesValide,
  emailPaiementRefuse,
  emailRappelEcheance,
  emailCompteExpire,
  emailComptabiliteValidation,
  emailBienvenueVerification,
  emailPaiementCommandeValide,
  emailCommandeLivree,
  emailResetMotDePasse,
};
