// Définition des visites guidées (onboarding), une par plan / rôle.
// Chaque étape pointe (optionnellement) vers un élément portant l'attribut
// `data-tour="<target>"`. Sans cible, ou si la cible est introuvable,
// l'étape s'affiche au centre de l'écran.

export type TourKey =
  | 'personal_free'
  | 'personal_starter'
  | 'personal_pro'
  | 'business_admin'
  | 'business_member';

export interface TourStep {
  /** Identifiant stable : sert à reprendre la visite même si l'ordre des étapes change */
  id: string;
  /** Page sur laquelle l'étape doit s'afficher (navigation automatique) */
  route: string;
  /** Valeur de l'attribut data-tour de l'élément à mettre en avant */
  target?: string;
  title: string;
  content: string;
  /** 'click' : l'utilisateur doit cliquer lui-même sur la cible pour passer à l'étape suivante */
  action?: 'click';
  /** Consigne affichée pour une étape interactive */
  hint?: string;
}

export interface TourDef {
  key: TourKey;
  label: string;
  steps: TourStep[];
}

// ─── Blocs réutilisables ──────────────────────────────────────────────────────

const CREATE_FLOW =
  "Un assistant en 3 étapes vous guide : 1. Données (photo, titre, bio, projets, compétences, expériences, liens sociaux), 2. choix du template, 3. récapitulatif. Cochez « Public » pour qu'il soit visible en ligne.";

/** Modifier / partager / supprimer : actions présentes sur chaque carte de portfolio */
const portfolioActionSteps = (route: string): TourStep[] => [
  {
    id: 'pf-edit',
    route,
    target: 'pf-edit',
    title: 'Modifier un portfolio',
    content: "Le crayon rouvre l'assistant : changez vos informations, ajoutez des sections ou passez à un autre template, puis validez. Les modifications sont en ligne immédiatement.",
  },
  {
    id: 'pf-share',
    route,
    target: 'pf-share',
    title: 'Partager',
    content: "Copiez le lien de votre portfolio pour l'envoyer ou le mettre dans votre signature, ou ouvrez-le en ligne avec l'icône voisine.",
  },
  {
    id: 'pf-delete',
    route,
    target: 'pf-delete',
    title: 'Supprimer un portfolio',
    content: "La corbeille supprime le portfolio après confirmation. Attention : c'est définitif, et son lien public ne fonctionnera plus. Cela libère une place dans votre formule.",
  },
];

/** Cartes NFC : présentation, commande (bientôt) et liste d'attente */
const nfcSteps = (fromRoute: string, nfcRoute: string): TourStep[] => [
  {
    id: 'go-nfc',
    route: fromRoute,
    target: 'nav-nfc',
    action: 'click',
    hint: 'Cliquez sur « Cartes NFC »',
    title: 'Les cartes NFC',
    content: "Une carte de visite connectée : approchée d'un téléphone, elle ouvre votre portfolio, sans application. Ouvrez la page Cartes NFC.",
  },
  {
    id: 'nfc-order',
    route: nfcRoute,
    target: 'nfc-order',
    title: 'Commander une carte',
    content: "Bientôt disponible. Pour commander, vous choisirez le portfolio relié à la carte et la quantité (12 500 F CFA par carte), puis vous paierez. À réception, vous activerez la carte depuis cette page. Il faut au moins un portfolio pour commander.",
  },
  {
    id: 'go-waitlist',
    route: nfcRoute,
    target: 'nfc-learn',
    action: 'click',
    hint: 'Cliquez sur « En savoir plus »',
    title: 'Précommandez votre carte',
    content: 'Les précommandes sont ouvertes : réservez votre carte et payez avec Wave.',
  },
  {
    id: 'nfc-waitlist',
    route: '/nfc-types',
    target: 'nfc-waitlist',
    title: 'La précommande',
    content: "Remplissez le formulaire (nom à imprimer, email, téléphone, quantité) puis validez. Vous recevrez par email les instructions de paiement Wave et un lien pour suivre votre précommande.",
  },
];

