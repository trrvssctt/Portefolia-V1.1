// tpl-data.js — mock data for portfolio templates (Sénégal). window.TPL_DATA
window.TPL_DATA = {
  name: 'Aminata Diallo',
  firstName: 'Aminata',
  role: 'Designer UX & Product',
  location: 'Dakar, Sénégal',
  email: 'aminata.diallo@gmail.com',
  phone: '+221 77 123 45 67',
  tagline: "Je transforme les idées en expériences numériques mémorables",
  bioShort: "Designer produit centrée utilisateur, passionnée par le design inclusif adapté au contexte africain.",
  bio: "Je crée des expériences numériques centrées sur l'utilisateur. Passionnée par le design inclusif et les solutions adaptées au contexte africain, j'accompagne startups et institutions de l'idée au produit fini — du cadrage à la mise en production. Cinq ans d'expérience entre Dakar et Abidjan.",
  avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop&crop=faces',
  stats: [
    { value: '5', label: "ans d'expérience" },
    { value: '40+', label: 'projets livrés' },
    { value: '18', label: 'clients' },
  ],
  socials: [
    { key: 'linkedin', label: 'LinkedIn', icon: 'linkedin', handle: 'aminata-diallo' },
    { key: 'github', label: 'GitHub', icon: 'github', handle: 'aminatad' },
    { key: 'dribbble', label: 'Dribbble', icon: 'dribbble', handle: 'aminata' },
    { key: 'mail', label: 'Email', icon: 'mail', handle: 'aminata.diallo@gmail.com' },
  ],
  skillGroups: [
    { cat: 'Design', items: ['Figma', 'Adobe XD', 'Prototypage', 'Design System'] },
    { cat: 'Recherche', items: ['User Research', 'Tests utilisateurs', 'Accessibilité'] },
    { cat: 'Méthodes', items: ['Design Thinking', 'Ateliers', 'Design Sprint'] },
  ],
  skillsFlat: ['Figma', 'User Research', 'Prototypage', 'Adobe XD', 'Design System', 'Accessibilité', 'Design Thinking', 'Motion'],
  skillLevels: [
    { name: 'Figma & Prototypage', level: 95 },
    { name: 'Design Systems', level: 90 },
    { name: 'Recherche utilisateur', level: 80 },
    { name: "Design d'interaction", level: 85 },
  ],
  experiences: [
    { position: 'Lead Product Designer', company: 'Wave', period: '2023 — Présent', location: 'Dakar', desc: "Pilotage du design system mobile money utilisé par 8 équipes. Refonte du parcours de transfert : -32% d'abandons.", current: true },
    { position: 'Product Designer', company: 'Sonatel — Orange', period: '2021 — 2023', location: 'Dakar', desc: "Conception des apps Orange Money & Orange et Moi. Première bibliothèque de composants partagée web/mobile." },
    { position: 'UI Designer', company: 'Freelance', period: '2019 — 2021', location: 'Abidjan', desc: 'Identités et interfaces pour des startups ouest-africaines (e-commerce, e-learning, logistique).' },
  ],
  projects: [
    { title: 'Wave App Redesign', cat: 'Fintech', desc: "Refonte du parcours d'envoi d'argent pour 2M+ d'utilisateurs, confirmation sans friction.", img: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop' },
    { title: 'Plateforme e-commerce Jumia', cat: 'E-commerce', desc: "Expérience d'achat mobile-first repensée pour les marchés d'Afrique de l'Ouest.", img: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=600&h=400&fit=crop' },
    { title: 'App mobile santé', cat: 'Santé', desc: 'Suivi médical et prise de rendez-vous pour cliniques privées à Dakar.', img: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&h=400&fit=crop' },
    { title: 'Dashboard Analytics', cat: 'Data', desc: 'Tableau de bord temps réel pour le suivi de performance produit et cohortes.', img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop' },
  ],
};
