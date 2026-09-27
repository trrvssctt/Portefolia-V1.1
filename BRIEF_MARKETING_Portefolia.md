# Portefolia — Brief produit & marketing

> **À quoi sert ce document.** C'est le contexte de référence à donner à Claude (ou à une agence, un
> freelance, un nouveau membre de l'équipe) avant toute production marketing : pubs, posts, landing,
> emails, scripts vidéo, pitch. Tout ce qui suit est **tiré du code réel** de `portefolia.tech`
> (frontend React, backend Express, base MySQL), pas d'une plaquette. Les écarts entre le discours
> actuel du site et ce que le produit fait vraiment sont signalés par ⚠️ — ce sont les points à
> arbitrer **avant** de lancer des campagnes.

---

## 1. En une phrase

**Portefolia est une plateforme sénégalaise qui permet à un professionnel de créer un portfolio en
ligne élégant en quelques minutes, et de le partager d'un simple geste grâce à une carte NFC —
avec un paiement en F CFA via Wave.**

Trois briques : le **portfolio** (le produit vivant), la **carte NFC** (l'objet physique qui y
mène), l'offre **Business** (équiper toute une équipe sous une charte commune).

---

## 2. Identité de marque

| Élément | Valeur |
|---|---|
| Nom | Portefolia |
| Domaine | `portefolia.tech` |
| Signature (OG/social) | **« Expose ton futur »** — variante NFC : « Expose Ton Futur, même hors ligne » |
| Accroche principale (H1) | **« Votre carrière. En un scan. »** |
| Sous-titre hero | « Créez un portfolio professionnel élégant et partagez-le instantanément avec une carte NFC. Votre réseau, à portée de geste. » |
| Origine | Dakar, Sénégal — fondée en 2025 |
| Contact | contact@portefolia.tech · support annoncé sous 24 h |
| Langue | Français (locale `fr_SN`), tutoiement sur les réseaux, vouvoiement sur le site |

### Ton
Sobre et affirmatif. Phrases courtes. Pas de superlatifs empilés, pas de jargon technique côté
public. Le site alterne deux registres assumés : **vouvoiement** dans l'interface et la landing
(« Créez votre portfolio »), **tutoiement** dans les métadonnées sociales (« Expose ton futur »,
« Crée ton portfolio »). À garder tel quel : le tutoiement pour l'acquisition sociale, le
vouvoiement pour le produit.

### Charte graphique (valeurs exactes du code)

| Rôle | Hex |
|---|---|
| Vert primaire (CTA, icônes) | `#2E7D32` |
| Vert foncé (titres accentués, fond CTA) | `#1B5E20` |
| Vert clair (fonds de badges, halos) | `#E8F5E9` |
| Accent turquoise (dégradés NFC) | `#1BC29A` |
| Texte principal | `#18181B` |
| Texte secondaire | `#71717A` |
| Bordures | `#E7E7EA` |
| Fond carte NFC (visuel) | dégradé `#1A1A2E → #16213E → #0F3460` |

**Typo :** Inter (400→900) pour toute l'interface ; une serif est utilisée sur les titres des pages
secondaires (À propos, FAQ) pour un registre plus éditorial.

**Motifs visuels récurrents :** halos radiaux verts derrière les hero, cartes à coins très arrondis
(`rounded-2xl`/`3xl`), bordures 1px gris très clair, ombres portées douces, la carte NFC en
perspective 3D (`rotateY(-16deg)`) avec une notification flottante « Profil ouvert · En 0,3 s après
le scan ».

### L'équipe (page À propos)
- **Seydou DIANKA** — co-fondateur, développeur
- **Rudaldy Rudy NGOMA** — co-fondateur, chef de projet marketing digital
- **Mariama NDIAYE** — co-fondatrice, directrice générale

### Valeurs affichées
Simplicité · Confiance · Ancrage local · Exigence.
Récit fondateur : *« En 2025, échanger ses coordonnées professionnelles passait encore par des bouts
de carton vite perdus. Nous avons imaginé une alternative : un portfolio vivant, partagé d'un simple
geste grâce au NFC. »*

---

## 3. Le produit, concrètement