const userMenuStep = (route: string, extra: string): TourStep => ({
  id: 'user-menu',
  route,
  target: 'user-menu',
  title: 'Votre compte',
  content: `${extra} C'est aussi ici que vous pourrez relancer cette visite guidée à tout moment.`,
});

// ─── Comptes personnels (Gratuit / Starter / Pro) ─────────────────────────────

interface PersonalPlan {
  key: TourKey;
  planLabel: string;
  portfolioLimit: string;
  itemLimits: string;
  analytics: TourStep;
  upgrade: TourStep;
}

const personalTour = (plan: PersonalPlan): TourDef => ({
  key: plan.key,
  label: 'Visite de votre espace',
  steps: [
    {
      id: 'welcome',
      route: '/dashboard',
      title: 'Bienvenue sur Portefolia',
      content: `Vous êtes sur la formule ${plan.planLabel}. Cette visite vous montre comment créer, modifier et partager vos portfolios, et ce que votre formule inclut. Vous pouvez la quitter à tout moment : nous retiendrons où vous vous êtes arrêté.`,
    },
    {
      id: 'dashboard-kpis',
      route: '/dashboard',
      target: 'dashboard-kpis',
      title: "Vue d'ensemble",
      content: "Suivez d'un coup d'œil le nombre de portfolios, les vues totales et ceux qui sont visibles en ligne.",
    },
    {
      id: 'go-portfolios',
      route: '/dashboard',
      target: 'nav-portfolios',
      action: 'click',
      hint: 'Cliquez sur « Mes Portfolios »',
      title: 'Vos portfolios',
      content: 'Tout se gère depuis la page Mes Portfolios. Ouvrez-la depuis la barre de navigation.',
    },
    {
      id: 'portfolios-list',
      route: '/dashboard/portfolios',
      target: 'portfolios-new',
      title: 'Créer un portfolio',
      content: `${CREATE_FLOW} Votre formule permet ${plan.portfolioLimit}, avec ${plan.itemLimits}.`,
    },
    ...portfolioActionSteps('/dashboard/portfolios'),
    plan.analytics,
    plan.upgrade,
    ...nfcSteps('/dashboard/portfolios', '/dashboard/nfc-cards'),
    userMenuStep('/dashboard', 'Modifiez votre profil, consultez vos paiements et gérez les paramètres de votre compte.'),
    {
      id: 'finish',
      route: '/dashboard',
      title: 'Vous êtes prêt !',
      content: 'Vous savez maintenant créer, modifier, partager et supprimer vos portfolios. À vous de jouer : créez le premier et partagez-le.',
    },
  ],
});

// ─── Visites ──────────────────────────────────────────────────────────────────

