# Portefolia — Documentation Projet

> Plateforme SaaS de création de portfolios professionnels avec cartes NFC physiques.
> Déployée sur **portefolia.tech** · Marché cible : Afrique (Sénégal) + international.

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Stack technique](#stack-technique)
3. [Structure du projet](#structure-du-projet)
4. [Fonctionnalités](#fonctionnalités)
5. [Partie Administration](#partie-administration)
6. [Base de données](#base-de-données)
7. [État d'avancement](#état-davancement)
8. [Objectifs restants](#objectifs-restants)

---

## Vue d'ensemble

Portefolia permet à des professionnels de :
- Créer un portfolio en ligne avec plusieurs templates visuels
- Commander une carte NFC physique liée à leur portfolio
- Souscrire à un plan (paiement Stripe pour l'international, Wave pour l'Afrique)
- Accéder à des analytics détaillées sur les visites de leur portfolio

Une offre **Business** permet à une entreprise de créer un compte, inviter des membres (agents/employés) et gérer leurs portfolios sous une charte graphique commune.

---

## Stack technique

### Frontend (`/src/`)
| Couche | Technologie |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS + Radix UI |
| Routing | React Router v6 |
| State / Cache | TanStack Query + contextes React |
| Animations | Framer Motion + GSAP |
| Paiements | Stripe (frontend) |

### Backend (`/backend/src/`)
| Couche | Technologie |
|---|---|
| Runtime | Node.js + Express |
| Base de données | MySQL (mysql2 brut, sans ORM) |
| Auth | JWT + refresh tokens + bcrypt |
| Uploads | Cloudinary + Multer |
| Emails | Nodemailer |
| Paiements | Stripe webhooks + Wave (API mobile Afrique) |
| RBAC | Système custom de rôles/permissions admin |
| Port | 3000 (par défaut) |

---

## Structure du projet

```
Portefolia_22_dec_2025/
├── src/                          # Frontend React
│   ├── App.tsx                   # Racine : routing global + providers
│   ├── main.tsx
│   ├── components/
│   │   ├── admin/                # AdminNav, AdminFooter, UserPaiementHistorique
│   │   ├── analytics/            # HeatmapGrid, SessionReplayPlayer, WorldMap
│   │   ├── auth/                 # AuthProvider, RequirePayment, LogoutDialog
│   │   ├── business/             # BusinessNav
│   │   ├── dashboard/            # DashboardNav, PortfolioForm
│   │   ├── portfolio/            # Templates, sections, BannerCustomizer...
│   │   └── ui/                   # Composants shadcn/ui
│   ├── contexts/
│   │   ├── AuthContext.tsx        # Auth globale (JWT)
│   │   ├── PlanContext.tsx        # Plan actif de l'utilisateur
│   │   ├── BusinessContext.tsx    # Compte entreprise courant
│   │   └── BusinessThemeProvider.tsx  # CSS vars branding entreprise
│   ├── hooks/
│   │   ├── useAuth.tsx
│   │   ├── useCheckoutPolling.ts
│   │   └── use-mobile.tsx
│   ├── lib/
│   │   └── api.ts                # Client API centralisé
│   ├── pages/
│   │   ├── admin/                # Toutes les pages admin (voir section dédiée)
│   │   ├── business/             # Dashboard entreprise + membres
│   │   ├── payment/              # Pages résultat paiement
│   │   └── (pages publiques et dashboard utilisateur)
│   └── types/ utils/
│
├── backend/
│   ├── src/
│   │   ├── index.js              # Point d'entrée Express
│   │   ├── db.js                 # Pool MySQL
│   │   ├── controllers/          # Logique métier
│   │   ├── models/               # Définition tables + requêtes SQL
│   │   ├── routes/               # Déclaration des routes API
│   │   ├── middlewares/          # Auth, RBAC, adminAuth, logger
│   │   ├── jobs/                 # subscriptionReminder (cron)
│   │   ├── scripts/              # create_admin.js
│   │   └── utils/                # sendEmail.js
│   └── migrations/               # SQL historique des migrations
│
└── assets/                       # Images, logo, QR codes
```

---

## Fonctionnalités

### Espace utilisateur
- **Authentification** : inscription, connexion, JWT + refresh token
- **Portfolios** : création multi-templates, sections configurables (Hero, Expériences, Compétences, Projets, Formation, Liens sociaux, Bannière), slug unique
- **Templates** : sélection visuelle, prévisualisation, paramètres JSON
- **NFC** : commande de carte physique liée au portfolio, suivi statut
- **Plans/Abonnements** : offres Free/Pro/Plus, checkout Stripe ou Wave
- **Analytics** : visites, heatmaps clics, replay session, carte du monde
- **Blog** : articles publics (slug, SEO meta)
- **Profil** : photo, biographie, paramètres compte

### Espace Business
- **Compte entreprise** : branding (logo, couleurs primaire/secondaire/accent, police)
- **Membres** : invitation par email, token d'onboarding, limite portfolios (10 par défaut)
- **Rôles** : `BUSINESS_ADMIN` (admin entreprise) + `BUSINESS_MEMBER` (agent)
- **Dashboard membre** : simplifié, sans paiements ni upgrade
- **Paiements Business** : gestion distincte des transactions entreprise

---

## Partie Administration

### Accès & Sécurité

| Élément | Détail |
|---|---|
| URL de connexion | `/admin/sama_connection_page` |
| Protection | JWT admin distinct + verrouillage après tentatives échouées (localStorage) |
| Middleware | `adminAuth.js` valide le token admin ; `rbac.js` vérifie les permissions |

### Rôles admin (RBAC)

| Rôle | Accès |
|---|---|
| `super_admin` | Tout — accès total |
| `admin_technique` | Dashboard, Utilisateurs, Portfolios, Plans, Commandes, Cartes, Paiements, Wave, Stats, Notifications |
| `admin_contenu` | Blog, Pages légales |
| `admin_support` | Utilisateurs (lecture), Commandes, Paiements, Upgrades |

### Pages admin (`/src/pages/admin/`)

| Page | Route | Rôles | Description |
|---|---|---|---|
| AdminLogin | `/admin/sama_connection_page` | — | Connexion sécurisée avec anti-brute-force |
| Dashboard_admin | `/admin/dashboard` | super_admin, admin_technique | KPI temps réel, graphiques revenus, "Time Travel" historique |
| Admin (legacy) | `/admin` | admin | Ancien tableau de bord (gestion commandes NFC + users) |
| Users | `/admin/users` | super_admin, technique, support | CRUD utilisateurs, filtre pending, validation comptes |
| DetailsUsers | `/admin/users/:id` | — | Profil complet d'un utilisateur |
| UserAdmin | `/admin/users-admin/` | super_admin | Gestion des comptes administrateurs |
| Portfolios | `/admin/portfolios` | super_admin, technique | Liste et gestion des portfolios |
| Commandes | `/admin/commandes` | super_admin, technique, support | Suivi commandes NFC (statut, livraison) |
| Cartes | `/admin/cartes` | super_admin, technique | Gestion cartes NFC (UID, activation) |
| Paiements | `/admin/paiements` | super_admin, technique, support | Historique paiements, remboursements |
| WavePayments | `/admin/wave-payments` | super_admin, technique | Validation paiements Wave manuels |
| Invoices | `/admin/invoices` | — | Factures générées |
| Plans | `/admin/plans` | super_admin, technique | CRUD des formules d'abonnement |
| Upgrades | `/admin/upgrades` | super_admin, technique, support | Demandes upgrade en attente |
| Stats | `/admin/stats` | super_admin, technique | Statistiques avancées |
| Notifications | `/admin/notifications` | super_admin, technique | Envoi de notifications utilisateurs |
| Blog | `/admin/blog` | super_admin, admin_contenu | Gestion articles blog |
| LegalPages | `/admin/pages` | super_admin, admin_contenu | Pages légales (CGU, mentions…) |

### Composants admin

- **`AdminNav`** ([src/components/admin/AdminNav.tsx](src/components/admin/AdminNav.tsx)) : navigation horizontale sticky, filtrée par rôle JWT, responsive (drawer mobile), badge rôle coloré
- **`AdminFooter`** : pied de page admin
- **`UserPaiementHistorique`** : tableau paiements d'un utilisateur

### Fonctionnalités clés du Dashboard admin

1. **Time Travel** : mode historique permettant de visualiser les KPI à une date/mois/trimestre/année passée
2. **KPI Bento** : Revenu période, Inscriptions, Conversion (commandes), Engagement (portfolios) avec sparklines
3. **Alertes actives** : upgrades en attente + échecs paiements du mois
4. **Graphique revenus** : AreaChart mensuel (Recharts)
5. **Distribution plans** : PieChart (donut) répartition clients par offre
6. **Flux activité** : dernières transactions + derniers inscrits
7. **Navigation rapide** : 6 raccourcis vers les sections principales

---

## Base de données

Moteur : **MySQL InnoDB** — utf8mb4 — initialisées au démarrage via `model.init()`.

### Schéma complet

#### `utilisateurs`
```sql
id INT PK AUTO_INCREMENT
nom VARCHAR(100) NOT NULL
prenom VARCHAR(100) NOT NULL
email VARCHAR(150) UNIQUE NOT NULL
mot_de_passe TEXT NOT NULL
photo_profil TEXT
biographie TEXT
role VARCHAR(20) DEFAULT 'USER'
business_account_id INT NULL           -- lien compte entreprise (ajout dynamique)
date_inscription TIMESTAMP DEFAULT NOW()
dernier_login TIMESTAMP
```

#### `portfolios`
```sql
id INT PK AUTO_INCREMENT
utilisateur_id INT NOT NULL → utilisateurs(id) CASCADE
titre VARCHAR(200)
description TEXT
theme VARCHAR(100)
url_slug VARCHAR(150) UNIQUE NOT NULL
est_public BOOLEAN DEFAULT TRUE
selected_template_id INT NULL → templates(id) SET NULL
template_settings JSON NULL
portfolio_type ENUM('personal','business') DEFAULT 'personal'  -- ajout Business
business_account_id INT NULL           -- ajout Business
date_creation TIMESTAMP DEFAULT NOW()
date_modification TIMESTAMP ON UPDATE NOW()
```

#### `projets`
```sql
id INT PK
portfolio_id INT → portfolios(id) CASCADE
titre VARCHAR(200) NOT NULL
description TEXT
image TEXT
lien_demo TEXT
lien_code TEXT
date_debut DATE
date_fin DATE
```

#### `competences`
```sql
id INT PK
portfolio_id INT → portfolios(id) CASCADE
nom VARCHAR(150) NOT NULL
niveau ENUM('Débutant','Intermédiaire','Avancé','Expert')
categorie VARCHAR(100)
```

#### `experiences`
```sql
id INT PK
portfolio_id INT → portfolios(id) CASCADE
titre_poste VARCHAR(200) NOT NULL
entreprise VARCHAR(150)
description TEXT
date_debut DATE
date_fin DATE
```

#### `liens_sociaux`
```sql
id INT PK
portfolio_id INT → portfolios(id) CASCADE
plateforme VARCHAR(100)
url TEXT
```

#### `visites`
```sql
id INT PK
portfolio_id INT → portfolios(id) CASCADE
date_visite TIMESTAMP DEFAULT NOW()
adresse_ip VARCHAR(50)
user_agent TEXT
pays VARCHAR(100)
referer TEXT
```

#### `analytics_events`
```sql
id INT PK
portfolio_id INT → portfolios(id) CASCADE
type VARCHAR(50)    -- 'click','scroll','move','interaction','project_view'
page VARCHAR(200)
payload JSON
adresse_ip VARCHAR(50)
user_agent TEXT
created_at TIMESTAMP DEFAULT NOW()
```

#### `templates`
```sql
id INT PK
name VARCHAR(255) NOT NULL
slug VARCHAR(255) UNIQUE NOT NULL
description TEXT
thumbnail_url VARCHAR(1024)
preview_url VARCHAR(1024)
price_cents INT DEFAULT 0
currency VARCHAR(16) DEFAULT 'F CFA'
is_public TINYINT DEFAULT 1
author VARCHAR(255)
version VARCHAR(50)
supported_sections JSON
required_fields JSON
allowed_plans JSON
default_settings JSON
settings_schema JSON
assets JSON
custom_css TEXT
created_at / updated_at TIMESTAMP
```

#### `plans`
```sql
id INT PK
name VARCHAR(200) NOT NULL
slug VARCHAR(200) UNIQUE NOT NULL
description TEXT
price_cents INT DEFAULT 0
currency VARCHAR(10) DEFAULT 'XOF'
billing_interval VARCHAR(50) DEFAULT 'one_time'  -- 'one_time','monthly','yearly'
is_public TINYINT DEFAULT 1
metadata JSON
external_price_id VARCHAR(255)   -- ref Stripe
created_at / updated_at TIMESTAMP
deleted_at TIMESTAMP NULL
```

#### `plan_features`
```sql
id INT PK
plan_id INT → plans(id) CASCADE
feature VARCHAR(255) NOT NULL
value VARCHAR(255)
position INT DEFAULT 0
```

#### `user_plans`
```sql
id INT PK
utilisateur_id INT → utilisateurs(id) CASCADE
plan_id INT → plans(id) SET NULL
start_date TIMESTAMP DEFAULT NOW()
end_date TIMESTAMP NULL
status VARCHAR(50) DEFAULT 'active'  -- 'active','cancelled','expired','pending'
payment_reference VARCHAR(255)
metadata JSON
```

#### `abonnements`
```sql
id INT PK
utilisateur_id INT → utilisateurs(id) CASCADE
plan_id INT → plans(id) SET NULL
type VARCHAR(50) DEFAULT 'abonnement'
statut VARCHAR(50) DEFAULT 'pending'
montant DECIMAL(10,2) DEFAULT 0
currency VARCHAR(10) DEFAULT 'XOF'
start_date TIMESTAMP DEFAULT NOW()
end_date TIMESTAMP NULL
payment_reference VARCHAR(255)
metadata JSON
created_at / updated_at TIMESTAMP
```

#### `commandes`
```sql
id INT PK
utilisateur_id INT → utilisateurs(id) CASCADE
numero_commande VARCHAR(100) UNIQUE NOT NULL
type_commande ENUM('commande_carte','abonnement') DEFAULT 'commande_carte'
statut ENUM('En_attente','En_traitement','Expédiée','Livrée','Annulée')
montant_total DECIMAL(10,2) DEFAULT 0
adresse_livraison TEXT
date_commande TIMESTAMP DEFAULT NOW()
date_livraison TIMESTAMP NULL
```

#### `cartes_nfc`
```sql
id INT PK
commande_id INT → commandes(id) CASCADE
uid_nfc VARCHAR(150) UNIQUE NOT NULL
lien_portfolio TEXT
design TEXT
statut ENUM('En_attente','Gravée','Envoyée','Active')
date_activation TIMESTAMP NULL
```

#### `paiements`
```sql
id INT PK
commande_id INT NULL → commandes(id) CASCADE
abonnement_id INT NULL → abonnements(id) SET NULL
moyen_paiement VARCHAR(100) DEFAULT 'manual'
reference_transaction VARCHAR(255)
invoice_id INT NULL
montant DECIMAL(10,2) DEFAULT 0
statut VARCHAR(50) DEFAULT 'pending'
metadata JSON
image_paiement VARCHAR(1024)
motif_remboursement VARCHAR(1024)
date_paiement TIMESTAMP DEFAULT NOW()
created_at / updated_at / deleted_at TIMESTAMP
```

#### `invoices`
```sql
id INT PK
utilisateur_id INT → utilisateurs(id) CASCADE
plan_id INT NULL
amount DECIMAL(10,2) DEFAULT 0
currency VARCHAR(10) DEFAULT 'XOF'
reference VARCHAR(255)
status VARCHAR(50) DEFAULT 'draft'
metadata JSON
created_at TIMESTAMP
```

#### `notifications`
```sql
id INT PK
user_id INT NULL
titre VARCHAR(255)
message TEXT
meta JSON
sent BOOLEAN DEFAULT FALSE
date_created TIMESTAMP DEFAULT NOW()
```

#### `refresh_tokens`
```sql
id INT PK
utilisateur_id INT → utilisateurs(id) CASCADE
token TEXT NOT NULL
expires_at TIMESTAMP
created_at TIMESTAMP
```

#### `articles`
```sql
id INT PK
title VARCHAR(255) NOT NULL
slug VARCHAR(255) UNIQUE NOT NULL
excerpt TEXT
content LONGTEXT
meta_title VARCHAR(255)
meta_description VARCHAR(512)
status ENUM('draft','published') DEFAULT 'draft'
author_id INT NULL
published_at TIMESTAMP NULL
created_at / updated_at / deleted_at TIMESTAMP
```

#### `pages`
```sql
id INT PK
slug VARCHAR(255) UNIQUE NOT NULL
title VARCHAR(255)
content LONGTEXT
meta_title VARCHAR(255)
meta_description VARCHAR(512)
created_at / updated_at TIMESTAMP
```

#### `content_history`
```sql
id INT PK
content_type VARCHAR(50)  -- 'article' | 'page'
content_id INT NOT NULL
changes JSON
editor_id INT NULL
created_at TIMESTAMP
```

#### `roles` (RBAC)
```sql
id INT PK
name VARCHAR(64) UNIQUE NOT NULL     -- 'super_admin','admin_technique','admin_contenu','admin_support'
description VARCHAR(255)
```

#### `permissions` (RBAC)
```sql
id INT PK
name VARCHAR(128) UNIQUE NOT NULL    -- 'users:read','payments:write','content:write'...
description VARCHAR(255)
```

#### `role_permissions` (RBAC)
```sql
role_id INT → roles(id) CASCADE
permission_id INT → permissions(id) CASCADE
PK (role_id, permission_id)
```

#### `admin_users`
```sql
id INT PK
email VARCHAR(255) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL
full_name VARCHAR(255)
role_id INT → roles(id) RESTRICT
is_active BOOLEAN DEFAULT TRUE
created_at / updated_at TIMESTAMP
```

#### `admin_action_logs`
```sql
id BIGINT PK
admin_id INT → admin_users(id) SET NULL
action VARCHAR(255) NOT NULL
resource VARCHAR(255)
details TEXT
ip_address VARCHAR(45)
user_agent VARCHAR(512)
created_at TIMESTAMP
```

#### `business_accounts`
```sql
id INT PK
admin_user_id INT → utilisateurs(id) CASCADE
company_name VARCHAR(200) NOT NULL
company_logo_url TEXT NULL
primary_color VARCHAR(7) DEFAULT '#1a1a2e'
secondary_color VARCHAR(7) DEFAULT '#16213e'
accent_color VARCHAR(7) DEFAULT '#0f3460'
font_family VARCHAR(100) DEFAULT 'Inter'
max_members INT DEFAULT 50
status VARCHAR(50) DEFAULT 'active'
plan_id INT → plans(id) SET NULL
website_url VARCHAR(500) NULL   -- ajout dynamique
created_at / updated_at TIMESTAMP
deleted_at TIMESTAMP NULL
```

#### `business_members`
```sql
id INT PK
business_account_id INT → business_accounts(id) CASCADE
user_id INT NULL → utilisateurs(id) SET NULL
invitation_email VARCHAR(150) NOT NULL
invitation_token VARCHAR(255) NULL
role VARCHAR(30) DEFAULT 'member'
status VARCHAR(30) DEFAULT 'pending'
portfolio_limit INT DEFAULT 10
invited_by INT → utilisateurs(id) SET NULL
created_at / updated_at TIMESTAMP
```

### Diagramme de relations (simplifié)

```
utilisateurs ──< portfolios ──< projets
                           ──< competences
                           ──< experiences
                           ──< liens_sociaux
                           ──< visites
                           ──< analytics_events
             ──< commandes ──< cartes_nfc
                           ──< paiements
             ──< abonnements ──< paiements
             ──< user_plans
             ──< invoices
             ──< business_members
business_accounts ──< business_members
plans ──< plan_features
      ──< user_plans
      ──< abonnements
      ──< business_accounts
templates <── portfolios
roles ──< admin_users
      ──< role_permissions ──> permissions
admin_users ──< admin_action_logs
articles / pages / content_history (gestion contenu)
notifications (broadcast ou user_id ciblé)
refresh_tokens
```

---

## État d'avancement

### Terminé ✅

- Auth complète (inscription, connexion, JWT, refresh token, logout)
- CRUD portfolios avec templates multiples et sections riches
- Commande carte NFC (front + back)
- Paiements Stripe (checkout, webhooks, success/error/pending/return)
- Paiements Wave (checkout mobile, validation admin manuelle)
- Dashboard admin complet (RBAC 4 rôles, Time Travel, KPI, graphiques)
- Gestion plans/abonnements (CRUD plans, features, checkout)
- Analytics utilisateur (visites, heatmap, replay session, worldmap)
- Blog (CRUD articles côté admin, lecture publique)
- Pages légales (CRUD admin)
- Notifications admin
- Factures (invoices)
- Système Business (comptes entreprise, membres, branding, invitation email)
- RBAC admin complet (roles, permissions, role_permissions, admin_users)
- Logs actions admin (`admin_action_logs`)
- Upload images (Cloudinary + Multer)
- Gestion remboursements paiements (`motif_remboursement`)
- Page historique paiements utilisateur

### En cours / Partiel ⚠️

- Page Templates admin (`/templates-gestion/dashboard`) : interface séparée via `TemplateAppProxy`, intégration partielle
- Vérification email à l'inscription (`verified` flag côté utilisateur, validation admin visible)
- Analytics business (page `BusinessAnalytics` créée, backend `businessAnalyticsController.js` présent)

### Non commencé / Prévu 📋

- Notifications push (actuellement envoi email via Nodemailer, pas de push natif)
- Système de parrainage/referral
- Page d'administration des templates en production (interface complète)
- Tests automatisés (frontend et backend)
- Documentation API (Swagger/OpenAPI)

---

## Objectifs restants

1. **Stabiliser la gestion des templates** : finir l'interface admin des templates et la prévisualisation en live dans le portfolio
2. **Compléter Business Analytics** : brancher les endpoints `/api/business/analytics/*` sur des graphiques dans `BusinessAnalytics.tsx`
3. **Vérification email** : automatiser la validation par email (token envoyé à l'inscription, lien de confirmation)
4. **Tests** : mettre en place Jest/Vitest pour le frontend et Supertest pour l'API backend
5. **Documentation API** : générer une spec OpenAPI à partir des routes Express
6. **SEO portfolio** : meta dynamiques (og:image, twitter card) sur `/portfolio/:slug`
7. **PWA** : rendre le dashboard installable en app mobile (service worker, manifest)
