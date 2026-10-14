import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Building2, CheckCircle2, Loader2 } from 'lucide-react';
import { NFC_API_BASE } from '@/hooks/useNfcConfig';

const inputCls = 'w-full h-11 px-4 rounded-xl border border-gray-200 bg-[#FAFAFA] text-sm outline-none focus:border-[#2E7D32]';

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// Demande de devis pour l'offre Entreprise (une carte par membre de l'équipe)
export default function NfcQuoteRequestPage() {
  const [f, setF] = useState({ company: '', contact_name: '', email: '', phone: '', quantity: '10', desired_date: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  // Pré-remplissage depuis le compte connecté
  useEffect(() => {
    document.title = 'Cartes NFC Entreprise — Demande de devis | Portefolia';
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${NFC_API_BASE}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const u = d?.user;
        if (!u) return;
        setF((x) => ({
          ...x,
          contact_name: x.contact_name || [u.prenom, u.nom].filter(Boolean).join(' '),
          email: x.email || u.email || '',
          phone: x.phone || u.phone || '',
        }));
      })
      .catch(() => {});
  }, []);

  const set = (k: keyof typeof f, v: string) => { setF((x) => ({ ...x, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); setError(''); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${NFC_API_BASE}/api/nfc/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ...f, quantity: Number(f.quantity) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.errors) setErrors(data.errors);
        setError(data?.error || 'Envoi impossible, réessayez.');
        return;
      }
      setDone(data.reference);
    } catch {
      setError('Connexion impossible. Vérifiez votre réseau et réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#F9F9F9', fontFamily: 'Inter, sans-serif' }}>
      <header style={{ background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 60%, #1BC29A 100%)' }}>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Link to="/nfc-types" className="inline-flex items-center gap-1.5 text-white/75 hover:text-white text-sm mb-3"><ArrowLeft size={15} /> Toutes les offres</Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Building2 size={22} /> Cartes NFC Entreprise</h1>
          <p className="text-white/80 text-sm">Le logo de votre entreprise et les infos de chaque membre de l'équipe. Tarif selon le volume.</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {done ? (
          <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-6 text-center space-y-3">
            <CheckCircle2 size={42} className="mx-auto text-[#2E7D32]" />
            <p className="font-semibold text-gray-900">Demande envoyée (réf. {done})</p>
            <p className="text-sm text-gray-500">Nous étudions votre demande et vous envoyons votre devis par e-mail sous 48 h ouvrées. Vous pourrez l'accepter en ligne.</p>
            <Link to="/" className="inline-block text-sm font-semibold text-[#2E7D32]">Retour à l'accueil</Link>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Entreprise"><input className={inputCls} value={f.company} maxLength={160} onChange={(e) => set('company', e.target.value)} />
                {errors.company && <p className="text-xs text-red-500 mt-1">{errors.company}</p>}</Field>
              <Field label="Nombre de cartes" hint="Une carte par membre de l'équipe (2 minimum).">
                <input className={inputCls} type="number" min={2} max={5000} value={f.quantity} onChange={(e) => set('quantity', e.target.value)} />
                {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}</Field>
              <Field label="Votre nom"><input className={inputCls} value={f.contact_name} maxLength={120} onChange={(e) => set('contact_name', e.target.value)} />
                {errors.contact_name && <p className="text-xs text-red-500 mt-1">{errors.contact_name}</p>}</Field>
              <Field label="E-mail"><input className={inputCls} type="email" value={f.email} onChange={(e) => set('email', e.target.value)} />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}</Field>
              <Field label="Téléphone"><input className={inputCls} type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="77 123 45 67" />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}</Field>
              <Field label="Date souhaitée (optionnel)"><input className={inputCls} type="date" value={f.desired_date} onChange={(e) => set('desired_date', e.target.value)} /></Field>
            </div>
            <Field label="Votre projet (optionnel)" hint="Charte graphique, couleurs, événement prévu… Vous validerez un bon à tirer avant impression.">
              <textarea rows={4} maxLength={2000} value={f.message} onChange={(e) => set('message', e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-[#FAFAFA] text-sm outline-none focus:border-[#2E7D32] resize-none" />
            </Field>
            {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #2E7D32, #1BC29A)' }}>
              {loading && <Loader2 size={16} className="animate-spin" />} Demander mon devis
            </button>
            <p className="text-[11px] text-center text-gray-400">Vous avez un compte Business ? Connectez-vous avant d'envoyer : les cartes seront pré-remplies avec les membres de votre équipe.</p>
          </form>
        )}
      </main>
    </div>
  );
}
