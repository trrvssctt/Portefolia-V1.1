import React, { useEffect, useRef, useState } from "react";
import { fetchJson } from '@/lib/api';
import { Link, useNavigate, useLocation } from "react-router-dom";
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  Wifi, Globe, UserPlus, BarChart2, Shield, QrCode, Check,
  Sparkles, LayoutGrid,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Plan = {
  id: number | string;
  name: string;
  description?: string;
  subtitle?: string;
  price?: number;
  price_cents?: number;
  price_monthly_cents?: number;
  price_annual_cents?: number;
  original_price?: number;
  currency?: string;
  slug?: string;
  billing_interval?: string;
  features?: string[];
  is_active?: boolean | number;
  is_public?: boolean | number;
};

const DURATIONS = [
  { months: 1,  label: '1 mois', discount: 0 },
  { months: 3,  label: '3 mois', discount: 15, badge: '-15%' },
  { months: 12, label: '1 an',   discount: 20, badge: '-20%' },
] as const;

type DurationIdx = 0 | 1 | 2;

function fmt(n: number): string {
  return Math.round(n).toLocaleString('fr-FR');
}

// ── NFC Card Visual ───────────────────────────────────────────────────────────
function NFCCardVisual() {
  return (
    <div className="relative" style={{ perspective: '1200px' }}>
      <div
        className="relative w-[300px] h-[190px] rounded-3xl p-6 flex flex-col justify-between"
        style={{
          background: 'linear-gradient(145deg, #1A1A1F 0%, #2A2D3A 100%)',
          transform: 'rotateY(-16deg) rotateX(6deg)',
          boxShadow: '0 30px 60px -20px rgba(16,24,40,0.4)',
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#2E7D32]">
              <LayoutGrid size={14} color="white" strokeWidth={2.2} />
            </span>
            <span className="text-white font-bold tracking-tight text-sm">Portefolia</span>
          </div>
          <Wifi size={20} className="text-white/70 rotate-90" />
        </div>
        <div
          className="w-11 h-8 rounded-md"
          style={{ background: 'linear-gradient(135deg,#E6C171,#B8923D)' }}
        />
        <div>
          <p className="text-white font-semibold text-lg leading-tight">Awa Ndiaye</p>
          <p className="text-white/50 text-xs">Product Designer · Dakar</p>
        </div>
      </div>
      <div
        className="absolute -bottom-6 -right-4 bg-white rounded-2xl border border-[#E7E7EA] p-3 flex items-center gap-2.5 w-52"
        style={{ boxShadow: '0 16px 40px rgba(16,24,40,0.16)', transform: 'rotate(4deg)' }}
      >
        <span
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ background: 'linear-gradient(140deg, #2E7D32, #1B5E20)' }}
        >A</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#18181B] truncate">Profil ouvert</p>
          <p className="text-[11px] text-[#71717A] truncate">En 0,3 s après le scan</p>
        </div>
        <span className="ml-auto shrink-0">
          <Check size={16} className="text-[#2E7D32]" />
        </span>
      </div>
    </div>
  );
}

