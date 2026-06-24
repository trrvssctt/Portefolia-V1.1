import { useState, useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Phone, Download, Github, Linkedin, Twitter,
  Facebook, Instagram, Globe, ArrowLeft, Copy, Check,
  FolderOpen, Briefcase, Cpu, ArrowRight, LayoutTemplate, Mail,
} from "lucide-react";
import { downloadCV } from "@/utils/downloadCV";
import { templateById } from "./portfolioTemplates";

// ── Props ─────────────────────────────────────────────────────────────────────
interface ModernPortfolioTemplateProps {
  portfolio: any;
  experiences: any[];
  education: any[];
  skills: any[];
  projects: any[];
}

// ── Color utilities ───────────────────────────────────────────────────────────
function hexToRgb(hex: string) {
  let h = (hex || '#2E7D32').replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function withAlpha(hex: string, a: number) {
  const { r, g, b } = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`;
}
function mixWhite(hex: string, a: number) {
  const { r, g, b } = hexToRgb(hex);
  const m = (c: number) => Math.round(c + (255 - c) * a);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
function darken(hex: string, a: number) {
  const { r, g, b } = hexToRgb(hex);
  const m = (c: number) => Math.round(c * (1 - a));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
function isLight(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150;
}
function onAccent(hex: string) { return isLight(hex) ? '#1A1A2E' : '#FFFFFF'; }

// ── Responsive hook ───────────────────────────────────────────────────────────
function useNarrow(bp = 768): boolean {
  const [n, setN] = useState(() => typeof window !== 'undefined' ? window.innerWidth < bp : false);
  useEffect(() => {
    const h = () => setN(window.innerWidth < bp);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [bp]);
  return n;
}

// ── Theme ─────────────────────────────────────────────────────────────────────
interface Theme {
  dark: boolean; bg: string; text: string; sub: string; muted: string;
  faint: string; line: string; card: string; cardLine: string; soft: string; serif: string;
}
const serifFont = "'Instrument Serif', Georgia, serif";
function themeFor(family: string): Theme {
  if (family === 'sombre')   return { dark: true,  bg: '#0E0F13', text: '#fff',     sub: 'rgba(255,255,255,0.65)', muted: 'rgba(255,255,255,0.45)', faint: 'rgba(255,255,255,0.4)', line: 'rgba(255,255,255,0.1)', card: 'rgba(255,255,255,0.03)', cardLine: 'rgba(255,255,255,0.1)', soft: 'rgba(255,255,255,0.06)', serif: serifFont };
  if (family === 'classique') return { dark: false, bg: '#F7F8F8', text: '#1A1A2E', sub: '#555', muted: '#777', faint: '#888', line: '#EEE', card: '#fff', cardLine: '#EEE', soft: '#F4F4F5', serif: serifFont };
  if (family === 'minimal')   return { dark: false, bg: '#FFFFFF', text: '#1A1A1A', sub: '#555', muted: '#888', faint: '#999', line: '#EEE', card: '#fff', cardLine: '#E8E8E8', soft: '#F7F7F7', serif: serifFont };
  return { dark: false, bg: '#FFFFFF', text: '#1A1A2E', sub: '#555', muted: '#777', faint: '#888', line: '#E8E8E8', card: '#fff', cardLine: '#E8E8E8', soft: '#F4F4F5', serif: serifFont };
}
function chipBg(t: Theme, a: string)  { return t.dark ? withAlpha(a, 0.14) : mixWhite(a, 0.9); }
function chipClr(t: Theme, a: string) { return t.dark ? a : darken(a, 0.1); }
function aClr(t: Theme, a: string)    { return t.dark ? a : darken(a, 0.1); }

// ── Normalized data ───────────────────────────────────────────────────────────
interface SocialLink { type: string; label: string; url: string; }
interface NormedExp  { poste: string; entreprise: string; periode: string; description: string; }
interface NormedProj { titre: string; description: string; categorie: string; image: string; }
interface D {
  titre: string; domaine: string; localisation: string; bio: string;
  photo: string; cv: string; banniere: string; couleur_theme: string;
  social_links: SocialLink[];
  experiences: NormedExp[];
  projets: NormedProj[];
  competences: string[];
}

function fmtDate(d: string | null): string {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }); }
  catch { return String(d); }
}
function fmtPeriod(s: string | null, e: string | null, cur: boolean): string {
  if (!s && !e) return '';
  const start = s ? fmtDate(s) : '';
  const end   = cur ? 'Présent' : (e ? fmtDate(e) : '?');
  return start ? `${start} — ${end}` : end;
}

function normalize(portfolio: any, exps: any[], skills: any[], projects: any[]): D {
  const sl: SocialLink[] = [];
  if (portfolio.linkedin_url)  sl.push({ type: 'linkedin',  label: 'LinkedIn',  url: portfolio.linkedin_url });
  if (portfolio.github_url)    sl.push({ type: 'github',    label: 'GitHub',    url: portfolio.github_url });
  if (portfolio.twitter_url)   sl.push({ type: 'twitter',   label: 'Twitter',   url: portfolio.twitter_url });
  if (portfolio.facebook_url)  sl.push({ type: 'facebook',  label: 'Facebook',  url: portfolio.facebook_url });
  if (portfolio.instagram_url) sl.push({ type: 'instagram', label: 'Instagram', url: portfolio.instagram_url });
  if (portfolio.website)       sl.push({ type: 'globe',     label: 'Site web',  url: portfolio.website });
  return {
    titre:         portfolio.title    || portfolio.titre       || '',
    domaine:       portfolio.role     || portfolio.domain      || '',
    localisation:  portfolio.location || '',
    bio:           portfolio.bio      || portfolio.description || '',
    photo:         portfolio.profile_image_url || '',
    cv:            portfolio.cv_url   || '',
    banniere:      portfolio.banner_image_url  || '',
    couleur_theme: portfolio.theme_color       || '',
    social_links:  sl,
    experiences: (exps || []).map(e => ({
      poste:       e.position    || e.titre_poste || e.title || '',
      entreprise:  e.company     || e.entreprise  || '',
      periode:     fmtPeriod(e.start_date, e.end_date, !!e.is_current),
      description: e.description || '',
    })),
    projets: (projects || []).map(p => ({
      titre:       p.title   || p.titre       || '',
      description: p.description || '',
      categorie:   Array.isArray(p.technologies) && p.technologies.length ? p.technologies[0] : '',
      image:       p.image   || p.image_url   || '',
    })),
    competences: (skills || []).map(s => s.name || s.nom || '').filter(Boolean),
  };
}

// ── Icon helper ───────────────────────────────────────────────────────────────
function TplIcon({ name, size = 16, style }: { name: string; size?: number; style?: CSSProperties }) {
  const p = { size, style };
  switch (name) {
    case 'pin':      return <MapPin      {...p} />;
    case 'download': return <Download    {...p} />;
    case 'arrow':    return <ArrowRight  {...p} />;
    case 'layout':   return <LayoutTemplate {...p} />;
    case 'cpu':      return <Cpu         {...p} />;
    case 'brief':    return <Briefcase   {...p} />;
    case 'folder':   return <FolderOpen  {...p} />;
    case 'linkedin': return <Linkedin    {...p} />;
    case 'github':   return <Github      {...p} />;
    case 'twitter':  return <Twitter     {...p} />;
    case 'instagram':return <Instagram   {...p} />;
    case 'facebook': return <Facebook    {...p} />;
    case 'mail':     return <Mail        {...p} />;
    case 'phone':    return <Phone       {...p} />;
    default:         return <Globe       {...p} />;
  }
}

// ── Shared atoms ──────────────────────────────────────────────────────────────
function TplAvatar({ photo, name, size, accent, round = false, dark = false }: {
  photo?: string; name: string; size: number; accent: string; round?: boolean; dark?: boolean;
}) {
  const [ok, setOk] = useState(!!photo);
  const initials = (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  if (photo && ok) {
    return <img src={photo} alt={name} onError={() => setOk(false)}
      style={{ width: size, height: size, borderRadius: round ? '50%' : 18, objectFit: 'cover' }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: round ? '50%' : 18,
      background: dark ? withAlpha(accent, 0.25) : accent,
      color: dark ? accent : onAccent(accent),
      display: 'grid', placeItems: 'center', fontWeight: 700,
      fontSize: size * 0.36, fontFamily: 'Inter, sans-serif',
    }}>{initials}</div>
  );
}

function TplProjImg({ src, accent, dark = false, ratio = '16/9' }: {
  src?: string; accent: string; dark?: boolean; ratio?: string;
}) {
  const [ok, setOk] = useState(!!src);
  if (src && ok) {
    return <img src={src} onError={() => setOk(false)}
      style={{ width: '100%', aspectRatio: ratio, objectFit: 'cover', display: 'block' }} />;
  }
  return (
    <div style={{ width: '100%', aspectRatio: ratio,
      background: dark ? withAlpha(accent, 0.12) : mixWhite(accent, 0.85),
      display: 'grid', placeItems: 'center',
    }}>
      <FolderOpen size={26} style={{ color: accent, opacity: 0.5 }} />
    </div>
  );
}

function SectionLbl({ children, t, center = false }: { children: ReactNode; t: Theme; center?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, justifyContent: center ? 'center' : 'flex-start' }}>
      {center && <span style={{ height: 1, flex: 1, maxWidth: 60, background: t.line }} />}
      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: t.muted }}>
        {children}
      </span>
      <span style={{ height: 1, flex: 1, background: t.line }} />
    </div>
  );
}

function TplSocialRow({ d, t, accent, center = false }: { d: D; t: Theme; accent: string; center?: boolean }) {
  if (!d.social_links.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 22, justifyContent: center ? 'center' : 'flex-start' }}>
      {d.social_links.map((s, i) => (
        <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={{
          display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 14px',
          borderRadius: 999, border: `1px solid ${t.dark ? 'rgba(255,255,255,0.15)' : '#E8E8E8'}`,
          background: t.dark ? 'transparent' : '#fff',
          fontSize: 13, fontWeight: 500, color: t.dark ? 'rgba(255,255,255,0.9)' : '#333',
          cursor: 'pointer', textDecoration: 'none',
        }}>
          <TplIcon name={s.type} size={15} /> {s.label}
        </a>
      ))}
    </div>
  );
}

function CvBtn({ d, accent }: { d: D; accent: string }) {
  if (!d.cv) return null;
  return (
    <a href={d.cv} target="_blank" rel="noopener noreferrer" style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      height: 44, padding: '0 20px', borderRadius: 8,
      background: accent, color: onAccent(accent),
      fontWeight: 600, fontSize: 15, marginTop: 18, textDecoration: 'none',
    }}>
      <Download size={16} /> Télécharger le CV
    </a>
  );
}

// ── Section renderers ─────────────────────────────────────────────────────────
function Chips({ d, t, accent, round = false, center = false }: { d: D; t: Theme; accent: string; round?: boolean; center?: boolean }) {
  if (!d.competences.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: center ? 'center' : 'flex-start' }}>
      {d.competences.map((c, i) => (
        <span key={i} style={{
          fontSize: 13, padding: round ? '6px 14px' : '5px 12px',
          borderRadius: round ? 999 : 8,
          background: chipBg(t, accent), color: chipClr(t, accent), fontWeight: 500,
        }}>{c}</span>
      ))}
    </div>
  );
}

function ChipsOutline({ d, t, center = false }: { d: D; t: Theme; center?: boolean }) {
  if (!d.competences.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: center ? 'center' : 'flex-start' }}>
      {d.competences.map((c, i) => (
        <span key={i} style={{
          fontSize: 14, padding: '7px 15px', borderRadius: 999,
          border: `1px solid ${t.dark ? 'rgba(255,255,255,0.18)' : '#E8E8E8'}`, color: t.sub,
        }}>{c}</span>
      ))}
    </div>
  );
}

function ExpTimeline({ d, t, accent }: { d: D; t: Theme; accent: string }) {
  return (
    <div style={{ display: 'grid', gap: 24, position: 'relative', paddingLeft: 22 }}>
      <div style={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 1, background: t.line }} />
      {d.experiences.map((e, i) => (
        <div key={i} style={{ position: 'relative', minWidth: 0 }}>
          <span style={{ position: 'absolute', left: -22, top: 5, width: 11, height: 11, borderRadius: '50%',
            background: i === 0 ? accent : (t.dark ? 'rgba(255,255,255,0.25)' : '#D4D4D8'),
            border: `2px solid ${t.bg}`, boxShadow: t.dark ? 'none' : '0 0 0 1px #E8E8E8',
          }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: t.text, minWidth: 0 }}>{e.poste}</h3>
            {e.periode && <span style={{ fontSize: 12, color: t.muted, flexShrink: 0 }}>{e.periode}</span>}
          </div>
          {e.entreprise && <p style={{ fontSize: 14, fontWeight: 600, color: aClr(t, accent), margin: '2px 0 0' }}>{e.entreprise}</p>}
          {e.description && <p style={{ fontSize: 14, lineHeight: 1.6, color: t.sub, margin: '8px 0 0', maxWidth: 560 }}>{e.description}</p>}
        </div>
      ))}
    </div>
  );
}

function ExpCards({ d, t, accent }: { d: D; t: Theme; accent: string }) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {d.experiences.map((e, i) => (
        <div key={i} style={{ border: `1px solid ${t.cardLine}`, background: t.card, borderRadius: 14, padding: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: t.text }}>{e.poste}</h3>
            {e.periode && <span style={{ fontSize: 12, color: t.muted }}>{e.periode}</span>}
          </div>
          {e.entreprise && <p style={{ fontSize: 14, fontWeight: 600, color: aClr(t, accent), margin: '2px 0 0' }}>{e.entreprise}</p>}
          {e.description && <p style={{ fontSize: 14, lineHeight: 1.6, color: t.sub, margin: '8px 0 0' }}>{e.description}</p>}
        </div>
      ))}
    </div>
  );
}

function ExpList({ d, t, narrow = false }: { d: D; t: Theme; accent: string; narrow?: boolean }) {
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {d.experiences.map((e, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '90px 1fr', gap: narrow ? 4 : 18 }}>
          <span style={{ fontSize: 13, color: t.faint, paddingTop: 2 }}>
            {(e.periode || '').split('—')[0].trim()}
          </span>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: t.text }}>
              {e.poste}
              {e.entreprise ? <span style={{ fontWeight: 400, color: t.faint }}> · {e.entreprise}</span> : null}
            </h3>
            {e.description && <p style={{ fontSize: 14, lineHeight: 1.6, color: t.sub, margin: '6px 0 0' }}>{e.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ExpNumbered({ d, t, accent }: { d: D; t: Theme; accent: string }) {
  return (
    <div style={{ display: 'grid', gap: 0 }}>
      {d.experiences.map((e, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '46px 1fr', gap: 14, padding: '18px 0', borderTop: i ? `1px solid ${t.line}` : 'none' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: accent, fontFamily: 'ui-monospace, monospace' }}>{String(i + 1).padStart(2, '0')}</span>
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: t.text }}>{e.poste}</h3>
              {e.periode && <span style={{ fontSize: 12, color: t.muted }}>{e.periode}</span>}
            </div>
            {e.entreprise && <p style={{ fontSize: 14, fontWeight: 600, color: aClr(t, accent), margin: '2px 0 0' }}>{e.entreprise}</p>}
            {e.description && <p style={{ fontSize: 14, lineHeight: 1.6, color: t.sub, margin: '6px 0 0' }}>{e.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjCards({ d, t, accent, cols, ratio = '16/9' }: { d: D; t: Theme; accent: string; cols: string; ratio?: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 18 }}>
      {d.projets.map((p, i) => (
        <article key={i} style={{ border: `1px solid ${t.cardLine}`, background: t.card, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <TplProjImg src={p.image} accent={accent} dark={t.dark} ratio={ratio} />
          <div style={{ padding: 16 }}>
            {p.categorie && <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: aClr(t, accent) }}>{p.categorie}</span>}
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '4px 0 0', color: t.text }}>{p.titre}</h3>
            {p.description && <p style={{ fontSize: 14, lineHeight: 1.5, color: t.sub, margin: '8px 0 0' }}>{p.description}</p>}
          </div>
        </article>
      ))}
    </div>
  );
}

function ProjRows({ d, t, accent }: { d: D; t: Theme; accent: string }) {
  return (
    <div>
      {d.projets.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: i < d.projets.length - 1 ? `1px solid ${t.line}` : 'none', cursor: 'pointer' }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: 16, fontWeight: 500, margin: 0, color: t.text }}>{p.titre}</h3>
            {(p.categorie || p.description) && <p style={{ fontSize: 13, color: t.faint, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.categorie || p.description}</p>}
          </div>
          <ArrowRight size={16} style={{ color: accent, flexShrink: 0, marginLeft: 16 }} />
        </div>
      ))}
    </div>
  );
}

function ProjNumbered({ d, t, accent }: { d: D; t: Theme; accent: string }) {
  return (
    <div>
      {d.projets.map((p, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '46px 1fr auto', alignItems: 'center', gap: 14, padding: '16px 0', borderTop: i ? `1px solid ${t.line}` : 'none', cursor: 'pointer' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: accent, fontFamily: 'ui-monospace, monospace' }}>{String(i + 1).padStart(2, '0')}</span>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: t.text }}>{p.titre}</h3>
            {(p.categorie || p.description) && <p style={{ fontSize: 13, color: t.faint, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.categorie || p.description}</p>}
          </div>
          <ArrowRight size={16} style={{ color: accent, flexShrink: 0 }} />
        </div>
      ))}
    </div>
  );
}

// ── Classique helpers ─────────────────────────────────────────────────────────
function Card({ t, children, style }: { t: Theme; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: t.card, border: `1px solid ${t.cardLine}`, borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', minWidth: 0, ...style }}>
      {children}
    </div>
  );
}
function CardHead({ children, icon, accent, t }: { children: ReactNode; icon: string; accent: string; t: Theme }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      <span style={{ width: 36, height: 36, borderRadius: 10, background: chipBg(t, accent), color: chipClr(t, accent), display: 'grid', placeItems: 'center' }}>
        <TplIcon name={icon} size={17} />
      </span>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: t.text }}>{children}</h2>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  FAMILY: EDITORIAL  (classic | cover | split)
// ════════════════════════════════════════════════════════════════
function FamilyEditorial({ d, accent, variant, narrow }: { d: D; accent: string; variant: string; narrow: boolean }) {
  const t = themeFor('editorial');
  const v = ['classic', 'cover', 'split'].includes(variant) ? variant : 'classic';
  const px = narrow ? '20px' : '40px';

  if (v === 'cover') {
    const banner = d.banniere
      ? `url(${d.banniere}) center/cover`
      : `linear-gradient(135deg, ${accent}, ${darken(accent, 0.35)})`;
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', background: t.bg, color: t.text }}>
        <div style={{ position: 'relative', background: banner, padding: narrow ? `56px ${px} 24px` : `90px ${px} 24px`, textAlign: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: d.banniere ? 'rgba(0,0,0,0.35)' : 'transparent' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ border: '4px solid #fff', borderRadius: '50%', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                <TplAvatar photo={d.photo} name={d.titre} size={narrow ? 88 : 120} accent={accent} round />
              </div>
            </div>
            <h1 style={{ fontFamily: t.serif, fontSize: narrow ? 40 : 66, lineHeight: 1, letterSpacing: '-0.02em', margin: '18px 0 0', color: '#fff' }}>{d.titre}</h1>
            <p style={{ fontSize: narrow ? 16 : 21, fontWeight: 500, color: 'rgba(255,255,255,0.92)', margin: '8px 0 0' }}>
              {d.domaine}{d.localisation ? ` · ${d.localisation}` : ''}
            </p>
          </div>
        </div>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: narrow ? `32px ${px} 56px` : `48px ${px} 80px`, display: 'grid', gap: 40, textAlign: 'center' }}>
          {d.bio && <p style={{ fontSize: narrow ? 16 : 19, lineHeight: 1.75, color: t.sub, margin: 0 }}>{d.bio}</p>}
          <TplSocialRow d={d} t={t} accent={accent} center />
          {d.competences.length > 0 && <div><SectionLbl t={t} center>Compétences</SectionLbl><Chips d={d} t={t} accent={accent} round center /></div>}
          {d.experiences.length > 0 && <div style={{ textAlign: 'left' }}><SectionLbl t={t} center>Expérience</SectionLbl><ExpCards d={d} t={t} accent={accent} /></div>}
          {d.projets.length > 0 && <div style={{ textAlign: 'left' }}><SectionLbl t={t} center>Projets</SectionLbl><ProjCards d={d} t={t} accent={accent} cols={narrow ? '1fr' : '1fr 1fr'} /></div>}
          <CvBtn d={d} accent={accent} />
        </div>
      </div>
    );
  }

  if (v === 'split') {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', background: t.bg, color: t.text }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: narrow ? '1fr' : '340px 1fr', gap: narrow ? 32 : 64, padding: narrow ? `40px ${px} 56px` : `72px ${px} 80px`, alignItems: 'start' }}>
          <aside style={{ position: narrow ? 'static' : 'sticky', top: 48, minWidth: 0 }}>
            <TplAvatar photo={d.photo} name={d.titre} size={narrow ? 72 : 96} accent={accent} />
            <h1 style={{ fontFamily: t.serif, fontSize: narrow ? 40 : 56, lineHeight: 0.95, letterSpacing: '-0.02em', margin: '20px 0 0' }}>{d.titre}</h1>
            <p style={{ fontSize: narrow ? 16 : 19, fontWeight: 500, color: t.sub, margin: '8px 0 0' }}>{d.domaine}</p>
            {d.localisation && <p style={{ fontSize: 14, color: t.muted, margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}><TplIcon name="pin" size={14} /> {d.localisation}</p>}
            {d.bio && <p style={{ fontSize: 15, lineHeight: 1.7, color: t.sub, margin: '20px 0 0' }}>{d.bio}</p>}
            <TplSocialRow d={d} t={t} accent={accent} />
            <CvBtn d={d} accent={accent} />
            {d.competences.length > 0 && <div style={{ marginTop: 28 }}><SectionLbl t={t}>Compétences</SectionLbl><Chips d={d} t={t} accent={accent} /></div>}
          </aside>
          <main style={{ display: 'grid', gap: 56, minWidth: 0 }}>
            {d.experiences.length > 0 && <section><SectionLbl t={t}>Expérience</SectionLbl><ExpTimeline d={d} t={t} accent={accent} /></section>}
            {d.projets.length > 0 && <section><SectionLbl t={t}>Projets</SectionLbl><ProjCards d={d} t={t} accent={accent} cols={narrow ? '1fr' : '1fr 1fr'} /></section>}
          </main>
        </div>
      </div>
    );
  }

  // classic
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: t.bg, color: t.text }}>
      <header style={{ padding: narrow ? `40px ${px} 28px` : `64px ${px} 36px`, maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: narrow ? 'column' : 'row', alignItems: narrow ? 'flex-start' : 'flex-end', gap: narrow ? 16 : 28, minWidth: 0 }}>
          <TplAvatar photo={d.photo} name={d.titre} size={narrow ? 80 : 128} accent={accent} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: t.serif, fontSize: narrow ? 40 : 68, lineHeight: 0.95, letterSpacing: '-0.02em', margin: 0 }}>{d.titre}</h1>
            <p style={{ fontSize: narrow ? 17 : 22, fontWeight: 500, color: t.sub, margin: '8px 0 0' }}>{d.domaine}</p>
            {d.localisation && <p style={{ fontSize: 14, color: t.muted, margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}><TplIcon name="pin" size={14} /> {d.localisation}</p>}
          </div>
        </div>
        {d.bio && <p style={{ fontSize: narrow ? 15 : 18, lineHeight: 1.7, color: t.sub, maxWidth: 640, margin: '28px 0 0' }}>{d.bio}</p>}
        <TplSocialRow d={d} t={t} accent={accent} />
        <CvBtn d={d} accent={accent} />
      </header>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: narrow ? `0 ${px} 56px` : `0 ${px} 80px`, display: 'grid', gridTemplateColumns: narrow ? '1fr' : '260px 1fr', gap: narrow ? 32 : 56, alignItems: 'start' }}>
        {d.competences.length > 0 && <aside style={{ minWidth: 0 }}><SectionLbl t={t}>Compétences</SectionLbl><Chips d={d} t={t} accent={accent} /></aside>}
        <main style={{ display: 'grid', gap: narrow ? 36 : 56, minWidth: 0 }}>
          {d.experiences.length > 0 && <section><SectionLbl t={t}>Expérience</SectionLbl><ExpTimeline d={d} t={t} accent={accent} /></section>}
          {d.projets.length > 0 && <section><SectionLbl t={t}>Projets</SectionLbl><ProjCards d={d} t={t} accent={accent} cols={narrow ? '1fr' : '1fr 1fr'} /></section>}
        </main>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  FAMILY: CLASSIQUE  (centered | sidebar | band)
// ════════════════════════════════════════════════════════════════
function FamilyClassique({ d, accent, variant, narrow }: { d: D; accent: string; variant: string; narrow: boolean }) {
  const t = themeFor('classique');
  const v = ['centered', 'sidebar', 'band'].includes(variant) ? variant : 'centered';
  const px = narrow ? '16px' : '40px';

  const expBlock = d.experiences.length > 0 && (
    <Card t={t}>
      <CardHead icon="brief" accent={accent} t={t}>Expérience</CardHead>
      <div style={{ display: 'grid', gap: 18 }}>
        {d.experiences.map((e, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: 18, borderBottom: i < d.experiences.length - 1 ? `1px solid ${t.line}` : 'none' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: accent, color: onAccent(accent), display: 'grid', placeItems: 'center', fontWeight: 700, flexShrink: 0 }}>
              {((e.entreprise || e.poste) || '?')[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: t.text }}>{e.poste}</h3>
                {e.periode && <span style={{ fontSize: 12, color: t.muted }}>{e.periode}</span>}
              </div>
              {e.entreprise && <p style={{ fontSize: 14, fontWeight: 600, color: aClr(t, accent), margin: '2px 0 0' }}>{e.entreprise}</p>}
              {e.description && <p style={{ fontSize: 14, lineHeight: 1.6, color: t.sub, margin: '6px 0 0' }}>{e.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  const blocksBase = (
    <>
      {d.competences.length > 0 && <Card t={t}><CardHead icon="cpu" accent={accent} t={t}>Compétences</CardHead><Chips d={d} t={t} accent={accent} round /></Card>}
      {expBlock}
    </>
  );
  const projCard = d.projets.length > 0 && (
    <Card t={t}><CardHead icon="folder" accent={accent} t={t}>Projets</CardHead><ProjCards d={d} t={t} accent={accent} cols={narrow ? '1fr' : '1fr 1fr'} ratio="16/10" /></Card>
  );
  const blocks = <>{blocksBase}{projCard}</>;

  if (v === 'sidebar') {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', background: t.bg, color: t.text }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: narrow ? '1fr' : '300px 1fr', gap: narrow ? 24 : 28, padding: narrow ? `32px ${px} 56px` : `56px ${px} 80px`, alignItems: 'start' }}>
          <aside style={{ position: narrow ? 'static' : 'sticky', top: 40, minWidth: 0 }}>
            <Card t={t}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}><TplAvatar photo={d.photo} name={d.titre} size={narrow ? 72 : 96} accent={accent} round /></div>
                <h1 style={{ fontSize: narrow ? 22 : 26, fontWeight: 800, letterSpacing: '-0.02em', margin: '16px 0 0', color: t.text }}>{d.titre}</h1>
                <p style={{ fontSize: 15, fontWeight: 600, color: aClr(t, accent), margin: '6px 0 0' }}>{d.domaine}</p>
                {d.localisation && <p style={{ fontSize: 13, color: t.muted, margin: '6px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><TplIcon name="pin" size={13} /> {d.localisation}</p>}
              </div>
              {d.bio && <p style={{ fontSize: 14, lineHeight: 1.7, color: t.sub, margin: '16px 0 0' }}>{d.bio}</p>}
              <div style={{ display: 'flex', justifyContent: 'center' }}><TplSocialRow d={d} t={t} accent={accent} center /></div>
              <div style={{ display: 'flex', justifyContent: 'center' }}><CvBtn d={d} accent={accent} /></div>
            </Card>
          </aside>
          <main style={{ display: 'grid', gap: 20, minWidth: 0 }}>{blocks}</main>
        </div>
      </div>
    );
  }

  if (v === 'band') {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', background: t.bg, color: t.text }}>
        <div style={{ background: `linear-gradient(135deg, ${mixWhite(accent, 0.86)}, ${mixWhite(accent, 0.95)})`, borderBottom: `1px solid ${t.line}` }}>
          <header style={{ textAlign: 'center', padding: narrow ? `44px ${px} 36px` : `64px ${px} 48px`, maxWidth: 760, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ border: `4px solid ${t.bg}`, borderRadius: '50%' }}>
                <TplAvatar photo={d.photo} name={d.titre} size={narrow ? 80 : 104} accent={accent} round />
              </div>
            </div>
            <h1 style={{ fontSize: narrow ? 36 : 46, fontWeight: 800, letterSpacing: '-0.02em', margin: '18px 0 0', color: t.text }}>{d.titre}</h1>
            <p style={{ fontSize: narrow ? 16 : 18, fontWeight: 600, color: darken(accent, 0.1), margin: '8px 0 0' }}>{d.domaine}</p>
            {d.localisation && <p style={{ fontSize: 14, color: t.muted, margin: '6px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><TplIcon name="pin" size={14} /> {d.localisation}</p>}
            {d.bio && <p style={{ fontSize: narrow ? 15 : 16, lineHeight: 1.7, color: t.sub, maxWidth: 600, margin: '16px auto 0' }}>{d.bio}</p>}
            <div style={{ display: 'flex', justifyContent: 'center' }}><TplSocialRow d={d} t={t} accent={accent} center /></div>
          </header>
        </div>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: narrow ? `24px ${px} 56px` : `40px ${px} 80px`, display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 20, alignItems: 'start' }}>
          {blocksBase}
          {d.projets.length > 0 && (
            <Card t={t} style={{ gridColumn: narrow ? undefined : '1 / -1' }}>
              <CardHead icon="folder" accent={accent} t={t}>Projets</CardHead>
              <ProjCards d={d} t={t} accent={accent} cols={narrow ? '1fr' : '1fr 1fr 1fr'} ratio="16/10" />
            </Card>
          )}
        </div>
      </div>
    );
  }

  // centered
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: t.bg, color: t.text }}>
      <header style={{ textAlign: 'center', padding: narrow ? `44px ${px} 28px` : `72px ${px} 44px`, maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}><TplAvatar photo={d.photo} name={d.titre} size={narrow ? 80 : 104} accent={accent} round /></div>
        <h1 style={{ fontSize: narrow ? 36 : 46, fontWeight: 800, letterSpacing: '-0.02em', margin: '20px 0 0', color: t.text }}>{d.titre}</h1>
        <p style={{ fontSize: narrow ? 16 : 18, fontWeight: 600, color: darken(accent, 0.05), margin: '8px 0 0' }}>{d.domaine}</p>
        {d.localisation && <p style={{ fontSize: 14, color: t.muted, margin: '6px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><TplIcon name="pin" size={14} /> {d.localisation}</p>}
        {d.bio && <p style={{ fontSize: narrow ? 15 : 16, lineHeight: 1.7, color: t.sub, maxWidth: 600, margin: '18px auto 0' }}>{d.bio}</p>}
        <div style={{ display: 'flex', justifyContent: 'center' }}><TplSocialRow d={d} t={t} accent={accent} center /></div>
      </header>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: narrow ? `0 ${px} 56px` : `0 ${px} 80px`, display: 'grid', gap: 20 }}>{blocks}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  FAMILY: MINIMAL  (list | center | index)
// ════════════════════════════════════════════════════════════════
function FamilyMinimal({ d, accent, variant, narrow }: { d: D; accent: string; variant: string; narrow: boolean }) {
  const t = themeFor('minimal');
  const v = ['list', 'center', 'index'].includes(variant) ? variant : 'list';
  const center = v === 'center';
  const lbl: CSSProperties = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', margin: '0 0 20px', color: t.faint, textAlign: center ? 'center' : 'left' };
  const px = narrow ? '16px' : '24px';

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: t.bg, color: t.text }}>
      <div style={{ maxWidth: center ? 680 : 620, margin: '0 auto', padding: `0 ${px}` }}>
        <header style={{ padding: narrow ? (center ? '48px 0 32px' : '44px 0 32px') : (center ? '80px 0 40px' : '72px 0 40px'), textAlign: center ? 'center' : 'left' }}>
          {center && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}><TplAvatar photo={d.photo} name={d.titre} size={narrow ? 72 : 88} accent={accent} round /></div>}
          <h1 style={{ fontSize: narrow ? (center ? 36 : 32) : (center ? 52 : 46), fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{d.titre}</h1>
          <p style={{ fontSize: narrow ? 15 : 18, color: t.muted, margin: '8px 0 0' }}>{d.domaine}{d.localisation ? ' — ' + d.localisation : ''}</p>
          {d.bio && <p style={{ fontSize: narrow ? 15 : 17, lineHeight: 1.75, color: t.sub, margin: '24px auto 0', maxWidth: center ? 540 : undefined }}>{d.bio}</p>}
          {d.social_links.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 22, justifyContent: center ? 'center' : 'flex-start' }}>
              {d.social_links.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, color: darken(accent, 0.05), textDecoration: 'none' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent }} /> {s.label}
                </a>
              ))}
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
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  FAMILY: SOMBRE  (panel | hero | mono)
// ════════════════════════════════════════════════════════════════
function FamilySombre({ d, accent, variant, narrow }: { d: D; accent: string; variant: string; narrow: boolean }) {
  const t = themeFor('sombre');
  const v = ['panel', 'hero', 'mono'].includes(variant) ? variant : 'panel';
  const px = narrow ? '20px' : '40px';

  if (v === 'hero') {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', background: t.bg, color: t.text }}>
        <div style={{ position: 'relative', overflow: 'hidden', textAlign: 'center', padding: narrow ? `56px ${px} 40px` : `96px ${px} 56px` }}>
          <div style={{ position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)', width: 560, height: 560, borderRadius: '50%', background: `radial-gradient(circle, ${withAlpha(accent, 0.35)}, transparent 65%)`, filter: 'blur(20px)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}><TplAvatar photo={d.photo} name={d.titre} size={narrow ? 88 : 116} accent={accent} round dark /></div>
            <h1 style={{ fontFamily: t.serif, fontSize: narrow ? 44 : 72, lineHeight: 1, letterSpacing: '-0.02em', margin: '20px 0 0', color: '#fff' }}>{d.titre}</h1>
            <p style={{ fontSize: narrow ? 17 : 22, fontWeight: 500, color: accent, margin: '10px 0 0' }}>{d.domaine}</p>
            {d.localisation && <p style={{ fontSize: 14, color: t.muted, margin: '8px 0 0' }}>{d.localisation}</p>}
            {d.bio && <p style={{ fontSize: narrow ? 15 : 18, lineHeight: 1.7, color: t.sub, maxWidth: 560, margin: '22px auto 0' }}>{d.bio}</p>}
            <div style={{ display: 'flex', justifyContent: 'center' }}><TplSocialRow d={d} t={t} accent={accent} center /></div>
          </div>
        </div>
        <div style={{ maxWidth: 880, margin: '0 auto', padding: narrow ? `24px ${px} 56px` : `32px ${px} 80px`, display: 'grid', gap: 48 }}>
          {d.competences.length > 0 && <div style={{ textAlign: 'center' }}><SectionLbl t={t} center>Compétences</SectionLbl><Chips d={d} t={t} accent={accent} round center /></div>}
          {d.experiences.length > 0 && <section><SectionLbl t={t}>Expérience</SectionLbl><ExpCards d={d} t={t} accent={accent} /></section>}
          {d.projets.length > 0 && <section><SectionLbl t={t}>Projets</SectionLbl><ProjCards d={d} t={t} accent={accent} cols={narrow ? '1fr' : '1fr 1fr'} /></section>}
        </div>
      </div>
    );
  }

  if (v === 'mono') {
    const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
    const tag = (txt: string) => (
      <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.1em', color: accent, textTransform: 'uppercase' as const }}>
        {txt}
      </span>
    );
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', background: t.bg, color: t.text }}>
        <header style={{ maxWidth: 1000, margin: '0 auto', padding: narrow ? `44px ${px} 28px` : `64px ${px} 36px`, borderBottom: `1px solid ${t.line}` }}>
          <div style={{ display: 'flex', flexDirection: narrow ? 'column' : 'row', alignItems: narrow ? 'flex-start' : 'center', gap: 24, minWidth: 0 }}>
            <TplAvatar photo={d.photo} name={d.titre} size={narrow ? 72 : 88} accent={accent} dark />
            <div style={{ flex: 1, minWidth: 0 }}>
              {tag('// portfolio')}
              <h1 style={{ fontSize: narrow ? 36 : 52, fontWeight: 700, letterSpacing: '-0.02em', margin: '6px 0 0', color: '#fff', fontFamily: mono }}>{d.titre}</h1>
              <p style={{ fontSize: narrow ? 15 : 19, color: accent, margin: '6px 0 0', fontFamily: mono }}>{d.domaine}{d.localisation ? `  ·  ${d.localisation}` : ''}</p>
            </div>
          </div>
          {d.bio && <p style={{ fontSize: 15, lineHeight: 1.7, color: t.sub, maxWidth: 680, margin: '22px 0 0' }}>{d.bio}</p>}
          <TplSocialRow d={d} t={t} accent={accent} />
        </header>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: narrow ? `32px ${px} 56px` : `44px ${px} 80px`, display: 'grid', gap: 48 }}>
          {d.competences.length > 0 && <section>{tag('# compétences')}<div style={{ marginTop: 16 }}><Chips d={d} t={t} accent={accent} /></div></section>}
          {d.experiences.length > 0 && <section>{tag('# expérience')}<div style={{ marginTop: 16 }}><ExpNumbered d={d} t={t} accent={accent} /></div></section>}
          {d.projets.length > 0 && <section>{tag('# projets')}<div style={{ marginTop: 16 }}><ProjCards d={d} t={t} accent={accent} cols={narrow ? '1fr' : '1fr 1fr'} /></div></section>}
        </div>
      </div>
    );
  }

  // panel
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: t.bg, color: t.text }}>
      <header style={{ padding: narrow ? `40px ${px} 28px` : `72px ${px} 40px`, maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: narrow ? 'column' : 'row', alignItems: narrow ? 'flex-start' : 'flex-end', gap: narrow ? 16 : 28, minWidth: 0 }}>
          <TplAvatar photo={d.photo} name={d.titre} size={narrow ? 80 : 128} accent={accent} dark />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: t.serif, fontSize: narrow ? 40 : 68, lineHeight: 0.95, letterSpacing: '-0.02em', margin: 0, color: '#fff' }}>{d.titre}</h1>
            <p style={{ fontSize: narrow ? 17 : 22, fontWeight: 500, color: t.sub, margin: '8px 0 0' }}>{d.domaine}</p>
            {d.localisation && <p style={{ fontSize: 14, color: t.muted, margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}><TplIcon name="pin" size={14} /> {d.localisation}</p>}
          </div>
        </div>
        {d.bio && <p style={{ fontSize: narrow ? 15 : 18, lineHeight: 1.7, color: t.sub, maxWidth: 640, margin: '28px 0 0' }}>{d.bio}</p>}
        <TplSocialRow d={d} t={t} accent={accent} />
      </header>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: narrow ? `0 ${px} 56px` : `0 ${px} 80px`, display: 'grid', gridTemplateColumns: narrow ? '1fr' : '260px 1fr', gap: narrow ? 32 : 56, alignItems: 'start' }}>
        {d.competences.length > 0 && <aside style={{ minWidth: 0 }}><SectionLbl t={t}>Compétences</SectionLbl><Chips d={d} t={t} accent={accent} /></aside>}
        <main style={{ display: 'grid', gap: narrow ? 36 : 56, minWidth: 0 }}>
          {d.experiences.length > 0 && <section><SectionLbl t={t}>Expérience</SectionLbl><ExpCards d={d} t={t} accent={accent} /></section>}
          {d.projets.length > 0 && <section><SectionLbl t={t}>Projets</SectionLbl><ProjCards d={d} t={t} accent={accent} cols={narrow ? '1fr' : '1fr 1fr'} /></section>}
        </main>
      </div>
    </div>
  );
}

// ── TopBar ────────────────────────────────────────────────────────────────────
const FAMILY_LABELS: Record<string, string> = {
  editorial: 'Éditorial', classique: 'Classique', minimal: 'Minimal', sombre: 'Sombre',
};

function TopBar({ portfolio, accent, dark, onCopy, copied }: {
  portfolio: any; accent: string; dark: boolean; onCopy: () => void; copied: boolean;
}) {
  const isLoggedIn = !!localStorage.getItem('token');
  const family  = portfolio.template_family  || 'editorial';
  const variant = portfolio.template_variant || '';
  return (
    <div className={`sticky top-0 z-40 backdrop-blur-md border-b ${dark ? 'bg-black/40 border-white/10' : 'bg-white/90 border-zinc-200/80'}`}>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
        {isLoggedIn ? (
          <a href="/dashboard" className={`flex items-center gap-2 text-sm font-medium transition-colors ${dark ? 'text-white/60 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}>
            <ArrowLeft size={15} /> Tableau de bord
          </a>
        ) : (
          <a href="/" className="text-sm font-bold" style={{ color: accent }}>Portefolia</a>
        )}
        <span className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${dark ? 'bg-white/10 text-white/70' : 'bg-zinc-100 text-zinc-500'}`}>
          {FAMILY_LABELS[family] || 'Template'}
          {variant && <span className="opacity-60">· {variant}</span>}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={onCopy} className={`hidden sm:flex items-center gap-1.5 h-9 px-3.5 rounded-xl border text-sm font-medium transition-colors ${dark ? 'border-white/15 text-white hover:bg-white/10' : 'border-zinc-200 text-zinc-800 hover:bg-zinc-50'}`}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copié !' : 'Copier le lien'}
          </button>
          {portfolio.cv_url && (
            <button onClick={() => downloadCV(portfolio.cv_url, portfolio.full_name || portfolio.nom || 'Profil')}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ background: accent }}>
              <Download size={14} /> CV
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function PageFooter({ portfolio, dark, accent }: { portfolio: any; dark: boolean; accent: string }) {
  return (
    <footer className={`border-t mt-12 ${dark ? 'border-white/10' : 'border-zinc-200'}`}>
      <div className={`max-w-5xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between text-sm ${dark ? 'text-white/40' : 'text-zinc-400'}`}>
        <span>© {new Date().getFullYear()} {portfolio.title}</span>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block">Créé avec <span className="font-semibold" style={{ color: accent }}>Portefolia</span></span>
          <a href="/" className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-white" style={{ background: accent }}>
            Créer le vôtre
          </a>
        </div>
      </div>
    </footer>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
const FAMILY_FN: Record<string, (props: { d: D; accent: string; variant: string; narrow: boolean }) => JSX.Element> = {
  editorial: FamilyEditorial,
  classique: FamilyClassique,
  minimal:   FamilyMinimal,
  sombre:    FamilySombre,
};

export const ModernPortfolioTemplate = ({ portfolio, experiences, education: _edu, skills, projects }: ModernPortfolioTemplateProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const narrow = useNarrow();

  const tplInfo = templateById(portfolio.template_id || 'tpl-1');
  const accent  = portfolio.theme_color    || tplInfo.primary;
  const family  = portfolio.template_family  || tplInfo.family;
  const variant = portfolio.template_variant || tplInfo.variant;
  const dark    = family === 'sombre';
  const t       = themeFor(family);

  const d = normalize(portfolio, experiences, skills, projects);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast({ title: 'Lien copié !', description: 'Le lien du portfolio a été copié.' });
  };

  const FamilyComp = FAMILY_FN[family] ?? FamilyEditorial;

  return (
    <>
      <style>{`
        .pf-tpl { overflow-x: clip; }
        .pf-tpl *, .pf-tpl *::before, .pf-tpl *::after { box-sizing: border-box; }
        .pf-tpl h1, .pf-tpl h2, .pf-tpl h3 { overflow-wrap: break-word; word-break: break-word; }
        .pf-tpl img { max-width: 100%; display: block; }
        .pf-tpl p { overflow-wrap: break-word; }
        .pf-tpl a { min-width: 0; }
      `}</style>
      <div className="pf-tpl min-h-screen" style={{ background: t.bg }}>
        <TopBar portfolio={portfolio} accent={accent} dark={dark} onCopy={copyLink} copied={copied} />
        <FamilyComp d={d} accent={accent} variant={variant} narrow={narrow} />
        <PageFooter portfolio={portfolio} dark={dark} accent={accent} />
      </div>
    </>
  );
};
