# Précommandes NFC Portefolia — Spécification d'implémentation (pour Claude Code)

> Ce document décrit **tout** ce qu'il faut coder côté backend (Node.js / Express / MySQL) et frontend (React 18 / TypeScript / Vite) pour passer de la simple liste d'attente NFC à de **vraies précommandes payées par Wave**, avec les notifications gérées par **n8n**.
> Les deux workflows n8n sont déjà prêts (`n8n/WF1_precommandes_evenements.json`, `n8n/WF2_precommandes_rappels.json`). Ton travail : construire le backend et le frontend qui respectent **exactement** les contrats décrits en section 5 et 6.

---

## 0. Règles de travail

1. **Lis d'abord le code existant** avant d'écrire quoi que ce soit, et adopte ses conventions (structure des dossiers, style des contrôleurs, accès MySQL, middlewares d'auth/RBAC, validation, gestion d'erreurs, composants UI) :
   - `nfcRoutes.js` (liste d'attente, `POST /api/nfc/waitlist`, email d'inscription ligne ~11)
   - `adminRoutes.js` (envoi groupé ligne ~249, `admin_action_logs`)
   - `adminController.js` (validation de paiement des commandes ~1184, livraison ~1150)
   - `sendEmail.js`
   - le système de commandes `/api/commandes` et sa table
   - `NFCCardTypes.tsx` (page `/nfc-types`) et `NfcWaitlistPage.tsx` (`/admin/nfc-waitlist`)
