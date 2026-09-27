// TemplateClarte.jsx — Template "Clarté" (Plan Essai) per spec. window.TemplateClarte
// Personnalité: minimaliste lumineux. Inter, accent #2E7D32, fond #FAFAFA, sections alternées.
const { useState: useClS, useEffect: useClE, useRef: useClR } = React;

// fade-in on scroll
function useReveal() {
  const ref = useClR(null);
  useClE(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((ents) => {
      ents.forEach(e => { if (e.isIntersecting) { e.target.style.opacity = 1; e.target.style.transform = 'none'; io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    el.querySelectorAll('[data-reveal]').forEach(n => io.observe(n));
    return () => io.disconnect();
  }, []);
  return ref;
}

function ClAvatar({ src, name, size = 96 }) {
  const [ok, setOk] = useClS(true);
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('');
  if (src && ok) return <img src={src} alt={name} onError={() => setOk(false)} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '3px solid #2E7D32' }} />;
  return <div style={{ width: size, height: size, borderRadius: '50%', background: '#2E7D32', color: '#fff', display: 'grid', placeItems: 'center', fontSize: size * 0.36, fontWeight: 700, border: '3px solid #2E7D32' }}>{initials}</div>;
}
function ClProjImg({ src, title }) {
  const [ok, setOk] = useClS(true);
  if (src && ok) return <img src={src} alt={title} onError={() => setOk(false)} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />;
  return <div style={{ width: '100%', aspectRatio: '16/9', background: '#E8F5E9', display: 'grid', placeItems: 'center' }}><Icon name="layout" size={28} style={{ color: '#2E7D32', opacity: .5 }} /></div>;
}

function TemplateClarte({ onBack }) {
  const d = window.TPL_DATA;
  const root = useReveal();
  const C = { bg: '#FAFAFA', alt: '#FFFFFF', accent: '#2E7D32', accentTint: '#E8F5E9', ink: '#1A1A2E', sub: '#5C5C5C', line: '#E8E8E8' };
  const label = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.accent };
  const reveal = { opacity: 0, transform: 'translateY(16px)', transition: 'opacity .6s ease, transform .6s ease' };

  return (
    <div ref={root} style={{ fontFamily: 'Inter, system-ui, sans-serif', background: C.bg, color: C.ink, minHeight: '100vh' }}>
      {/* prototype back bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(250,250,250,0.9)', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, color: C.sub, background: 'none', border: 'none', cursor: 'pointer' }}>
            <Icon name="arrow" size={16} style={{ transform: 'rotate(180deg)' }} /> Retour
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.sub, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: C.accentTint }}>
              <Icon name="layers" size={12} style={{ color: C.accent }} /> Clarté · Essai
            </span>
          </div>
        </div>
      </div>

      {/* in-page nav */}
      <nav style={{ position: 'sticky', top: 56, zIndex: 40, background: C.bg, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>{d.firstName}<span style={{ color: C.accent }}>.</span></span>
          <div style={{ display: 'flex', gap: 28 }}>
            {['À propos', 'Projets', 'Contact'].map(l => (
              <a key={l} className="cl-nav" style={{ fontSize: 14, fontWeight: 500, color: C.sub, textDecoration: 'none', cursor: 'pointer' }}>{l}</a>
            ))}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header style={{ background: `linear-gradient(180deg, ${C.bg} 0%, #F0F7F0 100%)`, padding: '80px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}><ClAvatar src={d.avatar} name={d.name} /></div>
          <h1 style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.05, margin: 0 }}>{d.name}</h1>
          <p style={{ fontSize: 18, color: C.accent, margin: '12px 0 0' }}>{d.role} · {d.location}</p>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: C.sub, maxWidth: 520, margin: '20px auto 0' }}>{d.bioShort}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
            <button className="cl-btn-primary" style={{ height: 46, padding: '0 22px', borderRadius: 8, background: C.accent, color: '#fff', fontWeight: 600, fontSize: 15, border: 'none', cursor: 'pointer', transition: 'all .3s ease' }}>Voir mes projets</button>
            <button className="cl-btn-outline" style={{ height: 46, padding: '0 22px', borderRadius: 8, background: 'transparent', color: C.accent, fontWeight: 600, fontSize: 15, border: `1.5px solid ${C.accent}`, cursor: 'pointer', transition: 'all .3s ease' }}>Me contacter</button>
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 24 }}>
            {d.socials.slice(0, 3).map(s => (
              <a key={s.key} className="cl-social" title={s.label} style={{ width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center', color: C.sub, border: `1px solid ${C.line}`, background: '#fff', cursor: 'pointer', transition: 'all .3s ease' }}><Icon name={s.icon} size={17} /></a>
            ))}
          </div>
        </div>
      </header>

      {/* À PROPOS (alt bg) */}
      <section style={{ background: C.alt, padding: '72px 24px', borderTop: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div data-reveal style={reveal}>
            <p style={label}>À propos</p>
            <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.01em', margin: '8px 0 0' }}>Qui suis-je ?</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 48, marginTop: 32 }} className="cl-about">
            <p data-reveal style={{ ...reveal, fontSize: 16, lineHeight: 1.8, color: C.sub, margin: 0 }}>{d.bio}</p>
            <div data-reveal style={reveal}>
              {d.skillGroups.map(g => (
                <div key={g.cat} style={{ marginBottom: 18 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.sub, margin: '0 0 8px' }}>{g.cat}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {g.items.map(s => <span key={s} style={{ fontSize: 13, padding: '4px 12px', borderRadius: 20, background: C.accentTint, color: C.accent, fontWeight: 500 }}>{s}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PROJETS */}
      <section style={{ background: C.bg, padding: '72px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div data-reveal style={reveal}>
            <p style={label}>Projets</p>
            <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.01em', margin: '8px 0 0' }}>Travaux sélectionnés</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginTop: 32 }} className="cl-grid">
            {d.projects.map((p, i) => (
              <article key={i} data-reveal className="cl-card" style={{ ...reveal, background: C.alt, border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'all .3s ease' }}>
                <ClProjImg src={p.img} title={p.title} />
                <div style={{ padding: 16 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.accent }}>{p.cat}</span>
                  <h3 style={{ fontSize: 16, fontWeight: 600, margin: '6px 0 0' }}>{p.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.5, color: C.sub, margin: '8px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* COMPÉTENCES (alt) */}
      <section style={{ background: C.alt, padding: '72px 24px', borderTop: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div data-reveal style={reveal}>
            <p style={label}>Compétences</p>
            <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.01em', margin: '8px 0 24px' }}>Ce que je maîtrise</h2>
          </div>
          <div data-reveal style={{ ...reveal, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {d.skillsFlat.map(s => <span key={s} style={{ fontSize: 14, padding: '8px 16px', borderRadius: 20, background: C.accentTint, color: C.accent, fontWeight: 500 }}>{s}</span>)}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section style={{ background: C.bg, padding: '72px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div data-reveal style={reveal}>
            <p style={{ ...label, justifyContent: 'center' }}>Contact</p>
            <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.01em', margin: '8px 0 16px' }}>Travaillons ensemble</h2>
            <a href={`mailto:${d.email}`} style={{ fontSize: 26, fontWeight: 700, color: C.accent, textDecoration: 'none', letterSpacing: '-0.01em' }}>{d.email}</a>
            <div style={{ display: 'flex', gap: 18, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
              {d.socials.map(s => (
                <a key={s.key} className="cl-social" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, color: C.sub, textDecoration: 'none', padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.line}`, background: '#fff', cursor: 'pointer', transition: 'all .3s ease' }}>
                  <Icon name={s.icon} size={16} /> {s.label}
                </a>
              ))}
            </div>
            <p style={{ fontSize: 14, color: C.sub, marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon name="pin" size={14} /> {d.location}</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: C.ink, color: '#fff', padding: '28px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 14, margin: 0, opacity: 0.85 }}>Portfolio créé avec <strong>Portefolia</strong> · © 2026 {d.name}</p>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .cl-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.10); border-color: #2E7D32 !important; }
        .cl-btn-primary:hover { background: #1B5E20 !important; transform: translateY(-1px); }
        .cl-btn-outline:hover { background: #E8F5E9 !important; }
        .cl-social:hover { color: #2E7D32 !important; border-color: #2E7D32 !important; transform: translateY(-2px); }
        .cl-nav:hover { color: #2E7D32 !important; }
        @media (max-width: 720px) { .cl-about { grid-template-columns: 1fr !important; } .cl-grid { grid-template-columns: 1fr !important; } }
      ` }} />
    </div>
  );
}
window.TemplateClarte = TemplateClarte;
