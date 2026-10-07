# Prompt à coller dans Claude Code

> Placer d'abord le dossier `precommandes-nfc/` dans le dépôt, par exemple sous `docs/precommandes-nfc/`.

---

Je veux transformer la liste d'attente NFC de Portefolia en un vrai système de précommandes payées par Wave, avec les notifications envoyées par n8n.

La spécification complète est dans `docs/precommandes-nfc/CLAUDE_CODE_PRECOMMANDES_NFC.md`, la migration dans `docs/precommandes-nfc/sql/2026_10_07_nfc_preorders.sql`. Les workflows n8n sont déjà faits (`docs/precommandes-nfc/n8n/`) : le backend doit respecter exactement les contrats JSON des sections 5 et 6.

Procède ainsi :
1. Lis la spécification en entier, puis le code existant listé en section 0 (routes NFC, admin, commandes, sendEmail, pages React). Fais-moi un court résumé de ce que tu as trouvé et des écarts éventuels avec la spec (noms de tables, types d'id, middlewares, framework de test) **avant** de coder.
2. Implémente ensuite dans l'ordre de la section 11, un commit par étape, en lançant les tests à chaque étape.
3. Ne modifie pas le comportement existant de `/api/nfc/waitlist` et `/api/commandes`, sauf les corrections listées en section 9.
4. À la fin, donne-moi : la liste des fichiers modifiés, les variables d'environnement à renseigner, les commandes pour lancer la migration et les tests, et les écarts par rapport à la spec.
