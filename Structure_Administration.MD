# Structure_Administration

Document d'architecture — Partie `src/pages/admin`

Ce document décrit l'architecture, le rôle et les fonctionnalités attendues des pages d'administration présentes dans le dossier `src/pages/admin`.

---

## Vue d'ensemble

La partie administration est une surcouche frontend (React + TypeScript) qui consomme l'API backend (Express). Elle contient :

- Une page de connexion dédiée aux administrateurs (`AdminLogin.tsx`).
- Un tableau de bord global pour super-admins (`Dashboard_admin.tsx`).
- Des écrans dédiés pour la gestion des utilisateurs, portfolios, paiements, factures, plans, commandes, cartes NFC, contenu, notifications et statistiques.

Authentification & RBAC :
- Les endpoints admin sont protégés côté backend par `authMiddleware` (vérification JWT) et `adminAuth` (vérifie `admin_users` ou rôle admin dans `utilisateurs`).
- Les pages frontend attendent un `token` stocké (localStorage) et utilisent `AuthProvider` / `loadProfile` pour initialiser le contexte.

---

## Schéma d'architecture (haut niveau)

```mermaid
flowchart LR
  subgraph Frontend
    A[Admin UI pages<br/>(src/pages/admin/*)]
    A --> B[AuthProvider]
    A --> C[API calls -> /api/admin/*]
  end

  subgraph Backend
    C1[Express routes]
    C1 --> C2[authRoutes, adminRoutes, paiementRoutes,...]
    C2 --> D[Controllers (adminController, paiementController, planController,...)]
    D --> E[DB Models -> MySQL via pool]
    D --> F[RBAC tables: roles, permissions, role_permissions]
  end

  Frontend -. HTTP(S) -> Backend
  E -->|reads/writes| DB[(MySQL)]
```

---

## Pages et responsabilités (fichier par fichier)

> Tous les fichiers sont dans `src/pages/admin/`.

- `AdminLogin.tsx`
  - Rôle : formulaire de connexion administrateur. Gère verrouillage local après plusieurs tentatives, validation client (décodage JWT) et initialisation du contexte via `reloadProfile()`.
  - Entrées : email, mot de passe.
  - Comportement : appelle `POST /api/auth/admin/login`, stocke le token, appelle `loadProfile`/`reloadProfile` et redirige vers `/admin/dashboard` en cas de succès.
  - Points d'attention : afficher erreurs 401, gérer expiration JWT et fallback réseau.

- `Dashboard_admin.tsx`
  - Rôle : vue d'ensemble pour Super Admin (totaux, éléments récents, liens d'administration).
  - Requêtes :
    - `GET /api/admin/totals`
    - `GET /api/admin/users?page=1&limit=6`
    - `GET /api/admin/portfolios?page=1&limit=6`
    - `GET /api/admin/invoices?page=1&limit=6`
    - `GET /api/admin/commandes?page=1&limit=6`
  - Fonctionnalités attendues : affichage des métriques clés, listes courtes récentes, liens rapides vers pages détaillées (utilisateurs, portfolios, factures).

- `Users.tsx`
  - Rôle : gestion complète des utilisateurs (liste, filtrage, pagination, actions activate/deactivate/verify/delete).
  - Requêtes backend : `GET /api/admin/users`, `PUT /api/admin/users/:id`, `PUT /api/admin/users/:id/activate`, `PUT /api/admin/users/:id/deactivate`, `DELETE /api/admin/users/:id`.
  - Fonctionnalités attendues : recherche, tri, pagination, actions d'administration et possible historique.

- `Portfolios.tsx`
  - Rôle : gestion des portfolios utilisateurs (liste, recherche, détails, désactiver/supprimer, statistiques de visites).
  - Requêtes backend : `GET /api/admin/portfolios`, `GET /api/admin/portfolios/:id`, `PUT /api/admin/portfolios/:id`, `DELETE /api/admin/portfolios/:id`.
  - Fonctionnalités attendues : visualiser le portfolio public, copier le lien, voir le propriétaire, état domaine, vues.

- `Plans.tsx`
  - Rôle : gestion des offres/formules (création, édition, suppression, export CSV).
  - Requêtes backend (public & admin) :
    - Public: `GET /api/plans` (list)
    - Admin: `GET /api/admin/plans`, `POST /api/admin/plans`, `PUT /api/admin/plans/:id`, `DELETE /api/admin/plans/:id`, endpoints d'export
  - Fonctionnalités attendues : CRUD complet, gestion des features, position d'affichage, toggles active/popular, export CSV.

- `Paiements.tsx`
  - Rôle : tableau de bord des paiements et paiements en attente, validation, création d'invoices.
  - Requêtes backend : `GET /api/admin/paiements` (passé par `paiementRoutes`), `PUT /api/admin/paiements/:id/status`.
  - Fonctionnalités attendues : voir statut, valider paiement, générer facture/abonnement.

