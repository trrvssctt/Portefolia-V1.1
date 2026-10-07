import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShoppingBag } from 'lucide-react';
import { useNfcConfig, formatFcfa, NFC_API_BASE } from '@/hooks/useNfcConfig';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Fields = {
  full_name: string;
  card_name: string;
  email: string;
  phone: string;
  city: string;
  quantity: number;
  website: string; // honeypot
};

const inputClass = 'w-full h-11 px-4 rounded-xl border text-sm outline-none transition-colors focus:border-[#2E7D32]';

function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
      {children}
      {error ? <p className="text-xs text-red-500 mt-1">{error}</p> : hint ? <p className="text-[11px] text-gray-400 mt-1">{hint}</p> : null}
    </div>
  );
}

export default function NfcPreorderForm() {
  const navigate = useNavigate();
  const { config } = useNfcConfig();
  const [f, setF] = useState<Fields>({ full_name: '', card_name: '', email: '', phone: '', city: '', quantity: 1, website: '' });
  const [cardNameTouched, setCardNameTouched] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  // Pré-remplir nom et e-mail si l'utilisateur est connecté
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${NFC_API_BASE}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const u = d?.user;
        if (!u) return;
        const name = [u.prenom, u.nom].filter(Boolean).join(' ').trim();
        setF((prev) => ({
          ...prev,
          full_name: prev.full_name || name,
          card_name: prev.card_name || name,
          email: prev.email || u.email || '',
          phone: prev.phone || u.phone || '',
        }));
      })
      .catch(() => {});
  }, []);

  const set = (k: keyof Fields, v: string | number) => {
    setF((prev) => {
      const next = { ...prev, [k]: v };
      if (k === 'full_name' && !cardNameTouched) next.card_name = String(v);
      return next;
    });
    setErrors((e) => ({ ...e, [k]: undefined }));
    setServerError('');
  };

  const validate = () => {
    const e: Partial<Record<keyof Fields, string>> = {};
    if (f.full_name.trim().length < 2) e.full_name = 'Votre nom complet est requis.';
    if (f.card_name.trim().length < 2) e.card_name = 'Le nom à imprimer est requis.';
    if (!EMAIL_RE.test(f.email.trim())) e.email = 'Adresse e-mail invalide.';
    if (f.phone.replace(/\D/g, '').length < 9) e.phone = 'Numéro invalide (ex. 77 123 45 67).';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (loading || !validate()) return;
    setLoading(true);
    setServerError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${NFC_API_BASE}/api/nfc/preorders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ...f, full_name: f.full_name.trim(), card_name: f.card_name.trim(), email: f.email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.errors) setErrors(data.errors);
        setServerError(data?.error || 'Une erreur est survenue. Veuillez réessayer.');
        return;
      }
      if (!data.token) { setServerError('Une erreur est survenue. Veuillez réessayer.'); return; }
      navigate(`/nfc/precommande/${encodeURIComponent(data.reference)}?t=${data.token}`);
    } catch {
      setServerError('Connexion impossible. Vérifiez votre réseau et réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const total = config.unit_price * f.quantity;

  return (
    <form id="precommande" onSubmit={handleSubmit} noValidate className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 scroll-mt-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-gray-900">Précommander ma carte</p>
          <p className="text-xs text-gray-500 mt-0.5">Paiement par Wave · gravure incluse</p>
        </div>
        <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: '#E8F5E9', color: '#1B5E20' }}>
          {formatFcfa(config.unit_price)}
        </span>
      </div>

      <Field label="Nom complet" error={errors.full_name}>
        <input className={inputClass} style={{ borderColor: errors.full_name ? '#EF4444' : '#E5E7EB', background: '#FAFAFA' }}
          value={f.full_name} onChange={(e) => set('full_name', e.target.value)} autoComplete="name" placeholder="Awa Diop" />
      </Field>

      <Field label="Nom à imprimer sur la carte" error={errors.card_name}>
        <input className={inputClass} style={{ borderColor: errors.card_name ? '#EF4444' : '#E5E7EB', background: '#FAFAFA' }}
          value={f.card_name} maxLength={80}
          onChange={(e) => { setCardNameTouched(true); set('card_name', e.target.value); }} placeholder="AWA DIOP" />
      </Field>

      <Field label="E-mail" error={errors.email}>
        <input type="email" className={inputClass} style={{ borderColor: errors.email ? '#EF4444' : '#E5E7EB', background: '#FAFAFA' }}
          value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" placeholder="votre@email.com" />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Téléphone WhatsApp" error={errors.phone}>
          <input type="tel" inputMode="tel" className={inputClass} style={{ borderColor: errors.phone ? '#EF4444' : '#E5E7EB', background: '#FAFAFA' }}
            value={f.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" placeholder="77 123 45 67" />
        </Field>
        <Field label="Ville (optionnel)" error={errors.city}>
          <input className={inputClass} style={{ borderColor: '#E5E7EB', background: '#FAFAFA' }}
            value={f.city} maxLength={80} onChange={(e) => set('city', e.target.value)} placeholder="Dakar" />
        </Field>
      </div>

      <Field label="Quantité" error={errors.quantity}>
        <select className={inputClass} style={{ borderColor: '#E5E7EB', background: '#FAFAFA' }}
          value={f.quantity} onChange={(e) => set('quantity', Number(e.target.value))}>
          {Array.from({ length: config.max_quantity }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n} carte{n > 1 ? 's' : ''}</option>
          ))}
        </select>
      </Field>

      {/* Champ piège pour les robots : invisible pour les humains */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label>Site web<input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set('website', e.target.value)} /></label>
      </div>

      <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: '#F0FFF4' }}>
        <span className="text-sm text-gray-600">Total à payer</span>
        <span className="text-lg font-black" style={{ color: '#1B5E20' }}>{formatFcfa(total)}</span>
      </div>

      {serverError && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{serverError}</p>
      )}

      <button type="submit" disabled={loading}
        className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-70"
        style={{ background: 'linear-gradient(135deg, #2E7D32, #1BC29A)' }}>
        {loading ? <Loader2 size={16} className="animate-spin" /> : <ShoppingBag size={16} />}
        Précommander — {formatFcfa(total)}
      </button>
      <p className="text-[11px] text-center leading-relaxed text-gray-400">
        Vous recevrez par e-mail les instructions de paiement Wave. Sans paiement sous {Math.round(config.expiry_hours / 24)} jours, la précommande est annulée.
      </p>
    </form>
  );
}
