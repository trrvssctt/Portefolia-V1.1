// Landing.jsx — modernized marketing landing. window.LandingScreen
function NFCCardVisual() {
  return (
    <div className="relative" style={{ perspective: '1200px' }}>
      {/* Main card */}
      <div className="relative w-[300px] h-[190px] rounded-3xl p-6 flex flex-col justify-between shadow-[0_30px_60px_-20px_rgba(16,24,40,0.4)]"
        style={{ background: 'linear-gradient(145deg, #1A1A1F 0%, #2A2D3A 100%)', transform: 'rotateY(-16deg) rotateX(6deg)' }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ background: 'var(--accent)' }}>
              <Icon name="layout" size={15} stroke={2.2} />
            </span>
            <span className="text-white font-bold tracking-tight">Portefolia</span>
          </div>
          <Icon name="wifi" size={20} className="text-white/70 rotate-90" />
        </div>
        {/* Chip */}
        <div className="w-11 h-8 rounded-md" style={{ background: 'linear-gradient(135deg,#E6C171,#B8923D)' }}></div>
        <div>
          <p className="text-white font-semibold text-lg leading-tight">Awa Ndiaye</p>
          <p className="text-white/50 text-xs">Product Designer · Dakar</p>
        </div>
      </div>
      {/* Floating profile chip */}
      <div className="absolute -bottom-6 -right-4 bg-white rounded-2xl border border-line shadow-[0_16px_40px_rgba(16,24,40,0.16)] p-3 flex items-center gap-2.5 w-52"
        style={{ transform: 'rotate(4deg)' }}>
        <span className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ background: 'linear-gradient(140deg, var(--accent), var(--accent-600))' }}>A</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-ink truncate">Profil ouvert</p>
          <p className="text-[11px] text-muted truncate">En 0,3 s après le scan</p>
        </div>
        <span className="ml-auto"><Icon name="check" size={16} style={{ color: 'var(--accent)' }} /></span>
      </div>
    </div>
  );
}

function LandingScreen({ go }) {
  const features = [
    { icon: 'wifi', title: 'NFC instantané', desc: "Un simple geste et votre portfolio s'affiche. Fini les cartes de visite perdues." },
    { icon: 'globe', title: 'Portfolio vivant', desc: 'Projets, expériences et contacts actualisés en temps réel, partout.' },
    { icon: 'userplus', title: 'Networking efficace', desc: 'Vos contacts enregistrent vos informations en un tap.' },
    { icon: 'bar', title: 'Analytics avancées', desc: 'Suivez scans, vues et conversions de votre portfolio.' },
    { icon: 'shield', title: 'Sécurisé & privé', desc: 'Contrôle granulaire de ce que chacun peut voir.' },
    { icon: 'qr', title: 'Multi-plateformes', desc: 'QR code de secours si le NFC est indisponible. Toujours accessible.' },
  ];
  const d = window.DATA;

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-line">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <button onClick={() => go('dashboard')} className="hidden sm:block text-sm font-medium text-muted hover:text-ink px-3 h-9 transition-colors">Connexion</button>
            <button onClick={() => go('dashboard')} className="h-9 px-4 rounded-[10px] text-sm font-semibold text-white transition-colors" style={{ background: 'var(--accent)' }}>Commencer</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(60% 50% at 50% -10%, var(--accent-tint), transparent 70%)' }}></div>
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-20 grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full mb-6"
              style={{ background: 'var(--accent-tint)', color: 'var(--accent-600)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }}></span>
              Nouvelle génération de carte de visite
            </span>
            <h1 className="font-serif text-ink leading-[0.95] tracking-tight" style={{ fontSize: 'clamp(2.8rem, 6vw, 4.6rem)' }}>
              Votre carrière.<br />En un <span style={{ color: 'var(--accent-600)' }}>scan</span>.
            </h1>
            <p className="mt-6 text-lg text-ink/70 max-w-md leading-relaxed" style={{ textWrap: 'pretty' }}>
              Créez un portfolio professionnel élégant et partagez-le instantanément avec une carte NFC. Votre réseau, à portée de geste.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => go('dashboard')} className="h-12 px-6 rounded-xl text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                style={{ background: 'var(--accent)' }}>Créer mon portfolio</button>
              <button onClick={() => go('portfolio')} className="h-12 px-6 rounded-xl text-sm font-semibold text-ink border border-line hover:bg-zinc-50 transition-colors">
                Voir un exemple
              </button>
            </div>
            <div className="mt-8 flex items-center gap-5 text-sm text-muted">
              <span className="flex items-center gap-1.5"><Icon name="check" size={16} style={{ color: 'var(--accent)' }} /> Sans engagement</span>
              <span className="flex items-center gap-1.5"><Icon name="check" size={16} style={{ color: 'var(--accent)' }} /> Paiement Wave</span>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end pr-4">
            <NFCCardVisual />
          </div>
        </div>
      </section>

      {/* Logos / trust */}
      <section className="border-y border-line bg-zinc-50/60">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm font-semibold text-muted">
          <span>Utilisé par des pros à</span>
          <span className="text-ink/70">Dakar</span>
          <span className="text-ink/70">Abidjan</span>
          <span className="text-ink/70">Paris</span>
          <span className="text-ink/70">Casablanca</span>
          <span className="text-ink/70">Montréal</span>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted mb-3">Pourquoi Portefolia</p>
          <h2 className="font-serif text-ink leading-[1.02] tracking-tight" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            Tout pour moderniser votre networking
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {features.map(f => (
            <div key={f.title} className="rounded-2xl border border-line p-6 hover:shadow-[0_8px_30px_rgba(16,24,40,0.07)] transition-shadow">
              <span className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                style={{ background: 'var(--accent-tint)', color: 'var(--accent-600)' }}>
                <Icon name={f.icon} size={20} />
              </span>
              <h3 className="text-base font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm text-ink/60 leading-relaxed" style={{ textWrap: 'pretty' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="bg-zinc-50/60 border-y border-line">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-24">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-serif text-ink leading-[1.02] tracking-tight" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
              Une formule pour chaque étape
            </h2>
            <p className="mt-4 text-ink/60">Commencez gratuitement, évoluez quand vous voulez.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 mt-12 items-start">
            {d.plans.map(p => <PlanCard key={p.slug} p={p} onChoose={() => go('formules')} compact />)}
          </div>
          <div className="text-center mt-8">
            <button onClick={() => go('formules')} className="text-sm font-semibold hover:underline" style={{ color: 'var(--accent-600)' }}>
              Comparer toutes les formules →
            </button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-20">
        <div className="rounded-3xl px-8 sm:px-14 py-14 text-center relative overflow-hidden" style={{ background: 'var(--ink-nav)' }}>
          <div className="absolute inset-0 opacity-[0.15] pointer-events-none"
            style={{ background: 'radial-gradient(50% 80% at 50% 0%, var(--accent), transparent 70%)' }}></div>
          <h2 className="relative font-serif text-white leading-[1.02] tracking-tight" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)' }}>
            Prêt à révolutionner votre networking ?
          </h2>
          <p className="relative mt-4 text-white/60 max-w-lg mx-auto">Rejoignez les professionnels qui ont déjà modernisé leur première impression.</p>
          <button onClick={() => go('dashboard')} className="relative mt-8 h-12 px-7 rounded-xl text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
            style={{ background: 'var(--accent)' }}>Créer mon compte gratuitement</button>
        </div>
      </section>

      <MarketingFooter go={go} />
    </div>
  );
}
window.LandingScreen = LandingScreen;
