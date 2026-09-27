// EntreprisePages.jsx — À propos, Blog, Carrières. window.AProposScreen, BlogScreen, CarrieresScreen

// ── À propos ───────────────────────────────────────────────────
const VALUES = [
  { icon: 'zap', title: 'Simplicité', desc: 'Un portfolio professionnel en ligne en quelques minutes, sans compétence technique.' },
  { icon: 'shield', title: 'Confiance', desc: 'Vos données protégées, des paiements sécurisés via Wave et Orange Money.' },
  { icon: 'globe', title: 'Ancrage local', desc: 'Pensé à Dakar pour les professionnels d\'Afrique de l\'Ouest, ouvert sur le monde.' },
  { icon: 'sparkles', title: 'Exigence', desc: 'Des designs soignés et une expérience irréprochable, du mobile au desktop.' },
];
const STATS = [['1 248', 'Professionnels'], ['2 156', 'Portfolios créés'], ['5 pays', 'Présence'], ['412', 'Cartes NFC livrées']];
const TEAM = [
  { name: 'Mamadou Diallo', role: 'CEO & Co-fondateur', initial: 'M' },
  { name: 'Awa Diané', role: 'CTO & Co-fondatrice', initial: 'A' },
  { name: 'Sokhna Mbaye', role: 'Head of Design', initial: 'S' },
  { name: 'Babacar Sy', role: 'Head of Growth', initial: 'B' },
];