### 3.1 Le portfolio (cœur du produit, 100 % opérationnel)

Un utilisateur s'inscrit, choisit un template, remplit ses informations, et sa page est en ligne.

**Sections disponibles :** bandeau hero, expériences professionnelles, compétences avec niveau
(Débutant → Intermédiaire → Avancé → Expert), projets (avec lien démo, lien code et images),
formation, liens sociaux, bannière personnalisable.

**Domaines métier proposés :** TECH, AGRO, DROIT, MÉDECINE — quatre verticales à exploiter en
ciblage publicitaire, c'est déjà structuré dans la base.

**Visibilité :** chaque portfolio peut être public ou privé (accessible par lien seulement).

**46 templates**, organisés en 4 familles × 12 variantes de mise en page :

| Famille | Esprit | Exemples de noms |
|---|---|---|
| Editorial | magazine, typographique | Clarté, Larsson, Papier, Kodak, Manuscrit, Flagship |
| Classique | sobre, corporate | Atlas, Baobab, Savane, Marbre, Velours, Émeraude |
| Minimal | blanc, contrasté | Miel, Horizon, Organic, Béton, Cristal, Mono |
| Sombre | dark mode, tech | Nuit, Obsidian, Terminal, Carbone, Néon, Noir Absolu |

Les noms sont un vrai actif marketing : Baobab, Savane, Miel, Aurore, Émeraude — il y a une identité
ouest-africaine dans le catalogue, sous-exploitée dans la communication actuelle.

**Les templates sont débloqués par formule :** 1 en Gratuit → 6 en Starter → 21 en Pro → **46 en
Business**. C'est un levier d'upgrade très concret à mettre en avant.

### 3.2 Les analytics (opérationnel, avec un palier payant)

Pour chaque portfolio, sur 24 h / 7 j / 30 j / 90 j / tout :
vues totales, visiteurs uniques, répartition par pays, répartition par appareil (desktop / mobile /
tablette), source de trafic, taux de rebond.

