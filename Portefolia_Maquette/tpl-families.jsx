// tpl-families.jsx — formData-driven renderer : 4 familles × 3 variantes de layout + PhonePreview
// window.TemplateRender, window.PhonePreview, window.normalizeFormData, window.SAMPLE_FORMDATA
const { useState: useFamS } = React;

// ── color utils ────────────────────────────────────────────────
function hexToRgb(hex) {
  let h = (hex || '#2E7D32').replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function withAlpha(hex, a) { const { r, g, b } = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
function mixWhite(hex, a) { const { r, g, b } = hexToRgb(hex); const m = (c) => Math.round(c + (255 - c) * a); return `rgb(${m(r)},${m(g)},${m(b)})`; }
function darken(hex, a) { const { r, g, b } = hexToRgb(hex); const m = (c) => Math.round(c * (1 - a)); return `rgb(${m(r)},${m(g)},${m(b)})`; }
function isLight(hex) { const { r, g, b } = hexToRgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) > 150; }
function onAccent(hex) { return isLight(hex) ? '#1A1A2E' : '#FFFFFF'; }

// ── normalize formData ─────────────────────────────────────────
function normalizeFormData(fd) {
  fd = fd || {};
  return {
    titre: fd.titre || 'Votre nom',
    domaine: fd.domaine || 'Votre métier',
    localisation: fd.localisation || '',
    bio: fd.bio || '',
    photo: fd.photo || '',
    cv: fd.cv || '',
    banniere: fd.banniere || '',
    couleur_theme: fd.couleur_theme || '',
    social_links: Array.isArray(fd.social_links) ? fd.social_links.filter(Boolean) : [],
    projets: Array.isArray(fd.projets) ? fd.projets.filter(p => p && (p.titre || p.title)) : [],
    competences: Array.isArray(fd.competences) ? fd.competences.filter(Boolean) : [],
    experiences: Array.isArray(fd.experiences) ? fd.experiences.filter(e => e && (e.poste || e.position || e.titre)) : [],
  };
}
function initials(name) { return (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase(); }
function projTitle(p) { return p.titre || p.title || ''; }
function projDesc(p) { return p.description || p.desc || ''; }
function projCat(p) { return p.categorie || p.cat || p.tag || ''; }
function projImg(p) { return p.image || p.img || ''; }
function expPoste(e) { return e.poste || e.position || e.titre || ''; }
function expEntreprise(e) { return e.entreprise || e.company || ''; }
function expPeriode(e) { return e.periode || e.period || ''; }
function expDesc(e) { return e.description || e.desc || ''; }
function socialIcon(s) {
  const k = (s.type || s.key || s.label || '').toLowerCase();
  if (k.includes('link')) return 'linkedin'; if (k.includes('git')) return 'github';
  if (k.includes('drib')) return 'dribbble'; if (k.includes('mail') || k.includes('email')) return 'mail';
  if (k.includes('insta')) return 'instagram'; if (k.includes('twit') || k === 'x') return 'twitter';
  if (k.includes('phone') || k.includes('tel') || k.includes('whats')) return 'phone';
  return 'globe';
}
function socialLabel(s) { return s.label || s.type || s.key || 'Lien'; }

// ── themes per family ──────────────────────────────────────────
const serifFont = "'Instrument Serif', Georgia, serif";
function themeFor(family) {
  if (family === 'sombre') return { dark: true, bg: '#0E0F13', text: '#fff', sub: 'rgba(255,255,255,0.65)', muted: 'rgba(255,255,255,0.45)', faint: 'rgba(255,255,255,0.4)', line: 'rgba(255,255,255,0.1)', card: 'rgba(255,255,255,0.03)', cardLine: 'rgba(255,255,255,0.1)', soft: 'rgba(255,255,255,0.06)', serif: serifFont };
  if (family === 'classique') return { dark: false, bg: '#F7F8F8', text: '#1A1A2E', sub: '#555', muted: '#777', faint: '#888', line: '#EEE', card: '#fff', cardLine: '#EEE', soft: '#F4F4F5', serif: serifFont };
  if (family === 'minimal') return { dark: false, bg: '#FFFFFF', text: '#1A1A1A', sub: '#555', muted: '#888', faint: '#999', line: '#EEE', card: '#fff', cardLine: '#E8E8E8', soft: '#F7F7F7', serif: serifFont };
  return { dark: false, bg: '#FFFFFF', text: '#1A1A2E', sub: '#555', muted: '#777', faint: '#888', line: '#E8E8E8', card: '#fff', cardLine: '#E8E8E8', soft: '#F4F4F5', serif: serifFont }; // editorial
}
function chipBg(t, accent) { return t.dark ? withAlpha(accent, 0.14) : mixWhite(accent, 0.9); }
function chipText(t, accent) { return t.dark ? accent : darken(accent, 0.1); }
function accentText(t, accent) { return t.dark ? accent : darken(accent, 0.1); }

// ── shared atoms ───────────────────────────────────────────────
function TplAvatar({ photo, name, size, accent, round, dark }) {
  const [ok, setOk] = useFamS(true);
  const radius = round ? '50%' : '18px';
  if (photo && ok) return <img src={photo} alt={name} onError={() => setOk(false)} style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover' }} />;
  return <div style={{ width: size, height: size, borderRadius: radius, background: dark ? withAlpha(accent, 0.25) : accent, color: dark ? accent : onAccent(accent), display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: size * 0.36, fontFamily: 'Inter, sans-serif' }}>{initials(name)}</div>;
}
function TplProjImg({ src, accent, dark, ratio }) {
  const [ok, setOk] = useFamS(true);
  const r = ratio || '16/9';
  if (src && ok) return <img src={src} onError={() => setOk(false)} style={{ width: '100%', aspectRatio: r, objectFit: 'cover', display: 'block' }} />;
  return <div style={{ width: '100%', aspectRatio: r, background: dark ? withAlpha(accent, 0.12) : mixWhite(accent, 0.85), display: 'grid', placeItems: 'center' }}><Icon name="layout" size={26} style={{ color: accent, opacity: .5 }} /></div>;
}
function SectionLbl({ children, t, center }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, justifyContent: center ? 'center' : 'flex-start' }}>
    {center && <span style={{ height: 1, flex: 1, maxWidth: 60, background: t.line }} />}
    <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: t.muted }}>{children}</span>
    <span style={{ height: 1, flex: 1, background: t.line }} />
  </div>;
}
function SocialRow({ d, t, accent, center }) {
  if (!d.social_links.length) return null;
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 22, justifyContent: center ? 'center' : 'flex-start' }}>
    {d.social_links.map((s, i) => <span key={i} className={t.dark ? 'tpl-chip-d' : 'tpl-chip'} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 14px', borderRadius: 999, border: `1px solid ${t.dark ? 'rgba(255,255,255,0.15)' : '#E8E8E8'}`, background: t.dark ? 'transparent' : '#fff', fontSize: 13, fontWeight: 500, color: t.dark ? 'rgba(255,255,255,0.9)' : '#333', cursor: 'pointer', transition: 'all .25s' }}><Icon name={socialIcon(s)} size={15} /> {socialLabel(s)}</span>)}
  </div>;
}
function CvBtn({ d, accent, center }) {
  if (!d.cv) return null;
  return <a className="tpl-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 20px', borderRadius: 8, background: accent, color: onAccent(accent), fontWeight: 600, fontSize: 15, marginTop: 18, cursor: 'pointer' }}><Icon name="download" size={16} /> Télécharger le CV</a>;
}

// ── shared section renderers (return JSX) ──────────────────────
function Chips({ d, t, accent, round, center }) {
  if (!d.competences.length) return null;
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: center ? 'center' : 'flex-start' }}>
    {d.competences.map((c, i) => <span key={i} style={{ fontSize: 13, padding: round ? '6px 14px' : '5px 12px', borderRadius: round ? 999 : 8, background: chipBg(t, accent), color: chipText(t, accent), fontWeight: 500 }}>{c}</span>)}
  </div>;
}
function ChipsOutline({ d, t, center }) {
  if (!d.competences.length) return null;
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: center ? 'center' : 'flex-start' }}>
    {d.competences.map((c, i) => <span key={i} style={{ fontSize: 14, padding: '7px 15px', borderRadius: 999, border: `1px solid ${t.dark ? 'rgba(255,255,255,0.18)' : '#E8E8E8'}`, color: t.sub }}>{c}</span>)}
  </div>;
}
function ExpTimeline({ d, t, accent }) {
  return <div style={{ display: 'grid', gap: 24, position: 'relative', paddingLeft: 22 }}>
    <div style={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 1, background: t.line }} />
    {d.experiences.map((e, i) => (
      <div key={i} style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: -22, top: 5, width: 11, height: 11, borderRadius: '50%', background: i === 0 ? accent : (t.dark ? 'rgba(255,255,255,0.25)' : '#D4D4D8'), border: `2px solid ${t.bg}`, boxShadow: t.dark ? 'none' : '0 0 0 1px #E8E8E8' }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: t.text }}>{expPoste(e)}</h3>
          {expPeriode(e) && <span style={{ fontSize: 12, color: t.muted }}>{expPeriode(e)}</span>}
        </div>
        {expEntreprise(e) && <p style={{ fontSize: 14, fontWeight: 600, color: accentText(t, accent), margin: '2px 0 0' }}>{expEntreprise(e)}</p>}
        {expDesc(e) && <p style={{ fontSize: 14, lineHeight: 1.6, color: t.sub, margin: '8px 0 0', maxWidth: 560 }}>{expDesc(e)}</p>}
      </div>
    ))}
  </div>;
}
function ExpCards({ d, t, accent }) {
  return <div style={{ display: 'grid', gap: 14 }}>
    {d.experiences.map((e, i) => (
      <div key={i} style={{ border: `1px solid ${t.cardLine}`, background: t.card, borderRadius: 14, padding: 18, boxShadow: t.dark ? 'none' : '0 1px 4px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: t.text }}>{expPoste(e)}</h3>
          {expPeriode(e) && <span style={{ fontSize: 12, color: t.muted }}>{expPeriode(e)}</span>}
        </div>
        {expEntreprise(e) && <p style={{ fontSize: 14, fontWeight: 600, color: accentText(t, accent), margin: '2px 0 0' }}>{expEntreprise(e)}</p>}
        {expDesc(e) && <p style={{ fontSize: 14, lineHeight: 1.6, color: t.sub, margin: '8px 0 0' }}>{expDesc(e)}</p>}
      </div>
    ))}
  </div>;
}
function ExpList({ d, t, accent, narrow }) {
  return <div style={{ display: 'grid', gap: 24 }}>
    {d.experiences.map((e, i) => (
      <div key={i} style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '90px 1fr', gap: narrow ? 4 : 18 }}>
        <span style={{ fontSize: 13, color: t.faint, paddingTop: 2 }}>{(expPeriode(e) || '').split('—')[0]}</span>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: t.text }}>{expPoste(e)}{expEntreprise(e) ? <span style={{ fontWeight: 400, color: t.faint }}> · {expEntreprise(e)}</span> : null}</h3>
          {expDesc(e) && <p style={{ fontSize: 14, lineHeight: 1.6, color: t.sub, margin: '6px 0 0' }}>{expDesc(e)}</p>}
        </div>
      </div>
    ))}
  </div>;
}
function ExpNumbered({ d, t, accent }) {
  return <div style={{ display: 'grid', gap: 0 }}>
    {d.experiences.map((e, i) => (
      <div key={i} style={{ display: 'grid', gridTemplateColumns: '46px 1fr', gap: 14, padding: '18px 0', borderTop: i ? `1px solid ${t.line}` : 'none' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: accent, fontVariantNumeric: 'tabular-nums', fontFamily: 'ui-monospace, monospace' }}>{String(i + 1).padStart(2, '0')}</span>
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: t.text }}>{expPoste(e)}</h3>
            {expPeriode(e) && <span style={{ fontSize: 12, color: t.muted }}>{expPeriode(e)}</span>}
          </div>
          {expEntreprise(e) && <p style={{ fontSize: 13.5, fontWeight: 600, color: accentText(t, accent), margin: '2px 0 0' }}>{expEntreprise(e)}</p>}
          {expDesc(e) && <p style={{ fontSize: 14, lineHeight: 1.6, color: t.sub, margin: '6px 0 0' }}>{expDesc(e)}</p>}
        </div>
      </div>
    ))}
  </div>;
}
function ProjCards({ d, t, accent, cols, ratio }) {
  return <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 18 }}>
    {d.projets.map((p, i) => (
      <article key={i} className={t.dark ? 'tpl-card-d' : 'tpl-card'} style={{ border: `1px solid ${t.cardLine}`, background: t.card, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'all .3s', display: 'flex', flexDirection: 'column' }}>
        <TplProjImg src={projImg(p)} accent={accent} dark={t.dark} ratio={ratio} />
        <div style={{ padding: 16 }}>
          {projCat(p) && <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: accentText(t, accent) }}>{projCat(p)}</span>}
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '4px 0 0', color: t.text }}>{projTitle(p)}</h3>
          {projDesc(p) && <p style={{ fontSize: 14, lineHeight: 1.5, color: t.sub, margin: '8px 0 0' }}>{projDesc(p)}</p>}
        </div>
      </article>
    ))}
  </div>;
}
function ProjRows({ d, t, accent }) {
  return <div>
    {d.projets.map((p, i) => (
      <a key={i} className="tpl-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: i < d.projets.length - 1 ? `1px solid ${t.line}` : 'none', cursor: 'pointer', transition: 'all .2s' }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, margin: 0, color: t.text }}>{projTitle(p)}</h3>
          {(projCat(p) || projDesc(p)) && <p style={{ fontSize: 13, color: t.faint, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{projCat(p) || projDesc(p)}</p>}
        </div>
        <Icon name="arrow" size={16} style={{ color: accent, flexShrink: 0, marginLeft: 16 }} />
      </a>
    ))}
  </div>;
}
function ProjNumbered({ d, t, accent }) {
  return <div>
    {d.projets.map((p, i) => (
      <a key={i} className="tpl-row" style={{ display: 'grid', gridTemplateColumns: '46px 1fr auto', alignItems: 'center', gap: 14, padding: '16px 0', borderTop: i ? `1px solid ${t.line}` : 'none', cursor: 'pointer', transition: 'all .2s' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: accent, fontFamily: 'ui-monospace, monospace' }}>{String(i + 1).padStart(2, '0')}</span>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: t.text }}>{projTitle(p)}</h3>
          {(projCat(p) || projDesc(p)) && <p style={{ fontSize: 13, color: t.faint, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{projCat(p) || projDesc(p)}</p>}
        </div>
        <Icon name="arrow" size={16} style={{ color: accent, flexShrink: 0 }} />
      </a>
    ))}
  </div>;
}

function PfFooter({ d, t }) {
  return <footer style={{ borderTop: `1px solid ${t.line}`, padding: '24px', textAlign: 'center', color: t.muted, fontSize: 13, background: t.dark ? 'transparent' : '#fff' }}>Créé avec <strong style={{ color: t.dark ? 'rgba(255,255,255,0.7)' : '#444' }}>Portefolia</strong> · © 2026 {d.titre}</footer>;
}

// ════════════════════════════════════════════════════════════════
//  FAMILY: EDITORIAL  (variants: classic | cover | split)
// ════════════════════════════════════════════════════════════════
function FamilyEditorial({ d, accent, narrow, variant }) {
  const t = themeFor('editorial');
  const v = ['classic', 'cover', 'split'].includes(variant) ? variant : 'classic';

  if (v === 'cover') {
    const banner = d.banniere ? `url(${d.banniere}) center/cover` : `linear-gradient(135deg, ${accent}, ${darken(accent, 0.35)})`;
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', background: t.bg, color: t.text }}>
        <div style={{ position: 'relative', background: banner, padding: narrow ? '48px 22px 22px' : '90px 40px 22px', textAlign: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: d.banniere ? 'rgba(0,0,0,0.35)' : 'transparent' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}><div style={{ border: '4px solid #fff', borderRadius: '50%', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}><TplAvatar photo={d.photo} name={d.titre} size={narrow ? 92 : 120} accent={accent} round /></div></div>
            <h1 style={{ fontFamily: t.serif, fontSize: narrow ? 44 : 66, lineHeight: 1, letterSpacing: '-0.02em', margin: '18px 0 0', color: '#fff' }}>{d.titre}</h1>
            <p style={{ fontSize: narrow ? 17 : 21, fontWeight: 500, color: 'rgba(255,255,255,0.92)', margin: '8px 0 0' }}>{d.domaine}{d.localisation ? ` · ${d.localisation}` : ''}</p>
          </div>
        </div>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: narrow ? '32px 22px 56px' : '48px 40px 80px', display: 'grid', gap: 48, textAlign: 'center' }}>
          {d.bio && <p style={{ fontSize: narrow ? 17 : 19, lineHeight: 1.75, color: t.sub, margin: 0 }}>{d.bio}</p>}
          {d.social_links.length > 0 && <SocialRow d={d} t={t} accent={accent} center />}
          {d.competences.length > 0 && <div><SectionLbl t={t} center>Compétences</SectionLbl><Chips d={d} t={t} accent={accent} round center /></div>}
          {d.experiences.length > 0 && <div style={{ textAlign: 'left' }}><SectionLbl t={t} center>Expérience</SectionLbl><ExpCards d={d} t={t} accent={accent} /></div>}
          {d.projets.length > 0 && <div style={{ textAlign: 'left' }}><SectionLbl t={t} center>Projets</SectionLbl><ProjCards d={d} t={t} accent={accent} cols={narrow ? '1fr' : '1fr 1fr'} /></div>}
          {d.cv && <div><CvBtn d={d} accent={accent} /></div>}
        </div>
        <PfFooter d={d} t={t} />
      </div>
    );
  }

  if (v === 'split') {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', background: t.bg, color: t.text }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: narrow ? '1fr' : '340px 1fr', gap: narrow ? 32 : 64, padding: narrow ? '40px 22px 56px' : '72px 40px 80px', alignItems: 'start' }}>
          <aside style={{ position: narrow ? 'static' : 'sticky', top: 48 }}>
            <TplAvatar photo={d.photo} name={d.titre} size={narrow ? 84 : 96} accent={accent} />
            <h1 style={{ fontFamily: t.serif, fontSize: narrow ? 46 : 56, lineHeight: 0.95, letterSpacing: '-0.02em', margin: '20px 0 0' }}>{d.titre}</h1>
            <p style={{ fontSize: 19, fontWeight: 500, color: t.sub, margin: '8px 0 0' }}>{d.domaine}</p>
            {d.localisation && <p style={{ fontSize: 14, color: t.muted, margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="pin" size={14} /> {d.localisation}</p>}
            {d.bio && <p style={{ fontSize: 15, lineHeight: 1.7, color: t.sub, margin: '20px 0 0' }}>{d.bio}</p>}
            <SocialRow d={d} t={t} accent={accent} />
            <CvBtn d={d} accent={accent} />
            {d.competences.length > 0 && <div style={{ marginTop: 28 }}><SectionLbl t={t}>Compétences</SectionLbl><Chips d={d} t={t} accent={accent} /></div>}
          </aside>
          <main style={{ display: 'grid', gap: 56 }}>
            {d.experiences.length > 0 && <section><SectionLbl t={t}>Expérience</SectionLbl><ExpTimeline d={d} t={t} accent={accent} /></section>}
            {d.projets.length > 0 && <section><SectionLbl t={t}>Projets</SectionLbl><ProjCards d={d} t={t} accent={accent} cols={narrow ? '1fr' : '1fr 1fr'} /></section>}
          </main>
        </div>
        <PfFooter d={d} t={t} />
      </div>
    );
  }

  // classic
  const cols = narrow ? '1fr' : '260px 1fr';
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: t.bg, color: t.text }}>
      <header style={{ padding: narrow ? '40px 22px 28px' : '64px 40px 36px', maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: narrow ? 'column' : 'row', alignItems: narrow ? 'flex-start' : 'flex-end', gap: narrow ? 18 : 28 }}>
          <TplAvatar photo={d.photo} name={d.titre} size={narrow ? 84 : 128} accent={accent} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {d.localisation && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 999, background: mixWhite(accent, 0.88), color: darken(accent, 0.15), marginBottom: 12 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} /> Disponible</span>}
            <h1 style={{ fontFamily: t.serif, fontSize: narrow ? 44 : 68, lineHeight: 0.95, letterSpacing: '-0.02em', margin: 0 }}>{d.titre}</h1>
            <p style={{ fontSize: narrow ? 18 : 22, fontWeight: 500, color: t.sub, margin: '8px 0 0' }}>{d.domaine}</p>
            {d.localisation && <p style={{ fontSize: 14, color: t.muted, margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="pin" size={14} /> {d.localisation}</p>}
          </div>
        </div>
        {d.bio && <p style={{ fontSize: narrow ? 16 : 18, lineHeight: 1.7, color: t.sub, maxWidth: 640, margin: '28px 0 0' }}>{d.bio}</p>}
        <SocialRow d={d} t={t} accent={accent} />
        <CvBtn d={d} accent={accent} />
      </header>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: narrow ? '0 22px 56px' : '0 40px 80px', display: 'grid', gridTemplateColumns: cols, gap: narrow ? 32 : 56, alignItems: 'start' }}>
        {d.competences.length > 0 && <aside><SectionLbl t={t}>Compétences</SectionLbl><Chips d={d} t={t} accent={accent} /></aside>}
        <main style={{ display: 'grid', gap: 56 }}>
          {d.experiences.length > 0 && <section><SectionLbl t={t}>Expérience</SectionLbl><ExpTimeline d={d} t={t} accent={accent} /></section>}
          {d.projets.length > 0 && <section><SectionLbl t={t}>Projets</SectionLbl><ProjCards d={d} t={t} accent={accent} cols={narrow ? '1fr' : '1fr 1fr'} /></section>}
        </main>
      </div>
      <PfFooter d={d} t={t} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  FAMILY: CLASSIQUE  (variants: centered | sidebar | band)
