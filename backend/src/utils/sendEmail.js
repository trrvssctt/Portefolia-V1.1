const nodemailer = require('nodemailer');

/**
 * sendEmail — supports two calling conventions:
 *   Object:     sendEmail({ to, subject, html, text?, attachments? })
 *   Positional: sendEmail(to, subject, htmlBody, opts?)
 */
module.exports = async function sendEmail(toOrOpts, subject, body, opts = {}) {
  // Normalise arguments
  let to, html, text, attachments, fromOverride;
  if (toOrOpts && typeof toOrOpts === 'object' && !Array.isArray(toOrOpts) && toOrOpts.to) {
    to           = toOrOpts.to;
    subject      = toOrOpts.subject || subject;
    html         = toOrOpts.html    || toOrOpts.body || body;
    text         = toOrOpts.text;
    attachments  = toOrOpts.attachments;
    fromOverride = toOrOpts.from || null;
  } else {
    to           = toOrOpts;
    html         = body;
    text         = opts.text;
    attachments  = opts.attachments;
    fromOverride = opts.from || null;
  }

  const hasSmtp = !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS;
  const provider = process.env.EMAIL_PROVIDER || (hasSmtp ? 'smtp' : 'console');

  if (provider === 'console') {
    console.log('--- sendEmail (console) ---');
    console.log('to:', to);
    console.log('subject:', subject);
    console.log('body:', (html || '').slice(0, 200));
    console.log('---------------------------');
    return;
  }

  if (provider === 'smtp') {
    const host    = process.env.SMTP_HOST;
    const port    = Number(process.env.SMTP_PORT || 587);
    const user    = process.env.SMTP_USER;
    const pass    = process.env.SMTP_PASS;
    const from    = fromOverride || process.env.EMAIL_FROM || user || 'no-reply@portefolia.tech';
    const secure  = process.env.SMTP_SECURE === 'true' || port === 465;

    if (!host || !user || !pass) {
      throw new Error('sendEmail: SMTP configuration missing (SMTP_HOST / SMTP_USER / SMTP_PASS)');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      // LWS / cPanel servers sometimes need this
      tls: { rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false' },
    });

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text:        text        || undefined,
      attachments: attachments || undefined,
    });

    console.log('sendEmail: sent', { messageId: info.messageId, to, subject });
    return info;
  }

  throw new Error('sendEmail: unknown provider');
};

/**
 * sendTemplateEmail — envoie un email en utilisant un template de emailTemplates.js
 *
 * @param {string}   to         Adresse email du destinataire
 * @param {Function} templateFn Fonction template depuis emailTemplates.js (ex. emailAccesValide)
 * @param {object}   data       Données passées à la fonction template
 * @returns {Promise}
 *
 * Exemple :
 *   const { emailAccesValide } = require('./emailTemplates');
 *   await sendTemplateEmail('user@example.com', emailAccesValide, { prenom: 'Dianka', ... });
 */
module.exports.sendTemplateEmail = async function sendTemplateEmail(to, templateFn, data) {
  if (typeof templateFn !== 'function') {
    throw new TypeError('sendTemplateEmail: templateFn doit être une fonction de emailTemplates.js');
  }
  const { subject, html } = templateFn(data);
  return module.exports(to, subject, html);
};