**Réservé aux formules Pro et Business :** les **heatmaps de clics** et le **session replay**
(rejouer la visite d'un prospect). Ces deux fonctionnalités sont l'argument d'upgrade le plus fort
du produit — quasiment aucun concurrent grand public ne les propose sur un portfolio personnel.

### 3.3 La carte NFC ⚠️ **pas encore commercialisée**

C'est le point le plus important de ce brief.

Le hero du site, le nom de domaine, l'accroche « Votre carrière. En un scan. » — tout repose sur la
carte NFC. **Or la page `/nfc-types` affiche « Lancement imminent » et ne propose qu'un formulaire
de liste d'attente.** On ne peut pas encore commander de carte.

Ce qui est **annoncé** (et donc ce qu'on peut promettre, au futur) :
- Métal gravé au laser, nom du porteur gravé
- NFC intégré : un tap ouvre le portfolio, sans application à installer
- QR code de secours imprimé au dos si le NFC est indisponible
- Lien intelligent : la carte ne change jamais, le portfolio se met à jour
- **Prix annoncé : 30 000 F CFA l'unité**, commande ouverte **à partir de la formule Pro**
- Délai de livraison annoncé : 5 à 7 jours ouvrés à Dakar, davantage ailleurs
- Tarifs dégressifs annoncés à partir de 10 cartes pour les équipes

> **Conséquence marketing directe.** Tant que la carte n'est pas livrable, toute campagne centrée
> sur le NFC doit vendre **l'inscription à la liste d'attente**, pas la carte. La liste d'attente
> est d'ailleurs déjà instrumentée côté back-office (`/admin/nfc-waitlist`) : c'est une campagne de
> pré-lancement parfaitement exploitable, avec un compteur d'attente comme preuve sociale.

### 3.4 L'offre Business (B2B, opérationnel)

Une entreprise crée un compte, définit sa **charte** (logo, couleur primaire, secondaire, accent,
police) et cette charte s'applique automatiquement aux portfolios de toute l'équipe.

- Jusqu'à **50 membres** par compte entreprise
- **10 portfolios par membre** par défaut (réglable membre par membre)
- Invitation par email avec lien d'onboarding (`/business/join`)
- Deux rôles : administrateur d'entreprise et membre
- Le membre a un tableau de bord simplifié, sans paiement — l'entreprise centralise la facturation
- Espaces dédiés : tableau de bord, membres, portfolios d'équipe, analytics, paiements, réglages

**Cibles B2B naturelles :** agences immobilières, équipes commerciales, cabinets de conseil,
agences de com', écoles et incubateurs qui veulent équiper une promotion.

---

## 4. Les formules et les prix

**Devise : F CFA (XOF).** Les prix sont gérés en base de données depuis le back-office
(`/admin/plans`), ils ne sont pas figés dans le code — ils peuvent donc changer sans redéploiement.
**Vérifier les montants en vigueur dans l'admin avant de les écrire dans une pub.**

### Les cinq niveaux et leurs limites réelles (codées en dur dans le backend)

| | Gratuit | Starter | Pro / Professionnel | Premium | Business |
|---|---|---|---|---|---|
| Portfolios | 1 | 5 | 20 | illimité | selon le compte entreprise |
| Templates | 1 | 6 | 21 | 21 | **46** |
| Projets / portfolio | — | 3 | 10 | illimité | illimité |
| Compétences / portfolio | — | 3 | 10 | illimité | illimité |
| Expériences / portfolio | — | 0 | 5 | illimité | illimité |
| Liens sociaux | 1 | 3 | illimité | 5 | 5 |
| Heatmaps + session replay | ✗ | ✗ | ✓ | ✓ | ✓ |
| Commande de carte NFC | ✗ | ✗ | ✓ (à venir) | ✓ (à venir) | ✓ (à venir) |

> ⚠️ **Deux incohérences à arbitrer avant de communiquer sur les formules :**
> 1. **Premium est moins généreux que Pro sur les liens sociaux** (5 contre illimité), alors qu'il
>    est plus cher. Un prospect attentif le verra.
> 2. **Starter n'autorise aucune expérience professionnelle** (limite à 0). Vendre une formule
>    payante sur laquelle on ne peut pas afficher son parcours est difficile à défendre.

### Remises par durée (appliquées automatiquement)

| Durée | Remise |
|---|---|
| 1 mois | — |
| 3 mois | **−15 %** |
| 1 an | **−20 %** |

Argument déjà présent sur la landing : *« Commencez gratuitement, évoluez quand vous voulez.
Économisez jusqu'à 20 % en payant plusieurs mois. »*

---

## 5. Le paiement — le vrai différenciateur

### Wave (mobile money) — le canal principal
Le parcours est **semi-manuel**, et il faut le savoir pour écrire honnêtement :
1. L'utilisateur choisit sa formule et sa durée
2. Il envoie le montant au numéro marchand **+221 78 131 13 71** (ou scanne le QR marchand affiché)
3. Il saisit la **référence de transaction Wave** dans le formulaire
4. Un administrateur valide le paiement depuis le back-office
5. L'abonnement s'active, une facture est générée, un email de confirmation part

Le site annonce une validation **en moins de 30 minutes**. C'est une promesse opérationnelle qui
dépend d'un humain : elle doit être tenable avant d'être répétée en publicité.

### Stripe (carte bancaire, international)
Intégration complète avec webhooks, clés configurées en production. Ouvre la diaspora et
l'international.

### ⚠️ Orange Money
**Mentionné dans les textes du site** (FAQ : « Wave, Orange Money et carte bancaire » ; page À
propos : « des paiements sécurisés via Wave et Orange Money ») **mais aucune intégration technique
n'existe dans le code.** Il faut soit l'intégrer, soit le retirer du discours — c'est aujourd'hui
une promesse non tenue, sur une page qui parle justement de « Confiance ».

**Pourquoi c'est le différenciateur majeur :** les plateformes internationales de portfolio et de
carte de visite digitale (Linktree, Popl, HiHello, Carrd…) n'acceptent que la carte bancaire. Sur un
marché où la carte bancaire est minoritaire et le mobile money dominant, accepter Wave n'est pas une
commodité : **c'est la condition d'accès au marché.** C'est l'angle le plus fort de tout le
positionnement, et il est aujourd'hui relégué à une petite mention « Paiement Wave » sous le CTA.

---

## 6. Cibles

### B2C — les personnes
Freelances · designers · développeurs · étudiants et jeunes diplômés · commerciaux · agents
immobiliers · consultants · créatifs · entrepreneurs.

Les mots-clés SEO déjà ciblés dans le code confirment la cible : *portfolio en ligne, portfolio
professionnel, portfolio sénégal, portfolio développeur, portfolio designer, portfolio étudiant,
carte de visite digitale, carte NFC, créer portfolio gratuit, carte NFC sénégal*.

### B2B — les organisations
Agences immobilières · équipes commerciales · cabinets de conseil · agences de communication ·
écoles, incubateurs et programmes d'accompagnement.

### Géographie
**Cœur de cible : Sénégal (Dakar).** Le site affiche une présence à Dakar, Abidjan, Paris,
Casablanca, Montréal — soit l'Afrique de l'Ouest francophone plus la diaspora. La locale technique
est `fr_SN`, la devise F CFA, le support à Dakar.

---

## 7. Arguments de vente, par ordre de force

1. **Payer en F CFA avec Wave.** Le seul acteur du genre qui accepte le mobile money. Argument
   d'accès, pas de confort.
2. **Le portfolio vivant contre la carte en carton.** On modifie son parcours, la carte ne change
   pas. « Fini les cartes de visite perdues. »
3. **Voir qui regarde.** Heatmaps et session replay sur un portfolio personnel — quasi inexistant
   chez les concurrents grand public.
4. **46 designs, dont un vocabulaire visuel ouest-africain** (Baobab, Savane, Miel, Aurore).
5. **Gratuit pour toujours, sans carte bancaire.** Aucun frein à l'entrée.
6. **Fait à Dakar, support à Dakar sous 24 h.** Fierté locale et proximité réelle.
7. **Équiper toute une équipe sous une charte commune** (argument B2B).
8. **La carte NFC** — puissant, mais à formuler au futur tant qu'elle n'est pas livrable.

---

## 8. Ce que le marketing ne doit PAS dire (en l'état)

| Affirmation actuelle | Problème | Où |
|---|---|---|
| « Plateforme **N°1 au Sénégal** » | Aucune source, aucun classement. Claim risqué. | balise meta description |
| « **412 cartes NFC livrées** » | Contredit frontalement « Lancement imminent » sur `/nfc-types`. | page À propos |
| « 1 248 professionnels · 2 156 portfolios · 5 pays » | **Chiffres écrits en dur dans le code**, non connectés à la base. À vérifier dans l'admin avant tout réemploi. | page À propos |
| « Utilisé par des pros à Dakar, Abidjan, Paris, Casablanca, Montréal » | Non vérifiable en l'état. | bandeau de confiance, landing |
| « Paiement par **Orange Money** » | Non intégré techniquement. | FAQ, À propos |
| « **Domaines personnalisés** dès la formule Pro » | Le champ existe en base mais **aucun parcours utilisateur** ne permet de le configurer. | FAQ |
| « Commandez votre carte NFC » | Impossible aujourd'hui : liste d'attente uniquement. | à éviter dans toute campagne |

⚠️ **Trois formats d'URL différents circulent dans les textes du site** : la FAQ annonce
`portefolia.tech/votre-nom`, le visuel de la carte NFC montre `votre-nom.portefolia.tech`, et l'URL
réelle est **`portefolia.tech/portfolio/votre-nom`**. À unifier — c'est l'adresse qu'on va graver
sur des cartes en métal.

---

## 9. Contrainte SEO majeure ⚠️

Le site est une **application React monopage sans rendu serveur**. Les balises meta, Open Graph et
les données structurées JSON-LD sont impeccables — mais **le contenu des pages n'existe pas dans le
HTML livré** : un robot qui récupère `portefolia.tech` ne reçoit qu'une coquille vide.

Conséquences concrètes :
- Les pages publiques (landing, blog, FAQ, À propos) sont mal indexées malgré un bon travail de mots-clés
- **Chaque portfolio public partage la même image et le même titre de partage.** Quand un
  utilisateur envoie son portfolio sur WhatsApp ou LinkedIn, l'aperçu affiche « Portefolia » et non
  son nom, son métier, sa photo.

Ce second point est un handicap marketing direct : le partage viral est le canal d'acquisition
naturel de ce produit, et il est actuellement bridé. **Un aperçu de partage dynamique par portfolio
(og:image généré au nom de la personne) est probablement l'investissement au meilleur rapport
effort/impact du produit.**

---

## 10. Angles de campagne à exploiter

- **Pré-lancement NFC.** Vendre l'attente : compteur d'inscrits, révélation du design, coulisses de
  la gravure. La liste d'attente est déjà outillée.
- **« Payez en Wave ».** Un message frontal, assumé, en tête de landing. Aujourd'hui c'est une
  mention discrète sous le bouton ; ça devrait être un argument principal.
- **Verticales métier.** TECH, AGRO, DROIT, MÉDECINE sont déjà dans la base : quatre campagnes
  segmentées avec templates et exemples dédiés.
- **Étudiants et jeunes diplômés.** Le gratuit sans carte bancaire lève tout frein ; partenariats
  écoles et incubateurs à Dakar et Abidjan.
- **Comparatif « portfolio vivant vs carte de visite ».** Format court, très visuel, parfait pour
  TikTok / Reels / LinkedIn.
- **Templates comme contenu.** 46 designs nommés, c'est 46 posts possibles.
- **Preuve par les analytics.** « Sachez qui a ouvert votre portfolio » — angle rarement traité par
  la concurrence.
- **B2B agences immobilières.** Toute l'équipe, même charte, un lien par agent : démonstration facile.

---

## 11. Repères techniques (contexte, pas argument de vente)

- **Frontend** React 18 · TypeScript · Vite · Tailwind + shadcn/ui + Radix · React Router 6 ·
  TanStack Query · Framer Motion + GSAP · Chart.js / Recharts
- **Backend** Node.js · Express · MySQL · JWT + refresh tokens · bcrypt · Cloudinary (images) ·
  Nodemailer (`mail.portefolia.tech`) · Stripe webhooks
- **Back-office** complet : clients, portfolios, commandes, cartes NFC, liste d'attente, paiements
  Wave et Stripe, validation manuelle, remboursements, factures, formules, demandes d'upgrade,
  tableau de bord financier, blog, pages légales, notifications, messages de contact.
  Contrôle d'accès à 4 rôles administrateurs et journal d'audit de toutes les actions.
- **SEO déjà en place** : title, description, mots-clés, canonical, Open Graph complet, Twitter
  Card, JSON-LD Organization + WebSite, favicons, `theme-color` `#2E7D32`.

### Pages publiques
`/` accueil · `/upgrade` tarifs · `/nfc-types` carte NFC (liste d'attente) · `/blog` et `/blog/:slug`
· `/apropos` · `/carrieres` · `/faq` · `/contact` · `/docs` · `/portfolio/:slug` portfolio public
· `/auth` inscription et connexion · `/business/join` invitation d'équipe

---

## 12. À trancher avant de lancer les campagnes

1. **La carte NFC : date de lancement réelle ?** Tout le discours en dépend.
2. **Les chiffres de la page À propos** : les remplacer par les vrais, ou les retirer.
3. **Orange Money** : l'intégrer ou le supprimer des textes.
4. **Le claim « N°1 au Sénégal »** : le justifier ou le remplacer.
5. **Le format d'URL des portfolios** : en choisir un et l'appliquer partout.
6. **Les limites de Premium vs Pro** : corriger l'incohérence des liens sociaux.
7. **Les prix en vigueur** : les relever dans `/admin/plans`, ils ne sont pas dans le code.
8. **L'aperçu de partage par portfolio** : la priorité technique à impact marketing la plus élevée.

---

*Document établi à partir de l'analyse du code source de Portefolia — landing, pages publiques,
contrôleurs backend, modèles de base de données, catalogue de templates et parcours de paiement.
Les affirmations marquées ⚠️ sont des écarts constatés entre le discours du site et le
fonctionnement réel du produit.*
