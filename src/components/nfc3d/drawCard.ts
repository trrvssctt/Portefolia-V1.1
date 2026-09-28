// Dessin des faces de la carte NFC sur <canvas>, utilisées comme textures 3D.
// Format ISO ID-1 : 85,6 × 54 mm → ratio 1,585.

export const CARD_W_MM = 85.6;
export const CARD_H_MM = 54;
export const TEX_W = 2048;
export const TEX_H = Math.round((TEX_W * CARD_H_MM) / CARD_W_MM); // 1292

export type CardInfo = {
  name: string;
  title: string;
  phone: string;
  email: string;
  slug: string;
};

export type FinishId = 'noir' | 'graphite' | 'blanc';

export type Finish = {
  id: FinishId;
  label: string;
  bg: [string, string];
  text: string;
  muted: string;
  accent: string;
  edge: string;
  swatch: string;
};

export const FINISHES: Finish[] = [
  { id: 'noir',     label: 'Noir mat', bg: ['#1f2024', '#121315'], text: '#f4f4f5', muted: '#a1a1aa', accent: '#4cc12a', edge: '#16181a', swatch: '#18191c' },
  { id: 'graphite', label: 'Graphite', bg: ['#343847', '#1d2029'], text: '#f4f4f5', muted: '#b4b7c2', accent: '#5ccf38', edge: '#23262f', swatch: '#2c303c' },
  { id: 'blanc',    label: 'Blanc',    bg: ['#fbfbf8', '#e8e9e3'], text: '#18181b', muted: '#52525b', accent: '#2E7D32', edge: '#d6d7d0', swatch: '#f3f3ef' },
];

export const PORTFOLIO_HOST = 'portefolia.tech/portfolio/';

const FONT = "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif";

function background(ctx: CanvasRenderingContext2D, f: Finish) {
  const g = ctx.createLinearGradient(0, 0, TEX_W, TEX_H);
  g.addColorStop(0, f.bg[0]);
  g.addColorStop(1, f.bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
}

// Pictogramme sans contact : un point + trois arcs
function contactless(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = size * 0.1;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.08, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(x, y, size * 0.2 * i + size * 0.05, -Math.PI / 3.2, Math.PI / 3.2);
    ctx.stroke();
  }
  ctx.restore();
}

// Écrit le texte en réduisant la police jusqu'à ce qu'il tienne dans maxW
function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, size: number, weight: number, minSize = size * 0.55) {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (s > minSize && ctx.measureText(text).width > maxW) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
  ctx.fillText(text, x, y, maxW);
}

export function drawRecto(ctx: CanvasRenderingContext2D, f: Finish, logo: HTMLImageElement | null) {
  background(ctx, f);
  if (logo && logo.complete && logo.naturalWidth) {
    const w = TEX_W * 0.46;
    const h = (w * logo.naturalHeight) / logo.naturalWidth;
    ctx.drawImage(logo, (TEX_W - w) / 2, (TEX_H - h) / 2 - 10, w, h);
  } else {
    ctx.fillStyle = f.accent;
    ctx.textAlign = 'center';
    ctx.font = `700 150px ${FONT}`;
    ctx.fillText('PORTEFOLIA', TEX_W / 2, TEX_H / 2 + 50);
    ctx.textAlign = 'left';
  }
  contactless(ctx, TEX_W - 150, 150, 150, f.muted);
}

export function drawVerso(ctx: CanvasRenderingContext2D, f: Finish, info: CardInfo, mark: HTMLImageElement | null) {
  background(ctx, f);
  const x = 170;
  const maxW = TEX_W - x - 420;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  if (mark && mark.complete && mark.naturalWidth) {
    const w = 210;
    const h = (w * mark.naturalHeight) / mark.naturalWidth;
    ctx.drawImage(mark, TEX_W - 170 - w, 120, w, h);
  }

  const name = info.name.trim() || 'Votre Nom';
  ctx.fillStyle = info.name.trim() ? f.text : f.muted;
  fitText(ctx, name, x, 500, maxW + 250, 136, 800);

  const title = info.title.trim();
  if (title) {
    ctx.fillStyle = f.accent;
    fitText(ctx, title, x, 610, maxW + 250, 72, 600);
  }
  ctx.fillStyle = f.accent;
  ctx.fillRect(x, title ? 650 : 555, 210, 8);

  const lines = [info.phone.trim(), info.email.trim(), info.slug ? PORTFOLIO_HOST + info.slug : ''].filter(Boolean);
  ctx.fillStyle = f.text;
  ctx.globalAlpha = 0.88;
  const top = title ? 790 : 700;
  lines.forEach((line, i) => fitText(ctx, line, x, top + i * 94, TEX_W - x - 170, 60, 400));
  ctx.globalAlpha = 1;

  contactless(ctx, x + 40, TEX_H - 110, 120, f.accent);
  ctx.fillStyle = f.muted;
  ctx.font = `400 54px ${FONT}`;
  ctx.fillText('Approchez votre téléphone', x + 140, TEX_H - 92);
}

export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

// Variante pour la saisie directe : garde le tiret final pendant qu'on tape
export function sanitizeSlugInput(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .slice(0, 40);
}