function AProposScreen({ go }) {
  return (
    <MarketingPage go={go} active="apropos">
      <PageHero go={go} crumb="À propos" eyebrow="Notre histoire" title="Moderniser la première impression"
        subtitle="Portefolia est né à Dakar d'un constat simple : la carte de visite papier n'a plus sa place dans un monde connecté." />
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-14">
        <div className="prose-like space-y-5 text-ink/75 text-lg leading-relaxed" style={{ textWrap: 'pretty' }}>
          <p>En 2025, échanger ses coordonnées professionnelles passait encore par des bouts de carton vite perdus. Nous avons imaginé une alternative : un <strong className="text-ink">portfolio vivant</strong>, partagé d'un simple geste grâce au NFC.</p>
          <p>Aujourd'hui, des centaines de designers, développeurs, commerciaux et entrepreneurs ouest-africains utilisent Portefolia pour présenter leur travail et développer leur réseau — du freelance à l'entreprise.</p>
        </div>
      </div>

      {/* Stats */}
      <section className="border-y border-line bg-zinc-50/60">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-12 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {STATS.map(([v, l]) => (
            <div key={l}><p className="font-serif text-ink tracking-tight" style={{ fontSize: 'clamp(2rem,4vw,2.8rem)' }}>{v}</p><p className="text-sm text-muted mt-1">{l}</p></div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-16">
        <h2 className="font-serif text-ink text-center leading-tight tracking-tight mb-10" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.6rem)' }}>Nos valeurs</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {VALUES.map(v => (
            <div key={v.title} className="rounded-2xl border border-line p-6">
              <span className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-tint)', color: 'var(--accent-600)' }}><Icon name={v.icon} size={20} /></span>
              <h3 className="font-bold text-ink">{v.title}</h3>
              <p className="text-sm text-ink/60 mt-1.5 leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="border-t border-line bg-zinc-50/60">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-16">
          <div className="text-center mb-10"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted mb-2">L'équipe</p><h2 className="font-serif text-ink leading-tight tracking-tight" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.6rem)' }}>Les visages derrière Portefolia</h2></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {TEAM.map(m => (
              <div key={m.name} className="rounded-2xl border border-line bg-white p-6 text-center">
                <span className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-bold" style={{ background: 'linear-gradient(140deg, var(--accent), var(--accent-600))' }}>{m.initial}</span>
                <p className="font-bold text-ink mt-4">{m.name}</p>
                <p className="text-sm text-muted mt-0.5">{m.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-16 text-center">
        <h2 className="font-serif text-ink leading-tight tracking-tight" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.6rem)' }}>Rejoignez l'aventure</h2>
        <p className="text-ink/60 mt-3 max-w-md mx-auto">Créez votre portfolio gratuitement, ou rejoignez notre équipe.</p>
        <div className="flex flex-wrap gap-3 justify-center mt-6">
          <button onClick={() => go('dashboard')} className="h-12 px-6 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--accent)' }}>Créer mon portfolio</button>
          <button onClick={() => go('carrieres')} className="h-12 px-6 rounded-xl text-sm font-semibold text-ink border border-line hover:bg-zinc-50 transition-colors">Voir les offres</button>
        </div>
      </section>
    </MarketingPage>
  );
}

// ── Blog ───────────────────────────────────────────────────────
const BLOG_CATS = ['Tous', 'Conseils carrière', 'Produit', 'NFC & tech', 'Études de cas'];
const BLOG_FEAT = { cat: 'Conseils carrière', title: 'Portfolio vs CV : que regardent vraiment les recruteurs en 2026 ?', excerpt: 'Le document figé laisse place à des expériences interactives. Décryptage de ce qui fait mouche aujourd\'hui auprès des recruteurs ouest-africains.', author: 'Sokhna Mbaye', date: '10 juin 2026', read: '6 min', img: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=900&h=500&fit=crop' };
const BLOG_POSTS = [
  { cat: 'NFC & tech', title: 'Comment fonctionne vraiment une carte NFC ?', excerpt: 'Plongée simple dans la technologie derrière le partage en un geste.', author: 'Awa Diané', date: '6 juin 2026', read: '4 min', img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop' },
  { cat: 'Produit', title: 'Nouveau : 25 templates pour votre portfolio', excerpt: 'Éditorial, Classique, Minimal, Sombre — déclinés en 8 palettes.', author: 'Sokhna Mbaye', date: '2 juin 2026', read: '3 min', img: 'https://images.unsplash.com/photo-1559028012-481c04fa702d?w=600&h=400&fit=crop' },
  { cat: 'Études de cas', title: 'Comment Wave structure son équipe design avec Portefolia', excerpt: 'Retour d\'expérience sur le déploiement à l\'échelle d\'une entreprise.', author: 'Mamadou Diallo', date: '28 mai 2026', read: '7 min', img: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&h=400&fit=crop' },
  { cat: 'Conseils carrière', title: '5 erreurs à éviter sur son portfolio de freelance', excerpt: 'Les pièges classiques qui font fuir les clients potentiels.', author: 'Babacar Sy', date: '21 mai 2026', read: '5 min', img: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&h=400&fit=crop' },
  { cat: 'Produit', title: 'Paiements Wave : encore plus rapides', excerpt: 'La validation des paiements passe sous la barre des 30 minutes.', author: 'Awa Diané', date: '15 mai 2026', read: '2 min', img: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=600&h=400&fit=crop' },
  { cat: 'NFC & tech', title: 'QR code ou NFC : lequel choisir ?', excerpt: 'Les deux ont leur place. On vous explique quand utiliser quoi.', author: 'Awa Diané', date: '9 mai 2026', read: '4 min', img: 'https://images.unsplash.com/photo-1606868306217-dbf5046868d2?w=600&h=400&fit=crop' },
];

function BlogImg({ src, h }) {
  const [ok, setOk] = React.useState(true);
  if (src && ok) return <div className={h + ' overflow-hidden bg-zinc-100'}><img src={src} onError={() => setOk(false)} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" /></div>;
  return <div className={h + ' flex items-center justify-center'} style={{ background: 'var(--accent-tint)' }}><Icon name="book" size={28} style={{ color: 'var(--accent-600)', opacity: .5 }} /></div>;
}

function BlogScreen({ go }) {
  const [cat, setCat] = React.useState('Tous');
  const posts = cat === 'Tous' ? BLOG_POSTS : BLOG_POSTS.filter(p => p.cat === cat);
  return (
    <MarketingPage go={go} active="blog">
      <PageHero go={go} crumb="Blog" eyebrow="Le journal" title="Le blog Portefolia" subtitle="Conseils carrière, nouveautés produit et coulisses de la tech NFC." />
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-12">
        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {BLOG_CATS.map(c => <button key={c} onClick={() => setCat(c)} className={`px-3.5 h-9 rounded-full text-sm font-medium transition-colors ${cat === c ? 'text-white' : 'border border-line text-ink/70 hover:bg-zinc-50'}`} style={cat === c ? { background: 'var(--ink-nav)' } : undefined}>{c}</button>)}
        </div>

        {/* Featured */}
        {cat === 'Tous' && (
          <article className="group grid md:grid-cols-2 gap-6 rounded-2xl border border-line overflow-hidden mb-10 hover:shadow-[0_10px_36px_rgba(16,24,40,0.08)] transition-shadow cursor-pointer">
            <BlogImg src={BLOG_FEAT.img} h="h-52 md:h-full" />
            <div className="p-6 sm:p-8 flex flex-col justify-center">
              <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md self-start" style={{ background: 'var(--accent-tint)', color: 'var(--accent-600)' }}>{BLOG_FEAT.cat}</span>
              <h2 className="font-serif text-ink leading-tight tracking-tight mt-3" style={{ fontSize: 'clamp(1.6rem,3vw,2.2rem)' }}>{BLOG_FEAT.title}</h2>
              <p className="text-ink/60 mt-3 leading-relaxed">{BLOG_FEAT.excerpt}</p>
              <div className="flex items-center gap-2 mt-5 text-sm text-muted"><span className="font-medium text-ink">{BLOG_FEAT.author}</span><span>·</span><span>{BLOG_FEAT.date}</span><span>·</span><span>{BLOG_FEAT.read}</span></div>
            </div>
          </article>
        )}

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map(p => (
            <article key={p.title} className="group rounded-2xl border border-line overflow-hidden flex flex-col hover:shadow-[0_8px_30px_rgba(16,24,40,0.07)] transition-shadow cursor-pointer">
              <BlogImg src={p.img} h="h-44" />
              <div className="p-5 flex flex-col flex-1">
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--accent-600)' }}>{p.cat}</span>
                <h3 className="font-bold text-ink mt-1.5 leading-snug">{p.title}</h3>
                <p className="text-sm text-ink/60 mt-2 leading-relaxed flex-1">{p.excerpt}</p>
                <div className="flex items-center gap-2 mt-4 text-xs text-muted"><span className="font-medium text-ink/80">{p.author}</span><span>·</span><span>{p.date}</span><span>·</span><span>{p.read}</span></div>
              </div>
            </article>
          ))}
        </div>

        {/* Newsletter */}
        <div className="mt-12 rounded-2xl border border-line p-7 sm:p-8 flex flex-col sm:flex-row items-center gap-5 bg-zinc-50/60">
          <div className="flex-1 text-center sm:text-left"><h3 className="font-bold text-ink text-lg">Recevez nos articles</h3><p className="text-sm text-muted mt-1">Un email par mois, zéro spam. Conseils carrière et nouveautés.</p></div>
          <div className="flex gap-2 w-full sm:w-auto">
            <input placeholder="vous@email.com" className="flex-1 sm:w-56 h-11 px-3.5 rounded-xl border border-line outline-none text-sm focus:border-ink/30" />
            <button className="h-11 px-5 rounded-xl text-sm font-semibold text-white shrink-0" style={{ background: 'var(--accent)' }}>S'abonner</button>
          </div>
        </div>
      </div>
    </MarketingPage>
  );
}

// ── Carrières ──────────────────────────────────────────────────
const PERKS = [
  { icon: 'globe', title: 'Remote-friendly', desc: 'Travaillez depuis Dakar ou à distance, horaires flexibles.' },
  { icon: 'trending', title: 'Impact réel', desc: 'Votre travail touche des milliers de professionnels chaque jour.' },
  { icon: 'sparkles', title: 'Équipe ambitieuse', desc: 'Une startup en croissance qui valorise l\'initiative.' },
  { icon: 'heart', title: 'Bien-être', desc: 'Assurance santé, congés généreux et budget formation.' },
];
const JOBS = [
  { title: 'Développeur·se Full-Stack', team: 'Engineering', type: 'CDI', loc: 'Dakar / Remote' },
  { title: 'Product Designer', team: 'Design', type: 'CDI', loc: 'Dakar' },
  { title: 'Growth Marketer', team: 'Marketing', type: 'CDI', loc: 'Dakar / Remote' },
  { title: 'Customer Success Manager', team: 'Support', type: 'CDI', loc: 'Dakar' },
  { title: 'Stage — Community Management', team: 'Marketing', type: 'Stage', loc: 'Dakar' },
];

function CarrieresScreen({ go }) {
  return (
    <MarketingPage go={go} active="carrieres">
      <PageHero go={go} crumb="Carrières" eyebrow="Rejoignez-nous" title="Construisons l'avenir du networking"
        subtitle="Nous recrutons des personnes passionnées pour faire grandir Portefolia depuis Dakar." />
      {/* Perks */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PERKS.map(p => (
            <div key={p.title} className="rounded-2xl border border-line p-6">
              <span className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-tint)', color: 'var(--accent-600)' }}><Icon name={p.icon} size={20} /></span>
              <h3 className="font-bold text-ink">{p.title}</h3>
              <p className="text-sm text-ink/60 mt-1.5 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Open positions */}
      <section className="border-t border-line bg-zinc-50/60">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-14">
          <div className="text-center mb-8"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted mb-2">Postes ouverts</p><h2 className="font-serif text-ink leading-tight tracking-tight" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.6rem)' }}>{JOBS.length} opportunités</h2></div>
          <div className="space-y-3">
            {JOBS.map(j => (
              <button key={j.title} className="group w-full flex items-center gap-4 rounded-2xl border border-line bg-white p-5 hover:border-ink/15 hover:shadow-[0_8px_30px_rgba(16,24,40,0.06)] transition-all text-left">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-ink">{j.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted">
                    <span className="flex items-center gap-1"><Icon name="brief" size={13} /> {j.team}</span>
                    <span className="flex items-center gap-1"><Icon name="clock" size={13} /> {j.type}</span>
                    <span className="flex items-center gap-1"><Icon name="pin" size={13} /> {j.loc}</span>
                  </div>
                </div>
                <span className="shrink-0 h-9 px-4 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors" style={{ background: 'var(--accent-tint)', color: 'var(--accent-600)' }}>Postuler <Icon name="arrow" size={14} className="group-hover:translate-x-0.5 transition-transform" /></span>
              </button>
            ))}
          </div>
          <div className="text-center mt-8">
            <p className="text-sm text-muted">Aucun poste ne correspond ? Écrivez-nous tout de même.</p>
            <button onClick={() => go('contact')} className="mt-3 text-sm font-semibold hover:underline" style={{ color: 'var(--accent-600)' }}>Candidature spontanée →</button>
          </div>
        </div>
      </section>
    </MarketingPage>
  );
}

Object.assign(window, { AProposScreen, BlogScreen, CarrieresScreen });
