import { useQuery } from '@tanstack/react-query';

export const NFC_API_BASE = import.meta.env.VITE_API_BASE ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://portefolia.tech');

export interface NfcConfig {
  unit_price: number;
  currency: string;
  max_quantity: number;
  wave_number: string;
  wave_link_available: boolean;
  expiry_hours: number;
}

// Valeurs affichées le temps que le serveur réponde (la source de vérité est la table nfc_settings)
export const NFC_CONFIG_FALLBACK: NfcConfig = {
  unit_price: 12500,
  currency: 'XOF',
  max_quantity: 10,
  wave_number: '+221 78 131 13 71',
  wave_link_available: false,
  expiry_hours: 72,
};

export function formatFcfa(n: number): string {
  return `${Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} F CFA`;
}

export function useNfcConfig() {
  const q = useQuery<NfcConfig>({
    queryKey: ['nfc-config'],
    queryFn: async () => {
      const res = await fetch(`${NFC_API_BASE}/api/nfc/preorders/config`);
      if (!res.ok) throw new Error('Configuration NFC indisponible');
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
  return { ...q, config: q.data ?? NFC_CONFIG_FALLBACK };
}