export const TOURS: Record<TourKey, TourDef> = {
  personal_free: personalTour({
    key: 'personal_free',
    planLabel: 'Gratuit',
    portfolioLimit: '1 portfolio',
    itemLimits: '2 projets, 2 compétences et 1 expérience',
    analytics: {
      id: 'analytics',
      route: '/dashboard/portfolios',
      target: 'nav-upgrade',
      title: 'Statistiques',
      content: "Les statistiques ne sont pas incluses dans la formule Gratuite. Starter : visites, sources de trafic et appareils. Pro : en plus, heatmaps et Session Replay. Business : en plus, géolocalisation des visiteurs.",
    },
    upgrade: {
      id: 'nav-upgrade',
      route: '/dashboard/portfolios',
      target: 'nav-upgrade',
      title: 'Formules',
      content: "Passez à une formule supérieure ici pour créer plus de portfolios, lever les limites de sections, débloquer d'autres templates et les statistiques.",
    },
  }),
  personal_starter: personalTour({
    key: 'personal_starter',
    planLabel: 'Starter',
    portfolioLimit: "jusqu'à 5 portfolios",
    itemLimits: '3 projets et 3 compétences par portfolio',
    analytics: {
      id: 'analytics',
      route: '/dashboard/portfolios',
      target: 'pf-analytics',
      title: 'Statistiques',
      content: "L'icône graphique de chaque portfolio ouvre ses statistiques. Votre formule Starter inclut les visites, les sources de trafic et les appareils utilisés. Heatmaps et Session Replay sont disponibles avec Pro.",
    },
    upgrade: {
      id: 'nav-upgrade',
      route: '/dashboard/portfolios',
      target: 'nav-upgrade',
      title: 'Formules',
      content: "Consultez votre abonnement ou passez à Pro pour plus de portfolios, des sections étendues et des statistiques avancées.",
    },
  }),
  personal_pro: personalTour({
    key: 'personal_pro',
    planLabel: 'Pro',
    portfolioLimit: "jusqu'à 20 portfolios",
    itemLimits: "jusqu'à 10 projets, 10 compétences et 5 expériences par portfolio",
    analytics: {
      id: 'analytics',
      route: '/dashboard/portfolios',
      target: 'pf-analytics',
      title: 'Statistiques avancées',
      content: "L'icône graphique de chaque portfolio ouvre ses statistiques : visites, sources de trafic, appareils, heatmaps (où cliquent vos visiteurs) et Session Replay (le parcours de chaque visite). La géolocalisation est réservée à Business.",
    },
    upgrade: {
      id: 'nav-upgrade',
      route: '/dashboard/portfolios',
      target: 'nav-upgrade',
      title: 'Formules',
      content: 'Consultez votre abonnement, renouvelez-le ou passez à une formule supérieure.',
    },
  }),

  business_admin: {
    key: 'business_admin',
    label: 'Visite de votre espace Business',
    steps: [
      {
        id: 'welcome',
        route: '/business/dashboard',
        title: 'Bienvenue dans votre espace Business',
        content: "Découvrez comment inviter et gérer vos collaborateurs, personnaliser l'espace à vos couleurs, gérer vos portfolios et vos cartes NFC. Vous pouvez quitter à tout moment et reprendre plus tard.",
      },
      {
        id: 'biz-stats',
        route: '/business/dashboard',
        target: 'biz-stats',
        title: 'Votre tableau de bord',
        content: 'Membres actifs, invitations en attente, portfolios créés par vos agents et capacité utilisée de votre espace.',
      },
      {
        id: 'biz-actions',
        route: '/business/dashboard',
        target: 'biz-actions',
        title: 'Actions rapides',
        content: 'Les raccourcis vers les trois tâches principales : créer un portfolio, gérer les membres et personnaliser votre marque.',
      },
      {
        id: 'go-members',
        route: '/business/dashboard',
        target: 'nav-members',
        action: 'click',
        hint: 'Cliquez sur « Membres »',
        title: 'Votre équipe',
        content: "Commençons par l'essentiel : inviter et gérer vos collaborateurs. Ouvrez la page Membres.",
      },
      {
        id: 'members-invite',
        route: '/business/members',
        target: 'members-invite',
        title: 'Invitez vos collaborateurs',
        content: "Saisissez l'email d'un collaborateur (et son poste, si vous le souhaitez) puis cliquez sur « Inviter ». Il reçoit un lien pour rejoindre votre espace.",
      },
      {
        id: 'members-list',
        route: '/business/members',
        target: 'members-list',
        title: 'Gérez vos membres',
        content: "Filtrez par statut (actifs, en attente, suspendus), cherchez un membre, consultez ses portfolios, suspendez ou réactivez son accès, ou retirez-le de l'espace.",
      },
      {
        id: 'go-settings',
        route: '/business/members',
        target: 'nav-settings',
        action: 'click',
        hint: 'Cliquez sur « Personnalisation »',
        title: 'Votre marque',
        content: "Passons à l'identité visuelle de votre espace. Ouvrez la page Personnalisation.",
      },
      {
        id: 'settings-info',
        route: '/business/settings',
        target: 'settings-info',
        title: 'Informations entreprise',
        content: "Nom, description, site web et coordonnées : ces informations apparaissent dans l'espace et sur les portfolios de vos agents.",
      },
      {
        id: 'settings-logo',
        route: '/business/settings',
        target: 'settings-logo',
        title: 'Votre logo',
        content: 'Importez votre logo : il remplace celui de Portefolia dans la navigation de tous vos membres.',
      },
      {
        id: 'settings-colors',
        route: '/business/settings',
        target: 'settings-colors',
        title: 'Vos couleurs',
        content: "Définissez les couleurs principale, secondaire et d'accent. Elles sont appliquées aux boutons, bandeaux et badges de tout l'espace.",
      },
      {
        id: 'settings-font',
        route: '/business/settings',
        target: 'settings-font',
        title: 'Votre typographie',
        content: "Choisissez la police utilisée dans l'espace de votre entreprise.",
      },
      {
        id: 'settings-save',
        route: '/business/settings',
        target: 'settings-save',
        title: 'Enregistrez',
        content: 'Pensez à sauvegarder : vos membres verront la nouvelle identité dès leur prochaine visite.',
      },
      {
        id: 'go-portfolios',
        route: '/business/settings',
        target: 'nav-portfolios',
        action: 'click',
        hint: 'Cliquez sur « Mes Portfolios »',
        title: 'Vos portfolios',
        content: 'Voyons maintenant comment créer et gérer les portfolios de votre entreprise.',
      },
      {
        id: 'nav-portfolios',
        route: '/business/portfolios',
        target: 'portfolios-create',
        title: 'Créer un portfolio Business',
        content: `${CREATE_FLOW} Avec Business, le nombre de portfolios et de sections est illimité, et votre charte graphique est appliquée.`,
      },
      ...portfolioActionSteps('/business/portfolios'),
      {
        id: 'analytics',
        route: '/business/portfolios',
        target: 'nav-analytics',
        title: "Analytics de l'équipe",
        content: "Votre formule inclut toutes les statistiques, pour vos portfolios comme pour ceux de vos agents : visites, sources de trafic, appareils, heatmaps, Session Replay et géolocalisation des visiteurs.",
      },
      {
        id: 'nav-payments',
        route: '/business/portfolios',
        target: 'nav-payments',
        title: 'Paiements',
        content: 'Suivez votre abonnement Business, vos factures et vos renouvellements.',
      },
      ...nfcSteps('/business/portfolios', '/business/nfc-cards'),
      userMenuStep('/business/dashboard', 'Accédez à votre profil, vos paiements et les paramètres de votre compte.'),
      {
        id: 'finish',
        route: '/business/dashboard',
        title: 'Votre espace est prêt',
        content: 'Prochaine étape conseillée : personnalisez votre marque, puis invitez vos premiers collaborateurs.',
      },
    ],
  },

  business_member: {
    key: 'business_member',
    label: 'Visite de votre espace',
    steps: [
      {
        id: 'welcome',
        route: '/business/member',
        title: 'Bienvenue dans votre espace',
        content: 'Votre entreprise vous a invité sur Portefolia. Cette visite vous montre comment créer, modifier et partager vos portfolios, suivre leurs statistiques et obtenir votre carte NFC.',
      },
      {
        id: 'member-actions',
        route: '/business/member',
        target: 'member-actions',
        title: 'Actions rapides',
        content: 'Créez un portfolio aux couleurs de votre entreprise, ou retrouvez ceux que vous avez déjà créés.',
      },
      {
        id: 'go-portfolios',
        route: '/business/member',
        target: 'nav-portfolios',
        action: 'click',
        hint: 'Cliquez sur « Mes Portfolios »',
        title: 'Mes portfolios',
        content: 'Ouvrez la page qui regroupe tous vos portfolios.',
      },
      {
        id: 'nav-portfolios',
        route: '/business/portfolios',
        target: 'portfolios-create',
        title: 'Créer un portfolio',
        content: `${CREATE_FLOW} Le nombre de portfolios que vous pouvez créer est fixé par votre administrateur.`,
      },
      ...portfolioActionSteps('/business/portfolios'),
      {
        id: 'analytics',
        route: '/business/portfolios',
        target: 'nav-analytics',
        title: 'Analytics',
        content: 'Suivez les visites de vos portfolios : sources de trafic, appareils, heatmaps, Session Replay et géolocalisation.',
      },
      ...nfcSteps('/business/portfolios', '/business/nfc-cards'),
      userMenuStep('/business/member', 'Complétez votre profil et gérez les paramètres de votre compte.'),
      {
        id: 'finish',
        route: '/business/member',
        title: "C'est parti !",
        content: 'Créez votre premier portfolio et partagez-le avec vos contacts.',
      },
    ],
  },
};
