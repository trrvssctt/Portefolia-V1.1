# Livraison — Charte Portefolia appliquée au code réel

Périmètre : **frontend uniquement**. Aucune logique, route, requête, prop ou appel API modifié.
Seuls le style visuel (couleurs, police, rayons, ombres, espacements) a été touché.

## Fichiers modifiés (à copier dans le dépôt à leur emplacement)

| Fichier | Emplacement dans le dépôt | Changements |
|---|---|---|
| `index.css` | `src/index.css` | Import **Inter** ; `--primary` et `--ring` en vert **#2E7D32** ; `--radius: 0.75rem` ; variables de marque (`--brand`, `--brand-light`, `--brand-dark`), `--shadow-card`, `--admin-grad` ; police body Inter ; utilitaires `.admin-header-gradient` et `.shadow-card` |
| `tailwind.config.ts` | `tailwind.config.ts` | `borderRadius` **lg=12px (cards) / md=8px (boutons)** ; `fontFamily.sans = Inter` ; couleurs `brand` (DEFAULT/light/dark) ; `boxShadow.card = 0 2px 12px rgba(0,0,0,.08)` |
| `Admin.tsx` | `src/pages/Admin.tsx` | En-tête **dégradé vert #1B5E20→#2E7D32** ; KPI en **cartes blanches** (accent vert/bleu/ambre + ombre charte) au lieu des dégradés arc-en-ciel ; boutons et accents passés à #2E7D32 ; fonds nettoyés |

## Non modifié (déjà conforme)
- `AdminNav.tsx` — utilise déjà #2E7D32 / #E8F5E9 (charte respectée). Les nouveaux rayons (12/8px) s'appliquent automatiquement via Tailwind.
- `AdminFooter.tsx`, `AdminLayout.tsx` — aucun changement nécessaire.

## Application
1. Copier les 3 fichiers ci-dessus dans le dépôt (mêmes chemins).
2. Vérifier qu'Inter se charge (l'`@import` dans `index.css` suffit ; sinon ajouter le `<link>` Google Fonts dans `index.html`).
3. `npm run dev` — la charte s'applique globalement (vert, Inter, rayons, ombres) ; le dashboard admin adopte l'en-tête dégradé et les KPI épurés.

> Couleurs : primaire `#2E7D32`, secondaire `#43A047`, foncé `#1B5E20`.
> Rayons : cards `12px`, boutons `8px`. Ombre : `0 2px 12px rgba(0,0,0,.08)`.
