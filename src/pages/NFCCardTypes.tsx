import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, Link, CreditCard, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || (window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://portefolia.tech');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const features = [
  {
    icon: CreditCard,
    title: 'Métal gravé laser',
    desc: 'Finition premium, votre nom gravé avec précision',
  },
  {
    icon: Wifi,
    title: 'NFC intégré',
    desc: 'Un tap = accès direct à votre portfolio complet',
  },
  {
    icon: Link,
    title: 'Lien intelligent',
    desc: 'Toujours à jour — modifiez votre portfolio sans changer de carte',
  },
];

export default function NFCCardTypes() {
  const navigate = useNavigate();
  const [email, setEmail]         = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [alreadyIn, setAlreadyIn] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Veuillez saisir votre email.'); return; }
    if (!EMAIL_RE.test(email.trim())) { setError('Format d\'email invalide.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/nfc/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.status === 409) {
        setAlreadyIn(true);
        setLoading(false);
        return;
      }
    } catch {}
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen" style={{ background: '#F9F9F9', fontFamily: 'Inter, sans-serif' }}>
      {/* ── Header ── */}
      <header style={{ background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 60%, #1BC29A 100%)' }} className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-8 right-12 w-40 h-40 rounded-full border-2 border-white/30" />
          <div className="absolute -bottom-8 -left-8 w-56 h-56 rounded-full border-2 border-white/20" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 py-10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/70 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft size={16} /> Retour
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Wifi size={22} className="text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Carte NFC Portefolia</h1>
          </div>
          <p className="text-white/80 text-base mt-1 ml-[52px]">Expose Ton Futur, même hors ligne</p>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">

        {/* Hero section */}
        <div className="text-center space-y-4">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: '#F59E0B' }}>
            Lancement imminent
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Votre carte arrive bientôt</h2>
          <p className="max-w-xl mx-auto text-gray-500 leading-relaxed">
            Gravée à votre nom avec le lien vers votre portfolio, la carte NFC Portefolia vous permet de
            partager votre profil d'un simple tap. Soyez parmi les premiers à la recevoir.
          </p>
        </div>

        {/* Card preview + form */}
        <div className="flex flex-col lg:flex-row items-center gap-12">

          {/* Card visual */}
          <div className="shrink-0 flex flex-col items-center gap-3">
            <div
              style={{
                width: 340,
                height: 215,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 60%, #0F3460 100%)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
                padding: '28px 32px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Decorative circles */}
              <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(43,196,154,0.1)' }} />
              <div style={{ position: 'absolute', bottom: -20, left: 20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(43,196,154,0.06)' }} />

              {/* Top row */}
              <div className="flex items-center justify-between relative">
                <img src="/lovable-uploads/logo_portefolia_remove_bg.png" alt="Portefolia" style={{ height: 28, filter: 'brightness(0) invert(1)' }} />
                <Wifi size={22} className="text-[#1BC29A]" />
              </div>

              {/* Bottom row */}
              <div className="relative">
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>votre-nom.portefolia.tech</p>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 18, letterSpacing: 0.5 }}>Votre Nom</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">Aperçu du design</p>
          </div>

          {/* Waitlist form */}
          <div className="flex-1 w-full max-w-sm mx-auto lg:mx-0">
            {submitted ? (
              <div className="text-center py-8 px-6 bg-white rounded-2xl border border-green-100 shadow-sm">
                <CheckCircle2 size={44} className="text-[#2E7D32] mx-auto mb-4" />
                <p className="font-semibold text-gray-900 text-lg mb-1">Vous êtes sur la liste !</p>
                <p className="text-sm text-gray-500">Un email de confirmation vous a été envoyé. Nous vous préviendrons dès le lancement.</p>
              </div>
            ) : alreadyIn ? (
              <div className="text-center py-8 px-6 bg-white rounded-2xl border border-amber-100 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={26} className="text-amber-500" />
                </div>
                <p className="font-semibold text-gray-900 text-lg mb-1">Déjà inscrit(e) !</p>
                <p className="text-sm text-gray-500">Votre email est déjà sur la liste d'attente. Vous serez notifié(e) dès le lancement.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Être notifié(e) du lancement
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="votre@email.com"
                    className="w-full h-11 px-4 rounded-xl border text-sm outline-none transition-colors"
                    style={{ borderColor: error ? '#EF4444' : '#E5E7EB', background: '#FAFAFA' }}
                    onFocus={e => { if (!error) e.currentTarget.style.borderColor = '#2E7D32'; }}
                    onBlur={e => { if (!error) e.currentTarget.style.borderColor = '#E5E7EB'; }}
                  />
                  {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-70"
                  style={{ background: 'linear-gradient(135deg, #2E7D32, #1BC29A)' }}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Je veux être notifié(e)
                </button>
                <p className="text-xs text-center leading-relaxed" style={{ color: '#9CA3AF' }}>
                  Votre email ne sera utilisé que pour vous notifier du lancement des cartes NFC.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Features */}
        <div>
          <h3 className="text-center text-xl font-bold text-gray-900 mb-8">Ce qui vous attend</h3>
          <div className="grid sm:grid-cols-3 gap-5">
            {features.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow text-center">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: '#E8F5E9' }}>
                    <Icon size={22} style={{ color: '#2E7D32' }} />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">{f.title}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

      </main>
    </div>
  );
}
