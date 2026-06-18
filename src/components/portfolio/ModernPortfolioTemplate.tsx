import { useState } from "react";
import type { ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Phone, Download, ExternalLink, Github,
  Linkedin, Twitter, Facebook, Instagram, Globe, ArrowLeft,
  Copy, Check, FolderOpen, Briefcase, Cpu,
} from "lucide-react";
import { downloadCV } from "@/utils/downloadCV";

// ── Same props as before ──────────────────────────────────────────────────────
interface ModernPortfolioTemplateProps {
  portfolio: any;
  experiences: any[];
  education: any[];
  skills: any[];
  projects: any[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d: string | null): string {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  } catch { return String(d); }
}

function fmtPeriod(start: string | null, end: string | null, isCurrent: boolean): string {
  if (!start && !end) return '';
  const s = start ? fmtDate(start) : '';
  const e = isCurrent ? 'Présent' : (end ? fmtDate(end) : '?');
  return s ? `${s} — ${e}` : e;
}

const SOCIAL_DEFS = [
  { key: 'linkedin_url', label: 'LinkedIn', Icon: Linkedin },
  { key: 'github_url',   label: 'GitHub',   Icon: Github },
  { key: 'twitter_url',  label: 'Twitter',  Icon: Twitter },
  { key: 'facebook_url', label: 'Facebook', Icon: Facebook },
  { key: 'instagram_url',label: 'Instagram',Icon: Instagram },
  { key: 'website',      label: 'Site web', Icon: Globe },
] as const;

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 'lg', round = false, accent }: {
  src?: string; name: string; size?: 'lg' | 'md'; round?: boolean; accent: string;
}) {
  const [ok, setOk] = useState(!!src);
  const initials = (name || 'P').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const dim     = size === 'lg' ? 'w-32 h-32 sm:w-36 sm:h-36' : 'w-24 h-24';
  const shape   = round ? 'rounded-full' : 'rounded-2xl';
  const fs      = size === 'lg' ? 40 : 30;
  if (src && ok) {
    return <img src={src} alt={name} onError={() => setOk(false)} className={`${dim} object-cover ${shape}`} />;
  }
  return (
    <div className={`${dim} ${shape} flex items-center justify-center text-white font-semibold`}
      style={{ background: `linear-gradient(140deg, ${accent}, ${accent}cc)`, fontSize: fs }}>
      {initials}
    </div>
  );
}