// ════════════════════════════════════════════════════════════════
function Card({ t, children }) { return <div style={{ background: t.card, border: `1px solid ${t.cardLine}`, borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>{children}</div>; }
function CardHead({ children, icon, accent, t }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
    <span style={{ width: 36, height: 36, borderRadius: 10, background: chipBg(t, accent), color: chipText(t, accent), display: 'grid', placeItems: 'center' }}><Icon name={icon} size={17} /></span>
    <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: t.text }}>{children}</h2>
  </div>;
}
function FamilyClassique({ d, accent, narrow, variant }) {
  const t = themeFor('classique');
  const v = ['centered', 'sidebar', 'band'].includes(variant) ? variant : 'centered';

  const blocks = (
    <React.Fragment>
      {d.competences.length > 0 && <Card t={t}><CardHead icon="cpu" accent={accent} t={t}>Compétences</CardHead><Chips d={d} t={t} accent={accent} round /></Card>}
      {d.experiences.length > 0 && <Card t={t}><CardHead icon="brief" accent={accent} t={t}>Expérience</CardHead>
        <div style={{ display: 'grid', gap: 18 }}>
          {d.experiences.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: 18, borderBottom: i < d.experiences.length - 1 ? `1px solid ${t.line}` : 'none' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: accent, color: onAccent(accent), display: 'grid', placeItems: 'center', fontWeight: 700, flexShrink: 0 }}>{((expEntreprise(e) || expPoste(e)) || '?')[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: t.text }}>{expPoste(e)}</h3>
                  {expPeriode(e) && <span style={{ fontSize: 12, color: t.muted }}>{expPeriode(e)}</span>}
                </div>
                {expEntreprise(e) && <p style={{ fontSize: 14, fontWeight: 600, color: accentText(t, accent), margin: '2px 0 0' }}>{expEntreprise(e)}</p>}
                {expDesc(e) && <p style={{ fontSize: 14, lineHeight: 1.6, color: t.sub, margin: '6px 0 0' }}>{expDesc(e)}</p>}
              </div>
            </div>
          ))}
        </div>
      </Card>}
      {d.projets.length > 0 && <Card t={t}><CardHead icon="folder" accent={accent} t={t}>Projets</CardHead><ProjCards d={d} t={t} accent={accent} cols={narrow ? '1fr' : '1fr 1fr'} ratio="16/10" /></Card>}
    </React.Fragment>
  );

  if (v === 'sidebar') {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', background: t.bg, color: t.text }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: narrow ? '1fr' : '300px 1fr', gap: narrow ? 20 : 28, padding: narrow ? '32px 18px 56px' : '56px 40px 80px', alignItems: 'start' }}>
          <aside style={{ position: narrow ? 'static' : 'sticky', top: 40 }}>
            <Card t={t}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}><TplAvatar photo={d.photo} name={d.titre} size={96} accent={accent} round /></div>
                <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', margin: '16px 0 0', color: t.text }}>{d.titre}</h1>
                <p style={{ fontSize: 15, fontWeight: 600, color: accentText(t, accent), margin: '6px 0 0' }}>{d.domaine}</p>
                {d.localisation && <p style={{ fontSize: 13, color: t.muted, margin: '6px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon name="pin" size={13} /> {d.localisation}</p>}
              </div>
              {d.bio && <p style={{ fontSize: 14, lineHeight: 1.7, color: t.sub, margin: '16px 0 0' }}>{d.bio}</p>}
              <div style={{ display: 'flex', justifyContent: 'center' }}><SocialRow d={d} t={t} accent={accent} center /></div>
              <div style={{ display: 'flex', justifyContent: 'center' }}><CvBtn d={d} accent={accent} /></div>
            </Card>
          </aside>
          <main style={{ display: 'grid', gap: 20 }}>{blocks}</main>
        </div>
        <PfFooter d={d} t={t} />
      </div>
    );
  }

  if (v === 'band') {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', background: t.bg, color: t.text }}>
        <div style={{ background: `linear-gradient(135deg, ${mixWhite(accent, 0.86)}, ${mixWhite(accent, 0.95)})`, borderBottom: `1px solid ${t.line}` }}>
          <header style={{ textAlign: 'center', padding: narrow ? '44px 22px 36px' : '64px 40px 48px', maxWidth: 760, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}><div style={{ border: `4px solid ${t.bg}`, borderRadius: '50%' }}><TplAvatar photo={d.photo} name={d.titre} size={narrow ? 88 : 104} accent={accent} round /></div></div>
            <h1 style={{ fontSize: narrow ? 34 : 46, fontWeight: 800, letterSpacing: '-0.02em', margin: '18px 0 0', color: t.text }}>{d.titre}</h1>
            <p style={{ fontSize: 18, fontWeight: 600, color: darken(accent, 0.1), margin: '8px 0 0' }}>{d.domaine}</p>
            {d.localisation && <p style={{ fontSize: 14, color: t.muted, margin: '6px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon name="pin" size={14} /> {d.localisation}</p>}
            {d.bio && <p style={{ fontSize: 16, lineHeight: 1.7, color: t.sub, maxWidth: 600, margin: '16px auto 0' }}>{d.bio}</p>}
            <div style={{ display: 'flex', justifyContent: 'center' }}><SocialRow d={d} t={t} accent={accent} center /></div>
          </header>
        </div>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: narrow ? '28px 18px 56px' : '40px 40px 80px', display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 20, alignItems: 'start' }}>
          {blocks}
        </div>
        <PfFooter d={d} t={t} />
      </div>
    );
  }

  // centered
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: t.bg, color: t.text }}>
      <header style={{ textAlign: 'center', padding: narrow ? '44px 22px 32px' : '72px 40px 44px', maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}><TplAvatar photo={d.photo} name={d.titre} size={narrow ? 88 : 104} accent={accent} round /></div>
        <h1 style={{ fontSize: narrow ? 34 : 46, fontWeight: 800, letterSpacing: '-0.02em', margin: '20px 0 0' }}>{d.titre}</h1>
        <p style={{ fontSize: 18, fontWeight: 600, color: darken(accent, 0.05), margin: '8px 0 0' }}>{d.domaine}</p>
        {d.localisation && <p style={{ fontSize: 14, color: t.muted, margin: '6px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon name="pin" size={14} /> {d.localisation}</p>}
        {d.bio && <p style={{ fontSize: 16, lineHeight: 1.7, color: t.sub, maxWidth: 600, margin: '18px auto 0' }}>{d.bio}</p>}
        <div style={{ display: 'flex', justifyContent: 'center' }}><SocialRow d={d} t={t} accent={accent} center /></div>
      </header>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: narrow ? '0 18px 56px' : '0 40px 80px', display: 'grid', gap: 20 }}>{blocks}</div>
      <PfFooter d={d} t={t} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  FAMILY: MINIMAL  (variants: list | center | index)
// ════════════════════════════════════════════════════════════════
const miniLbl = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', margin: '0 0 20px' };
function FamilyMinimal({ d, accent, narrow, variant }) {
  const t = themeFor('minimal');
  const v = ['list', 'center', 'index'].includes(variant) ? variant : 'list';
  const center = v === 'center';
  const lbl = { ...miniLbl, color: t.faint, textAlign: center ? 'center' : 'left' };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: t.bg, color: t.text }}>
      <div style={{ maxWidth: center ? 680 : 620, margin: '0 auto', padding: narrow ? '0 22px' : '0 24px' }}>
        <header style={{ padding: center ? '80px 0 40px' : '72px 0 40px', textAlign: center ? 'center' : 'left' }}>
          {center && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}><TplAvatar photo={d.photo} name={d.titre} size={88} accent={accent} round /></div>}
          <h1 style={{ fontSize: narrow ? 38 : (center ? 52 : 46), fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{d.titre}</h1>
          <p style={{ fontSize: 18, color: t.muted, margin: '8px 0 0' }}>{d.domaine}{d.localisation ? ' — ' + d.localisation : ''}</p>
          {d.bio && <p style={{ fontSize: 17, lineHeight: 1.75, color: t.sub, margin: '24px auto 0', maxWidth: center ? 540 : 'none' }}>{d.bio}</p>}
          {d.social_links.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 22, justifyContent: center ? 'center' : 'flex-start' }}>
              {d.social_links.map((s, i) => <a key={i} className="tpl-ulink" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, color: darken(accent, 0.05), cursor: 'pointer' }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: accent }} /> {socialLabel(s)}</a>)}
            </div>
          )}
        </header>

        {d.experiences.length > 0 && (
          <section style={{ padding: '40px 0', borderTop: `1px solid ${t.line}` }}>
            <p style={lbl}>Expérience</p>
            {v === 'index' ? <ExpNumbered d={d} t={t} accent={accent} /> : <ExpList d={d} t={t} accent={accent} narrow={narrow || center} />}
          </section>
        )}
        {d.projets.length > 0 && (
          <section style={{ padding: '40px 0', borderTop: `1px solid ${t.line}` }}>
            <p style={lbl}>Projets</p>
            {v === 'index' ? <ProjNumbered d={d} t={t} accent={accent} /> : <ProjRows d={d} t={t} accent={accent} />}
          </section>
        )}
        {d.competences.length > 0 && (
          <section style={{ padding: '40px 0 72px', borderTop: `1px solid ${t.line}` }}>
            <p style={lbl}>Compétences</p>
            <ChipsOutline d={d} t={t} center={center} />
          </section>
        )}
      </div>
      <PfFooter d={d} t={t} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  FAMILY: SOMBRE  (variants: panel | hero | mono)
