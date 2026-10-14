import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Wifi, Clock, ShieldOff, AlertTriangle, ShieldCheck } from 'lucide-react';
import { NFC_API_BASE } from '@/hooks/useNfcConfig';

// Pages affichées quand une carte NFC ne peut pas (encore) ouvrir un portfolio
const PAGES: Record<string, { icon: React.ElementType; title: string; text: string; color: string }> = {
  'non-activee': {
    icon: Wifi,
    title: 'Carte non activée',
    text: "Cette carte Portefolia n'est pas encore attribuée. Si elle est à vous, elle sera activée dès la fin de sa préparation.",
    color: '#2E7D32',
  },
  'en-preparation': {
    icon: Clock,
    title: 'Carte en préparation',
    text: "Cette carte est en cours de fabrication. Elle ouvrira le portfolio de son titulaire dès qu'elle sera prête.",
    color: '#B45309',
  },
  desactivee: {
    icon: ShieldOff,
    title: 'Carte inactive',
    text: "Cette carte n'est plus active.",
    color: '#6B7280',
  },
  indisponible: {
    icon: AlertTriangle,
    title: 'Profil indisponible',
    text: "Le titulaire de cette carte n'a pas encore de portfolio public. Réessayez un peu plus tard.",
    color: '#6B7280',
  },
};

interface AdminCard {
  code: string;
  type_label: string;
  statut_label: string;
  user_name?: string;
  user_email?: string;
  order_reference?: string | null;
  portfolio_slug?: string | null;
  deactivation_reason?: string | null;
}

export default function NfcCardStatus() {
  const { etat = 'non-activee' } = useParams();
  const [params] = useSearchParams();
  const code = params.get('code') || '';
  const page = PAGES[etat] || PAGES['non-activee'];
  const Icon = page.icon;
  const [adminCard, setAdminCard] = useState<AdminCard | null>(null);

  // Un admin connecté qui tape la carte voit à qui elle est réservée (contrôle avant impression)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !code) return;
    fetch(`${NFC_API_BASE}/api/admin/nfc-cards/by-code/${encodeURIComponent(code)}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.card && setAdminCard(d.card))
      .catch(() => {});
  }, [code]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: '#F9F9F9', fontFamily: 'Inter, sans-serif' }}>
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center space-y-3">
        <img src="/logo_portefolia.png" alt="Portefolia" className="h-8 mx-auto mb-2" />
        <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background: `${page.color}14` }}>
          <Icon size={26} style={{ color: page.color }} />
        </div>
        <h1 className="text-lg font-bold text-gray-900">{page.title}</h1>
        <p className="text-sm text-gray-500 leading-relaxed">{page.text}</p>
        {etat !== 'desactivee' && (
          <Link to="/nfc-types" className="inline-block text-sm font-semibold text-[#2E7D32] pt-1">Découvrir la carte NFC Portefolia</Link>
        )}
      </div>

      {adminCard && (
        <div className="w-full max-w-sm mt-4 rounded-2xl border border-[#2E7D32]/30 bg-[#F0FFF4] p-4 text-sm space-y-1.5">
          <p className="flex items-center gap-1.5 font-bold text-[#1B5E20]"><ShieldCheck size={15} /> Vue administrateur</p>
          <p><span className="text-gray-500">Code :</span> <span className="font-mono font-bold">{adminCard.code}</span> · {adminCard.type_label}</p>
          <p><span className="text-gray-500">Statut :</span> {adminCard.statut_label}</p>
          {adminCard.user_email
            ? <p><span className="text-gray-500">Réservée pour :</span> <strong>{adminCard.user_name || adminCard.user_email}</strong> ({adminCard.user_email})</p>
            : <p className="text-gray-500">Non attribuée.</p>}
          {adminCard.order_reference && <p><span className="text-gray-500">Commande :</span> <span className="font-mono">{adminCard.order_reference}</span></p>}
          {adminCard.deactivation_reason && <p><span className="text-gray-500">Motif :</span> {adminCard.deactivation_reason}</p>}
          <Link to={`/admin/nfc-stock?q=${adminCard.code}`} className="inline-block pt-1 font-semibold text-[#2E7D32]">Ouvrir dans le stock</Link>
        </div>
      )}
    </div>
  );
}
