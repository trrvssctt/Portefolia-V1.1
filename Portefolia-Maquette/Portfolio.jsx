// Portfolio.jsx — public portfolio with 4 template families. window.PortfolioScreen
const { useState } = React;

function Avatar({ src, name, size = 'lg', round = false }) {
  const [ok, setOk] = useState(true);
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const dim = size === 'lg' ? 'w-32 h-32 sm:w-36 sm:h-36' : size === 'md' ? 'w-24 h-24' : 'w-10 h-10';
  const shape = round ? 'rounded-full' : 'rounded-2xl';
  if (src && ok) return <img src={src} alt={name} onError={() => setOk(false)} className={`${dim} object-cover ${shape}`} />;
  return (
    <div className={`${dim} ${shape} flex items-center justify-center text-white font-semibold`}
      style={{ background: 'linear-gradient(140deg, var(--accent), var(--accent-600))', fontSize: size === 'lg' ? 40 : size === 'md' ? 30 : 15 }}>
      {initials}
    </div>
  );
}
function ProjImage({ src, title, h = 'h-44', dark }) {
  const [ok, setOk] = useState(true);
  if (src && ok) return <div className={`${h} overflow-hidden ${dark ? 'bg-white/5' : 'bg-zinc-100'}`}><img src={src} alt={title} onError={() => setOk(false)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" /></div>;
  return <div className={`${h} flex items-center justify-center`} style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'color-mix(in srgb, var(--accent) 12%, white)' }}><Icon name="layout" size={30} style={{ color: 'var(--accent-600)', opacity: .5 }} /></div>;
}
function SectionLabel({ children, dark }) {
  return <div className="flex items-center gap-3 mb-6"><span className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${dark ? 'text-white/40' : 'text-muted'}`}>{children}</span><span className={`h-px flex-1 ${dark ? 'bg-white/12' : 'bg-line'}`}></span></div>;
}

// ── Shared chrome ──────────────────────────────────────────────
function TopBar({ onBack, dark, templateName }) {
  return (
    <div className={`sticky top-0 z-40 backdrop-blur-md border-b ${dark ? 'bg-black/40 border-white/10' : 'bg-white/80 border-line'}`}>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
        <button onClick={onBack} className={`flex items-center gap-2 text-sm font-medium transition-colors ${dark ? 'text-white/60 hover:text-white' : 'text-muted hover:text-ink'}`}>
          <Icon name="arrow" size={16} className="rotate-180" /> Tableau de bord
        </button>
        {templateName && <span className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${dark ? 'bg-white/10 text-white/70' : 'bg-zinc-100 text-muted'}`}><Icon name="layers" size={12} /> {templateName}</span>}
        <div className="flex items-center gap-2">
          <button className={`hidden sm:flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] border text-sm font-medium transition-colors ${dark ? 'border-white/15 text-white hover:bg-white/10' : 'border-line text-ink hover:bg-zinc-50'}`}><Icon name="share" size={15} /> Partager</button>
          <button className="flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] text-sm font-semibold text-white transition-colors" style={{ background: 'var(--accent)' }}><Icon name="download" size={15} /> CV</button>
        </div>
      </div>
    </div>
  );
}
function Footer({ p, dark }) {
  return (
    <footer className={`border-t ${dark ? 'border-white/10' : 'border-line'}`}>
      <div className={`max-w-5xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between text-sm ${dark ? 'text-white/40' : 'text-muted'}`}>
        <span>© 2026 {p.title}</span>
        <span className="flex items-center gap-1.5">Créé avec <span className={dark ? 'font-semibold text-white/80' : 'font-semibold text-ink'}>Portefolia</span></span>
      </div>
    </footer>
  );
}
function Socials({ p, dark }) {
  return (
    <div className="flex flex-wrap gap-2">
      {p.socials.map(s => (
        <a key={s.key} className={`flex items-center gap-2 h-10 px-3.5 rounded-full border text-sm font-medium transition-all cursor-pointer ${dark ? 'border-white/15 text-white/90 hover:bg-white/10' : 'border-line text-ink hover:border-ink/30 hover:bg-zinc-50'}`}>
          <Icon name={s.icon} size={16} className={dark ? 'text-white/50' : 'text-muted'} /> {s.label}
        </a>
      ))}
    </div>
  );
}

