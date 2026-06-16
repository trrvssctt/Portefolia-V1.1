export function formatFCFA(montant: number): string {
  return (
    new Intl.NumberFormat('fr-SN', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant) + ' F CFA'
  );
}

export function formatVariation(variation: number | null): {
  texte: string;
  couleur: string;
  icone: string;
} {
  if (variation === null || variation === undefined) {
    return { texte: '—', couleur: '#757575', icone: '→' };
  }
  if (variation > 0) return { texte: `+${variation.toFixed(1)}%`, couleur: '#2E7D32', icone: '↑' };
  if (variation < 0) return { texte: `${variation.toFixed(1)}%`, couleur: '#C62828', icone: '↓' };
  return { texte: '0%', couleur: '#757575', icone: '→' };
}

export function formatMilliers(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'k';
  return n.toString();
}
