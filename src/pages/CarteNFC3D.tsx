import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pause, Play, RotateCcw, Hand, ArrowRight, Loader2, Info } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  CardInfo, FinishId, FINISHES, PORTFOLIO_HOST, TEX_H, TEX_W,
  drawRecto, drawVerso, sanitizeSlugInput, slugify,
} from '@/components/nfc3d/drawCard';
import type { Face } from '@/components/nfc3d/CardScene';

// three.js (~150 Ko gzip) n'est chargé que sur cette page
const CardScene = lazy(() => import('@/components/nfc3d/CardScene'));

const DRAFT_KEY = 'portefolia_nfc_card_draft';

const DEFAULT_INFO: CardInfo = {
  name: 'Awa Ndiaye',
  title: 'Product Designer',
  phone: '+221 77 000 00 00',
  email: 'awa.ndiaye@email.com',
  slug: 'awa-ndiaye',
};

const FIELDS: { key: keyof CardInfo; label: string; placeholder: string; max: number; type?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; autoComplete?: string }[] = [
  { key: 'name',  label: 'Nom complet',     placeholder: 'Votre Nom',         max: 32, autoComplete: 'name' },
  { key: 'title', label: 'Poste / métier',  placeholder: 'Product Designer',  max: 40, autoComplete: 'organization-title' },
  { key: 'phone', label: 'Téléphone',       placeholder: '+221 77 000 00 00', max: 22, type: 'tel', inputMode: 'tel', autoComplete: 'tel' },
  { key: 'email', label: 'Email',           placeholder: 'vous@email.com',    max: 48, type: 'email', inputMode: 'email', autoComplete: 'email' },
];

function loadDraft(): { info: CardInfo; finish: FinishId; slugTouched: boolean } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object' || !d.info) return null;
    return {
      info: { ...DEFAULT_INFO, ...d.info },
      finish: FINISHES.some(f => f.id === d.finish) ? d.finish : 'noir',
      slugTouched: !!d.slugTouched,
    };
  } catch {
    return null;
  }
}

function useImage(src: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const i = new Image();
    i.decoding = 'async';
    i.onload = () => setImg(i);
    i.src = src;
  }, [src]);
  return img;
}

