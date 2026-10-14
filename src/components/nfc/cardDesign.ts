// Rendu des cartes commandées (aperçu, BAT et fichiers d'impression) à partir des choix du client.
// Format ISO ID-1 (85,6 × 54 mm). Les fichiers d'impression ajoutent 3 mm de fond perdu de chaque côté.
import {
  TEX_W, TEX_H, CARD_W_MM, CARD_H_MM, FINISHES, FONT,
  background, contactless, fitText, drawRecto,
  type Finish, type FinishId,
} from '@/components/nfc3d/drawCard';

export type TemplateId = 'classique' | 'moderne' | 'photo';

export const TEMPLATES: { id: TemplateId; label: string; hint: string }[] = [
  { id: 'classique', label: 'Classique', hint: 'Nom en grand, coordonnées alignées' },
  { id: 'moderne', label: 'Moderne', hint: 'Bandeau de couleur à gauche' },
  { id: 'photo', label: 'Photo', hint: 'Votre photo en médaillon' },
];

export interface CardColors { bg: string; text: string; accent: string }

export interface PrintedInfo {
  name: string;
  title: string;
  phone: string;
  email: string;
  profile_url: string; // « portefolia.tech/portfolio/mon-slug »
}

export interface DesignChoice {
  template: TemplateId;
  finish: FinishId;
  colors?: CardColors | null;
}

export interface DesignImages {
  portefoliaLogo: HTMLImageElement | null; // face logo imprimée en usine (Standard, Personnalisée)
  mark: HTMLImageElement | null;           // petit « P » Portefolia
  photo?: HTMLImageElement | null;
  clientLogo?: HTMLImageElement | null;    // Premium
}

export const PRINT_DPI = 600;
export const BLEED_MM = 3;
const mmToPx = (mm: number) => Math.round((mm / 25.4) * PRINT_DPI);