2. **Ne casse pas la liste d'attente** ni le système de commandes existant. Tout est additif.
3. Les e-mails des précommandes sont envoyés **par n8n**, pas par `sendEmail.js`. Le backend se contente d'**émettre des événements**.
4. Travaille par étapes (section 11), un commit par étape, et lance les tests à chaque étape.
5. Si un point de ce document contredit le code existant (nom de table, type d'id, middleware…), **adapte-toi au code existant** et note l'écart dans le résumé final.

---

## 1. Flux et machine à états

```
Client (site)                Backend Portefolia                       n8n
─────────────                ──────────────────                       ───
Formulaire précommande ──►  POST /api/nfc/preorders
                            status = pending_payment
                            outbox: preorder.created  ───────────►  WF1 : e-mail client (récap + instructions Wave)
                                                                         + alerte admin
Paie avec Wave, puis
déclare la transaction ──►  POST /api/nfc/preorders/:ref/payment
                            status = payment_submitted
                            outbox: preorder.payment_submitted ──►  WF1 : accusé client + « paiement à valider » admin
Admin vérifie dans Wave
Business et valide     ──►  PATCH /api/admin/nfc-preorders/:id/validate
                            status = paid
                            outbox: preorder.paid  ──────────────►  WF1 : confirmation client
                                                                         (+ alerte admin si seuil du lot atteint)
         … ou refuse   ──►  PATCH …/:id/reject → status = rejected → preorder.rejected → WF1 : e-mail client

                            ◄── toutes les 2 h ──────────────────  WF2 : POST /internal/…/expire-stale
                                                                         GET  /internal/…/reminders-due
                                                                         → rappels client J+1 / J+2
                                                                         → digest admin des paiements à valider
                            ◄── après chaque envoi ──────────────  POST /internal/nfc/notifications (journal)
```

**Statuts** (`nfc_preorders.status`) et transitions autorisées — à faire respecter dans un seul service :

| De | Vers | Déclencheur | Événement émis |
|---|---|---|---|
| — | `pending_payment` | client crée la précommande | `preorder.created` |
| `pending_payment`, `rejected` | `payment_submitted` | client déclare sa transaction Wave | `preorder.payment_submitted` |
| `payment_submitted` | `paid` | admin valide | `preorder.paid` |
| `payment_submitted` | `rejected` | admin refuse (motif obligatoire) | `preorder.rejected` |
| `pending_payment` | `expired` | n8n appelle `expire-stale` (72 h sans paiement et 2 rappels envoyés) | `preorder.expired` |
| tout sauf `paid`, `converted` | `cancelled` | admin annule | `preorder.cancelled` |
| `paid` | `converted` | admin convertit en commande | aucun (voir §8) |

Toute autre transition → `409 Conflict` avec un message clair.

---

## 2. Variables d'environnement (backend)

À ajouter dans `.env` et `.env.example` :

```env
# Précommandes NFC
NFC_PREORDER_UNIT_PRICE=30000          # F CFA — ne plus jamais écrire le prix en dur
NFC_PREORDER_MAX_QUANTITY=10
NFC_PREORDER_BATCH_THRESHOLD=10        # nb de précommandes payées pour lancer un lot de fabrication
NFC_PREORDER_EXPIRY_HOURS=72

# Wave (paiement manuel)
WAVE_MERCHANT_NUMBER="+221 7X XXX XX XX"
WAVE_PAYMENT_LINK=                      # lien marchand Wave Business, optionnel (voir §4.6)

# n8n
N8N_PREORDER_WEBHOOK_URL=https://<n8n>/webhook/portefolia-nfc-preorder
N8N_WEBHOOK_KEY=<secret long aléatoire>   # envoyé dans l'en-tête X-Portefolia-Key
INTERNAL_API_KEY=<autre secret long>      # exigé par n8n quand il appelle /api/internal/*

FRONTEND_URL=https://portefolia.tech      # réutiliser la variable existante si elle existe déjà
```

Générer les secrets avec `openssl rand -hex 32`. Les deux secrets doivent être **différents**.

---

## 3. Base de données

Exécuter `sql/2026_10_07_nfc_preorders.sql` en l'intégrant au mécanisme de migration du projet. Trois tables :

- `nfc_preorders` — la précommande elle-même.
- `nfc_preorder_events` — **outbox** des événements à envoyer à n8n (permet le renvoi si n8n est injoignable).
- `nfc_preorder_notifications` — journal de chaque e-mail réellement envoyé (rempli par n8n). Corrige le défaut « pas de suivi des envois ».

Points d'attention :
- vérifier le type de `users.id` et de `commandes.id` et ajuster `user_id` / `commande_id` ;
- `reference` est calculée après l'INSERT : `PF-NFC-` + id sur 4 chiffres (`PF-NFC-0007`) puis `UPDATE`, dans la **même transaction** ;
- `public_token` = `crypto.randomBytes(32).toString('hex')`.

---

## 4. Backend

### 4.1 Fichiers à créer (adapter aux dossiers existants)

```
config/nfcPreorder.js            # lit les variables d'env, valeurs par défaut, export unique
services/nfcPreorderService.js   # logique métier + transitions de statut (point d'entrée unique)
services/n8nNotifier.js          # outbox : enregistrement + envoi + renvoi des événements
serializers/nfcPreorder.js       # buildPreorderPayload(preorder) — format unique pour n8n
middlewares/internalAuth.js      # vérifie X-Internal-Key
routes/nfcPreorderRoutes.js      # routes publiques
routes/adminNfcPreorderRoutes.js # routes admin (ou ajout dans adminRoutes.js selon la convention)
routes/internalRoutes.js         # routes appelées par n8n
```

### 4.2 Service métier — `nfcPreorderService.js`

Fonctions (toutes transactionnelles quand elles écrivent) :

- `createPreorder(input, { userId, ip })` → insère, calcule `reference`, émet `preorder.created`, retourne `{ preorder, token }`.
- `submitPayment(reference, token, { wave_transaction_id, wave_sender_phone })` → vérifie le jeton (comparaison à temps constant), le statut (`pending_payment` ou `rejected`), l'unicité de l'ID de transaction (sinon 409 « Cette transaction a déjà été utilisée »), passe en `payment_submitted`, `payment_submitted_at = NOW()`, vide `rejection_reason`, émet l'événement.
- `validatePayment(id, adminId)` → `paid`, `paid_at`, `validated_by`, émet `preorder.paid`, log dans `admin_action_logs`.
- `rejectPayment(id, adminId, reason)` → `rejected`, `rejection_reason`, émet, log.
- `cancelPreorder(id, adminId, reason?)` → `cancelled`, émet, log.
- `expireStale()` → sélectionne les `pending_payment` avec `created_at <= NOW() - INTERVAL NFC_PREORDER_EXPIRY_HOURS HOUR` **et** `client_reminder_count >= 2`, passe chacune en `expired` et émet `preorder.expired`. Retourne `{ expired: n }`.
- `getRemindersDue()` → voir §6.2.
- `recordNotification(body)` → voir §6.3.
- `convertToCommande(id, adminId)` → voir §8.
- `getStats()` → `{ paid_count, batch_threshold, by_status: {...} }` (`paid_count` = statuts `paid` + `converted`).

Une fonction interne `transition(preorder, toStatus)` contrôle la table de la §1 et lève une erreur 409 sinon. Utiliser `SELECT … FOR UPDATE` pour éviter les doubles validations.

### 4.3 Outbox et envoi à n8n — `n8nNotifier.js`

```js
// Pseudo-code de référence
async function emit(conn, preorderId, event) {
  const preorder = await loadPreorder(conn, preorderId);
  const payload = { event_id: uuidv4(), event, occurred_at: new Date().toISOString(), ...buildPreorderPayload(preorder, stats) };
  await conn.query('INSERT INTO nfc_preorder_events (id, preorder_id, event, payload) VALUES (?,?,?,?)',
                   [payload.event_id, preorderId, event, JSON.stringify(payload)]);
  // l'envoi HTTP se fait APRÈS le commit (setImmediate / après la transaction), jamais dans la transaction
}

async function deliver(eventRow) {
  // POST N8N_PREORDER_WEBHOOK_URL, header X-Portefolia-Key, JSON, timeout 5 s
  // succès (2xx) → delivered_at = NOW() ; échec → attempts+1, last_error
}

// Au démarrage du serveur : setInterval(retryPending, 5 * 60 * 1000)
// retryPending : événements delivered_at IS NULL AND attempts < 5, du plus ancien au plus récent
```

Règles :
- l'échec de n8n **ne doit jamais** faire échouer la requête du client ou de l'admin ;
- si `N8N_PREORDER_WEBHOOK_URL` est vide (dev), logguer le payload dans la console et marquer `last_error = 'n8n non configuré'` ;
- utiliser `fetch` natif (Node 18+) ou `axios` si déjà présent ;
- `stats` est calculé **après** le changement de statut (pour que `paid_count` atteigne bien le seuil sur l'événement `preorder.paid`).

### 4.4 Payload commun — `buildPreorderPayload(preorder, stats)`

Utilisé à la fois pour le webhook (§5) et pour `reminders-due` (§6.2). Ne jamais y mettre `public_token` en clair ailleurs que dans `links.tracking_url`.

```js
{
  preorder: {
    id, reference, full_name, first_name /* premier mot de full_name */, card_name,
    email, phone, city, quantity, unit_price, total_amount, currency, status,
    wave_transaction_id, wave_sender_phone, rejection_reason,
    client_reminder_count, payment_submitted_at, paid_at, created_at   // ISO 8601
  },
  payment: { method: 'wave', wave_number: WAVE_MERCHANT_NUMBER, wave_link: buildWaveLink(total_amount) /* ou null */ },
  stats:   { paid_count, batch_threshold },
  links: {
    tracking_url:   `${FRONTEND_URL}/nfc/precommande/${reference}?t=${public_token}`,
    admin_url:      `${FRONTEND_URL}/admin/nfc-preorders?ref=${reference}`,
    admin_list_url: `${FRONTEND_URL}/admin/nfc-preorders`,
    portfolio_url:  `${FRONTEND_URL}/dashboard`,      // adapter à la vraie route d'édition du portfolio
    preorder_url:   `${FRONTEND_URL}/nfc-types#precommande`
  }
}
```

### 4.5 Validation des entrées (création)

| Champ | Règle |
|---|---|
| `full_name` | 2–120 caractères, trim |
| `card_name` | 2–80 caractères, trim (défaut : `full_name`) |
| `email` | email valide, mis en minuscules |
| `phone` | normaliser : retirer espaces/points/tirets ; accepter `7XXXXXXXX`, `2217XXXXXXXX`, `+2217XXXXXXXX` → stocker `+2217XXXXXXXX`. Regex finale `^\+2217[05678]\d{7}$`. Prévoir un message clair. (Autoriser d'autres indicatifs plus tard via config.) |
| `quantity` | entier 1…`NFC_PREORDER_MAX_QUANTITY` |
| `city`, `notes` | optionnels, longueur max |
| `website` | **honeypot** : s'il est rempli, répondre 201 factice sans rien enregistrer |

Le **prix vient toujours du serveur** (`NFC_PREORDER_UNIT_PRICE`), jamais du client. `total_amount = unit_price × quantity`.

Anti-abus : `express-rate-limit` (ou l'équivalent déjà utilisé) — 5 créations / 15 min / IP, 10 déclarations de paiement / 15 min / IP. Refuser une nouvelle précommande si le même email a déjà une précommande `pending_payment` de moins de 72 h → 409 avec la référence existante et un message « Vous avez déjà une précommande en attente de paiement ».

Validation de `wave_transaction_id` : trim, majuscules, 6–64 caractères `[A-Z0-9_-]`.

### 4.6 Lien de paiement Wave

`buildWaveLink(amount)` : si `WAVE_PAYMENT_LINK` est défini, renvoyer ce lien en ajoutant `amount=<montant>` en paramètre de requête **seulement si** le lien marchand le supporte (rendre ce comportement configurable : `WAVE_LINK_SUPPORTS_AMOUNT=true|false`). Sinon renvoyer `null` : les e-mails afficheront alors uniquement le numéro Wave et le montant à envoyer.

> Phase 2 (hors périmètre) : l'API Checkout de Wave Business permettrait une validation automatique par webhook. Prévoir le service pour qu'un futur `confirmPaymentFromWave()` puisse appeler `validatePayment()` sans réécriture.

### 4.7 Routes publiques — `/api/nfc/preorders`

| Méthode | Route | Corps / Query | Réponse |
|---|---|---|---|
| `GET` | `/api/nfc/preorders/config` | — | `{ unit_price, currency, max_quantity, wave_number, wave_link_available }` (le front n'écrit plus le prix en dur) |
| `POST` | `/api/nfc/preorders` | `{ full_name, card_name, email, phone, city?, quantity, notes?, website? }` | `201 { reference, token, status, total_amount, currency, payment: {wave_number, wave_link}, tracking_url }` |
| `GET` | `/api/nfc/preorders/:reference?t=<token>` | — | `200 { reference, status, full_name, card_name, quantity, total_amount, wave_transaction_id, rejection_reason, created_at, payment }` — `404` si référence/jeton invalides (même message dans les deux cas) |
| `POST` | `/api/nfc/preorders/:reference/payment` | `{ token, wave_transaction_id, wave_sender_phone? }` | `200 { status: 'payment_submitted' }` |

Si l'utilisateur est connecté (middleware d'auth optionnel), renseigner `user_id`.

### 4.8 Routes admin — `/api/admin/nfc-preorders`

Protégées par le middleware admin/RBAC existant. Chaque action écrit dans `admin_action_logs`.

| Méthode | Route | Rôle |
|---|---|---|
| `GET` | `/api/admin/nfc-preorders?status=&q=&page=&limit=` | liste paginée, recherche sur référence / nom / email / téléphone / transaction |
| `GET` | `/api/admin/nfc-preorders/stats` | `getStats()` |
| `GET` | `/api/admin/nfc-preorders/:id` | détail + historique (`nfc_preorder_events` + `nfc_preorder_notifications`) |
| `PATCH` | `/api/admin/nfc-preorders/:id/validate` | → `paid` |
| `PATCH` | `/api/admin/nfc-preorders/:id/reject` | `{ reason }` obligatoire → `rejected` |
| `PATCH` | `/api/admin/nfc-preorders/:id/cancel` | `{ reason? }` → `cancelled` |
| `POST` | `/api/admin/nfc-preorders/:id/convert` | → crée la commande, statut `converted` (§8) |
| `POST` | `/api/admin/nfc-preorders/:id/resend` | renvoie à n8n le **dernier** événement de la précommande (nouvel `event_id`) |
| `GET` | `/api/admin/nfc-preorders/export.csv` | export CSV (mêmes filtres que la liste) |

### 4.9 Middleware `internalAuth.js`

```js
const crypto = require('crypto');
module.exports = (req, res, next) => {
  const expected = process.env.INTERNAL_API_KEY || '';
  const given = req.get('X-Internal-Key') || '';
  const ok = expected.length > 0 && given.length === expected.length &&
             crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  return ok ? next() : res.status(401).json({ error: 'unauthorized' });
};
```

Monter les routes internes sous `/api/internal` **avec** ce middleware, sans session ni CSRF. Les exclure des logs d'accès verbeux si besoin.

---

## 5. Contrat du webhook Backend → n8n (WF1)

`POST {N8N_PREORDER_WEBHOOK_URL}`
En-têtes : `Content-Type: application/json`, `X-Portefolia-Key: {N8N_WEBHOOK_KEY}`

```json
{
  "event_id": "5f1d2c3e-8a7b-4c1d-9e2f-0a1b2c3d4e5f",
  "event": "preorder.created",
  "occurred_at": "2026-10-07T10:15:00.000Z",
  "preorder": {
    "id": 7,
    "reference": "PF-NFC-0007",
    "full_name": "Awa Diop",
    "first_name": "Awa",
    "card_name": "AWA DIOP",
    "email": "awa@example.sn",
    "phone": "+221771234567",
    "city": "Dakar",
    "quantity": 1,
    "unit_price": 30000,
    "total_amount": 30000,
    "currency": "XOF",
    "status": "pending_payment",
    "wave_transaction_id": null,
    "wave_sender_phone": null,
    "rejection_reason": null,
    "client_reminder_count": 0,
    "payment_submitted_at": null,
    "paid_at": null,
    "created_at": "2026-10-07T10:15:00.000Z"
  },
  "payment": { "method": "wave", "wave_number": "+221 7X XXX XX XX", "wave_link": null },
  "stats": { "paid_count": 3, "batch_threshold": 10 },
  "links": {
    "tracking_url": "https://portefolia.tech/nfc/precommande/PF-NFC-0007?t=…",
    "admin_url": "https://portefolia.tech/admin/nfc-preorders?ref=PF-NFC-0007",
    "admin_list_url": "https://portefolia.tech/admin/nfc-preorders",
    "portfolio_url": "https://portefolia.tech/dashboard",
    "preorder_url": "https://portefolia.tech/nfc-types#precommande"
  }
}
```

Valeurs possibles de `event` : `preorder.created`, `preorder.payment_submitted`, `preorder.paid`, `preorder.rejected`, `preorder.expired`, `preorder.cancelled`.
n8n répond immédiatement `200 { "received": true, "event_id": "…" }` puis envoie les e-mails.

---

## 6. Routes internes appelées par n8n (WF1 et WF2)

Toutes exigent l'en-tête `X-Internal-Key: {INTERNAL_API_KEY}`.

### 6.1 `POST /api/internal/nfc/preorders/expire-stale`
Corps vide. Appelle `expireStale()`. Réponse : `200 { "expired": 2 }`.

### 6.2 `GET /api/internal/nfc/preorders/reminders-due`

```json
{
  "client_payment_reminders": [ { "preorder": {…}, "payment": {…}, "links": {…} } ],
  "admin_validation_pending": [ { "preorder": {…}, "payment": {…}, "links": {…} } ],
  "admin_list_url": "https://portefolia.tech/admin/nfc-preorders"
}
```

Chaque élément = `buildPreorderPayload()` (sans `stats`). Règles de sélection (requête **sans effet de bord**) :

- **Rappels client** : `status = 'pending_payment'` ET `client_reminder_count < 2` ET `created_at <= NOW() - INTERVAL (24 * (client_reminder_count + 1)) HOUR` ET (`last_client_reminder_at IS NULL` OU `last_client_reminder_at <= NOW() - INTERVAL 20 HOUR`). → rappel 1 à J+1, rappel 2 (« dernier rappel ») à J+2, expiration à J+3.
- **Digest admin** : `status = 'payment_submitted'` ET `payment_submitted_at <= NOW() - INTERVAL 2 HOUR` ET (`last_admin_reminder_at IS NULL` OU `last_admin_reminder_at <= NOW() - INTERVAL 4 HOUR`).

Limiter chaque liste à 100 éléments, triés du plus ancien au plus récent.

### 6.3 `POST /api/internal/nfc/notifications`

```json
{
  "event_id": "5f1d…",            
  "preorder_ids": [7],
  "channel": "email",
  "audience": "client",
  "template": "preorder.created",
  "recipient": "awa@example.sn",
  "status": "sent",
  "error": null
}
```

- `event_id` peut être `null` (cas des rappels).
- Insérer **une ligne par `preorder_id`** dans `nfc_preorder_notifications`.
- Si `status = 'sent'` :
  - `template` commence par `reminder.client_payment` → `client_reminder_count = client_reminder_count + 1`, `last_client_reminder_at = NOW()` ;
  - `template = 'reminder.admin_validation'` → `last_admin_reminder_at = NOW()` pour tous les ids.
- Valider le corps (ids entiers, enums), répondre `201 { "ok": true }`. Ignorer silencieusement les ids inexistants.

---

## 7. Frontend

### 7.1 Formulaire de précommande — page `/nfc-types` (ancre `#precommande`)

