// admin-data.js — realistic admin dataset (Senegal fintech context, F CFA)
window.fmtF = (n) => (n >= 1000000 ? (n / 1000000).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' M' : n.toLocaleString('fr-FR')) + ' F';
window.fmtFull = (n) => n.toLocaleString('fr-FR') + ' F CFA';
window.ADMIN = {
  me: { name: 'Mamadou Diallo', email: 'mamadou@portefolia.tech', role: 'super_admin' },
  roles: {
    super_admin: { label: 'Super Admin', color: '#B45309', tint: '#FEF3E2' },
    admin_technique: { label: 'Technique', color: '#1D4ED8', tint: '#EFF4FF' },
    admin_contenu: { label: 'Contenu', color: '#7C3AED', tint: '#F3EEFF' },
    admin_support: { label: 'Support', color: '#2E7D32', tint: '#EAF5EB' },
  },
  badges: { wave: 12, upgrades: 4, expired: 3 },

  // ── Dashboard KPIs ───────────────────────────────────────────
  kpiFin: {
    mrr: { valeur: 4820000, abonnes: 241, arpu: 20000, variation: 12.4 },
    pipeline: { total: 360000, nb: 12 },
    ca_mois: { total: 5240000, variation: 12.4 },
    churn: { taux: 2.3, perdus: 5 },
  },
  kpiPlat: [
    { label: 'Utilisateurs', value: 1248, delta: '+24%', icon: 'user', up: true },
    { label: 'Portfolios', value: 2156, delta: '+18%', icon: 'folder', up: true },
    { label: 'Cartes NFC', value: 412, delta: '+9%', icon: 'wifi', up: true },
    { label: 'Taux d\'activation', value: '87%', delta: '+3pts', icon: 'zap', up: true },
  ],
  // 12 months revenue (F CFA, thousands)
  revenueSeries: [2100, 2450, 2680, 3010, 3240, 3580, 3760, 4120, 4380, 4610, 4920, 5240],
  revenueMonths: ['Juil','Août','Sep','Oct','Nov','Déc','Jan','Fév','Mar','Avr','Mai','Juin'],
  revenueByFlux: [
    { label: 'Abonnements', value: 3680000, pct: 70, icon: 'sparkles' },
    { label: 'Cartes NFC', value: 1080000, pct: 21, icon: 'wifi' },
    { label: 'Upgrades', value: 480000, pct: 9, icon: 'rocket' },
  ],
  alertes: [
    { niveau: 'CRITIQUE', message: '3 comptes expirés non renouvelés', detail: 'Abonnements Pro arrivés à échéance il y a +7 jours', action: 'Relancer', to: 'admin-clients' },
    { niveau: 'ATTENTION', message: '12 paiements Wave à valider', detail: 'Total 360 000 F CFA en attente de confirmation', action: 'Valider', to: 'admin-wave' },
    { niveau: 'ATTENTION', message: '4 demandes d\'upgrade en attente', detail: 'Passages Starter → Pro à confirmer', action: 'Traiter', to: 'admin-wave' },
    { niveau: 'INFO', message: 'Pic d\'inscriptions : +64 cette semaine', detail: 'Campagne LinkedIn active depuis lundi', action: 'Voir', to: 'admin-clients' },
  ],
  sante: [
    { label: 'API', status: 'ok', value: '99.98%', sub: 'latence 82 ms' },
    { label: 'Base de données', status: 'ok', value: '99.99%', sub: '12 ms · 41% util.' },
    { label: 'Webhook Wave', status: 'warn', value: '98.4%', sub: '2 échecs (réessai)' },
    { label: 'Stockage', status: 'ok', value: '63%', sub: '126 / 200 Go' },
  ],
  activite: [
    { icon: 'card', who: 'Système', what: 'Paiement Wave validé', detail: 'Awa Ndiaye · 20 000 F CFA', when: 'il y a 8 min', tone: 'ok' },
    { icon: 'userplus', who: 'Inscription', what: 'Nouveau compte créé', detail: 'cheikh.fall@gmail.com', when: 'il y a 22 min', tone: 'info' },
    { icon: 'rocket', who: 'Fatou Bâ', what: 'Upgrade Starter → Pro', detail: '+20 000 F CFA / mois', when: 'il y a 1 h', tone: 'ok' },
    { icon: 'wifi', who: 'Commande NFC', what: 'Nouvelle commande de carte', detail: 'Ousmane Sow · noir mat', when: 'il y a 2 h', tone: 'info' },
    { icon: 'ban', who: 'Modération', what: 'Portfolio signalé masqué', detail: '/spam-promo-xyz', when: 'il y a 3 h', tone: 'danger' },
    { icon: 'usercog', who: 'A. Sow', what: 'Rôle modifié', detail: 'Support → Technique', when: 'il y a 5 h', tone: 'info' },
  ],

  // ── Clients ──────────────────────────────────────────────────
  clients: [
    { id: 1, name: 'Awa Ndiaye', email: 'awa.ndiaye@gmail.com', plan: 'Pro', status: 'active', portfolios: 4, nfc: 2, revenue: 240000, joined: '02/03/2025', phone: '+221 77 123 45 67', location: 'Dakar' },
    { id: 2, name: 'Cheikh Diop', email: 'cheikh.diop@sahelstudio.sn', plan: 'Business', status: 'active', portfolios: 12, nfc: 8, revenue: 1440000, joined: '14/01/2025', phone: '+221 78 234 56 78', location: 'Dakar' },
    { id: 3, name: 'Fatou Bâ', email: 'fatou.ba@gmail.com', plan: 'Pro', status: 'active', portfolios: 3, nfc: 1, revenue: 180000, joined: '21/02/2025', phone: '+221 76 345 67 89', location: 'Thiès' },
    { id: 4, name: 'Ousmane Sow', email: 'ousmane.sow@outlook.com', plan: 'Starter', status: 'pending', portfolios: 1, nfc: 0, revenue: 0, joined: '08/06/2026', phone: '+221 70 456 78 90', location: 'Saint-Louis' },
    { id: 5, name: 'Aminata Fall', email: 'aminata.fall@gmail.com', plan: 'Pro', status: 'expired', portfolios: 2, nfc: 1, revenue: 120000, joined: '11/09/2024', phone: '+221 77 567 89 01', location: 'Dakar' },
    { id: 6, name: 'Ibrahima Kane', email: 'ibrahima.kane@sahelstudio.sn', plan: 'Business', status: 'active', portfolios: 6, nfc: 4, revenue: 720000, joined: '03/12/2024', phone: '+221 78 678 90 12', location: 'Dakar' },
    { id: 7, name: 'Mariama Ndour', email: 'mariama.ndour@gmail.com', plan: 'Gratuit', status: 'active', portfolios: 1, nfc: 0, revenue: 0, joined: '29/05/2026', phone: '+221 76 789 01 23', location: 'Mbour' },
    { id: 8, name: 'Modou Gueye', email: 'modou.gueye@gmail.com', plan: 'Starter', status: 'suspended', portfolios: 2, nfc: 1, revenue: 60000, joined: '17/04/2025', phone: '+221 70 890 12 34', location: 'Rufisque' },
  ],

  // ── Wave validation queue ────────────────────────────────────
  waveQueue: [
    { id: 'WV-2041', client: 'Ousmane Sow', email: 'ousmane.sow@outlook.com', motif: 'Abonnement Pro', amount: 20000, ref: 'TXN-WAVE-7741', date: '13/06/2026 09:12', phone: '+221 70 456 78 90' },
    { id: 'WV-2040', client: 'Mariama Ndour', email: 'mariama.ndour@gmail.com', motif: 'Upgrade Starter → Pro', amount: 20000, ref: 'TXN-WAVE-7738', date: '13/06/2026 08:47', phone: '+221 76 789 01 23' },
    { id: 'WV-2039', client: 'Modou Gueye', email: 'modou.gueye@gmail.com', motif: 'Commande NFC ×2', amount: 60000, ref: 'TXN-WAVE-7735', date: '12/06/2026 19:30', phone: '+221 70 890 12 34' },
    { id: 'WV-2038', client: 'Seynabou Diouf', email: 'seynabou.diouf@gmail.com', motif: 'Abonnement Pro', amount: 20000, ref: 'TXN-WAVE-7730', date: '12/06/2026 16:05', phone: '+221 77 111 22 33' },
    { id: 'WV-2037', client: 'Pape Mbaye', email: 'pape.mbaye@gmail.com', motif: 'Commande NFC ×1', amount: 30000, ref: 'TXN-WAVE-7726', date: '12/06/2026 14:22', phone: '+221 78 222 33 44' },
  ],

  // ── Payments history ─────────────────────────────────────────
  paiements: [
    { id: 'PAY-9981', client: 'Awa Ndiaye', motif: 'Abonnement Pro', method: 'Wave', amount: 20000, status: 'validated', date: '13/06/2026' },
    { id: 'PAY-9980', client: 'Cheikh Diop', motif: 'Abonnement Business', method: 'Orange Money', amount: 120000, status: 'validated', date: '12/06/2026' },
    { id: 'PAY-9979', client: 'Ousmane Sow', motif: 'Abonnement Pro', method: 'Wave', amount: 20000, status: 'pending', date: '13/06/2026' },
    { id: 'PAY-9978', client: 'Fatou Bâ', motif: 'Commande NFC', method: 'Wave', amount: 30000, status: 'validated', date: '11/06/2026' },
    { id: 'PAY-9977', client: 'Modou Gueye', motif: 'Commande NFC ×2', method: 'Wave', amount: 60000, status: 'pending', date: '12/06/2026' },
    { id: 'PAY-9976', client: 'Aminata Fall', motif: 'Renouvellement Pro', method: 'Carte', amount: 20000, status: 'rejected', date: '10/06/2026' },
    { id: 'PAY-9975', client: 'Ibrahima Kane', motif: 'Abonnement Business', method: 'Orange Money', amount: 120000, status: 'validated', date: '09/06/2026' },
    { id: 'PAY-9974', client: 'Mariama Ndour', motif: 'Upgrade Pro', method: 'Wave', amount: 20000, status: 'pending', date: '13/06/2026' },
  ],

  // ── Admin team ───────────────────────────────────────────────
  team: [
    { name: 'Mamadou Diallo', email: 'mamadou@portefolia.tech', role: 'super_admin', last: 'En ligne', active: true },
    { name: 'Awa Diané', email: 'awa.diane@portefolia.tech', role: 'admin_technique', last: 'il y a 12 min', active: true },
    { name: 'Sokhna Mbaye', email: 'sokhna.mbaye@portefolia.tech', role: 'admin_contenu', last: 'il y a 2 h', active: true },
    { name: 'Babacar Sy', email: 'babacar.sy@portefolia.tech', role: 'admin_support', last: 'il y a 1 j', active: false },
  ],
};
