# Mise en place des workflows n8n — Précommandes NFC

> **État (7 oct. 2026)** : le backend est en place. Le prix (12 500 F CFA) et le numéro Wave (+221 78 131 13 71)
> sont dans la table `nfc_settings` et se modifient depuis l'admin (« Précommandes NFC » → Réglages), pas dans n8n.
> Les deux secrets (`N8N_WEBHOOK_KEY`, `INTERNAL_API_KEY`) sont déjà générés dans `backend/.env` : recopier les mêmes valeurs
> dans les identifiants n8n et dans le `.env` du VPS. Seule l'URL du webhook WF1 reste à fournir (`N8N_PREORDER_WEBHOOK_URL`).
> Écart avec la spec : `reminders-due` est un **POST** qui réserve les rappels (le journal n'incrémente plus le compteur).

Deux workflows à importer :

| Fichier | Rôle | Déclencheur |
|---|---|---|
| `WF1_precommandes_evenements.json` | E-mails client et admin à chaque événement (création, paiement déclaré, validé, refusé, expiré, annulé) | Webhook appelé par le backend |
| `WF2_precommandes_rappels.json` | Expiration des précommandes impayées, rappels client J+1 / J+2, digest admin des paiements à valider | Toutes les 2 h entre 9 h et 19 h (heure de Dakar) |

---

## Étape 1 — Créer les identifiants (Credentials)

Dans n8n : **Overview → Credentials → Create credential**.

1. **SMTP** — nom : `SMTP Portefolia`
   Mêmes paramètres que le SMTP du backend (hôte, port, utilisateur, mot de passe, SSL/TLS). L'adresse d'envoi doit être autorisée par ce serveur.
2. **Header Auth** — nom : `Portefolia → n8n (webhook)`
   Name : `X-Portefolia-Key` — Value : la valeur de `N8N_WEBHOOK_KEY` du backend.
3. **Header Auth** — nom : `n8n → API Portefolia (interne)`
   Name : `X-Internal-Key` — Value : la valeur de `INTERNAL_API_KEY` du backend.

Générer les deux secrets sur le VPS avec `openssl rand -hex 32` (deux valeurs différentes).

## Étape 2 — Importer les workflows

**Workflows → Add workflow → ⋯ → Import from File**, une fois pour chaque fichier JSON.

Puis, dans chaque workflow, ouvrir les nodes signalés en rouge et sélectionner le bon identifiant :

| Node | Identifiant |
|---|---|
| WF1 · Webhook précommande | `Portefolia → n8n (webhook)` |
| WF1 · Email client, Email admin | `SMTP Portefolia` |
| WF1 · Journal – client, Journal – admin | `n8n → API Portefolia (interne)` |
| WF2 · Expirer…, Récupérer les rappels dus, Journaliser l'envoi | `n8n → API Portefolia (interne)` |
| WF2 · Email rappel client, Email digest admin | `SMTP Portefolia` |

## Étape 3 — Renseigner le node « Config » (dans les deux workflows)

Ouvrir le node **Config** et vérifier l'objet `CONFIG` : `apiUrl`, `fromEmail`, `replyTo`, `adminEmail` (préréglé sur contact@portefolia.tech), `supportWhatsapp` (préréglé sur +221 78 131 13 71). Les couleurs sont déjà celles de Portefolia.

- Si n8n tourne sur le même VPS que le backend, `apiUrl` peut pointer en local (ex. `http://localhost:<port_backend>/api`) : plus rapide et ne passe pas par Internet.
- Garder la **même configuration** dans les deux workflows.

## Étape 4 — Brancher le backend

1. Ouvrir WF1, cliquer sur le node **Webhook précommande**, copier la **Production URL** (se termine par `/webhook/portefolia-nfc-preorder`).
2. La mettre dans `N8N_PREORDER_WEBHOOK_URL` du `.env` backend, redémarrer le backend (`pm2 restart <app>`).
3. **Activer** les deux workflows (interrupteur *Active* en haut à droite).
4. Vérifier dans **Settings** de chaque workflow que le fuseau est `Africa/Dakar` (déjà défini dans le fichier).

## Étape 5 — Tester

### Test du WF1 sans backend
```bash
export N8N_URL="https://<votre-n8n>/webhook/portefolia-nfc-preorder"
export N8N_KEY="<valeur de N8N_WEBHOOK_KEY>"
export TEST_EMAIL="votre.adresse@gmail.com"
bash test-webhook.sh preorder.created
bash test-webhook.sh preorder.payment_submitted
bash test-webhook.sh preorder.paid
bash test-webhook.sh preorder.rejected
```
Chaque appel doit répondre `{"received":true,…}` et vous devez recevoir l'e-mail client (sur `TEST_EMAIL`) et, selon l'événement, l'e-mail admin. Les nodes « Journal » échoueront tant que le backend n'a pas la route `/internal/nfc/notifications` : c'est normal, ils sont en mode « continuer en cas d'erreur ».

> Pour tester avant activation, utiliser la **Test URL** (`/webhook-test/…`) et cliquer sur *Listen for test event*.

### Test du WF2
Une fois le backend prêt : ouvrir WF2 → **Test workflow**. Sans précommande éligible, le workflow s'arrête après « Préparer les rappels » (0 élément), c'est le comportement attendu.

## Étape 6 — Options

**Alertes admin sur Telegram** : créer un bot avec @BotFather, récupérer le `chat_id`, créer l'identifiant Telegram dans n8n, l'associer au node *Telegram admin (optionnel)*, **activer le node** (clic droit → Activate) et mettre `telegram: { enabled: true, chatId: '…' }` dans Config.

**WhatsApp client (Cloud API Meta)** : nécessite des modèles de message approuvés par Meta, en français, nommés `precommande_recue` (3 variables : prénom, référence, montant) et `precommande_confirmee` (2 variables : prénom, référence). Créer un identifiant Header Auth `Authorization` = `Bearer <token permanent>`, l'associer au node *WhatsApp client (optionnel)*, activer le node, puis renseigner `whatsapp.enabled`, `phoneNumberId` et les noms de modèles dans Config.

**Workflow d'erreur** : dans *Settings* de chaque workflow, définir un *Error Workflow* qui vous alerte (e-mail/Telegram) si une exécution plante.

## Dépannage

| Symptôme | Cause probable |
|---|---|
| Le backend reçoit 403 du webhook | `X-Portefolia-Key` différent entre `.env` et l'identifiant n8n |
| 404 sur le webhook | Workflow non activé, ou Test URL utilisée au lieu de Production URL |
| Les nodes Journal renvoient 401 | `X-Internal-Key` différent de `INTERNAL_API_KEY` |
| Aucun e-mail mais exécution verte | Regarder la sortie du node Email : le champ `error` contient le message SMTP |
| Les rappels partent la nuit | Fuseau du workflow ou de l'instance n8n (`GENERIC_TIMEZONE=Africa/Dakar`) |
| Doublons d'e-mails | Le backend a renvoyé un événement (n8n trop lent > 5 s). Vérifier la latence ; le node « Répondre 200 » répond normalement en premier |