// ── Family: ÉDITORIAL ──────────────────────────────────────────
function EditorialBody({ p }) {
  return (
    <React.Fragment>
      <header className="max-w-5xl mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-10">
        <div className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-8">
          <Avatar src={p.avatar} name={p.title} />
          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full mb-3" style={{ background: 'var(--accent-tint)', color: 'var(--accent-600)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }}></span> Disponible pour missions
            </span>
            <h1 className="font-serif leading-[0.95] text-ink tracking-tight" style={{ fontSize: 'clamp(2.6rem, 6vw, 4.2rem)' }}>{p.title}</h1>
            <p className="mt-2 text-lg sm:text-xl text-ink/70 font-medium">{p.role}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted">
              <span className="flex items-center gap-1.5"><Icon name="pin" size={15} /> {p.location}</span>
              <span className="flex items-center gap-1.5"><Icon name="phone" size={15} /> {p.phone}</span>
            </div>
          </div>
        </div>
        <p className="mt-8 text-lg leading-relaxed text-ink/75 max-w-2xl" style={{ textWrap: 'pretty' }}>{p.bio}</p>
        <div className="mt-6"><Socials p={p} /></div>
      </header>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10 lg:gap-14 items-start">
          <aside className="lg:sticky lg:top-20">
            <SectionLabel>Compétences</SectionLabel>
            <div className="space-y-4">
              {p.skills.map(s => (
                <div key={s.name}>
                  <div className="flex justify-between items-baseline mb-1.5"><span className="text-sm font-medium text-ink">{s.name}</span><span className="text-xs font-semibold text-muted tabular-nums">{s.level}</span></div>
                  <div className="h-1 rounded-full bg-zinc-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: s.level + '%', background: 'var(--accent)' }}></div></div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-5">{p.tags.map(t => <span key={t} className="text-xs font-medium px-2.5 py-1 rounded-md bg-zinc-100 text-ink/70">{t}</span>)}</div>
          </aside>
          <main className="space-y-16">
            <section>
              <SectionLabel>Expérience</SectionLabel>
              <div className="relative pl-6">
                <div className="absolute left-[5px] top-2 bottom-2 w-px bg-line"></div>
                <div className="space-y-9">
                  {p.experiences.map((e, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-6 top-1.5 w-[11px] h-[11px] rounded-full border-2 border-white" style={{ background: e.current ? 'var(--accent)' : '#D4D4D8', boxShadow: '0 0 0 1px #E7E7EA' }}></div>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"><h3 className="text-base font-semibold text-ink">{e.position}</h3><span className="text-xs font-medium text-muted tabular-nums">{e.period}</span></div>
                      <div className="flex items-center gap-2 mt-0.5"><span className="text-sm font-semibold" style={{ color: 'var(--accent-600)' }}>{e.company}</span><span className="text-xs text-muted">· {e.location}</span>{e.current && <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-tint)', color: 'var(--accent-600)' }}>Actuel</span>}</div>
                      <p className="mt-2 text-sm leading-relaxed text-ink/65 max-w-xl" style={{ textWrap: 'pretty' }}>{e.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            <section>
              <SectionLabel>Projets sélectionnés</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {p.projects.map((pr, i) => (
                  <article key={i} className="group rounded-2xl border border-line overflow-hidden bg-white hover:shadow-[0_8px_30px_rgba(16,24,40,0.08)] transition-shadow duration-300 flex flex-col">
                    <ProjImage src={pr.img} title={pr.title} />
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-2"><h3 className="text-base font-semibold text-ink leading-snug">{pr.title}</h3><Icon name="external" size={16} className="text-muted shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                      <p className="mt-2 text-sm leading-relaxed text-ink/60 flex-1" style={{ textWrap: 'pretty' }}>{pr.desc}</p>
                      <div className="flex flex-wrap gap-1.5 mt-4">{pr.tech.map(t => <span key={t} className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md border border-line text-ink/70"><span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }}></span>{t}</span>)}</div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>
    </React.Fragment>
  );
}

// ── Family: CLASSIQUE ──────────────────────────────────────────
function ClassiqueBody({ p }) {
  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 pb-24">
      <header className="text-center pt-16 pb-12">
        <div className="flex justify-center"><Avatar src={p.avatar} name={p.title} size="md" round /></div>
        <h1 className="mt-6 text-4xl sm:text-5xl font-bold text-ink tracking-tight">{p.title}</h1>
        <p className="mt-2 text-lg font-medium" style={{ color: 'var(--accent-600)' }}>{p.role}</p>
        <div className="mt-3 flex items-center justify-center gap-x-5 text-sm text-muted">
          <span className="flex items-center gap-1.5"><Icon name="pin" size={15} /> {p.location}</span>
          <span className="flex items-center gap-1.5"><Icon name="phone" size={15} /> {p.phone}</span>
        </div>
        <p className="mt-6 text-base leading-relaxed text-ink/70 max-w-2xl mx-auto" style={{ textWrap: 'pretty' }}>{p.bio}</p>
        <div className="mt-6 flex justify-center"><Socials p={p} /></div>
      </header>
      {/* Skills card */}
      <section className="bg-white rounded-2xl border border-line p-6 sm:p-8 mb-6">
        <div className="flex items-center gap-2.5 mb-5"><span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-tint)', color: 'var(--accent-600)' }}><Icon name="cpu" size={17} /></span><h2 className="text-lg font-semibold text-ink">Compétences</h2></div>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
          {p.skills.map(s => (
            <div key={s.name}>
              <div className="flex justify-between mb-1.5 text-sm"><span className="font-medium text-ink">{s.name}</span><span className="text-muted tabular-nums">{s.level}%</span></div>
              <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: s.level + '%', background: 'var(--accent)' }}></div></div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-5">{p.tags.map(t => <span key={t} className="text-xs font-medium px-2.5 py-1 rounded-md bg-zinc-100 text-ink/70">{t}</span>)}</div>
      </section>
      {/* Experience card */}
      <section className="bg-white rounded-2xl border border-line p-6 sm:p-8 mb-6">
        <div className="flex items-center gap-2.5 mb-6"><span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-tint)', color: 'var(--accent-600)' }}><Icon name="brief" size={17} /></span><h2 className="text-lg font-semibold text-ink">Expérience</h2></div>
        <div className="space-y-5">
          {p.experiences.map((e, i) => (
            <div key={i} className="flex gap-4 pb-5 border-b border-line last:border-0 last:pb-0">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold shrink-0" style={{ background: 'linear-gradient(140deg, var(--accent), var(--accent-600))' }}>{e.company[0]}</div>
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3"><h3 className="font-semibold text-ink">{e.position}</h3><span className="text-xs text-muted">{e.period}</span></div>
                <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--accent-600)' }}>{e.company} <span className="text-muted font-normal">· {e.location}</span></p>
                <p className="mt-2 text-sm text-ink/60 leading-relaxed">{e.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      {/* Projects */}
      <section className="bg-white rounded-2xl border border-line p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-6"><span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-tint)', color: 'var(--accent-600)' }}><Icon name="folder" size={17} /></span><h2 className="text-lg font-semibold text-ink">Projets</h2></div>
        <div className="grid sm:grid-cols-2 gap-5">
          {p.projects.map((pr, i) => (
            <article key={i} className="group rounded-xl border border-line overflow-hidden flex flex-col">
              <ProjImage src={pr.img} title={pr.title} h="h-36" />
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-semibold text-ink text-sm">{pr.title}</h3>
                <p className="mt-1.5 text-sm text-ink/60 flex-1 leading-relaxed">{pr.desc}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">{pr.tech.map(t => <span key={t} className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: 'var(--accent-tint)', color: 'var(--accent-600)' }}>{t}</span>)}</div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Family: MINIMAL ────────────────────────────────────────────
function MinimalBody({ p }) {
  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 pb-28">
      <header className="pt-20 pb-14">
        <h1 className="text-4xl sm:text-5xl font-semibold text-ink tracking-tight">{p.title}</h1>
        <p className="mt-2 text-lg text-ink/55">{p.role} — {p.location}</p>
        <p className="mt-6 text-lg leading-relaxed text-ink/70" style={{ textWrap: 'pretty' }}>{p.bio}</p>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
          {p.socials.map(s => <a key={s.key} className="font-medium hover:underline cursor-pointer flex items-center gap-1.5" style={{ color: 'var(--accent-600)' }}><span className="w-1 h-1 rounded-full" style={{ background: 'var(--accent)' }}></span>{s.label}</a>)}
        </div>
      </header>
      <section className="py-10 border-t border-line">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted mb-6">Expérience</p>
        <div className="space-y-7">
          {p.experiences.map((e, i) => (
            <div key={i} className="grid grid-cols-[80px_1fr] gap-5">
              <span className="text-xs text-muted pt-0.5">{e.period.split('—')[0]}</span>
              <div>
                <h3 className="font-semibold text-ink">{e.position} <span className="font-normal text-muted">· {e.company}</span></h3>
                <p className="mt-1.5 text-sm text-ink/60 leading-relaxed">{e.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="py-10 border-t border-line">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted mb-6">Projets</p>
        <div className="space-y-1">
          {p.projects.map((pr, i) => (
            <a key={i} className="group flex items-center justify-between py-3.5 border-b border-line last:border-0 cursor-pointer">
              <div className="min-w-0"><h3 className="font-medium text-ink group-hover:opacity-60 transition-opacity">{pr.title}</h3><p className="text-sm text-muted truncate">{pr.tech.join(' · ')}</p></div>
              <Icon name="arrow" size={16} className="text-muted shrink-0 ml-4 group-hover:translate-x-1 transition-transform" />
            </a>
          ))}
        </div>
      </section>
      <section className="py-10 border-t border-line">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted mb-5">Compétences</p>
        <div className="flex flex-wrap gap-2">
          {p.skills.map(s => <span key={s.name} className="text-sm px-3 py-1.5 rounded-full border border-line text-ink/75">{s.name}</span>)}
          {p.tags.map(t => <span key={t} className="text-sm px-3 py-1.5 rounded-full border border-line text-ink/75">{t}</span>)}
        </div>
      </section>
    </div>
  );
}

// ── Family: SOMBRE ─────────────────────────────────────────────
function SombreBody({ p }) {
  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 pb-24">
      <header className="pt-16 sm:pt-20 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-8">
          <Avatar src={p.avatar} name={p.title} />
          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full mb-3" style={{ background: 'color-mix(in srgb, var(--accent) 22%, transparent)', color: 'var(--accent)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }}></span> Disponible pour missions
            </span>
            <h1 className="font-serif leading-[0.95] text-white tracking-tight" style={{ fontSize: 'clamp(2.6rem, 6vw, 4.2rem)' }}>{p.title}</h1>
            <p className="mt-2 text-lg sm:text-xl text-white/60 font-medium">{p.role}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-white/45">
              <span className="flex items-center gap-1.5"><Icon name="pin" size={15} /> {p.location}</span>
              <span className="flex items-center gap-1.5"><Icon name="phone" size={15} /> {p.phone}</span>
            </div>
          </div>
        </div>
        <p className="mt-8 text-lg leading-relaxed text-white/65 max-w-2xl" style={{ textWrap: 'pretty' }}>{p.bio}</p>
        <div className="mt-6"><Socials p={p} dark /></div>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10 lg:gap-14 items-start">
        <aside className="lg:sticky lg:top-20">
          <SectionLabel dark>Compétences</SectionLabel>
          <div className="space-y-4">
            {p.skills.map(s => (
              <div key={s.name}>
                <div className="flex justify-between items-baseline mb-1.5"><span className="text-sm font-medium text-white/90">{s.name}</span><span className="text-xs font-semibold text-white/40 tabular-nums">{s.level}</span></div>
                <div className="h-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full" style={{ width: s.level + '%', background: 'var(--accent)' }}></div></div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-5">{p.tags.map(t => <span key={t} className="text-xs font-medium px-2.5 py-1 rounded-md bg-white/8 text-white/60">{t}</span>)}</div>
        </aside>
        <main className="space-y-16">
          <section>
            <SectionLabel dark>Expérience</SectionLabel>
            <div className="space-y-4">
              {p.experiences.map((e, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3"><h3 className="text-base font-semibold text-white">{e.position}</h3><span className="text-xs text-white/40">{e.period}</span></div>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--accent)' }}>{e.company} <span className="text-white/40 font-normal">· {e.location}</span></p>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">{e.desc}</p>
                </div>
              ))}
            </div>
          </section>
          <section>
            <SectionLabel dark>Projets sélectionnés</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {p.projects.map((pr, i) => (
                <article key={i} className="group rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden flex flex-col hover:border-white/20 transition-colors">
                  <ProjImage src={pr.img} title={pr.title} dark />
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-base font-semibold text-white leading-snug">{pr.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/50 flex-1">{pr.desc}</p>
                    <div className="flex flex-wrap gap-1.5 mt-4">{pr.tech.map(t => <span key={t} className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md border border-white/15 text-white/70"><span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }}></span>{t}</span>)}</div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function PortfolioScreen({ onBack, template }) {
  const p = window.DATA.portfolio;
  const tpl = template || window.TEMPLATES[0];
  const dark = tpl.family === 'sombre';
  const vars = window.paletteVars(tpl.primary);
  const Body = { editorial: EditorialBody, classique: ClassiqueBody, minimal: MinimalBody, sombre: SombreBody }[tpl.family] || EditorialBody;
  return (
    <div className={`min-h-screen ${dark ? '' : 'bg-white'}`} style={{ ...vars, background: dark ? '#0E0F13' : undefined }}>
      <TopBar onBack={onBack} dark={dark} templateName={tpl.name} />
      <Body p={p} />
      <Footer p={p} dark={dark} />
    </div>
  );
}
window.PortfolioScreen = PortfolioScreen;