- `Invoices.tsx`
  - Rôle : liste et vue détaillée des factures; export CSV / PDF si disponible.
  - Requêtes backend : `GET /api/admin/invoices`, `GET /api/admin/invoices/:id/html`, `GET /api/admin/invoices/:id/pdf`, `GET /api/admin/invoices/export.csv`.
  - Fonctionnalités attendues : recherche, téléchargement PDF/CSV, affichage HTML invoice.

- `Commandes.tsx`
  - Rôle : gestion des commandes générées lors des paiements/checkout.
  - Requêtes backend : `GET /api/admin/commandes`, `GET /api/admin/commandes/:id`, `PUT /api/admin/commandes/:id/status`.

- `Cartes.tsx` (Cartes NFC)
  - Rôle : gestion des cartes NFC physiques (assignation UID, statut, suppression).
  - Requêtes backend : `GET /api/admin/cartes`, `PUT /api/admin/cartes/:id/status`, `PUT /api/admin/cartes/:id/assign-uid`.

- `Blog.tsx` (admin)
  - Rôle : gestion des articles (CRUD) pour le blog public.
  - Requêtes backend : `GET /api/admin/articles`, `POST /api/admin/articles`, `PUT /api/admin/articles/:id`, `DELETE /api/admin/articles/:id`.

- `LegalPages.tsx`
  - Rôle : éditeur des pages légales (mentions, CGU, RGPD...).
  - Requêtes backend : `GET /api/pages/:slug` (public), `PUT /api/admin/pages/:slug` (admin upsert).

- `Notifications.tsx`
  - Rôle : envoyer des notifications globales (emails/in-app) aux utilisateurs.
  - Requêtes backend : `GET /api/admin/notifications`, `POST /api/admin/notifications`.

- `Stats.tsx`
  - Rôle : statistiques avancées (visites, revenus mensuels, trends).
  - Requêtes backend : `GET /api/admin/visits/monthly`, `GET /api/admin/revenue/monthly`, `GET /api/admin/totals`.
  - Fonctionnalités attendues : graphiques, filtres par période.

- `Upgrades.tsx`
  - Rôle : gestion des demandes de mise à niveau (checkouts), approbation et création d'abonnements.
  - Requêtes backend : `GET /api/admin/upgrades`, `PUT /api/admin/upgrades/:id/approve`.

---

## Flux d'authentification Admin

1. L'administrateur se connecte via `AdminLogin.tsx` qui appelle `POST /api/auth/admin/login`.
2. Le backend vérifie `admin_users` et retourne un `accessToken` JWT (avec `token_type: 'admin'` et `role: '<role_name>'`).
3. Frontend stocke le token dans `localStorage.token` et appelle `loadProfile(token)` :
   - `loadProfile` tente `/api/users/me` puis `/api/auth/admin/me`, puis décode le JWT en fallback.
4. `AuthProvider` expose `profile`, `user` et `reloadProfile()` pour initialiser l'UI.
5. Toutes les requêtes admin incluent `Authorization: Bearer <token>`.

---

## RBAC & Permissions

- Le backend gère RBAC via les tables `roles`, `permissions`, `role_permissions`.
- Middleware `requirePermission('<key>')` protège des routes (ex : `content:read`, `users:write`).
- `adminAuth` vérifie que l'utilisateur est administrateur (par rôle dans `utilisateurs.role` ou en regardant `admin_users`).

---

## Schéma d'appels API (exemples)

- Dashboard totals : `GET /api/admin/totals` -> renvoie counts { total_users, total_portfolios, total_commandes, total_cartes }
- Utilisateurs : `GET /api/admin/users?page=1&limit=20`
- Plans (admin) : `GET /api/admin/plans` (protégé)
- Factures : `GET /api/admin/invoices?page=1&limit=20`

---

## Bonnes pratiques et points d'attention

- Toujours inclure `Authorization` pour les appels admin côté frontend. Gérer 401 en redirigeant vers `/admin/login`.
- Pour CORS, autoriser les entêtes `Cache-Control`, `Authorization`, `Content-Type`, `Accept` (préflight).
- Les modifications destructrices (suppression permanente) devraient exiger un niveau RBAC `system:admin`.
- Ajouter des confirmations et journaux d'action (middleware `logAdminAction`) autour des opérations critiques.

---

## Prochaines évolutions recommandées

- Ajouter tests unitaires et d'intégration pour chaque controller admin.
- Ajouter un aperçu en temps réel (websocket) pour certaines métriques (revenu, visites).
- Ajouter pages de rôle + gestion granularisée des permissions dans l'UI (affecter permissions à des rôles et éditeur de rôles).

---

## Références utiles

- Backend routes admin : `backend/src/routes/adminRoutes.js`
- Contrôleur principal : `backend/src/controllers/adminController.js`
- Auth (admin) : `backend/src/controllers/authController.js` et `backend/src/scripts/create_admin.js`
- Frontend AuthProvider : `src/components/auth/AuthProvider.tsx`
- Emplacement des pages admin : `src/pages/admin/`

---

Document généré automatiquement — si vous voulez que j'ajoute des diagrammes plus détaillés (séquence d'auth, diagramme DB, ou mermaid pour chaque écran), dites-moi lesquels et je les ajoute.