// ════════════════════════════════════════════════════════════════
function FamilySombre({ d, accent, narrow, variant }) {
  const t = themeFor('sombre');
  const v = ['panel', 'hero', 'mono'].includes(variant) ? variant : 'panel';

  if (v === 'hero') {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', background: t.bg, color: t.text }}>
        <div style={{ position: 'relative', overflow: 'hidden', textAlign: 'center', padding: narrow ? '56px 22px 40px' : '96px 40px 56px' }}>
          <div style={{ position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)', width: 560, height: 560, borderRadius: '50%', background: `radial-gradient(circle, ${withAlpha(accent, 0.35)}, transparent 65%)`, filter: 'blur(20px)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}><TplAvatar photo={d.photo} name={d.titre} size={narrow ? 92 : 116} accent={accent} round dark /></div>
            <h1 style={{ fontFamily: t.serif, fontSize: narrow ? 46 : 72, lineHeight: 1, letterSpacing: '-0.02em', margin: '20px 0 0', color: '#fff' }}>{d.titre}</h1>
            <p style={{ fontSize: narrow ? 18 : 22, fontWeight: 500, color: accent, margin: '10px 0 0' }}>{d.domaine}</p>
            {d.localisation && <p style={{ fontSize: 14, color: t.muted, margin: '8px 0 0' }}>{d.localisation}</p>}
            {d.bio && <p style={{ fontSize: narrow ? 16 : 18, lineHeight: 1.7, color: t.sub, maxWidth: 560, margin: '22px auto 0' }}>{d.bio}</p>}
            <div style={{ display: 'flex', justifyContent: 'center' }}><SocialRow d={d} t={t} accent={accent} center /></div>
          </div>
        </div>
        <div style={{ maxWidth: 880, margin: '0 auto', padding: narrow ? '20px 22px 56px' : '32px 40px 80px', display: 'grid', gap: 48 }}>
          {d.competences.length > 0 && <div style={{ textAlign: 'center' }}><SectionLbl t={t} center>Compétences</SectionLbl><Chips d={d} t={t} accent={accent} round center /></div>}
          {d.experiences.length > 0 && <section><SectionLbl t={t}>Expérience</SectionLbl><ExpCards d={d} t={t} accent={accent} /></section>}
          {d.projets.length > 0 && <section><SectionLbl t={t}>Projets</SectionLbl><ProjCards d={d} t={t} accent={accent} cols={narrow ? '1fr' : '1fr 1fr'} /></section>}
        </div>
        <PfFooter d={d} t={t} />
      </div>
    );
  }

  if (v === 'mono') {
    const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
    const tag = (txt) => <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.1em', color: accent, textTransform: 'uppercase' }}>{txt}</span>;
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', background: t.bg, color: t.text }}>
        <header style={{ maxWidth: 1000, margin: '0 auto', padding: narrow ? '40px 22px 28px' : '64px 40px 36px', borderBottom: `1px solid ${t.line}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: narrow ? 16 : 24, flexWrap: 'wrap' }}>
            <TplAvatar photo={d.photo} name={d.titre} size={narrow ? 72 : 88} accent={accent} dark />
            <div style={{ flex: 1, minWidth: 0 }}>
              {tag('// portfolio')}
              <h1 style={{ fontSize: narrow ? 36 : 52, fontWeight: 700, letterSpacing: '-0.02em', margin: '6px 0 0', color: '#fff', fontFamily: mono }}>{d.titre}</h1>
              <p style={{ fontSize: narrow ? 16 : 19, color: accent, margin: '6px 0 0', fontFamily: mono }}>{d.domaine}{d.localisation ? `  ·  ${d.localisation}` : ''}</p>
            </div>
          </div>
          {d.bio && <p style={{ fontSize: 15, lineHeight: 1.7, color: t.sub, maxWidth: 680, margin: '22px 0 0' }}>{d.bio}</p>}
          <SocialRow d={d} t={t} accent={accent} />
        </header>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: narrow ? '32px 22px 56px' : '44px 40px 80px', display: 'grid', gap: 48 }}>
          {d.competences.length > 0 && <section>{tag('# compétences')}<div style={{ marginTop: 16 }}><Chips d={d} t={t} accent={accent} /></div></section>}
          {d.experiences.length > 0 && <section>{tag('# expérience')}<div style={{ marginTop: 16 }}><ExpNumbered d={d} t={t} accent={accent} /></div></section>}
          {d.projets.length > 0 && <section>{tag('# projets')}<div style={{ marginTop: 16 }}><ProjCards d={d} t={t} accent={accent} cols={narrow ? '1fr' : '1fr 1fr'} /></div></section>}
        </div>
        <PfFooter d={d} t={t} />
      </div>
    );
  }

  // panel
  const cols = narrow ? '1fr' : '260px 1fr';
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: t.bg, color: t.text }}>
      <header style={{ padding: narrow ? '44px 22px 32px' : '72px 40px 40px', maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: narrow ? 'column' : 'row', alignItems: narrow ? 'flex-start' : 'flex-end', gap: narrow ? 18 : 28 }}>
          <TplAvatar photo={d.photo} name={d.titre} size={narrow ? 84 : 128} accent={accent} dark />
          <div style={{ flex: 1, minWidth: 0 }}>
            {d.localisation && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 999, background: withAlpha(accent, 0.18), color: accent, marginBottom: 12 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} /> Disponible</span>}
            <h1 style={{ fontFamily: t.serif, fontSize: narrow ? 44 : 68, lineHeight: 0.95, letterSpacing: '-0.02em', margin: 0, color: '#fff' }}>{d.titre}</h1>
            <p style={{ fontSize: narrow ? 18 : 22, fontWeight: 500, color: t.sub, margin: '8px 0 0' }}>{d.domaine}</p>
            {d.localisation && <p style={{ fontSize: 14, color: t.muted, margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="pin" size={14} /> {d.localisation}</p>}
          </div>
        </div>
        {d.bio && <p style={{ fontSize: narrow ? 16 : 18, lineHeight: 1.7, color: t.sub, maxWidth: 640, margin: '28px 0 0' }}>{d.bio}</p>}
        <SocialRow d={d} t={t} accent={accent} />
      </header>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: narrow ? '0 22px 56px' : '0 40px 80px', display: 'grid', gridTemplateColumns: cols, gap: narrow ? 32 : 56, alignItems: 'start' }}>
        {d.competences.length > 0 && <aside><SectionLbl t={t}>Compétences</SectionLbl><Chips d={d} t={t} accent={accent} /></aside>}
        <main style={{ display: 'grid', gap: 56 }}>
          {d.experiences.length > 0 && <section><SectionLbl t={t}>Expérience</SectionLbl><ExpCards d={d} t={t} accent={accent} /></section>}
          {d.projets.length > 0 && <section><SectionLbl t={t}>Projets</SectionLbl><ProjCards d={d} t={t} accent={accent} cols={narrow ? '1fr' : '1fr 1fr'} /></section>}
        </main>
      </div>
      <PfFooter d={d} t={t} />
    </div>
  );
}

const FAMILY_FN = { editorial: FamilyEditorial, classique: FamilyClassique, minimal: FamilyMinimal, sombre: FamilySombre };

// ── public renderer ────────────────────────────────────────────
function TemplateRender({ tpl, formData, narrow }) {
  const d = normalizeFormData(formData);
  const accent = d.couleur_theme || (tpl && tpl.couleur) || '#2E7D32';
  const famille = (tpl && tpl.famille) || 'editorial';
  const variant = (tpl && tpl.variant) || 'default';
  const Fn = FAMILY_FN[famille] || FamilyEditorial;
  return (
    <React.Fragment>
      <Fn d={d} accent={accent} narrow={!!narrow} variant={variant} />
      <style dangerouslySetInnerHTML={{ __html: `
        .tpl-chip:hover{border-color:${accent} !important;color:${accent} !important;transform:translateY(-1px);}
        .tpl-chip-d:hover{border-color:${accent} !important;background:${withAlpha(accent,0.1)} !important;}
        .tpl-card:hover{transform:translateY(-4px);box-shadow:0 10px 30px rgba(0,0,0,0.10);border-color:${accent} !important;}
        .tpl-card-d:hover{border-color:${withAlpha(accent,0.5)} !important;transform:translateY(-4px);}
        .tpl-row:hover{padding-left:8px !important;}
        .tpl-ulink:hover{opacity:0.6;}
        .tpl-btn:hover{filter:brightness(0.92);}
      ` }} />
    </React.Fragment>
  );
}

// ── PhonePreview ───────────────────────────────────────────────
function PhonePreview({ tpl, formData, scale }) {
  const W = 300, H = 600;
  return (
    <div style={{ width: W, height: H, borderRadius: 36, background: '#1A1A1F', padding: 10, boxShadow: '0 24px 60px -20px rgba(0,0,0,0.45)', position: 'relative', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', width: 80, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.25)', zIndex: 5 }} />
      <div style={{ width: '100%', height: '100%', borderRadius: 28, overflow: 'hidden', background: '#fff', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden' }} className="phone-scroll">
          <div style={{ width: 720, transformOrigin: 'top left', transform: 'scale(' + (280 / 720) + ')' }}>
            <TemplateRender tpl={tpl} formData={formData} narrow />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── sample formData ────────────────────────────────────────────
window.SAMPLE_FORMDATA = {
  titre: 'Aminata Diallo', domaine: 'Designer UX & Product', localisation: 'Dakar, Sénégal',
  couleur_theme: '', cv: '1',
  photo: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop&crop=faces',
  bio: "Designer produit centrée utilisateur, passionnée par le design inclusif adapté au contexte africain. J'accompagne startups et institutions de l'idée au produit fini.",
  social_links: [{ type: 'linkedin', label: 'LinkedIn' }, { type: 'github', label: 'GitHub' }, { type: 'dribbble', label: 'Dribbble' }, { type: 'mail', label: 'Email' }],
  competences: ['Figma', 'User Research', 'Prototypage', 'Design System', 'Accessibilité', 'Motion'],
  experiences: [
    { poste: 'Lead Product Designer', entreprise: 'Wave', periode: '2023 — Présent', description: 'Pilotage du design system mobile money utilisé par 8 équipes. Refonte du parcours : -32% d\'abandons.' },
    { poste: 'Product Designer', entreprise: 'Sonatel — Orange', periode: '2021 — 2023', description: 'Conception des apps Orange Money & Orange et Moi.' },
    { poste: 'UI Designer', entreprise: 'Freelance', periode: '2019 — 2021', description: 'Interfaces pour startups ouest-africaines.' },
  ],
  projets: [
    { titre: 'Wave App Redesign', categorie: 'Fintech', description: "Refonte du parcours d'envoi d'argent pour 2M+ d'utilisateurs.", image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop' },
    { titre: 'Plateforme Jumia', categorie: 'E-commerce', description: "Expérience d'achat mobile-first pour l'Afrique de l'Ouest.", image: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=600&h=400&fit=crop' },
    { titre: 'App santé', categorie: 'Santé', description: 'Suivi médical et prise de rendez-vous à Dakar.', image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&h=400&fit=crop' },
    { titre: 'Dashboard Analytics', categorie: 'Data', description: 'Suivi de performance produit temps réel.', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop' },
  ],
};

// color utils exportés → accessibles "bare" dans tpl-wizard.jsx (même pattern que window.Icon)
Object.assign(window, { TemplateRender, PhonePreview, normalizeFormData, mixWhite, darken, onAccent, withAlpha });
