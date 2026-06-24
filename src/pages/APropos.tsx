import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Zap, Shield, Globe, Sparkles, ArrowLeft } from 'lucide-react';

const VALUES = [
  { Icon: Zap,      title: 'Simplicité',    desc: 'Un portfolio professionnel en ligne en quelques minutes, sans compétence technique.' },
  { Icon: Shield,   title: 'Confiance',     desc: 'Vos données protégées, des paiements sécurisés via Wave et Orange Money.' },
  { Icon: Globe,    title: 'Ancrage local', desc: "Pensé à Dakar pour les professionnels d'Afrique de l'Ouest, ouvert sur le monde." },
  { Icon: Sparkles, title: 'Exigence',      desc: 'Des designs soignés et une expérience irréprochable, du mobile au desktop.' },
];

const STATS: [string, string][] = [
  ['1 248', 'Professionnels'],
  ['2 156', 'Portfolios créés'],
  ['5 pays', 'Présence'],
  ['412',   'Cartes NFC livrées'],
];

const TEAM = [
  { name: 'Seydou DIANKA',        role: 'Co-fondateur · Développeur',              initial: 'SD' },
  { name: 'Rudaldy Rudy NGOMA',   role: 'Co-fondateur · Chef de projet Marketing digital', initial: 'RN' },
  { name: 'Mariama NDIAYE',       role: 'Co-fondatrice · Directrice Générale',     initial: 'MN' },
];

export default function APropos() {
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
            <span className="text-[#18181B]">À propos</span>
          </Link>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-3" style={{ color: '#1B5E20' }}>Notre histoire</p>
          <h1 className="font-serif text-[#18181B] leading-[1.0] tracking-tight mx-auto"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>
            Moderniser la première impression
          </h1>
          <p className="mt-4 text-lg text-[#18181B]/65 max-w-xl mx-auto leading-relaxed">
            Portefolia est né à Dakar d'un constat simple : la carte de visite papier n'a plus sa place dans un monde connecté.
          </p>
        </div>
      </header>

      {/* Story */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-14">
        <div className="space-y-5 text-[#18181B]/75 text-lg leading-relaxed">
          <p>En 2025, échanger ses coordonnées professionnelles passait encore par des bouts de carton vite perdus. Nous avons imaginé une alternative : un <strong className="text-[#18181B]">portfolio vivant</strong>, partagé d'un simple geste grâce au NFC.</p>
          <p>Aujourd'hui, des centaines de designers, développeurs, commerciaux et entrepreneurs ouest-africains utilisent Portefolia pour présenter leur travail et développer leur réseau — du freelance à l'entreprise.</p>
        </div>
      </div>

      {/* Stats */}
      <section className="border-y border-[#E7E7EA] bg-zinc-50/60">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-12 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {STATS.map(([v, l]) => (
            <div key={l}>
              <p className="font-serif text-[#18181B] tracking-tight" style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)' }}>{v}</p>
              <p className="text-sm text-[#71717A] mt-1">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-16">
        <h2 className="font-serif text-[#18181B] text-center leading-tight tracking-tight mb-10"
          style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)' }}>Nos valeurs</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {VALUES.map(({ Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-[#E7E7EA] p-6">
              <span className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: '#E8F5E9', color: '#1B5E20' }}>
                <Icon size={20} />
              </span>
              <h3 className="font-bold text-[#18181B]">{title}</h3>
              <p className="text-sm text-[#18181B]/60 mt-1.5 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="border-t border-[#E7E7EA] bg-zinc-50/60">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-16">
          <div className="text-center mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#71717A] mb-2">L'équipe</p>
            <h2 className="font-serif text-[#18181B] leading-tight tracking-tight"
              style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)' }}>Les visages derrière Portefolia</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {TEAM.map(m => (
              <div key={m.name} className="rounded-2xl border border-[#E7E7EA] bg-white p-6 text-center">
                <span className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-bold"
                  style={{ background: 'linear-gradient(140deg, #2E7D32, #1B5E20)' }}>{m.initial}</span>
                <p className="font-bold text-[#18181B] mt-4">{m.name}</p>
                <p className="text-sm text-[#71717A] mt-0.5">{m.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-16 text-center">
        <h2 className="font-serif text-[#18181B] leading-tight tracking-tight"
          style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)' }}>Rejoignez l'aventure</h2>
        <p className="text-[#18181B]/60 mt-3 max-w-md mx-auto">Créez votre portfolio gratuitement, ou rejoignez notre équipe.</p>
        <div className="flex flex-wrap gap-3 justify-center mt-6">
          <Link to="/auth"
            className="h-12 px-6 rounded-xl text-sm font-semibold text-white inline-flex items-center"
            style={{ background: '#2E7D32' }}>
            Créer mon portfolio
          </Link>
          <Link to="/carrieres"
            className="h-12 px-6 rounded-xl text-sm font-semibold text-[#18181B] border border-[#E7E7EA] hover:bg-zinc-50 transition-colors inline-flex items-center">
            Voir les offres
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