- Charger le prix via `GET /api/nfc/preorders/config` (supprimer tout prix écrit en dur).
- Champs : nom complet, nom à imprimer sur la carte (pré-rempli avec le nom complet), email, téléphone WhatsApp (placeholder `77 123 45 67`), ville (optionnel), quantité (sélecteur 1…max), champ honeypot `website` caché (CSS, `tabIndex=-1`, `autoComplete="off"`).
- Total calculé en direct (`quantité × prix`, format `30 000 F CFA`).
- Pré-remplir nom/email si l'utilisateur est connecté.
- Bouton désactivé pendant l'envoi. **Afficher le succès uniquement sur une réponse 2xx** ; afficher le message d'erreur du serveur sinon (409, 422, 429, 500, réseau).
- Après succès : rediriger vers `tracking_url` (page §7.2).
- Garder la liste d'attente accessible tant que l'admin le souhaite (bloc secondaire « Pas encore prêt ? Laissez-nous votre email »).

### 7.2 Page de suivi publique — `/nfc/precommande/:reference?t=<token>`

- Appelle `GET /api/nfc/preorders/:reference?t=…`.
- Affiche : référence, récapitulatif, statut sous forme de frise (Précommande reçue → Paiement déclaré → Paiement confirmé → En fabrication/Livrée).
- Si statut `pending_payment` ou `rejected` : bloc d'instructions Wave (numéro, montant, référence à mettre en note, bouton « Payer avec Wave » si `wave_link`), bouton copier pour le numéro et la référence, puis formulaire « J'ai payé » : ID de transaction Wave (+ numéro Wave utilisé, optionnel) → `POST …/payment`.
- Si `rejected` : afficher le motif.
- Si `payment_submitted` : « Vérification en cours, confirmation sous 24 h ouvrées ».
- Si `paid` / `converted` : confirmation + CTA « Préparer mon portfolio ».
- Si `expired` / `cancelled` : message + lien pour refaire une précommande.
- Responsive mobile en priorité (la plupart des clients viendront de WhatsApp sur téléphone).