export default function CarteNFC3D() {
  const navigate = useNavigate();
  const draft = useMemo(loadDraft, []);
  const [info, setInfo] = useState<CardInfo>(draft?.info ?? DEFAULT_INFO);
  const [finishId, setFinishId] = useState<FinishId>(draft?.finish ?? 'noir');
  const [slugTouched, setSlugTouched] = useState(draft?.slugTouched ?? false);
  const [autoRotate, setAutoRotate] = useState(() => {
    try { return !window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return true; }
  });
  const [pinnedFace, setPinnedFace] = useState<Face | null>(null);
  const [editing, setEditing] = useState(false);
  const [version, setVersion] = useState(0);
  const [fontsReady, setFontsReady] = useState(false);

  const finish = FINISHES.find(f => f.id === finishId)!;
  const logo = useImage('/nfc-card/logo-portefolia.webp');
  const mark = useImage('/nfc-card/logo-p.webp');

  // Canvas stables, redessinés à chaque modification
  const canvases = useMemo(() => {
    const mk = () => { const c = document.createElement('canvas'); c.width = TEX_W; c.height = TEX_H; return c; };
    return { recto: mk(), verso: mk() };
  }, []);

  useEffect(() => {
    document.title = 'Carte NFC 3D — Personnalisez la vôtre | Portefolia';
    const fonts = document.fonts as FontFaceSet | undefined;
    if (!fonts?.load) { setFontsReady(true); return; }
    Promise.all([
      fonts.load("800 136px Inter"), fonts.load("600 72px Inter"), fonts.load("400 60px Inter"),
    ]).catch(() => {}).finally(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    const r = canvases.recto.getContext('2d');
    const v = canvases.verso.getContext('2d');
    if (!r || !v) return;
    drawRecto(r, finish, logo);
    drawVerso(v, finish, info, mark);
    setVersion(n => n + 1);
  }, [canvases, finish, info, logo, mark, fontsReady]);

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ info, finish: finishId, slugTouched })); } catch { /* stockage indisponible */ }
  }, [info, finishId, slugTouched]);

  // Pendant la saisie, la carte montre le verso ; elle repart ensuite en rotation
  const blurTimer = useRef<number>();
  const onFieldFocus = () => { window.clearTimeout(blurTimer.current); setEditing(true); };
  const onFieldBlur = () => { blurTimer.current = window.setTimeout(() => setEditing(false), 1800); };
  useEffect(() => () => window.clearTimeout(blurTimer.current), []);

  const focusFace: Face | null = pinnedFace ?? (editing ? 'verso' : null);

  const update = (key: keyof CardInfo, value: string) => {
    setInfo(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'name' && !slugTouched) next.slug = slugify(value);
      return next;
    });
  };

  const reset = () => {
    setInfo(DEFAULT_INFO);
    setFinishId('noir');
    setSlugTouched(false);
    setPinnedFace(null);
  };

  const showFace = (face: Face) => setPinnedFace(p => (p === face ? null : face));
  const toggleRotate = () => { setPinnedFace(null); setAutoRotate(a => !a); };

  const goSubscribe = () => navigate('/#formules');

  const inputCls = 'scroll-mt-[calc(36svh+100px)] sm:scroll-mt-[calc(40vh+110px)] lg:scroll-mt-28 w-full h-11 px-3.5 rounded-xl border border-[#E7E7EA] bg-white text-base sm:text-[15px] text-[#18181B] placeholder:text-[#A1A1AA] outline-none transition focus:border-[#2E7D32] focus:ring-4 focus:ring-[#2E7D32]/10';

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-8 pb-16 lg:py-12 grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6 lg:gap-12 lg:items-start">

        {/* ── Aperçu 3D (collant sous le header sur mobile pour voir les modifs pendant la saisie) ── */}
        <section
          aria-label="Aperçu 3D de la carte"
          className="sticky [@media(max-height:560px)]:static top-16 z-10 -mx-4 sm:mx-0 lg:top-24 bg-white/95 backdrop-blur sm:bg-transparent sm:backdrop-blur-0 pt-3 pb-2 sm:pt-6 lg:pt-0"
        >
          <div
            className="relative mx-4 sm:mx-0 rounded-3xl overflow-hidden border border-[#E7E7EA]"
            style={{ background: 'radial-gradient(120% 90% at 50% 20%, #ffffff 0%, #f1f4ef 55%, #e6ebe3 100%)' }}
          >
            <Suspense
              fallback={
                <div className="h-[36svh] min-h-[220px] sm:h-[40vh] lg:h-[min(640px,calc(100vh-10rem))] flex items-center justify-center text-[#71717A]">
                  <Loader2 className="animate-spin" size={22} />
                </div>
              }
            >
              <CardScene
                recto={canvases.recto}
                verso={canvases.verso}
                version={version}
                edgeColor={finish.edge}
                autoRotate={autoRotate}
                focusFace={focusFace}
                className="h-[36svh] min-h-[220px] sm:h-[40vh] sm:min-h-[340px] lg:h-[min(640px,calc(100vh-10rem))] lg:min-h-[480px] w-full"
              />
            </Suspense>

            <span className="pointer-events-none absolute top-3 left-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-white rounded-full px-2.5 py-1" style={{ background: '#F59E0B' }}>
              Bientôt disponible
            </span>
            <p className="pointer-events-none absolute top-3 right-3 hidden min-[420px]:flex items-center gap-1.5 text-[11px] sm:text-xs text-[#71717A] bg-white/80 rounded-full px-2.5 py-1">
              <Hand size={13} /> Glissez pour faire tourner
            </p>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-full bg-white/90 backdrop-blur border border-[#E7E7EA] shadow-sm">
              {(['recto', 'verso'] as Face[]).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => showFace(f)}
                  aria-pressed={pinnedFace === f}
                  className={`h-8 px-3.5 rounded-full text-xs sm:text-sm font-medium capitalize transition-colors ${
                    pinnedFace === f ? 'bg-[#2E7D32] text-white' : 'text-[#18181B] hover:bg-zinc-100'
                  }`}
                >
                  {f}
                </button>
              ))}
              <button
                type="button"
                onClick={toggleRotate}
                aria-label={autoRotate ? 'Arrêter la rotation' : 'Lancer la rotation'}
                aria-pressed={autoRotate}
                className="h-8 w-8 rounded-full flex items-center justify-center text-[#18181B] hover:bg-zinc-100"
              >
                {autoRotate ? <Pause size={15} /> : <Play size={15} />}
              </button>
            </div>
          </div>
        </section>

        {/* ── Personnalisation ── */}
        <section className="pt-2 lg:pt-0">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: '#E8F5E9', color: '#1B5E20' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]" />
            Aperçu en direct · Pré-lancement
          </span>
          <h1 className="mt-4 font-extrabold text-[#18181B] tracking-tight leading-[1.05]" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}>
            Votre carte NFC, <span className="text-[#1B5E20]">à votre nom</span>.
          </h1>
          <p className="mt-3 text-[#18181B]/65 leading-relaxed">
            Modifiez les informations : la carte se met à jour instantanément. Un tap sur un téléphone ouvre votre portfolio.
          </p>

          <div role="note" className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 leading-relaxed">
            <Info size={18} className="shrink-0 mt-0.5 text-amber-600" />
            <p>
              <strong className="font-semibold">Les cartes NFC ne sont pas encore disponibles à la commande.</strong>{' '}
              Cette page vous montre à quoi ressemblera la vôtre. En attendant, vous pouvez déjà créer votre portfolio : c'est lui que votre carte ouvrira.
            </p>
          </div>

          <form className="mt-7 space-y-4" onSubmit={e => { e.preventDefault(); goSubscribe(); }}>
            <div className="grid sm:grid-cols-2 gap-4">
              {FIELDS.map(f => (
                <label key={f.key} className={f.key === 'email' ? 'sm:col-span-2 block' : 'block'}>
                  <span className="block text-sm font-medium text-[#18181B] mb-1.5">{f.label}</span>
                  <input
                    type={f.type ?? 'text'}
                    inputMode={f.inputMode}
                    autoComplete={f.autoComplete}
                    value={info[f.key]}
                    maxLength={f.max}
                    placeholder={f.placeholder}
                    onChange={e => update(f.key, e.target.value)}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                    className={inputCls}
                  />
                </label>
              ))}
            </div>

            <label className="block">
              <span className="block text-sm font-medium text-[#18181B] mb-1.5">Lien de votre portfolio</span>
              <div className="scroll-mt-[calc(36svh+100px)] sm:scroll-mt-[calc(40vh+110px)] lg:scroll-mt-28 flex items-stretch rounded-xl border border-[#E7E7EA] bg-white overflow-hidden focus-within:border-[#2E7D32] focus-within:ring-4 focus-within:ring-[#2E7D32]/10 transition">
                <span className="hidden min-[400px]:flex items-center pl-3.5 pr-1 text-sm text-[#71717A] bg-zinc-50 border-r border-[#E7E7EA] whitespace-nowrap">
                  {PORTFOLIO_HOST}
                </span>
                <input
                  value={info.slug}
                  maxLength={40}
                  placeholder="votre-nom"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  onChange={e => { setSlugTouched(true); setInfo(p => ({ ...p, slug: sanitizeSlugInput(e.target.value) })); }}
                  onFocus={onFieldFocus}
                  onBlur={onFieldBlur}
                  className="flex-1 min-w-0 h-11 px-3 text-base sm:text-[15px] text-[#18181B] placeholder:text-[#A1A1AA] outline-none"
                />
              </div>
            </label>

            <fieldset>
              <legend className="block text-sm font-medium text-[#18181B] mb-2">Finition</legend>
              <div className="flex flex-wrap gap-2">
                {FINISHES.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFinishId(f.id)}
                    aria-pressed={finishId === f.id}
                    className={`h-10 pl-2 pr-3.5 rounded-full border flex items-center gap-2 text-sm transition-colors ${
                      finishId === f.id ? 'border-[#2E7D32] bg-[#E8F5E9] text-[#1B5E20] font-semibold' : 'border-[#E7E7EA] text-[#18181B] hover:bg-zinc-50'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full border border-black/10" style={{ background: f.swatch }} />
                    {f.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="pt-3 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                style={{ background: '#2E7D32' }}
              >
                Je veux ma carte <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl text-sm font-semibold text-[#18181B] border border-[#E7E7EA] hover:bg-zinc-50 transition-colors"
              >
                <RotateCcw size={15} /> Réinitialiser
              </button>
            </div>

            <p className="text-xs text-[#71717A] leading-relaxed">
              « Je veux ma carte » vous mène à nos formules pour créer votre portfolio. La carte elle-même n'est pas encore en vente.{' '}
              <Link to="/nfc-types" className="underline underline-offset-2 hover:text-[#1B5E20]">Être prévenu du lancement</Link>
            </p>
          </form>
        </section>
      </main>

      <Footer />
    </div>
  );
}