// ── Couleurs ──────────────────────────────────────────────────────────────────

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) * (1 + amount));
  const g = clamp(((n >> 8) & 255) * (1 + amount));
  const b = clamp((n & 255) * (1 + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

export function paletteFor(design: DesignChoice): Finish {
  const base = FINISHES.find((f) => f.id === design.finish) || FINISHES[0];
  if (!design.colors) return base;
  const { bg, text, accent } = design.colors;
  return {
    ...base,
    bg: [bg, shade(bg, -0.18)],
    text,
    muted: mix(text, bg, 0.4),
    accent,
    edge: shade(bg, -0.3),
    swatch: bg,
  };
}

// ── Faces ─────────────────────────────────────────────────────────────────────

// Face logo : logo Portefolia (usine) ou logo du client (Premium)
export function drawLogoFace(ctx: CanvasRenderingContext2D, offerCode: string, design: DesignChoice, imgs: DesignImages) {
  if (offerCode !== 'premium' && offerCode !== 'entreprise') {
    drawRecto(ctx, FINISHES[0], imgs.portefoliaLogo);
    return;
  }
  const p = paletteFor(design);
  background(ctx, p);
  const logo = imgs.clientLogo;
  if (logo && logo.complete && logo.naturalWidth) {
    const maxW = TEX_W * 0.55;
    const maxH = TEX_H * 0.5;
    const ratio = Math.min(maxW / logo.naturalWidth, maxH / logo.naturalHeight);
    const w = logo.naturalWidth * ratio;
    const h = logo.naturalHeight * ratio;
    ctx.drawImage(logo, (TEX_W - w) / 2, (TEX_H - h) / 2, w, h);
  } else {
    ctx.fillStyle = p.muted;
    ctx.textAlign = 'center';
    ctx.font = `600 90px ${FONT}`;
    ctx.fillText('Votre logo ici', TEX_W / 2, TEX_H / 2 + 30);
    ctx.textAlign = 'left';
  }
  contactless(ctx, TEX_W - 150, 150, 150, p.muted);
}

function textBlock(ctx: CanvasRenderingContext2D, p: Finish, info: PrintedInfo, x: number, maxW: number, compact = false) {
  const name = info.name.trim() || 'Votre Nom';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = info.name.trim() ? p.text : p.muted;
  fitText(ctx, name, x, compact ? 460 : 500, maxW, compact ? 118 : 136, 800);
  const title = info.title.trim();
  if (title) {
    ctx.fillStyle = p.accent;
    fitText(ctx, title, x, compact ? 560 : 610, maxW, compact ? 64 : 72, 600);
  }
  ctx.fillStyle = p.accent;
  ctx.fillRect(x, title ? (compact ? 600 : 650) : 555, 210, 8);
  const lines = [info.phone.trim(), info.email.trim(), info.profile_url.trim()].filter(Boolean);
  ctx.fillStyle = p.text;
  ctx.globalAlpha = 0.88;
  const top = title ? (compact ? 730 : 790) : 700;
  lines.forEach((line, i) => fitText(ctx, line, x, top + i * (compact ? 86 : 94), maxW, compact ? 54 : 60, 400));
  ctx.globalAlpha = 1;
}

function footer(ctx: CanvasRenderingContext2D, p: Finish, x: number) {
  contactless(ctx, x + 40, TEX_H - 110, 120, p.accent);
  ctx.fillStyle = p.muted;
  ctx.font = `400 54px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('Approchez votre téléphone', x + 140, TEX_H - 92);
}

function cornerMark(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null | undefined, maxW = 210) {
  if (!img || !img.complete || !img.naturalWidth) return;
  const h = (maxW * img.naturalHeight) / img.naturalWidth;
  const hh = Math.min(h, 200);
  const ww = (hh * img.naturalWidth) / img.naturalHeight;
  ctx.drawImage(img, TEX_W - 170 - ww, 120, ww, hh);
}

// Face infos : gabarit classique, moderne ou photo
export function drawInfoFace(ctx: CanvasRenderingContext2D, offerCode: string, design: DesignChoice, info: PrintedInfo, imgs: DesignImages) {
  const p = paletteFor(design);
  background(ctx, p);
  // Premium / Entreprise : le logo du client remplace le « P » Portefolia
  const corner = offerCode === 'premium' || offerCode === 'entreprise' ? imgs.clientLogo : imgs.mark;

  if (design.template === 'moderne') {
    const band = Math.round(TEX_W * 0.3);
    ctx.fillStyle = p.accent;
    ctx.fillRect(0, 0, band, TEX_H);
    const initials = (info.name.trim() || 'VN').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    ctx.fillStyle = p.bg[0];
    ctx.textAlign = 'center';
    ctx.font = `800 260px ${FONT}`;
    ctx.fillText(initials, band / 2, TEX_H / 2 + 90);
    ctx.textAlign = 'left';
    cornerMark(ctx, corner, 180);
    textBlock(ctx, p, info, band + 130, TEX_W - band - 300, true);
    footer(ctx, p, band + 90);
    return;
  }

  if (design.template === 'photo') {
    const r = 300;
    const cx = 170 + r;
    const cy = TEX_H / 2 - 40;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = p.muted;
    ctx.fill();
    const photo = imgs.photo;
    if (photo && photo.complete && photo.naturalWidth) {
      ctx.clip();
      // Recadrage carré centré
      const side = Math.min(photo.naturalWidth, photo.naturalHeight);
      ctx.drawImage(photo, (photo.naturalWidth - side) / 2, (photo.naturalHeight - side) / 2, side, side, cx - r, cy - r, r * 2, r * 2);
    }
    ctx.restore();
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 7, 0, Math.PI * 2);
    ctx.stroke();
    cornerMark(ctx, corner, 180);
    const x = cx + r + 110;
    textBlock(ctx, p, info, x, TEX_W - x - 150, true);
    footer(ctx, p, x - 40);
    return;
  }

  // Classique
  cornerMark(ctx, corner);
  textBlock(ctx, p, info, 170, TEX_W - 170 - 170);
  footer(ctx, p, 170);
}

// ── Sorties ───────────────────────────────────────────────────────────────────

export function newFaceCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = TEX_W;
  c.height = TEX_H;
  return c;
}

// Fichier d'impression : 600 dpi, 3 mm de fond perdu (le fond de la carte est prolongé)
export function toPrintCanvas(face: HTMLCanvasElement, bleedPalette: Finish | null): HTMLCanvasElement {
  const bleed = mmToPx(BLEED_MM);
  const w = mmToPx(CARD_W_MM);
  const h = mmToPx(CARD_H_MM);
  const out = document.createElement('canvas');
  out.width = w + bleed * 2;
  out.height = h + bleed * 2;
  const ctx = out.getContext('2d')!;
  if (bleedPalette) {
    const g = ctx.createLinearGradient(0, 0, out.width, out.height);
    g.addColorStop(0, bleedPalette.bg[0]);
    g.addColorStop(1, bleedPalette.bg[1]);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = '#ffffff';
  }
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(face, bleed, bleed, w, h);
  return out;
}

export function toPreviewCanvas(face: HTMLCanvasElement, width = 1024): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = width;
  out.height = Math.round((width * TEX_H) / TEX_W);
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(face, 0, 0, out.width, out.height);
  return out;
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Rendu impossible'))), 'image/png');
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image illisible'));
    img.src = src;
  });
}
