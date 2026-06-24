import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Mail, Phone, MessageCircle, MapPin, Send, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const CHANNELS = [
  { Icon: Mail,          label: 'Email',      value: 'contact@portefolia.tech', sub: 'Réponse sous 24 h' },
  { Icon: Phone,         label: 'Téléphone',  value: '+221 78 131 13 71',       sub: 'Lun–Ven, 9h–18h' },
  { Icon: MessageCircle, label: 'WhatsApp',   value: '+221 78 131 13 71',       sub: 'Réponse rapide' },
  { Icon: MapPin,        label: 'Bureau',     value: 'Dakar, Sénégal',          sub: 'Sur rendez-vous' },
];

const SUBJECTS = ['Question générale', 'Paiement & facturation', 'Carte NFC', 'Partenariat', 'Support technique'];

export default function Contact() {
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [subject, setSubject] = useState('Question générale');
  const [form, setForm]       = useState({ nom: '', email: '', message: '' });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    setError('');
    if (!form.nom.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: form.nom, email: form.email, sujet: subject, message: form.message }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Erreur serveur');
      }
      setSent(true);
    } catch (e: any) {
      setError(e.message || 'Une erreur est survenue. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <header className="relative overflow-hidden border-b border-[#E7E7EA]">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(70% 60% at 50% -20%, #E8F5E9, transparent 70%)' }} />
        <div className="relative max-w-4xl mx-auto px-5 sm:px-8 pt-14 sm:pt-20 pb-12 text-center">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#71717A] hover:text-[#18181B] transition-colors mb-5">
            <ArrowLeft size={13} /> Accueil <span className="text-[#D4D4D8] mx-1">/</span>
            <span className="text-[#18181B]">Contact</span>
          </Link>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-3" style={{ color: '#1B5E20' }}>Nous écrire</p>
          <h1 className="font-serif text-[#18181B] leading-[1.0] tracking-tight mx-auto"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>Parlons de votre projet</h1>
          <p className="mt-4 text-lg text-[#18181B]/65 max-w-xl mx-auto leading-relaxed">
            Une question, un partenariat, un besoin pour votre équipe ? Notre équipe basée à Dakar vous répond.
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-14 grid lg:grid-cols-[1fr_1.2fr] gap-10 items-start">

        {/* Channels */}
        <div className="space-y-3">
          {CHANNELS.map(({ Icon, label, value, sub }) => (
            <div key={label} className="flex items-center gap-3.5 rounded-2xl border border-[#E7E7EA] p-4">
              <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: '#E8F5E9', color: '#1B5E20' }}>
                <Icon size={19} />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-[#71717A]">{label}</p>
                <p className="font-semibold text-[#18181B] text-[15px] truncate">{value}</p>
                <p className="text-xs text-[#71717A]">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-[#E7E7EA] p-6 sm:p-7"
          style={{ boxShadow: '0 12px 40px rgba(16,24,40,0.07)' }}>
          {sent ? (
            <div className="text-center py-10">
              <span className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4"
                style={{ background: '#E8F5E9', color: '#2E7D32' }}>
                <CheckCircle size={28} />
              </span>
              <h3 className="text-lg font-bold text-[#18181B]">Message envoyé !</h3>
              <p className="text-sm text-[#71717A] mt-1.5">Merci {form.nom} ! Nous revenons vers vous sous 24 h ouvrées.</p>
              <button
                onClick={() => { setSent(false); setForm({ nom: '', email: '', message: '' }); }}
                className="mt-5 text-sm font-semibold hover:underline"
                style={{ color: '#1B5E20' }}>
                Envoyer un autre message
              </button>
            </div>
          ) : (
            <>
              <h3 className="font-bold text-[#18181B] mb-5">Envoyez-nous un message</h3>
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#71717A] uppercase tracking-wide">Nom complet</label>
                    <input
                      value={form.nom}
                      onChange={set('nom')}
                      className="mt-1.5 w-full h-11 px-3.5 rounded-xl border border-[#E7E7EA] outline-none text-sm focus:border-[#2E7D32]/40"
                      placeholder="Awa Ndiaye" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#71717A] uppercase tracking-wide">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={set('email')}
                      className="mt-1.5 w-full h-11 px-3.5 rounded-xl border border-[#E7E7EA] outline-none text-sm focus:border-[#2E7D32]/40"
                      placeholder="vous@email.com" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#71717A] uppercase tracking-wide">Sujet</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {SUBJECTS.map(s => (
                      <button key={s} onClick={() => setSubject(s)}
                        className={`px-3 h-9 rounded-full text-xs font-medium transition-colors ${subject === s ? 'text-white' : 'border border-[#E7E7EA] text-[#18181B]/70 hover:bg-zinc-50'}`}
                        style={subject === s ? { background: '#18181B' } : undefined}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#71717A] uppercase tracking-wide">Message</label>
                  <textarea
                    rows={4}
                    value={form.message}
                    onChange={set('message')}
                    className="mt-1.5 w-full px-3.5 py-3 rounded-xl border border-[#E7E7EA] outline-none text-sm focus:border-[#2E7D32]/40 resize-none"
                    placeholder="Décrivez votre demande…" />
                </div>
                {error && (
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: '#2E7D32' }}>
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> Envoi en cours…</>
                    : <><Send size={15} /> Envoyer le message</>
                  }
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
