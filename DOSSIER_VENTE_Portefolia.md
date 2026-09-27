# Portefolia — Dossier de cession

> **Plateforme SaaS clé en main : portfolios professionnels + cartes NFC physiques**
> Marché cible : Afrique francophone (Sénégal en tête) + international
> Déployée en production sur **portefolia.tech**

Ce document présente le périmètre fonctionnel complet, la technologie, les actifs et le potentiel de marché de Portefolia à destination d'un acheteur ou d'un investisseur.

---

## 1. Résumé exécutif

Portefolia est un SaaS **opérationnel et déployé** qui permet à des professionnels et à des entreprises de :

1. Créer un **portfolio en ligne** professionnel (multi-templates, sections riches, URL personnalisée) ;
2. Commander une **carte NFC physique** qui redirige d'un tap vers le portfolio ;
3. Souscrire à un **abonnement** payé par **Stripe** (international) ou **Wave** (mobile money Afrique) ;
4. Suivre des **analytics détaillées** sur les visites de leur portfolio.

Un module **Business** permet à une entreprise d'équiper ses équipes (agents, commerciaux) de portfolios sous une **charte graphique commune**.

L'ensemble est piloté par un **back-office d'administration complet** (RBAC, finance, commandes, paiements, contenu, notifications).

### Ce qui fait la valeur du produit

| Atout | Détail |
|---|---|
| **Double moteur de paiement** | Stripe **et** Wave — rare : ouvre à la fois le marché international et le marché africain (mobile money) |
| **Produit physique + digital** | La carte NFC crée une source de revenu matérielle en plus de l'abonnement récurrent |
| **Back-office de niveau pro** | RBAC 4 rôles, dashboard financier, « Time Travel » sur les KPI, logs d'audit |
| **Offre Business multi-tenant** | Comptes entreprise avec branding et gestion d'équipe — ouvre le B2B |
| **Produit déjà en production** | Code fonctionnel, base de données structurée, pas un prototype |

---

## 2. Fonctionnalités — Espace utilisateur

### 2.1 Authentification & compte
- Inscription / connexion sécurisées (**JWT + refresh tokens**, mots de passe **bcrypt**)
- Connexion par lien token, réinitialisation de mot de passe, vérification email
- Gestion des états de compte : en attente de validation, suspendu, à renouveler
- Profil : photo, biographie, paramètres de compte

### 2.2 Portfolios
- Création de portfolios avec **plusieurs templates visuels** et prévisualisation
- **Sections configurables** : Hero, Expériences, Compétences (avec niveaux Débutant→Expert), Projets (démo + code + images), Formation, Liens sociaux, Bannière
- **URL personnalisée** (slug unique), page publique `portefolia.tech/portfolio/:slug`
- Portfolio public/privé, paramètres de template en JSON (personnalisation fine)

### 2.3 Cartes NFC
- Commande de **carte physique** liée au portfolio
- Suivi de commande de bout en bout : `En attente → En traitement → Expédiée → Livrée`
- Cycle de vie de la carte : `En attente → Gravée → Envoyée → Active` (UID NFC unique)
- Liste d'attente NFC (waitlist) pour gérer la demande

### 2.4 Abonnements & paiements
- Offres multiples (**Free / Pro / Plus**), facturation ponctuelle, mensuelle ou annuelle
- Checkout **Stripe** (international, webhooks) + **Wave** (mobile money Afrique, validation)
- Parcours de paiement complet : succès / erreur / en attente / annulé / retour
- Upgrade de plan, réabonnement, renouvellement
- **Historique des paiements** côté utilisateur, factures

### 2.5 Analytics
Suivi riche des visites de chaque portfolio :
- Visites, visiteurs uniques, **carte du monde** (géolocalisation par pays)
- **Heatmap des clics**, suivi du scroll, **replay de session**
- Type d'appareil (device), source de trafic (referrer), taux de rebond
- Événements personnalisés (clic, mouvement, vue de projet…)

### 2.6 Contenu public
- **Blog** : articles publics avec slug et méta SEO
- Pages : À propos, FAQ, Contact, Carrières, Documentation, pages légales

---

## 3. Fonctionnalités — Espace Business (B2B)

Module multi-tenant destiné aux entreprises :