### 7.3 Admin — `/admin/nfc-preorders`

S'inspirer de `NfcWaitlistPage.tsx` et de la page `/admin/commandes` pour garder la cohérence visuelle.

- En-tête : compteur **« X / 10 précommandes payées »** (barre de progression vers `batch_threshold`), compteurs par statut.
- Filtres par statut (onglet « À valider » sélectionné par défaut s'il y en a), recherche, pagination.
- Tableau : référence, client, téléphone (lien `wa.me`), quantité, montant, statut (badge coloré), transaction Wave (copiable), date.
- Ouverture d'une ligne (`?ref=` dans l'URL ouvre directement la précommande) → panneau de détail : toutes les infos, historique des événements et des notifications (envoyé/échec), boutons selon statut : **Valider le paiement**, **Refuser** (modale avec motif obligatoire), **Annuler**, **Convertir en commande**, **Renvoyer la dernière notification**. Confirmation avant chaque action.
- Export CSV.
- Ajouter l'entrée dans le menu admin à côté de « Liste d'attente NFC ».

---

## 8. Conversion en commande (lien avec `/api/commandes`)

Quand les cartes sont fabriquées, l'admin clique **Convertir en commande** :

1. Lire la structure de la table des commandes et de `adminController.js`.
2. Créer la commande correspondante (client, quantité, montant, mode de paiement Wave, référence de transaction, statut « paiement validé »), en la rattachant à `user_id` si présent ; sinon suivre la logique existante pour une commande sans compte (si elle n'existe pas, le signaler et proposer de créer/associer le compte par email).
3. **Ne pas** appeler la fonction qui envoie l'e-mail de confirmation de paiement (ligne ~1184) : le client a déjà reçu la confirmation via n8n. Créer la commande directement ou ajouter une option `{ silent: true }`.
4. Enregistrer `commande_id`, passer la précommande en `converted`, logguer dans `admin_action_logs`.
5. Ensuite, le flux existant prend le relais : quand l'admin passera la commande en « Livrée », l'e-mail de livraison existant partira normalement.

---

## 9. Corrections rapides sur la liste d'attente (dans le même chantier)

1. **Fausse confirmation** (`NFCCardTypes.tsx`) : n'afficher « inscrit » que sur 201 ; 409 → « déjà inscrit » ; autre erreur → message d'erreur et possibilité de réessayer.
2. **Prix en dur** dans l'e-mail d'inscription (`nfcRoutes.js` ~l.11) : lire `NFC_PREORDER_UNIT_PRICE`.
3. Ajouter dans l'e-mail d'inscription et dans le modèle d'envoi groupé un bouton **« Précommander ma carte »** vers `${FRONTEND_URL}/nfc-types#precommande`.
4. Échapper le texte saisi par l'admin dans l'envoi groupé (convertir en HTML sûr : échapper puis remplacer les retours à la ligne par `<br>`).

(Ne pas traiter ici : lien de désinscription, envoi groupé asynchrone — à prévoir dans un chantier séparé.)

---

## 10. Tests et critères d'acceptation

Utiliser le framework de test du projet (Jest + Supertest si présent ; sinon en ajouter le minimum en devDependency). Mocker l'appel HTTP vers n8n.

Tests obligatoires :
- création valide → 201, référence `PF-NFC-XXXX`, événement `preorder.created` en outbox, prix issu de la config même si le client envoie un autre montant ;
- téléphone invalide / quantité hors bornes → 422 ; honeypot rempli → 201 sans insertion ;
- précommande en double (même email, `pending_payment` < 72 h) → 409 ;
- déclaration de paiement avec mauvais jeton → 404 ; transaction déjà utilisée → 409 ;
- validation admin d'une précommande non `payment_submitted` → 409 ; double validation concurrente → une seule réussit ;
- `reminders-due` : renvoie le rappel 1 à J+1, le rappel 2 à J+2, plus rien ensuite ; digest admin à H+2 puis pas avant 4 h ;
- `notifications` avec `reminder.client_payment_1` / `sent` → compteur incrémenté ; `failed` → compteur inchangé ;
- `expire-stale` n'expire que `pending_payment` ≥ 72 h avec 2 rappels ;
- routes internes sans `X-Internal-Key` → 401 ;
- n8n injoignable → la création répond quand même 201 et l'événement reste en outbox avec `attempts = 1`.

Critères d'acceptation de bout en bout (avec n8n réel, voir `n8n/GUIDE_N8N.md`) :
- [ ] Une précommande sur le site → le client reçoit l'e-mail avec les instructions Wave, l'admin reçoit l'alerte.
- [ ] Déclaration de paiement → accusé client + alerte admin « à valider ».
- [ ] Validation admin → e-mail de confirmation client ; à la 10ᵉ précommande payée, alerte « seuil atteint ».
- [ ] Refus → e-mail client avec motif ; le client peut redéclarer.
- [ ] Rappels J+1/J+2 puis expiration J+3 avec e-mail.
- [ ] Chaque envoi apparaît dans l'historique de la précommande côté admin.
- [ ] Aucune régression sur `/api/nfc/waitlist` ni `/api/commandes`.

---

## 11. Ordre de réalisation (un commit par étape)

1. Migration SQL + `config/nfcPreorder.js` + `.env.example`.
2. Service métier + serializer + transitions + tests unitaires.
3. `n8nNotifier` (outbox + renvoi) + tests.
4. Routes publiques + validation + rate-limit + tests.
5. Routes internes + `internalAuth` + tests.
6. Routes admin + logs + export CSV + tests.
7. Frontend : formulaire de précommande + page de suivi.
8. Frontend : page admin + menu.
9. Conversion en commande.
10. Corrections liste d'attente (§9).
11. Résumé final : fichiers modifiés, variables à renseigner, écarts par rapport à cette spec, commandes pour lancer la migration et les tests.
