# Précommandes NFC Portefolia — kit de mise en place

Contenu :

- `PROMPT_CLAUDE_CODE.md` — le message à coller dans Claude Code.
- `CLAUDE_CODE_PRECOMMANDES_NFC.md` — la spécification complète (backend, frontend, contrats n8n, tests).
- `sql/2026_10_07_nfc_preorders.sql` — migration MySQL (3 tables).
- `n8n/WF1_precommandes_evenements.json` — workflow des notifications (webhook).
- `n8n/WF2_precommandes_rappels.json` — workflow des rappels et expirations (planifié).
- `n8n/GUIDE_N8N.md` — import, identifiants, configuration, tests.
- `n8n/test-webhook.sh` — envoie de faux événements au workflow pour tester les e-mails.

Ordre conseillé :

1. Copier ce dossier dans le dépôt (`docs/precommandes-nfc/`).
2. Importer les deux workflows dans n8n et tester WF1 avec `test-webhook.sh` (les e-mails partent déjà, même sans backend).
3. Lancer Claude Code avec `PROMPT_CLAUDE_CODE.md`.
4. Renseigner le `.env` du backend, migrer, redémarrer, puis faire le parcours de bout en bout (section 10 de la spec).
