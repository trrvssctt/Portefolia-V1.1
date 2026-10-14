// Statuts d'une commande de carte NFC (paiement puis production), libellés communs client / admin
export type OrderStatus =
  | 'pending_payment' | 'payment_submitted' | 'rejected' | 'paid'
  | 'design_en_cours' | 'bat_envoye' | 'bat_valide' | 'en_impression' | 'prete' | 'livree'
  | 'cancelled' | 'expired' | 'converted';

export const ORDER_STATUS: Record<OrderStatus, { label: string; client: string; color: string; bg: string }> = {
  pending_payment:   { label: 'Attente paiement',  client: 'En attente de votre paiement Wave', color: '#1D4ED8', bg: '#DBEAFE' },
  payment_submitted: { label: 'À valider',         client: 'Paiement en cours de vérification', color: '#B45309', bg: '#FEF3C7' },
  rejected:          { label: 'Paiement refusé',   client: 'Paiement non confirmé',             color: '#B91C1C', bg: '#FEE2E2' },
  paid:              { label: 'Payée',             client: 'Paiement confirmé',                 color: '#1B5E20', bg: '#DCFCE7' },
  design_en_cours:   { label: 'Design en cours',   client: 'Notre designer prépare votre carte', color: '#7C3AED', bg: '#EDE9FE' },
  bat_envoye:        { label: 'BAT envoyé',        client: 'Bon à tirer à valider',             color: '#C2410C', bg: '#FFEDD5' },
  bat_valide:        { label: 'BAT validé',        client: 'Bon à tirer validé',                color: '#0F766E', bg: '#CCFBF1' },
  en_impression:     { label: 'En impression',     client: 'En impression à Dakar',             color: '#6D28D9', bg: '#EDE9FE' },
  prete:             { label: 'Prête',             client: 'Votre carte est prête',             color: '#15803D', bg: '#DCFCE7' },
  livree:            { label: 'Livrée',            client: 'Livrée',                            color: '#166534', bg: '#BBF7D0' },
  cancelled:         { label: 'Annulée',           client: 'Annulée',                           color: '#6B7280', bg: '#F3F4F6' },
  expired:           { label: 'Expirée',           client: 'Expirée (paiement non reçu)',       color: '#6B7280', bg: '#F3F4F6' },
  converted:         { label: 'En fabrication',    client: 'En fabrication',                    color: '#6D28D9', bg: '#EDE9FE' },
};

export function orderStatusMeta(s: string) {
  return ORDER_STATUS[s as OrderStatus] || { label: s, client: s, color: '#6B7280', bg: '#F3F4F6' };
}