function ProjImage({ src, title, h = 'h-44', dark = false, accent }: {
  src?: string; title: string; h?: string; dark?: boolean; accent: string;
}) {
  const [ok, setOk] = useState(!!src);
  if (src && ok) {
    return (
      <div className={`${h} overflow-hidden ${dark ? 'bg-white/5' : 'bg-zinc-100'}`}>
        <img src={src} alt={title} onError={() => setOk(false)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
      </div>
    );
  }
  return (
    <div className={`${h} flex items-center justify-center`}
      style={{ background: dark ? 'rgba(255,255,255,0.04)' : `${accent}1A` }}>
      <FolderOpen size={30} style={{ color: accent, opacity: 0.4 }} />
    </div>
  );
}

function SectionLabel({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className={`text-[11px] font-semibold uppercase tracking-[0.18em] whitespace-nowrap ${dark ? 'text-white/40' : 'text-zinc-400'}`}>
        {children}
      </span>
      <span className={`h-px flex-1 ${dark ? 'bg-white/12' : 'bg-zinc-200'}`} />
    </div>
  );
}

function Socials({ portfolio, dark = false }: { portfolio: any; dark?: boolean }) {
  const links = SOCIAL_DEFS.filter(s => portfolio[s.key]);
  if (!links.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {links.map(s => (
        <a key={s.key} href={portfolio[s.key]} target="_blank" rel="noopener noreferrer"
          className={`flex items-center gap-2 h-10 px-3.5 rounded-full border text-sm font-medium transition-all ${
            dark
              ? 'border-white/15 text-white/90 hover:bg-white/10'
              : 'border-zinc-200 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50'
          }`}>
          <s.Icon size={15} className={dark ? 'opacity-50' : 'text-zinc-400'} />
          {s.label}
        </a>
      ))}
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
  const family = portfolio.template_family || 'editorial';
  return (
    <div className={`sticky top-0 z-40 backdrop-blur-md border-b ${dark ? 'bg-black/40 border-white/10' : 'bg-white/90 border-zinc-200/80'}`}>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
        {isLoggedIn ? (
          <a href="/dashboard"
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${dark ? 'text-white/60 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}>
            <ArrowLeft size={15} /> Tableau de bord
          </a>
        ) : (
          <a href="/" className="text-sm font-bold" style={{ color: accent }}>Portefolia</a>
        )}
        <span className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${dark ? 'bg-white/10 text-white/70' : 'bg-zinc-100 text-zinc-500'}`}>
          {FAMILY_LABELS[family] || 'Template'}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={onCopy}
            className={`hidden sm:flex items-center gap-1.5 h-9 px-3.5 rounded-xl border text-sm font-medium transition-colors ${dark ? 'border-white/15 text-white hover:bg-white/10' : 'border-zinc-200 text-zinc-800 hover:bg-zinc-50'}`}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copié !' : 'Copier le lien'}
          </button>
          {portfolio.cv_url && (
            <button
              onClick={() => downloadCV(portfolio.cv_url, portfolio.full_name || portfolio.nom || 'Profil')}
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
          <span className="hidden sm:block">
            Créé avec <span className="font-semibold" style={{ color: accent }}>Portefolia</span>
          </span>
          <a href="/" className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-white"
            style={{ background: accent }}>
            Créer le vôtre
          </a>
        </div>
      </div>
    </footer>
  );
}

// ── Project tech tags ─────────────────────────────────────────────────────────
function TechTags({ techs, dark = false, accent }: { techs: string[]; dark?: boolean; accent: string }) {
  if (!techs?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-4">
      {techs.map((t: string, j: number) => (
        dark ? (
          <span key={j} className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md border border-white/15 text-white/70">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />{t}
          </span>
        ) : (
          <span key={j} className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md border border-zinc-200 text-zinc-600">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />{t}
          </span>
        )
      ))}
    </div>
  );
}

// ── Project link icons ────────────────────────────────────────────────────────
function ProjLinks({ pr, dark = false }: { pr: any; dark?: boolean }) {
  if (!pr.project_url && !pr.github_url) return null;
  const cls = dark
    ? 'p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 transition-colors'
    : 'p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-colors';
  return (
    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
      {pr.project_url && <a href={pr.project_url} target="_blank" rel="noopener noreferrer" className={cls} title="Demo"><ExternalLink size={13} /></a>}
      {pr.github_url  && <a href={pr.github_url}  target="_blank" rel="noopener noreferrer" className={cls} title="Code"><Github size={13} /></a>}
    </div>
  );
}

// ── FAMILY: ÉDITORIAL ─────────────────────────────────────────────────────────
function EditorialBody({ portfolio, experiences, skills, projects, accent }: any) {
  const displayRole = portfolio.role ||
    (experiences[0]?.position
      ? `${experiences[0].position}${experiences[0]?.company ? ` · ${experiences[0].company}` : ''}`
      : '');

  return (
    <>
      <header className="max-w-5xl mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-10">
        <div className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-8">
          <Avatar src={portfolio.profile_image_url} name={portfolio.title} accent={accent} />
          <div className="flex-1 min-w-0">
            {displayRole && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full mb-3"
                style={{ background: `${accent}18`, color: accent }}>
                {displayRole}
              </span>
            )}
            <h1 className="font-serif leading-[0.95] text-zinc-900 tracking-tight"
              style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)' }}>
              {portfolio.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-zinc-500">
              {portfolio.location && <span className="flex items-center gap-1.5"><MapPin size={14} /> {portfolio.location}</span>}
              {portfolio.phone   && <a href={`tel:${portfolio.phone}`} className="flex items-center gap-1.5 hover:text-zinc-800 transition-colors"><Phone size={14} /> {portfolio.phone}</a>}
            </div>
          </div>
        </div>
        {portfolio.bio && (
          <p className="mt-8 text-lg leading-relaxed text-zinc-600 max-w-2xl" style={{ textWrap: 'pretty' } as any}>
            {portfolio.bio}
          </p>
        )}
        {portfolio.business && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium"
            style={{ borderColor: `${portfolio.business.primary_color || '#18181B'}40`, background: `${portfolio.business.primary_color || '#18181B'}0D`, color: portfolio.business.primary_color || '#18181B' }}>
            <span className="font-semibold">{portfolio.business.company_name}</span>
            {portfolio.business.role_label && <><span className="opacity-40">·</span><span className="opacity-70">{portfolio.business.role_label}</span></>}
          </div>
        )}
        <div className="mt-6"><Socials portfolio={portfolio} /></div>
      </header>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10 lg:gap-14 items-start">

          {/* Sidebar */}
          <aside className="lg:sticky lg:top-20">
            {skills.length > 0 && (
              <>
                <SectionLabel>Compétences</SectionLabel>
                <div className="space-y-4">
                  {skills.map((s: any, i: number) => (
                    <div key={s.id || i}>
                      <div className="flex justify-between items-baseline mb-1.5">
                        <span className="text-sm font-medium text-zinc-800">{s.name}</span>
                        {s.level && <span className="text-xs font-semibold text-zinc-400 tabular-nums">{s.level}</span>}
                      </div>
                      {s.level && (
                        <div className="h-1 rounded-full bg-zinc-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${s.level}%`, background: accent }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </aside>

          {/* Main */}
          <main className="space-y-16">
            {experiences.length > 0 && (
              <section id="experience">
                <SectionLabel>Expérience</SectionLabel>
                <div className="relative pl-6">
                  <div className="absolute left-[5px] top-2 bottom-2 w-px bg-zinc-200" />
                  <div className="space-y-9">
                    {experiences.map((e: any, i: number) => (
                      <div key={e.id || i} className="relative">
                        <div className="absolute -left-6 top-1.5 w-[11px] h-[11px] rounded-full border-2 border-white"
                          style={{ background: e.is_current ? accent : '#D4D4D8', boxShadow: '0 0 0 1px #E7E7EA' }} />
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                          <h3 className="text-base font-semibold text-zinc-900">{e.position}</h3>
                          <span className="text-xs font-medium text-zinc-400 tabular-nums">{fmtPeriod(e.start_date, e.end_date, e.is_current)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm font-semibold" style={{ color: accent }}>{e.company}</span>
                          {e.location && <span className="text-xs text-zinc-400">· {e.location}</span>}
                          {e.is_current && <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: `${accent}18`, color: accent }}>Actuel</span>}
                        </div>
                        {e.description && <p className="mt-2 text-sm leading-relaxed text-zinc-500 max-w-xl" style={{ textWrap: 'pretty' } as any}>{e.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {projects.length > 0 && (
              <section id="projets">
                <SectionLabel>Projets sélectionnés</SectionLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {projects.map((pr: any, i: number) => (
                    <article key={pr.id || i}
                      className="group rounded-2xl border border-zinc-200 overflow-hidden bg-white hover:shadow-[0_8px_30px_rgba(16,24,40,0.08)] transition-shadow duration-300 flex flex-col">
                      <ProjImage src={pr.image} title={pr.title} accent={accent} />
                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-base font-semibold text-zinc-900 leading-snug">{pr.title}</h3>
                          <ProjLinks pr={pr} />
                        </div>
                        {pr.description && <p className="mt-2 text-sm leading-relaxed text-zinc-500 flex-1" style={{ textWrap: 'pretty' } as any}>{pr.description}</p>}
                        <TechTags techs={pr.technologies} accent={accent} />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {experiences.length === 0 && projects.length === 0 && (
              <div className="text-center py-20 text-zinc-400">
                <p className="text-lg">Ce portfolio est en cours de construction.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

// ── FAMILY: CLASSIQUE ─────────────────────────────────────────────────────────
function ClassiqueBody({ portfolio, experiences, skills, projects, accent }: any) {
  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 pb-24">
      {/* Centered header */}
      <header className="text-center pt-16 pb-12">
        <div className="flex justify-center">
          <Avatar src={portfolio.profile_image_url} name={portfolio.title} size="md" round accent={accent} />
        </div>
        <h1 className="mt-6 text-4xl sm:text-5xl font-bold text-zinc-900 tracking-tight">{portfolio.title}</h1>
        {portfolio.role && <p className="mt-2 text-lg font-medium" style={{ color: accent }}>{portfolio.role}</p>}
        <div className="mt-3 flex items-center justify-center gap-x-5 text-sm text-zinc-500">
          {portfolio.location && <span className="flex items-center gap-1.5"><MapPin size={14} /> {portfolio.location}</span>}
          {portfolio.phone   && <a href={`tel:${portfolio.phone}`} className="flex items-center gap-1.5 hover:text-zinc-800 transition-colors"><Phone size={14} /> {portfolio.phone}</a>}
        </div>
        {portfolio.bio && <p className="mt-6 text-base leading-relaxed text-zinc-600 max-w-2xl mx-auto" style={{ textWrap: 'pretty' } as any}>{portfolio.bio}</p>}
        {portfolio.business && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium"
            style={{ borderColor: `${portfolio.business.primary_color || '#18181B'}40`, background: `${portfolio.business.primary_color || '#18181B'}0D`, color: portfolio.business.primary_color || '#18181B' }}>
            <span className="font-semibold">{portfolio.business.company_name}</span>
            {portfolio.business.role_label && <><span className="opacity-40">·</span><span className="opacity-70">{portfolio.business.role_label}</span></>}
          </div>
        )}
        <div className="mt-6 flex justify-center"><Socials portfolio={portfolio} /></div>
      </header>

      {/* Skills card */}
      {skills.length > 0 && (
        <section className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}18`, color: accent }}>
              <Cpu size={17} />
            </span>
            <h2 className="text-lg font-semibold text-zinc-900">Compétences</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
            {skills.map((s: any, i: number) => (
              <div key={s.id || i}>
                <div className="flex justify-between mb-1.5 text-sm">
                  <span className="font-medium text-zinc-800">{s.name}</span>
                  {s.level && <span className="text-zinc-400 tabular-nums">{s.level}%</span>}
                </div>
                {s.level && (
                  <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${s.level}%`, background: accent }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Experience card */}
      {experiences.length > 0 && (
        <section className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 mb-6" id="experience">
          <div className="flex items-center gap-2.5 mb-6">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}18`, color: accent }}>
              <Briefcase size={17} />
            </span>
            <h2 className="text-lg font-semibold text-zinc-900">Expérience</h2>
          </div>
          <div className="space-y-5">
            {experiences.map((e: any, i: number) => (
              <div key={e.id || i} className="flex gap-4 pb-5 border-b border-zinc-100 last:border-0 last:pb-0">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold shrink-0 text-base"
                  style={{ background: `linear-gradient(140deg, ${accent}, ${accent}cc)` }}>
                  {(e.company || 'E')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <h3 className="font-semibold text-zinc-900">{e.position}</h3>
                    <span className="text-xs text-zinc-400 shrink-0">{fmtPeriod(e.start_date, e.end_date, e.is_current)}</span>
                  </div>
                  <p className="text-sm font-medium mt-0.5" style={{ color: accent }}>
                    {e.company}{e.location && <span className="text-zinc-400 font-normal"> · {e.location}</span>}
                  </p>
                  {e.description && <p className="mt-2 text-sm text-zinc-500 leading-relaxed">{e.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects card */}
      {projects.length > 0 && (
        <section className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8" id="projets">
          <div className="flex items-center gap-2.5 mb-6">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}18`, color: accent }}>
              <FolderOpen size={17} />
            </span>
            <h2 className="text-lg font-semibold text-zinc-900">Projets</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {projects.map((pr: any, i: number) => (
              <article key={pr.id || i} className="group rounded-xl border border-zinc-200 overflow-hidden flex flex-col">
                <ProjImage src={pr.image} title={pr.title} h="h-36" accent={accent} />
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-zinc-900 text-sm">{pr.title}</h3>
                    <ProjLinks pr={pr} />
                  </div>
                  {pr.description && <p className="mt-1.5 text-sm text-zinc-500 flex-1 leading-relaxed line-clamp-3">{pr.description}</p>}
                  {Array.isArray(pr.technologies) && pr.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {pr.technologies.map((t: string, j: number) => (
                        <span key={j} className="text-xs font-medium px-2 py-0.5 rounded"
                          style={{ background: `${accent}18`, color: accent }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── FAMILY: MINIMAL ───────────────────────────────────────────────────────────
function MinimalBody({ portfolio, experiences, skills, projects, accent }: any) {
  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 pb-28">
      <header className="pt-20 pb-14">
        <h1 className="text-4xl sm:text-5xl font-semibold text-zinc-900 tracking-tight">{portfolio.title}</h1>
        {(portfolio.role || portfolio.location) && (
          <p className="mt-2 text-lg text-zinc-500">
            {[portfolio.role, portfolio.location].filter(Boolean).join(' — ')}
          </p>
        )}
        {portfolio.bio && (
          <p className="mt-6 text-lg leading-relaxed text-zinc-600" style={{ textWrap: 'pretty' } as any}>
            {portfolio.bio}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
          {SOCIAL_DEFS.filter(s => portfolio[s.key]).map(s => (
            <a key={s.key} href={portfolio[s.key]} target="_blank" rel="noopener noreferrer"
              className="font-medium hover:underline flex items-center gap-1.5 transition-colors"
              style={{ color: accent }}>
              <span className="w-1 h-1 rounded-full" style={{ background: accent }} />
              {s.label}
            </a>
          ))}
        </div>
      </header>

      {experiences.length > 0 && (
        <section id="experience" className="py-10 border-t border-zinc-200">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400 mb-6">Expérience</p>
          <div className="space-y-7">
            {experiences.map((e: any, i: number) => (
              <div key={e.id || i} className="grid grid-cols-[90px_1fr] gap-5">
                <span className="text-xs text-zinc-400 pt-0.5 leading-relaxed">
                  {fmtPeriod(e.start_date, e.end_date, e.is_current).split(' — ')[0]}
                </span>
                <div>
                  <h3 className="font-semibold text-zinc-900">
                    {e.position} <span className="font-normal text-zinc-400">· {e.company}</span>
                  </h3>
                  {e.description && <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">{e.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {projects.length > 0 && (
        <section id="projets" className="py-10 border-t border-zinc-200">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400 mb-6">Projets</p>
          <div className="space-y-1">
            {projects.map((pr: any, i: number) => (
              <a key={pr.id || i}
                href={pr.project_url || pr.github_url || '#'}
                target={pr.project_url || pr.github_url ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="group flex items-center justify-between py-3.5 border-b border-zinc-100 last:border-0 cursor-pointer">
                <div className="min-w-0">
                  <h3 className="font-medium text-zinc-900 group-hover:opacity-60 transition-opacity">{pr.title}</h3>
                  {Array.isArray(pr.technologies) && pr.technologies.length > 0 && (
                    <p className="text-sm text-zinc-400 truncate">{pr.technologies.join(' · ')}</p>
                  )}
                </div>
                <ExternalLink size={15} className="text-zinc-300 shrink-0 ml-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
            ))}
          </div>
        </section>
      )}

      {skills.length > 0 && (
        <section className="py-10 border-t border-zinc-200">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400 mb-5">Compétences</p>
          <div className="flex flex-wrap gap-2">
            {skills.map((s: any, i: number) => (
              <span key={s.id || i} className="text-sm px-3 py-1.5 rounded-full border border-zinc-200 text-zinc-600">
                {s.name}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── FAMILY: SOMBRE ────────────────────────────────────────────────────────────
function SombreBody({ portfolio, experiences, skills, projects, accent }: any) {
  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 pb-24">
      <header className="pt-16 sm:pt-20 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-8">
          <Avatar src={portfolio.profile_image_url} name={portfolio.title} accent={accent} />
          <div className="flex-1 min-w-0">
            {portfolio.role && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full mb-3"
                style={{ background: `${accent}36`, color: accent }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
                {portfolio.role}
              </span>
            )}
            <h1 className="font-serif leading-[0.95] text-white tracking-tight"
              style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)' }}>
              {portfolio.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-white/45">
              {portfolio.location && <span className="flex items-center gap-1.5"><MapPin size={14} /> {portfolio.location}</span>}
              {portfolio.phone   && <a href={`tel:${portfolio.phone}`} className="flex items-center gap-1.5 hover:text-white/80 transition-colors"><Phone size={14} /> {portfolio.phone}</a>}
            </div>
          </div>
        </div>
        {portfolio.bio && (
          <p className="mt-8 text-lg leading-relaxed text-white/65 max-w-2xl" style={{ textWrap: 'pretty' } as any}>
            {portfolio.bio}
          </p>
        )}
        {portfolio.business && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium border-white/20 text-white/80" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <span className="font-semibold">{portfolio.business.company_name}</span>
            {portfolio.business.role_label && <><span className="opacity-40">·</span><span className="opacity-70">{portfolio.business.role_label}</span></>}
          </div>
        )}
        <div className="mt-6"><Socials portfolio={portfolio} dark /></div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10 lg:gap-14 items-start">

        {/* Sidebar */}
        <aside className="lg:sticky lg:top-20">
          {skills.length > 0 && (
            <>
              <SectionLabel dark>Compétences</SectionLabel>
              <div className="space-y-4">
                {skills.map((s: any, i: number) => (
                  <div key={s.id || i}>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-sm font-medium text-white/90">{s.name}</span>
                      {s.level && <span className="text-xs font-semibold text-white/40 tabular-nums">{s.level}</span>}
                    </div>
                    {s.level && (
                      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${s.level}%`, background: accent }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>

        {/* Main */}
        <main className="space-y-16">
          {experiences.length > 0 && (
            <section id="experience">
              <SectionLabel dark>Expérience</SectionLabel>
              <div className="space-y-4">
                {experiences.map((e: any, i: number) => (
                  <div key={e.id || i} className="rounded-2xl border border-white/10 p-5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <h3 className="text-base font-semibold text-white">{e.position}</h3>
                      <span className="text-xs text-white/40">{fmtPeriod(e.start_date, e.end_date, e.is_current)}</span>
                    </div>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: accent }}>
                      {e.company}{e.location && <span className="text-white/40 font-normal"> · {e.location}</span>}
                    </p>
                    {e.description && <p className="mt-2 text-sm leading-relaxed text-white/55">{e.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {projects.length > 0 && (
            <section id="projets">
              <SectionLabel dark>Projets sélectionnés</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {projects.map((pr: any, i: number) => (
                  <article key={pr.id || i}
                    className="group rounded-2xl border border-white/10 overflow-hidden flex flex-col hover:border-white/20 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <ProjImage src={pr.image} title={pr.title} dark accent={accent} />
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-semibold text-white leading-snug">{pr.title}</h3>
                        <ProjLinks pr={pr} dark />
                      </div>
                      {pr.description && <p className="mt-2 text-sm leading-relaxed text-white/50 flex-1">{pr.description}</p>}
                      <TechTags techs={pr.technologies} dark accent={accent} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {experiences.length === 0 && projects.length === 0 && (
            <div className="text-center py-20 text-white/30">
              <p className="text-lg">Ce portfolio est en cours de construction.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export const ModernPortfolioTemplate = ({
  portfolio, experiences, education, skills, projects,
}: ModernPortfolioTemplateProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const accent = portfolio.theme_color || '#2E7D32';
  const family = portfolio.template_family || 'editorial';
  const dark   = family === 'sombre';

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast({ title: 'Lien copié !', description: 'Le lien du portfolio a été copié.' });
  };

  const BODIES: Record<string, JSX.Element> = {
    editorial: <EditorialBody portfolio={portfolio} experiences={experiences} skills={skills} projects={projects} accent={accent} />,
    classique: <ClassiqueBody portfolio={portfolio} experiences={experiences} skills={skills} projects={projects} accent={accent} />,
    minimal:   <MinimalBody   portfolio={portfolio} experiences={experiences} skills={skills} projects={projects} accent={accent} />,
    sombre:    <SombreBody    portfolio={portfolio} experiences={experiences} skills={skills} projects={projects} accent={accent} />,
  };

  return (
    <div className="min-h-screen" style={{ background: dark ? '#0E0F13' : '#ffffff' }}>
      <TopBar portfolio={portfolio} accent={accent} dark={dark} onCopy={copyLink} copied={copied} />
      {BODIES[family] ?? BODIES.editorial}
      <PageFooter portfolio={portfolio} dark={dark} accent={accent} />
    </div>
  );
};