- **Compte entreprise** avec branding complet : logo, couleurs (primaire / secondaire / accent), police — appliqué automatiquement à tous les portfolios de l'équipe
- **Gestion de membres** : invitation par email avec token d'onboarding, statut, limite de portfolios par membre (10 par défaut), jusqu'à 50 membres
- **Deux rôles** : `BUSINESS_ADMIN` (administrateur d'entreprise) et `BUSINESS_MEMBER` (agent / employé)
- **Dashboard membre simplifié** (sans paiement ni upgrade — l'entreprise gère la facturation)
- Pages dédiées : tableau de bord, membres, portfolios d'équipe, paiements, analytics, réglages, onboarding public par invitation

---

## 4. Back-office d'administration

Un des points forts du produit : une administration de **niveau professionnel**.

### 4.1 Dashboard & pilotage
- **KPI Bento** : revenu de la période, inscriptions, conversion (commandes), engagement (portfolios) avec sparklines
- **« Time Travel »** : visualisation des KPI à une date / mois / trimestre / année passée
- **Graphiques** : courbe de revenus mensuels, répartition des clients par offre (donut)
- **Alertes actives** : upgrades en attente, échecs de paiement du mois
- **Flux d'activité** : dernières transactions et derniers inscrits

### 4.2 Gestion opérationnelle
| Domaine | Capacités |
|---|---|
| **Clients / utilisateurs** | Liste, détails, gestion des comptes, suspension/blocage |
| **Portfolios** | Supervision de tous les portfolios |
| **Commandes** | Suivi et traitement des commandes de cartes |
| **Cartes NFC** | Gravure, envoi, activation ; gestion de la waitlist |
| **Paiements** | Stripe + Wave, validation manuelle Wave, **remboursements** (motif tracé) |
| **Facturation** | Génération et gestion des factures (invoices) |
| **Plans** | CRUD des offres et de leurs caractéristiques (features) |
| **Upgrades** | File des demandes de montée en gamme |
| **Dashboard financier** | KPI financiers dédiés |
| **Contenu** | Blog, pages, pages légales avec historique des modifications |
| **Messages** | Messages du formulaire de contact |
| **Notifications** | Diffusion (broadcast ou ciblée par utilisateur) |

### 4.3 Sécurité & gouvernance (RBAC)
- **4 rôles admin** : `super_admin`, `admin_technique`, `admin_contenu`, `admin_support`
- Système **permissions** granulaire (`users:read`, `payments:write`, `content:write`…)
- **Logs d'audit** de toutes les actions admin (`admin_action_logs` : action, ressource, IP, user-agent)
- Page de connexion admin séparée et sécurisée

---

## 5. Technologie

Stack moderne, maintenable, sans dépendance propriétaire lourde.

### Frontend (`/src/`)
| Couche | Techno |
|---|---|
| Framework | React 18 + TypeScript + **Vite** |
| UI | shadcn/ui + Tailwind CSS + Radix UI |
| Routing | React Router v6 |
| État / cache | TanStack Query + contextes React (Auth, Plan, Business) |
| Animations | Framer Motion + GSAP |

### Backend (`/backend/src/`)
| Couche | Techno |
|---|---|
| Runtime | Node.js + **Express** |
| Base de données | **MySQL** (mysql2, InnoDB, utf8mb4) |
| Auth | JWT + refresh tokens + bcrypt |
| Uploads | **Cloudinary** + Multer |
| Emails | Nodemailer |
| Paiements | Stripe (webhooks) + Wave (mobile money) |
| Sécurité | RBAC custom, logs d'audit |

### Points d'architecture notables
- Modèles auto-initialisés au démarrage (`model.init()`) — installation simplifiée
- Intercepteur global qui déconnecte sur token invalide (401)
- Middleware `RequirePayment` qui protège le dashboard sans abonnement actif
- Middlewares d'accès Business (`requireBusinessAdmin`, `requireBusinessAccess`)

---

## 6. Actifs cédés

- **Code source complet** : frontend React/TS + backend Node/Express
- **Schéma de base de données** structuré (~30 tables couvrant utilisateurs, portfolios, projets, compétences, expériences, visites, analytics, commandes, cartes NFC, paiements, factures, plans, abonnements, business, RBAC, contenu, notifications)
- **Intégrations configurées** : Stripe, Wave, Cloudinary, envoi d'emails
- **Nom de domaine** : portefolia.tech (déploiement en production)
- **Documentation technique** : architecture, RBAC, structure administration, procédure de déploiement VPS
- **Templates de portfolio** et charte graphique
- Système de **cartes NFC** (workflow commande → gravure → activation)

---

## 7. Positionnement & potentiel de marché

### Proposition de valeur unique
Portefolia combine **trois sources de revenus** rarement réunies dans un seul produit :

1. **Abonnement récurrent** (MRR) — portfolios Free/Pro/Plus ;
2. **Vente de produit physique** (cartes NFC) — marge matérielle + réassort ;
3. **Contrats B2B** (offre Business) — panier moyen élevé, faible churn.

### Différenciateurs
- **Wave / mobile money** : accès direct au marché africain, largement sous-servi par les acteurs internationaux (qui n'acceptent que la carte bancaire).
- **Carte NFC physique** : produit tangible, effet « waouh » en networking, verrou d'usage.
- **Multi-tenant Business** : porte d'entrée vers des contrats d'entreprise (équipes commerciales, immobilier, événementiel…).

### Segments cibles
Freelances, consultants, commerciaux, agents immobiliers, créatifs, et **entreprises** souhaitant équiper leurs équipes de cartes de visite connectées et centralisées.

---

## 8. État d'avancement & feuille de route

### Livré et opérationnel ✅
Auth complète · CRUD portfolios multi-templates · Commande NFC · Paiements Stripe & Wave · Back-office admin (RBAC, Time Travel, finance) · Plans & abonnements · Analytics (heatmap, replay, worldmap) · Blog & pages · Notifications · Factures · Module Business · Logs d'audit · Uploads Cloudinary · Remboursements.

### Opportunités d'amélioration (leviers pour l'acquéreur) 📋
- Interface d'administration des templates à finaliser
- Analytics Business à brancher entièrement sur graphiques
- Automatisation complète de la vérification email
- Tests automatisés (Jest/Vitest + Supertest) et documentation API (OpenAPI)
- SEO avancé des portfolios publics (og:image dynamique)
- Application mobile / PWA installable
- Programme de parrainage (referral)

Ces points ne sont **pas des blocages** : le produit est fonctionnel. Ils constituent une **feuille de route de croissance** claire pour l'acquéreur.

---

## 9. Synthèse

Portefolia est un SaaS **complet, déployé et différencié**, alliant un produit digital récurrent, un produit physique (NFC) et une offre B2B, avec un moteur de paiement adapté au marché africain **et** international. Le back-office de niveau professionnel et la base de données structurée en font un actif prêt à être exploité et développé.

---

*Document généré à partir de l'inventaire réel du code source (routes, contrôleurs, modèles, pages). Pour une revue technique détaillée, se référer à `Portefolia.MD`, `RBAC.md` et `Structure_Administration.MD`.*
