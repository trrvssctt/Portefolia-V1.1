import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Globe, TrendingUp, Sparkles, Heart, Briefcase, Clock, MapPin, ArrowRight, ArrowLeft } from 'lucide-react';

const PERKS = [
  { Icon: Globe,      title: 'Remote-friendly',    desc: 'Travaillez depuis Dakar ou à distance, horaires flexibles.' },
  { Icon: TrendingUp, title: 'Impact réel',         desc: 'Votre travail touche des milliers de professionnels chaque jour.' },
  { Icon: Sparkles,   title: 'Équipe ambitieuse',   desc: "Une startup en croissance qui valorise l'initiative." },
  { Icon: Heart,      title: 'Bien-être',           desc: 'Assurance santé, congés généreux et budget formation.' },
];

const JOBS = [
  { title: 'Développeur·se Full-Stack',     team: 'Engineering', type: 'CDI',   loc: 'Dakar / Remote' },
  { title: 'Product Designer',              team: 'Design',      type: 'CDI',   loc: 'Dakar' },
  { title: 'Growth Marketer',               team: 'Marketing',   type: 'CDI',   loc: 'Dakar / Remote' },
  { title: 'Customer Success Manager',      team: 'Support',     type: 'CDI',   loc: 'Dakar' },
  { title: 'Stage — Community Management',  team: 'Marketing',   type: 'Stage', loc: 'Dakar' },
];

export default function Carrieres() {
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
            <span className="text-[#18181B]">Carrières</span>
          </Link>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-3" style={{ color: '#1B5E20' }}>Rejoignez-nous</p>
          <h1 className="font-serif text-[#18181B] leading-[1.0] tracking-tight mx-auto"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>
            Construisons l'avenir du networking
          </h1>
          <p className="mt-4 text-lg text-[#18181B]/65 max-w-xl mx-auto leading-relaxed">
            Nous recrutons des personnes passionnées pour faire grandir Portefolia depuis Dakar.
          </p>
        </div>
      </header>

      {/* Perks */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PERKS.map(({ Icon, title, desc }) => (
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

      {/* Open positions */}
      <section className="border-t border-[#E7E7EA] bg-zinc-50/60">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-14">
          <div className="text-center mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#71717A] mb-2">Postes ouverts</p>
            <h2 className="font-serif text-[#18181B] leading-tight tracking-tight"
              style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)' }}>{JOBS.length} opportunités</h2>
          </div>
          <div className="space-y-3">
            {JOBS.map(j => (
              <div key={j.title}
                className="group w-full flex items-center gap-4 rounded-2xl border border-[#E7E7EA] bg-white p-5 hover:border-[#18181B]/15 hover:shadow-[0_8px_30px_rgba(16,24,40,0.06)] transition-all cursor-pointer">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#18181B]">{j.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-[#71717A]">
                    <span className="flex items-center gap-1"><Briefcase size={13} /> {j.team}</span>
                    <span className="flex items-center gap-1"><Clock size={13} /> {j.type}</span>
                    <span className="flex items-center gap-1"><MapPin size={13} /> {j.loc}</span>
                  </div>
                </div>
                <span className="shrink-0 h-9 px-4 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors"
                  style={{ background: '#E8F5E9', color: '#1B5E20' }}>
                  Postuler <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <p className="text-sm text-[#71717A]">Aucun poste ne correspond ? Écrivez-nous tout de même.</p>
            <Link to="/contact"
              className="mt-3 text-sm font-semibold hover:underline inline-block"
              style={{ color: '#1B5E20' }}>
              Candidature spontanée →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
