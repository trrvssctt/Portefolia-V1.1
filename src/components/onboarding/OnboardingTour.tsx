import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, ArrowLeft, ArrowRight, Compass, PlayCircle, MousePointerClick } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useBusiness } from '@/contexts/BusinessContext';

const PADDING = 8;
const CARD_WIDTH = 360;
const GAP = 14;

// Pages de l'espace connecté où la visite peut s'afficher
function isAppArea(pathname: string) {
  if (pathname.startsWith('/business/join')) return false;
  return pathname.startsWith('/dashboard') || pathname.startsWith('/business');
}

function findVisible(target: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`);
  for (const el of Array.from(nodes)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden') return el;
  }
  return null;
}

const NAV_OFFSET = 80; // hauteur de la navbar collante

function isFullyVisible(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return r.top >= NAV_OFFSET && r.bottom <= window.innerHeight - 16;
}

const px = (n: number) => `${Math.round(n)}px`;

const OnboardingTour: React.FC = () => {
  const ob = useOnboarding();
  const { account, isBusinessUser } = useBusiness();
  const location = useLocation();
  const navigate = useNavigate();

  const brand = isBusinessUser ? account?.primary_color || '#1a1a2e' : '#2E7D32';
  const inApp = isAppArea(location.pathname);
  const step = ob.active && ob.tour ? ob.tour.steps[ob.stepIndex] : null;
  const total = ob.tour?.steps.length ?? 0;

  // `ready` : la cible est trouvée et immobile (fin du défilement) → on affiche en fondu
  const [ready, setReady] = useState(false);
  const [hasSpot, setHasSpot] = useState(false);

  const targetRef = useRef<HTMLElement | null>(null);
  const settlingRef = useRef(false);
  const spotRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const blockerRefs = useRef<(HTMLDivElement | null)[]>([]);

  const navigatedFor = useRef<number | null>(null);
  useEffect(() => { if (!ob.active) navigatedFor.current = null; }, [ob.active]);

  // Navigation vers la page de l'étape (une seule fois par étape, pour ne pas boucler
  // si la page redirige ailleurs, ex. abonnement requis)
  useEffect(() => {
    if (!step || location.pathname === step.route || navigatedFor.current === ob.stepIndex) return;
    navigatedFor.current = ob.stepIndex;
    navigate(step.route);
  }, [step, ob.stepIndex, location.pathname, navigate]);

  // Recherche de l'élément ciblé (il peut apparaître après le chargement des données)
  useEffect(() => {
    targetRef.current = null;
    settlingRef.current = false;
    setReady(false);
    setHasSpot(false);
    if (!step) return;
    if (location.pathname !== step.route) {
      // En attente de la navigation ; si elle n'aboutit pas, on affiche l'étape au centre
      const t = window.setTimeout(() => setReady(true), 1500);
      return () => window.clearTimeout(t);
    }
    if (!step.target) {
      setReady(true);
      return;
    }
    const attach = (el: HTMLElement) => {
      targetRef.current = el;
      settlingRef.current = true; // la boucle d'animation passera `ready` à true une fois immobile
      if (!isFullyVisible(el)) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    const found = findVisible(step.target);
    if (found) { attach(found); return; }
    let tries = 0;
    const timer = window.setInterval(() => {
      const el = findVisible(step.target!);
      if (el) { window.clearInterval(timer); attach(el); }
      else if (++tries > 60) { window.clearInterval(timer); setReady(true); }
    }, 50);
    return () => window.clearInterval(timer);
  }, [step, location.pathname]);

  // Boucle de positionnement : écrit directement dans le DOM à chaque frame,
  // sans transition CSS, pour que le rectangle colle à l'élément pendant le défilement.
  useEffect(() => {
    if (!step) return;
    let raf = 0;
    let last = '';
    let stableFrames = 0;
    const loop = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const el = targetRef.current;
      const r = el && el.isConnected ? el.getBoundingClientRect() : null;

      if (r && settlingRef.current) {
        const key = `${r.top}|${r.left}|${r.width}|${r.height}`;
        stableFrames = key === last ? stableFrames + 1 : 0;
        last = key;
        if (stableFrames >= 3) {
          settlingRef.current = false;
          setHasSpot(true);
          setReady(true);
        }
      }

      const spot = r ? {
        top: r.top - PADDING,
        left: r.left - PADDING,
        width: r.width + PADDING * 2,
        height: r.height + PADDING * 2,
      } : null;

      for (const node of [spotRef.current, pulseRef.current]) {
        if (node && spot) {
          node.style.top = px(spot.top);
          node.style.left = px(spot.left);
          node.style.width = px(spot.width);
          node.style.height = px(spot.height);
        }
      }

      const [bTop, bBottom, bLeft, bRight] = blockerRefs.current;
      if (spot && bTop && bBottom && bLeft && bRight) {
        bTop.style.height = px(Math.max(0, spot.top));
        bBottom.style.top = px(spot.top + spot.height);
        bLeft.style.top = bRight.style.top = px(spot.top);
        bLeft.style.height = bRight.style.height = px(spot.height);
        bLeft.style.width = px(Math.max(0, spot.left));
        bRight.style.left = px(spot.left + spot.width);
      }

      const card = cardRef.current;
      if (card) {
        const cw = Math.min(CARD_WIDTH, vw - 32);
        const ch = card.offsetHeight;
        card.style.width = px(cw);
        let top: number | null;
        let left: number;
        let bottom: number | null = null;
        if (!spot) {
          top = Math.max(16, (vh - ch) / 2);
          left = (vw - cw) / 2;
        } else if (vw < 640) {
          // Mobile : carte ancrée en bas, ou en haut si la cible est dans la moitié basse
          left = 16;
          if (spot.top + spot.height / 2 > vh / 2) top = 16;
          else { top = null; bottom = 16; }
        } else {
          const below = spot.top + spot.height + GAP;
          const above = spot.top - GAP - ch;
          top = below + ch <= vh - 16 ? below : above >= 16 ? above : Math.max(16, vh - ch - 16);
          left = Math.min(Math.max(16, spot.left + spot.width / 2 - cw / 2), vw - cw - 16);
        }
        card.style.top = top === null ? 'auto' : px(top);
        card.style.bottom = bottom === null ? 'auto' : px(bottom);
        card.style.left = px(left);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  // Étapes « action » : c'est l'utilisateur qui clique sur l'élément mis en avant.
  // Écoute en phase de capture pour avancer avant que le clic ne déclenche la navigation.
  useEffect(() => {
    if (!step || step.action !== 'click') return;
    const onClick = (e: MouseEvent) => {
      const el = targetRef.current;
      if (el && e.target instanceof Node && el.contains(e.target)) ob.next();
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [step, ob]);

  // Clavier : Échap pour quitter, flèches pour naviguer
  useEffect(() => {
    if (!step) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ob.pause();
      else if (e.key === 'ArrowRight') ob.next();
      else if (e.key === 'ArrowLeft') ob.prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, ob]);

  if (!ob.ready || !ob.tour) return null;

  // ── Invitation (bienvenue ou reprise) quand la visite n'est pas en cours ──
  if (!ob.active) {
    if (!inApp || ob.dismissedForSession) return null;
    const status = ob.record?.status;
    if (status === 'completed' || status === 'skipped') return null;

    if (status === 'in_progress') {
      return createPortal(
        <div className="fixed bottom-5 right-5 z-[90] max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl border border-[#E7E7EA] shadow-[0_12px_40px_rgba(16,24,40,0.16)] p-4 flex items-center gap-3 w-[340px]">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: brand }}>
            <Compass size={18} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#18181B]">Visite guidée en pause</p>
            <p className="text-xs text-[#71717A]">Étape {ob.resumeIndex + 1} sur {total}</p>
          </div>
          <button
            onClick={() => ob.start()}
            className="h-9 px-3 rounded-[10px] text-xs font-semibold text-white shrink-0"
            style={{ background: brand }}
          >
            Reprendre
          </button>
          <button onClick={ob.dismissForSession} aria-label="Masquer" className="p-1 text-[#71717A] hover:text-[#18181B] shrink-0">
            <X size={16} />
          </button>
        </div>,
        document.body,
      );
    }

    // Jamais commencée : proposition de visite
    return createPortal(
      <div className="fixed inset-0 z-[90] bg-black/50 flex items-end sm:items-center justify-center p-4">
        <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4" style={{ background: brand }}>
            <Compass size={22} />
          </span>
          <h2 className="text-lg font-bold text-[#18181B]">{ob.tour.label}</h2>
          <p className="text-sm text-[#71717A] mt-1.5 leading-relaxed">
            Découvrez votre espace en {total} étapes, environ 2 minutes. La visite est facultative :
            vous pouvez l'interrompre à tout moment et la reprendre là où vous vous êtes arrêté.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => ob.start({ restart: true })}
              className="h-11 px-5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 sm:flex-1"
              style={{ background: brand }}
            >
              <PlayCircle size={16} /> Commencer la visite
            </button>
            <button
              onClick={ob.dismissForSession}
              className="h-11 px-4 rounded-xl text-sm font-semibold text-[#18181B] border border-[#E7E7EA] hover:bg-zinc-50"
            >
              Plus tard
            </button>
          </div>
          <button onClick={ob.skip} className="mt-3 w-full text-xs text-[#71717A] hover:text-[#18181B] hover:underline">
            Ne plus me proposer (accessible depuis le menu de votre compte)
          </button>
        </div>
      </div>,
      document.body,
    );
  }

  if (!step) return null;

  // ── Visite en cours ──
  const isLast = ob.stepIndex === total - 1;
  const showSpot = ready && hasSpot;
  // Étape interactive seulement si la cible est bien affichée ; sinon on retombe sur « Suivant »
  const waitsForClick = step.action === 'click' && showSpot;
  const fade = 'transition-opacity duration-200 ease-out';

  return createPortal(
    <div className="fixed inset-0 z-[100] pointer-events-none" aria-live="polite">
      {/* Bloque les clics sur la page ; pour une étape interactive, la zone mise en avant reste cliquable */}
      {waitsForClick ? (
        <>
          <div ref={n => { blockerRefs.current[0] = n; }} className="absolute left-0 right-0 top-0 pointer-events-auto" />
          <div ref={n => { blockerRefs.current[1] = n; }} className="absolute left-0 right-0 bottom-0 pointer-events-auto" />
          <div ref={n => { blockerRefs.current[2] = n; }} className="absolute left-0 pointer-events-auto" />
          <div ref={n => { blockerRefs.current[3] = n; }} className="absolute right-0 pointer-events-auto" />
        </>
      ) : (
        <div className="absolute inset-0 pointer-events-auto" />
      )}

      {/* Voile plein écran (entre deux étapes ou étape sans cible) */}
      <div className={`absolute inset-0 bg-[rgba(15,15,20,0.6)] ${fade}`} style={{ opacity: showSpot ? 0 : 1 }} />

      {/* Découpe autour de la cible */}
      <div
        ref={spotRef}
        className={`absolute rounded-xl ${fade}`}
        style={{
          opacity: showSpot ? 1 : 0,
          boxShadow: `0 0 0 3px ${brand}, 0 0 0 9999px rgba(15, 15, 20, 0.6)`,
        }}
      />
      {waitsForClick && (
        <div ref={pulseRef} className="absolute rounded-xl animate-ping" style={{ top: -9999, boxShadow: `0 0 0 3px ${brand}` }} />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-label={step.title}
        className={`absolute bg-white rounded-2xl shadow-2xl p-5 transition-[opacity,transform] duration-200 ease-out ${ready ? 'pointer-events-auto' : ''}`}
        style={{ opacity: ready ? 1 : 0, transform: ready ? 'translateY(0)' : 'translateY(6px)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: brand }}>
            Étape {ob.stepIndex + 1} / {total}
          </p>
          <button onClick={ob.pause} aria-label="Quitter la visite" title="Quitter (vous pourrez reprendre plus tard)" className="-mt-1 -mr-1 p-1 text-[#71717A] hover:text-[#18181B]">
            <X size={16} />
          </button>
        </div>
        <h3 className="text-base font-bold text-[#18181B] mt-1">{step.title}</h3>
        <p className="text-sm text-[#52525B] mt-1.5 leading-relaxed">{step.content}</p>
        {waitsForClick && (
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold rounded-xl px-3 py-2" style={{ color: brand, background: `${brand}14` }}>
            <MousePointerClick size={16} className="shrink-0" />
            {step.hint || "Cliquez sur l'élément en surbrillance"}
          </p>
        )}

        <div className="mt-4 h-1 rounded-full bg-zinc-100 overflow-hidden">
          <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${((ob.stepIndex + 1) / total) * 100}%`, background: brand }} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button onClick={isLast ? ob.finish : ob.pause} className="text-xs text-[#71717A] hover:text-[#18181B] hover:underline">
            {isLast ? 'Fermer' : 'Plus tard'}
          </button>
          <div className="flex items-center gap-2">
            {ob.stepIndex > 0 && (
              <button
                onClick={ob.prev}
                className="h-9 px-3 rounded-[10px] text-sm font-semibold text-[#18181B] border border-[#E7E7EA] hover:bg-zinc-50 flex items-center gap-1"
              >
                <ArrowLeft size={14} /> Précédent
              </button>
            )}
            {waitsForClick ? (
              <button onClick={ob.next} className="h-9 px-3 text-xs text-[#71717A] hover:text-[#18181B] hover:underline">
                Passer
              </button>
            ) : (
              <button
                onClick={ob.next}
                className="h-9 px-4 rounded-[10px] text-sm font-semibold text-white flex items-center gap-1"
                style={{ background: brand }}
              >
                {isLast ? 'Terminer' : <>Suivant <ArrowRight size={14} /></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default OnboardingTour;