// ── Plans Grid ────────────────────────────────────────────────────────────────
function PlansGrid(): JSX.Element {
  const [plans, setPlans]               = useState<Plan[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [durationIdx, setDurationIdx]   = useState<DurationIdx>(0);
  const [animating, setAnimating]       = useState(false);
  const tabRefs                         = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const navigate = useNavigate();

  // Sliding indicator position
  useEffect(() => {
    const el = tabRefs.current[durationIdx];
    if (el) {
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [durationIdx]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchJson('/plans')
      .then((data) => {
        if (!mounted) return;
        let raw: Plan[] = [];
        if (Array.isArray(data)) raw = data as Plan[];
        else if (data && Array.isArray((data as any).plans)) raw = (data as any).plans as Plan[];
        raw = raw.filter(p => p.is_active !== false && p.is_active !== 0 && p.is_public !== false && p.is_public !== 0);
        setPlans(raw);
      })
      .catch(() => setError("Impossible de charger les formules"))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const handleDuration = (idx: DurationIdx) => {
    if (idx === durationIdx) return;
    setAnimating(true);
    setTimeout(() => {
      setDurationIdx(idx);
      setAnimating(false);
    }, 130);
  };

  const getMonthly = (p: Plan): number =>
    Number(p.price_monthly_cents ?? p.price_cents ?? p.price ?? 0);

  if (loading)
    return (
      <div className="grid md:grid-cols-3 gap-5 mt-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl border border-[#E7E7EA] p-6 animate-pulse">
            <div className="h-5 bg-zinc-100 rounded w-24 mb-3" />
            <div className="h-8 bg-zinc-100 rounded w-32 mb-2" />
            <div className="h-3 bg-zinc-100 rounded w-full mb-1" />
            <div className="h-3 bg-zinc-100 rounded w-3/4 mb-6" />
            <div className="h-10 bg-zinc-100 rounded-xl" />
          </div>
        ))}
      </div>
    );

  if (error)
    return <div className="text-center py-8 text-sm text-[#71717A]">{error}</div>;

  if (!plans.length)
    return (
      <div className="text-center py-8">
        <p className="text-sm text-[#71717A] mb-4">Aucune formule disponible.</p>
        <Link
          to="/auth"
          className="inline-flex h-10 px-5 rounded-[10px] text-sm font-semibold text-white items-center"
          style={{ background: '#2E7D32' }}
        >Créer mon compte</Link>
      </div>
    );

  const { months, discount } = DURATIONS[durationIdx];

  return (
    <div>
      {/* ── Duration selector ── */}
      <div className="flex justify-center mb-10">
        <div className="relative inline-flex bg-[#F0F0F0] rounded-2xl p-1">
          {/* Sliding pill */}
          <div
            className="absolute top-1 bottom-1 bg-white rounded-[14px] shadow-sm pointer-events-none"
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
              transition: 'left 260ms cubic-bezier(.4,0,.2,1), width 260ms cubic-bezier(.4,0,.2,1)',
            }}
          />
          {DURATIONS.map((d, i) => (
            <button
              key={d.months}
              ref={el => { tabRefs.current[i] = el; }}
              onClick={() => handleDuration(i as DurationIdx)}
              className={`relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-sm font-semibold transition-colors duration-200 ${
                durationIdx === i ? 'text-[#18181B]' : 'text-[#71717A] hover:text-[#18181B]'
              }`}
            >
              {d.label}
              {'badge' in d && d.badge && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: '#E8F5E9', color: '#1B5E20' }}
                >
                  {d.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Plan cards ── */}
      <div className="grid md:grid-cols-3 gap-5">
        {plans.map((p) => {
          const isPopular = p.name?.toLowerCase().includes('professionnel') ||
            p.slug?.toLowerCase().includes('professionnel');
          const monthly   = getMonthly(p);
          const isFree    = monthly === 0;
          const base      = monthly * months;
          const total     = Math.round(base * (1 - discount / 100));
          const savings   = Math.round(base - total);
          const perMonth  = months > 1 ? Math.round(total / months) : total;

          const priceContent = isFree ? (
            <div>
              <p className="text-[28px] font-semibold text-[#18181B] leading-none tabular-nums mb-1">
                0 <span className="text-sm font-normal text-[#71717A]">F CFA</span>
              </p>
              <p className="text-xs text-[#71717A]">Gratuit pour toujours</p>
            </div>
          ) : (
            <div>
              {/* Total à payer */}
              <div
                className="transition-all duration-200"
                style={{ opacity: animating ? 0 : 1, transform: animating ? 'scale(0.95)' : 'scale(1)' }}
              >
                <p className="text-[28px] font-semibold text-[#18181B] leading-none tabular-nums">
                  {fmt(total)}
                  <span className="text-sm font-normal text-[#71717A] ml-1.5">F CFA</span>
                </p>

                {months > 1 ? (
                  <p className="text-xs text-[#71717A] mt-1">
                    soit {fmt(perMonth)} F CFA/mois · {months === 12 ? '1 an' : `${months} mois`}
                  </p>
                ) : (
                  <p className="text-xs text-[#71717A] mt-1">par mois</p>
                )}

                {savings > 0 && (
                  <span
                    className="inline-flex items-center mt-2 text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: '#E8F5E9', color: '#1B5E20' }}
                  >
                    Économie : {fmt(savings)} F CFA
                  </span>
                )}
              </div>

              {/* Prix mensuel barré quand discount actif */}
              {discount > 0 && (
                <p
                  className="text-xs text-[#71717A]/60 line-through mt-1 transition-all duration-200"
                  style={{ opacity: animating ? 0 : 1 }}
                >
                  Sans remise : {fmt(base)} F CFA
                </p>
              )}
            </div>
          );

          return (
            <div
              key={String(p.id)}
              className="relative flex flex-col rounded-2xl border p-6 transition-shadow hover:shadow-[0_8px_30px_rgba(16,24,40,0.07)]"
              style={{
                borderColor: isPopular ? '#2E7D32' : '#E7E7EA',
                background: isPopular ? '#F9FFF9' : '#fff',
              }}
            >
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full text-white"
                    style={{ background: '#2E7D32' }}
                  >
                    <Sparkles size={11} /> Le plus populaire
                  </span>
                </div>
              )}

              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] mb-3">{p.name}</p>

              <div className="mb-4">{priceContent}</div>

              {p.description && (
                <p className="text-sm text-[#71717A] mb-5 leading-relaxed">{p.description}</p>
              )}

              {p.features && p.features.length > 0 && (
                <ul className="space-y-2 mb-5 flex-1">
                  {p.features.slice(0, 4).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#18181B]">
                      <Check size={14} className="shrink-0 mt-0.5 text-[#2E7D32]" />
                      {f}
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={() => navigate(`/auth?plan=${p.slug || p.id}&duration=${months}`)}
                className="mt-auto w-full h-10 rounded-[10px] text-sm font-semibold transition-colors"
                style={isPopular
                  ? { background: '#2E7D32', color: '#fff' }
                  : { background: 'transparent', color: '#18181B', border: '1px solid #E7E7EA' }
                }
              >
                {isFree ? 'Commencer gratuitement' : 'Choisir cette formule'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Features list ─────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Wifi,     title: 'NFC instantané',      desc: "Un simple geste et votre portfolio s'affiche. Fini les cartes de visite perdues." },
  { icon: Globe,    title: 'Portfolio vivant',     desc: 'Projets, expériences et contacts actualisés en temps réel, partout.' },
  { icon: UserPlus, title: 'Networking efficace',  desc: 'Vos contacts enregistrent vos informations en un tap.' },
  { icon: BarChart2,title: 'Analytics avancées',   desc: 'Suivez scans, vues et conversions de votre portfolio.' },
  { icon: Shield,   title: 'Sécurisé & privé',     desc: 'Contrôle granulaire de ce que chacun peut voir.' },
  { icon: QrCode,   title: 'Multi-plateformes',    desc: 'QR code de secours si le NFC est indisponible. Toujours accessible.' },
];

// ── Landing Page ──────────────────────────────────────────────────────────────
const Landing: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash === '#formules') {
      const el = document.getElementById('formules');
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(60% 50% at 50% -10%, #E8F5E9, transparent 70%)' }}
        />
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-20 grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full mb-6"
              style={{ background: '#E8F5E9', color: '#1B5E20' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]" />
              Nouvelle génération de carte de visite
            </span>

            <h1
              className="font-extrabold text-[#18181B] leading-[0.95] tracking-tight"
              style={{ fontSize: 'clamp(2.8rem, 6vw, 4.6rem)' }}
            >
              Votre carrière.<br />En un{' '}
              <span className="text-[#1B5E20]">scan</span>.
            </h1>

            <p className="mt-6 text-lg text-[#18181B]/70 max-w-md leading-relaxed">
              Créez un portfolio professionnel élégant et partagez-le instantanément avec une carte NFC.
              Votre réseau, à portée de geste.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center h-12 px-6 rounded-xl text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                style={{ background: '#2E7D32' }}
              >
                Créer mon portfolio
              </Link>
              <Link
                to="/nfc-types"
                className="inline-flex items-center h-12 px-6 rounded-xl text-sm font-semibold text-[#18181B] border border-[#E7E7EA] hover:bg-zinc-50 transition-colors"
              >
                Voir un exemple
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-5 text-sm text-[#71717A]">
              <span className="flex items-center gap-1.5">
                <Check size={16} className="text-[#2E7D32]" /> Sans engagement
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={16} className="text-[#2E7D32]" /> Paiement Wave
              </span>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end pr-4 py-10">
            <NFCCardVisual />
          </div>
        </div>
      </section>

      {/* ── Trust band ── */}
      <section className="border-y border-[#E7E7EA] bg-zinc-50/60">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm font-semibold text-[#71717A]">
          <span>Utilisé par des pros à</span>
          {['Dakar', 'Abidjan', 'Paris', 'Casablanca', 'Montréal'].map(city => (
            <span key={city} className="text-[#18181B]/70">{city}</span>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#71717A] mb-3">
            Pourquoi Portefolia
          </p>
          <h2
            className="font-extrabold text-[#18181B] leading-[1.02] tracking-tight"
            style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}
          >
            Tout pour moderniser votre networking
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-[#E7E7EA] p-6 hover:shadow-[0_8px_30px_rgba(16,24,40,0.07)] transition-shadow"
              >
                <span
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: '#E8F5E9', color: '#1B5E20' }}
                >
                  <Icon size={20} />
                </span>
                <h3 className="text-base font-semibold text-[#18181B]">{f.title}</h3>
                <p className="mt-2 text-sm text-[#18181B]/60 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="formules" className="bg-zinc-50/60 border-y border-[#E7E7EA]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-24">
          <div className="text-center max-w-2xl mx-auto mb-4">
            <h2
              className="font-extrabold text-[#18181B] leading-[1.02] tracking-tight"
              style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}
            >
              Une formule pour chaque étape
            </h2>
            <p className="mt-4 text-[#18181B]/60">
              Commencez gratuitement, évoluez quand vous voulez.{' '}
              <span className="font-semibold text-[#1B5E20]">Économisez jusqu'à 20%</span> en payant plusieurs mois.
            </p>
          </div>

          <PlansGrid />

          <div className="text-center mt-8">
            <Link
              to="/upgrade"
              className="text-sm font-semibold hover:underline"
              style={{ color: '#1B5E20' }}
            >
              Comparer toutes les formules →
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-20">
        <div
          className="rounded-3xl px-8 sm:px-14 py-14 text-center relative overflow-hidden"
          style={{ background: '#1B5E20' }}
        >
          <div
            className="absolute inset-0 opacity-[0.15] pointer-events-none"
            style={{ background: 'radial-gradient(50% 80% at 50% 0%, #2E7D32, transparent 70%)' }}
          />
          <h2
            className="relative font-extrabold text-white leading-[1.02] tracking-tight"
            style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)' }}
          >
            Prêt à révolutionner votre networking ?
          </h2>
          <p className="relative mt-4 text-white/60 max-w-lg mx-auto">
            Rejoignez les professionnels qui ont déjà modernisé leur première impression.
          </p>
          <Link
            to="/auth"
            className="relative inline-flex items-center mt-8 h-12 px-7 rounded-xl text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
            style={{ background: '#2E7D32' }}
          >
            Créer mon compte gratuitement
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
