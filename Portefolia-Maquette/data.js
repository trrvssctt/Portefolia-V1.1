// data.js — mock data for the Portefolia prototype (Dakar / Wave / F CFA context)
window.DATA = {
  profile: { prenom: 'Awa', nom: 'Ndiaye', email: 'awa.ndiaye@gmail.com', plan: 'pro' },
  plan: {
    type: 'pro', label: 'Pro', name: 'Formule Pro', price: '20 000 F CFA',
    limit: 20, renew: '14 juil. 2026',
  },
  kpis: {
    portfolios: 4, vues: 1648, activites: 12, publics: 3,
  },
  portfolios: [
    { id: 1, title: 'Awa Ndiaye — Product Designer', slug: 'awa-ndiaye', desc: 'Portfolio principal · études de cas produit & design systems', public: true, views: 1218, date: '02/03/2026', accent: true },
    { id: 2, title: 'UX Case Studies 2025', slug: 'awa-ux', desc: 'Sélection de 6 études de cas approfondies', public: true, views: 342, date: '18/12/2025' },
    { id: 3, title: 'Freelance — Design Systems', slug: 'awa-freelance', desc: 'Offre de mission & références clients', public: false, views: 0, date: '04/11/2025' },
    { id: 4, title: 'Portfolio Photo', slug: 'awa-photo', desc: 'Travaux personnels de photographie', public: true, views: 88, date: '21/09/2025' },
  ],
  activity: [
    { type: 'portfolio_created', icon: 'folder', title: 'Portfolio créé', desc: 'UX Case Studies 2025', when: 'il y a 2 jours' },
    { type: 'payment_made', icon: 'card', title: 'Paiement reçu', desc: 'Formule Pro · 20 000 F CFA', when: 'il y a 5 jours' },
    { type: 'view', icon: 'trending', title: 'Pic de vues', desc: '+214 vues sur « Awa Ndiaye »', when: 'il y a 6 jours' },
    { type: 'login', icon: 'user', title: 'Connexion', desc: 'Nouvel appareil · Dakar', when: 'il y a 1 semaine' },
    { type: 'portfolio_created', icon: 'folder', title: 'Portfolio publié', desc: 'Portfolio Photo rendu public', when: 'il y a 2 semaines' },
  ],
  // ── Public portfolio (Awa Ndiaye) ──────────────────────────────
  portfolio: {
    title: 'Awa Ndiaye',
    role: 'Product Designer',
    location: 'Dakar, Sénégal',
    phone: '+221 77 123 45 67',
    bio: "Product designer spécialisée en design systems et produits fintech. J'aide les équipes à transformer des problèmes complexes en interfaces claires, accessibles et mesurables — du cadrage à la mise en production.",
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop&crop=faces',
    socials: [
      { key: 'linkedin', label: 'LinkedIn', icon: 'linkedin' },
      { key: 'dribbble', label: 'Dribbble', icon: 'dribbble' },
      { key: 'github', label: 'GitHub', icon: 'github' },
      { key: 'website', label: 'awandiaye.design', icon: 'globe' },
    ],
    skills: [
      { name: 'Figma & Prototypage', level: 95 },
      { name: 'Design Systems', level: 90 },
      { name: 'Recherche utilisateur', level: 78 },
      { name: 'Design d\'interaction', level: 84 },
    ],
    tags: ['Accessibilité', 'Webflow', 'Design Tokens', 'Atelier produit', 'Data viz'],
    experiences: [
      { position: 'Lead Product Designer', company: 'Wave', period: 'Jan. 2023 — Présent', location: 'Dakar', current: true, desc: "Pilotage du design system mobile money utilisé par 8 équipes. Refonte du parcours de transfert : -32% d'abandons et +18 pts de satisfaction." },
      { position: 'Product Designer', company: 'Sonatel — Orange', period: '2021 — 2023', location: 'Dakar', desc: "Conception des apps Orange Money & Orange et Moi. Mise en place de la première bibliothèque de composants partagée entre web et mobile." },
      { position: 'UI Designer', company: 'Freelance', period: '2019 — 2021', location: 'Remote', desc: 'Identités et interfaces pour des startups ouest-africaines (e-commerce, e-learning, logistique).' },
    ],
    projects: [
      { title: 'Refonte App Mobile Banking', desc: "Repensé de zéro le parcours d'envoi d'argent pour 2M+ d'utilisateurs, avec un système de confirmation sans friction.", tech: ['Figma', 'Design System', 'Recherche'], img: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop' },
      { title: 'Design System « Kaolack »', desc: 'Bibliothèque de 120+ composants, tokens multi-thèmes et documentation vivante adoptée par toute l\'organisation.', tech: ['Tokens', 'Storybook', 'Docs'], img: 'https://images.unsplash.com/photo-1559028012-481c04fa702d?w=600&h=400&fit=crop' },
      { title: 'Plateforme E-learning', desc: 'Expérience d\'apprentissage mobile-first pour des formations professionnelles certifiantes au Sénégal.', tech: ['Webflow', 'UX', 'Motion'], img: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=600&h=400&fit=crop' },
      { title: 'Dashboard Analytics', desc: 'Tableau de bord temps réel pour le suivi de la performance produit et des cohortes utilisateurs.', tech: ['Data viz', 'Figma'], img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop' },
    ],
  },

  // ── Portfolios grid (Mes Portfolios) ───────────────────────────
  portfoliosGrid: [
    { id: 1, title: 'Awa Ndiaye — Product Designer', slug: 'awa-ndiaye', bio: 'Portfolio principal · études de cas produit & design systems', public: true, views: 1218, contacts: 64, date: '2 mars 2026', top: true, accent: true },
    { id: 2, title: 'UX Case Studies 2025', slug: 'awa-ux', bio: 'Sélection de 6 études de cas approfondies sur le mobile money.', public: true, views: 342, contacts: 12, date: '18 déc. 2025' },
    { id: 3, title: 'Freelance — Design Systems', slug: 'awa-freelance', bio: 'Offre de mission & références clients pour accompagnement design system.', public: false, views: 0, contacts: 0, date: '4 nov. 2025' },
    { id: 4, title: 'Portfolio Photo', slug: 'awa-photo', bio: 'Travaux personnels de photographie argentique.', public: true, views: 88, contacts: 3, date: '21 sept. 2025' },
  ],

  // ── Cartes NFC ─────────────────────────────────────────────────
  nfc: {
    cards: [
      { id: 1, portfolio: 'Awa Ndiaye — Product Designer', uid: 'PF-9A3D-77E1', status: 'active', ordered: '2 mars 2026', activated: '5 mars 2026' },
      { id: 2, portfolio: 'UX Case Studies 2025', uid: 'PF-2B5C-10F4', status: 'active', ordered: '20 déc. 2025', activated: '22 déc. 2025' },
      { id: 3, portfolio: 'Freelance — Design Systems', uid: 'PF-7E1A-58C9', status: 'pending', ordered: '10 jan. 2026', activated: null },
    ],
    price: '30 000 F CFA',
  },

  // ── Formules (pricing) ─────────────────────────────────────────
  plans: [
    { name: 'Gratuit', slug: 'free', price: '0', period: 'pour toujours', desc: 'Pour démarrer et tester la plateforme.', features: ['1 portfolio professionnel', 'Sous-domaine portefolia.tech', 'Statistiques de base', 'Support par email'], cta: 'Commencer', tone: 'ink' },
    { name: 'Pro', slug: 'pro', price: '20 000', period: 'par mois', desc: 'Pour les indépendants et freelances exigeants.', features: ['Jusqu\'à 20 portfolios', 'Cartes NFC illimitées', 'Domaine personnalisé', 'Analytics avancées', 'Collecte de contacts', 'Support prioritaire'], cta: 'Choisir Pro', popular: true, tone: 'accent' },
    { name: 'Business', slug: 'business', price: '120 000', period: 'par mois', desc: 'Pour les équipes et entreprises.', features: ['Portfolios illimités', 'Jusqu\'à 50 membres', 'Image de marque entreprise', 'Tableau de bord centralisé', 'Analytics agrégées', 'Account manager dédié'], cta: 'Choisir Business', tone: 'business' },
  ],

  // ── Analytics ──────────────────────────────────────────────────
  analytics: {
    kpis: [
      { label: 'Vues de profil', value: '4 820', delta: '+12,4%', up: true },
      { label: 'Scans NFC', value: '1 204', delta: '+8,1%', up: true },
      { label: 'Contacts collectés', value: '318', delta: '+21,0%', up: true },
      { label: 'Taux de conversion', value: '6,6%', delta: '−0,4%', up: false },
    ],
    // 12 weeks of views (sparkline / bar chart)
    series: [180, 220, 195, 260, 240, 310, 290, 360, 340, 420, 460, 540],
    sources: [
      { label: 'Carte NFC', pct: 46 },
      { label: 'Lien direct', pct: 28 },
      { label: 'LinkedIn', pct: 14 },
      { label: 'QR code', pct: 8 },
      { label: 'Autre', pct: 4 },
    ],
    countries: [
      { name: 'Sénégal', pct: 62, flag: '🇸🇳' },
      { name: 'France', pct: 18, flag: '🇫🇷' },
      { name: 'Côte d\'Ivoire', pct: 9, flag: '🇨🇮' },
      { name: 'Canada', pct: 6, flag: '🇨🇦' },
      { name: 'Maroc', pct: 5, flag: '🇲🇦' },
    ],
    topPortfolios: [
      { title: 'Awa Ndiaye — Product Designer', views: 1218, pct: 74 },
      { title: 'UX Case Studies 2025', views: 342, pct: 21 },
      { title: 'Portfolio Photo', views: 88, pct: 5 },
    ],
  },

  // ── Business ───────────────────────────────────────────────────
  business: {
    company: 'Sahel Studio',
    admin: 'Mamadou',
    kpis: { members: 23, pending: 4, portfolios: 41, capacity: 46 },
    plan: { name: 'Business', renew: '14 juil. 2026' },
    portfolios: [
      { title: 'Sahel Studio — Brand', slug: 'sahel-brand', public: true },
      { title: 'Équipe Commerciale', slug: 'sahel-sales', public: true },
      { title: 'Direction', slug: 'sahel-board', public: false },
    ],
    members: [
      { name: 'Fatou Bâ', email: 'fatou.ba@sahelstudio.sn', role: 'Designer', status: 'active', portfolios: 3, limit: 5 },
      { name: 'Cheikh Diop', email: 'cheikh.diop@sahelstudio.sn', role: 'Commercial', status: 'active', portfolios: 2, limit: 5 },
      { name: 'Aminata Sow', email: 'aminata.sow@sahelstudio.sn', role: 'Directrice', status: 'active', portfolios: 4, limit: 5 },
      { name: 'invité', email: 'ibrahima.kane@sahelstudio.sn', role: 'Commercial', status: 'pending', portfolios: 0, limit: 5 },
      { name: 'Ousmane Fall', email: 'ousmane.fall@sahelstudio.sn', role: 'Développeur', status: 'suspended', portfolios: 1, limit: 5 },
    ],
  },
};
