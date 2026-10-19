import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import NfcOffersGrid from '@/components/nfc/NfcOffersGrid';
import {
  Wifi, Link2, ArrowLeft, CheckCircle2, Loader2, Smartphone, BarChart3, ShieldOff, Palette,
  CreditCard, FileCheck2, PackageCheck, ChevronDown, Mail, Box, MapPin,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || (window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://portefolia.tech');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GREEN = '#2E7D32';

const STEPS = [
  { icon: Palette, title: 'Choisissez et personnalisez', desc: 'Votre offre, vos infos, vos couleurs, votre photo ou votre logo, avec un aperçu en direct.' },
  { icon: CreditCard, title: 'Payez avec Wave', desc: 'Envoyez la capture de votre paiement : nous le validons sous 24 h ouvrées.' },
  { icon: FileCheck2, title: 'Validez le bon à tirer', desc: 'Vous approuvez le visuel final avant l\'impression à Dakar.' },
  { icon: PackageCheck, title: 'Recevez votre carte', desc: 'Elle est prête à l\'emploi : un tap ouvre votre portfolio.' },
];

const FEATURES = [
  { icon: Wifi, title: 'Un tap, votre portfolio', desc: 'Approchez la carte d\'un smartphone : votre portfolio s\'ouvre, sans application à installer.' },
  { icon: Link2, title: 'Un lien qui ne casse jamais', desc: 'Changez de portfolio ou de lien quand vous voulez : la carte suit, sans la réimprimer.' },
  { icon: BarChart3, title: 'Vos taps comptés', desc: 'Suivez depuis votre espace combien de personnes ont ouvert votre portfolio avec la carte.' },
  { icon: ShieldOff, title: 'Perdue ? Désactivée en un clic', desc: 'Déclarez la perte depuis votre espace : la carte n\'ouvre plus votre portfolio, immédiatement.' },
];

const FAQ = [
  { q: 'Avec quels téléphones la carte fonctionne-t-elle ?', a: 'Avec la grande majorité des smartphones récents équipés du NFC (iPhone depuis le XS, la plupart des Android). Il suffit d\'approcher la carte du haut du téléphone, sans application.' },
  { q: 'Que se passe-t-il si je change le lien de mon portfolio ?', a: 'Rien à refaire : la puce contient un lien Portefolia permanent qui redirige vers le portfolio de votre choix. Vous le changez depuis votre espace, la carte suit.' },
  { q: 'Comment se passe le paiement ?', a: 'Par Wave, au numéro ou via le QR code affiché après la commande. Vous envoyez ensuite la capture du paiement ; nous le validons et vous recevez une confirmation par e-mail.' },
  { q: 'Quels sont les délais ?', a: 'Après le paiement, vous recevez un bon à tirer (le visuel final) à valider. Les cartes sont ensuite imprimées à Dakar ; nous vous prévenons dès que la vôtre est prête.' },
  { q: 'Et si je perds ma carte ?', a: 'Désactivez-la depuis « Cartes NFC » dans votre espace : elle n\'ouvre plus votre portfolio. Contactez-nous pour une carte de remplacement.' },
];

// Carte recto / verso qui se retourne au clic
function FlipCard() {
  const [showBack, setShowBack] = useState(false);
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <button type="button" onClick={() => setShowBack((v) => !v)}
        aria-label={showBack ? 'Voir le recto de la carte' : 'Voir le verso de la carte'}
        className="nfc-float relative w-full max-w-[420px] outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded-2xl"
        style={{ aspectRatio: '475 / 300', perspective: 1200 }}>
        <div className="absolute -inset-6 rounded-[40px] blur-3xl opacity-60" style={{ background: 'radial-gradient(closest-side, rgba(27,194,154,0.55), transparent)' }} />
        <div className="absolute inset-0 transition-transform duration-700"
          style={{ transformStyle: 'preserve-3d', transform: showBack ? 'rotateY(180deg)' : 'rotateY(0deg)', transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
          <img src="/nfc-card/carte-recto.webp" alt="Face infos de la carte NFC Portefolia : nom, poste, coordonnées et lien du portfolio"
            className="absolute inset-0 w-full h-full object-contain" draggable={false}
            style={{ backfaceVisibility: 'hidden', filter: 'drop-shadow(0 28px 44px rgba(0,0,0,0.35))' }} />
          <img src="/nfc-card/carte-verso.webp" alt="Face logo de la carte NFC Portefolia : logo Portefolia, « Expose ton futur »"
            className="absolute inset-0 w-full h-full object-contain" draggable={false}
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', filter: 'drop-shadow(0 28px 44px rgba(0,0,0,0.35))' }} />
        </div>
      </button>
      <div className="inline-flex p-1 rounded-full bg-white/15 backdrop-blur border border-white/20">
        {[{ back: false, label: 'Face infos' }, { back: true, label: 'Face logo' }].map((f) => (
          <button key={f.label} type="button" onClick={() => setShowBack(f.back)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold transition-colors"
            style={showBack === f.back ? { background: '#fff', color: '#1B5E20' } : { color: 'rgba(255,255,255,0.85)' }}>
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-10">
      <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: GREEN }}>{eyebrow}</p>
      <h2 className="mt-2 text-3xl sm:text-[34px] font-extrabold text-gray-900 tracking-tight">{title}</h2>
      {sub && <p className="mt-3 text-gray-500 leading-relaxed">{sub}</p>}
    </div>
  );
}

export default function NFCCardTypes() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [alreadyIn, setAlreadyIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => { document.title = 'Carte NFC Portefolia — Les offres | Portefolia'; }, []);

  // Les liens /nfc-types#precommande (offres) et #liste-attente amènent directement à la section
  useEffect(() => {
    const id = location.hash.slice(1);
    if (id !== 'precommande' && id !== 'liste-attente') return;
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    return () => clearTimeout(t);
  }, [location.hash]);

  const scrollToOffers = () => document.getElementById('precommande')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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
      } else if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || 'L\'inscription a échoué. Veuillez réessayer.');
      }
    } catch {
      setError('Connexion impossible. Vérifiez votre réseau et réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#F7F8F7', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @keyframes nfcFloat { 0%,100% { transform: translateY(0) rotate(-1.5deg); } 50% { transform: translateY(-10px) rotate(1deg); } }
        .nfc-float { animation: nfcFloat 6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .nfc-float { animation: none; } }
      `}</style>

      {/* ── En-tête ── */}
      <header className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F3D14 0%, #1B5E20 40%, #2E7D32 70%, #1BC29A 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.12), transparent)' }} />
        <div className="relative max-w-6xl mx-auto px-5 sm:px-6 pt-6 pb-16 lg:pb-20">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors">
            <ArrowLeft size={16} /> Retour
          </button>
          <div className="mt-8 grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-white border border-white/20 backdrop-blur">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7CF29B] animate-pulse" /> Commandes ouvertes
              </span>
              <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold text-white leading-[1.08] tracking-tight">
                La carte de visite<br className="hidden sm:block" /> qui ouvre votre portfolio
              </h1>
              <p className="mt-5 text-base sm:text-lg text-white/80 leading-relaxed max-w-xl mx-auto lg:mx-0">
                Un tap sur un smartphone et votre portfolio s'affiche : projets, expériences, contacts.
                Quatre formules, de l'essentiel à une carte entièrement à votre image.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <button onClick={scrollToOffers}
                  className="h-12 px-7 rounded-xl bg-white text-[15px] font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all" style={{ color: '#1B5E20' }}>
                  Voir les offres · dès 5 000 F CFA
                </button>
                <Link to="/carte-3d"
                  className="h-12 px-6 rounded-xl border border-white/40 text-white text-[15px] font-semibold hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                  <Box size={17} /> Essayer en 3D
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 justify-center lg:justify-start text-sm text-white/80">
                <span className="flex items-center gap-1.5"><Smartphone size={15} /> Sans application</span>
                <span className="flex items-center gap-1.5"><CreditCard size={15} /> Paiement Wave</span>
                <span className="flex items-center gap-1.5"><MapPin size={15} /> Imprimée à Dakar</span>
              </div>
            </div>
            <FlipCard />
          </div>
        </div>
        {/* Transition douce vers le contenu */}
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 48" preserveAspectRatio="none" style={{ height: 40 }} aria-hidden="true">
          <path d="M0 48h1440V20C1200 44 960 52 720 36S240 4 0 24z" fill="#F7F8F7" />
        </svg>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-6">
        {/* ── Offres ── */}
        <section id="precommande" data-tour="nfc-waitlist" className="pt-14 scroll-mt-6">
          <SectionTitle eyebrow="Nos offres" title="Quatre cartes, un seul geste"
            sub="Le prix comprend la carte, la puce NFC et l'impression. Paiement par Wave, bon à tirer validé avant impression." />
          <NfcOffersGrid />
        </section>

        {/* ── Comment ça marche ── */}
        <section className="pt-20">
          <SectionTitle eyebrow="Comment ça marche" title="De la commande à votre poche" />
          <ol className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="hidden lg:block absolute top-7 left-7 right-[calc(25%-2.5rem)] h-0.5" style={{ background: 'repeating-linear-gradient(90deg,#A5D6A7 0 8px,transparent 8px 14px)' }} aria-hidden="true" />
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center lg:text-left lg:bg-transparent lg:border-0 lg:shadow-none lg:p-0">
                <div className="relative mx-auto lg:mx-0 w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#2E7D32,#1BC29A)' }}>
                  <s.icon size={24} />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white text-[11px] font-black flex items-center justify-center shadow" style={{ color: '#1B5E20' }}>{i + 1}</span>
                </div>
                <p className="mt-4 font-bold text-gray-900">{s.title}</p>
                <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Atouts ── */}
        <section className="pt-20">
          <SectionTitle eyebrow="Pourquoi Portefolia" title="Plus qu'une carte de visite" />
          <div className="grid sm:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="group flex gap-4 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center transition-colors group-hover:bg-[#2E7D32]" style={{ background: '#E8F5E9' }}>
                  <f.icon size={22} className="text-[#2E7D32] group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{f.title}</h3>
                  <p className="mt-1 text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Questions fréquentes ── */}
        <section className="pt-20">
          <SectionTitle eyebrow="Questions fréquentes" title="Tout ce qu'il faut savoir" />
          <div className="max-w-3xl mx-auto space-y-3">
            {FAQ.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className="bg-white rounded-2xl border shadow-sm transition-colors" style={{ borderColor: open ? '#A5D6A7' : '#F3F4F6' }}>
                  <button onClick={() => setOpenFaq(open ? null : i)} aria-expanded={open}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left">
                    <span className="font-semibold text-gray-900">{f.q}</span>
                    <ChevronDown size={18} className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180 text-[#2E7D32]' : ''}`} />
                  </button>
                  {open && <p className="px-5 pb-5 -mt-1 text-sm text-gray-600 leading-relaxed">{f.a}</p>}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Liste d'attente (secondaire) ── */}
        <section id="liste-attente" className="py-20 scroll-mt-6">
          <div className="relative overflow-hidden rounded-3xl p-7 sm:p-10" style={{ background: 'linear-gradient(135deg,#1B5E20,#2E7D32 60%,#1BC29A)' }}>
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            <div className="relative grid md:grid-cols-[1fr_minmax(0,380px)] gap-8 items-center">
              <div className="text-white">
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center mb-4"><Mail size={20} /></div>
                <h2 className="text-2xl font-extrabold">Pas encore prêt(e) ?</h2>
                <p className="mt-2 text-white/80 leading-relaxed">Laissez votre e-mail : nous vous prévenons des nouveautés et du retour en stock des cartes.</p>
              </div>
              {submitted || alreadyIn ? (
                <div className="bg-white rounded-2xl p-6 text-center shadow-lg">
                  <CheckCircle2 size={40} className={`mx-auto mb-3 ${submitted ? 'text-[#2E7D32]' : 'text-amber-500'}`} />
                  <p className="font-bold text-gray-900">{submitted ? 'Vous êtes sur la liste !' : 'Déjà inscrit(e) !'}</p>
                  <p className="mt-1 text-sm text-gray-500">{submitted ? 'Un e-mail de confirmation vous a été envoyé.' : 'Votre e-mail est déjà sur la liste : nous vous préviendrons.'}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-lg space-y-3">
                  <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="votre@email.com" aria-label="Votre adresse e-mail"
                    className="w-full h-11 px-4 rounded-xl border text-sm outline-none transition-colors focus:border-[#2E7D32]"
                    style={{ borderColor: error ? '#EF4444' : '#E5E7EB', background: '#FAFAFA' }} />
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <button type="submit" disabled={loading}
                    className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-70"
                    style={{ background: 'linear-gradient(135deg, #2E7D32, #1BC29A)' }}>
                    {loading && <Loader2 size={16} className="animate-spin" />} Me tenir informé(e)
                  </button>
                  <p className="text-[11px] text-center text-gray-400">Uniquement pour les cartes NFC. Désinscription à tout moment.</p>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
