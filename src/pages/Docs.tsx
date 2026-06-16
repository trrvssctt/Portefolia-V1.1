import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Rocket, LayoutGrid, Wifi, Waves, Building2, BarChart2, Star, FileText, ArrowRight, Search, MessageCircle, ArrowLeft } from 'lucide-react';

const DOC_CATS = [
  { Icon: Rocket,    title: 'Premiers pas',          desc: 'Créer un compte, votre premier portfolio, choisir un template.',         n: 8 },
  { Icon: LayoutGrid,title: 'Éditeur de portfolio',  desc: 'Sections, projets, expériences, compétences et personnalisation.',       n: 14 },
  { Icon: Wifi,      title: 'Cartes NFC',            desc: 'Commander, activer et associer une carte à un portfolio.',               n: 6 },
  { Icon: Waves,     title: 'Paiements & formules',  desc: 'Wave, Orange Money, factures et changement de formule.',                 n: 9 },
  { Icon: Building2, title: 'Espace Business',       desc: 'Inviter des membres, gérer les rôles et la marque entreprise.',         n: 11 },
  { Icon: BarChart2, title: 'Analytics',             desc: 'Comprendre vues, scans NFC et contacts collectés.',                     n: 5 },
];

const DOC_POPULAR = [
  'Connecter un domaine personnalisé',
  'Activer ma carte NFC pour la première fois',
  'Comprendre mes statistiques de vues',
  'Passer de Starter à Pro',
  'Rendre un portfolio public ou privé',
];

export default function Docs() {
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
            <span className="text-[#18181B]">Documentation</span>
          </Link>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-3" style={{ color: '#1B5E20' }}>Centre de ressources</p>
          <h1 className="font-serif text-[#18181B] leading-[1.0] tracking-tight mx-auto"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>Documentation</h1>
          <p className="mt-4 text-lg text-[#18181B]/65 max-w-xl mx-auto leading-relaxed">
            Guides, tutoriels et bonnes pratiques pour tirer le meilleur de Portefolia.
          </p>
          <div className="relative max-w-md mx-auto mt-7">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#71717A]" />
            <input
              placeholder="Rechercher dans la documentation…"
              className="w-full h-12 pl-11 pr-4 rounded-xl border border-[#E7E7EA] bg-white outline-none text-sm focus:border-[#18181B]/30"
            />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-14">

        {/* Category grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {DOC_CATS.map(({ Icon, title, desc, n }) => (
            <button key={title}
              className="group text-left rounded-2xl border border-[#E7E7EA] p-6 hover:shadow-[0_8px_30px_rgba(16,24,40,0.07)] hover:border-[#18181B]/15 transition-all">
              <span className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: '#E8F5E9', color: '#1B5E20' }}>
                <Icon size={20} />
              </span>
              <h3 className="font-bold text-[#18181B]">{title}</h3>
              <p className="text-sm text-[#18181B]/60 mt-1.5 leading-relaxed">{desc}</p>
              <p className="text-xs font-semibold mt-4 flex items-center gap-1" style={{ color: '#1B5E20' }}>
                {n} articles <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </p>
            </button>
          ))}
        </div>

        {/* Popular + CTA */}
        <div className="mt-12 grid lg:grid-cols-[1.4fr_1fr] gap-6">
          <div className="rounded-2xl border border-[#E7E7EA] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E7E7EA] flex items-center gap-2">
              <Star size={15} style={{ color: '#1B5E20' }} />
              <h3 className="font-bold text-[#18181B] text-sm">Articles populaires</h3>
            </div>
            <div className="divide-y divide-[#E7E7EA]">
              {DOC_POPULAR.map(a => (
                <button key={a}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-zinc-50/60 transition-colors group">
                  <FileText size={15} className="text-[#71717A] shrink-0" />
                  <span className="text-sm text-[#18181B] flex-1">{a}</span>
                  <ArrowRight size={15} className="text-[#D4D4D8] group-hover:text-[#18181B]/50 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-6 text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(140deg, #1B5E20, #2E7D32)' }}>
            <div className="absolute inset-0 opacity-[0.12] pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
            <div className="relative">
              <MessageCircle size={24} />
              <h3 className="font-bold text-lg mt-3">Besoin d'aide ?</h3>
              <p className="text-white/70 text-sm mt-1.5 leading-relaxed">
                Notre équipe support répond à toutes vos questions techniques.
              </p>
              <Link to="/contact"
                className="mt-5 h-10 px-4 rounded-lg bg-white text-sm font-semibold inline-flex items-center gap-2"
                style={{ color: '#1B5E20' }}>
                Contacter le support <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
