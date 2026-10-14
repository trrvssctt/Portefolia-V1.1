import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Upload, Check, AlertTriangle, ShoppingBag, ImageIcon } from 'lucide-react';
import { NFC_API_BASE, formatFcfa } from '@/hooks/useNfcConfig';
import { FINISHES, type FinishId } from '@/components/nfc3d/drawCard';
import {
  TEMPLATES, drawLogoFace, drawInfoFace, newFaceCanvas, toPrintCanvas, toPreviewCanvas, canvasToPng, loadImage, paletteFor,
  type TemplateId, type CardColors, type PrintedInfo, type DesignChoice,
} from '@/components/nfc/cardDesign';

interface OfferOptions {
  print_faces: 'info' | 'both';
  allow_templates: boolean;
  allow_colors: boolean;
  allow_photo: boolean;
  allow_logo: boolean;
  allow_notes: boolean;
  needs_design: boolean;
  features: string[];
}
interface Offer { code: string; name: string; tagline: string | null; price: number | null; is_quote: boolean; available: boolean; options: OfferOptions }
interface Portfolio { id: number; titre: string; url_slug: string; est_public: number }

const inputCls = 'w-full h-11 px-4 rounded-xl border border-gray-200 bg-[#FAFAFA] text-sm outline-none focus:border-[#2E7D32]';
const DEFAULT_COLORS: CardColors = { bg: '#1f2024', text: '#f4f4f5', accent: '#4cc12a' };

function authHeaders(): Record<string, string> {
  const t = localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
        <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center" style={{ background: '#2E7D32' }}>{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// Envoi d'une photo ou d'un logo : aperçu local immédiat, URL Cloudinary pour la commande
function AssetPicker({ kind, label, hint, onReady }: {
  kind: 'photo' | 'logo'; label: string; hint: string;
  onReady: (v: { localUrl: string; url: string } | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const accept = kind === 'logo' ? 'image/png,image/svg+xml,.svg' : 'image/jpeg,image/png,image/webp';

  const pick = async (f?: File) => {
    if (!f) return;
    setName(f.name);
    setState('uploading');
    setError('');
    const localUrl = URL.createObjectURL(f);
    try {
      const form = new FormData();
      form.append('kind', kind);
      form.append('file', f);
      const res = await fetch(`${NFC_API_BASE}/api/nfc/orders/assets`, { method: 'POST', headers: authHeaders(), body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Envoi impossible.');
      setState('done');
      onReady({ localUrl, url: data.url });
    } catch (e) {
      setState('error');
      setError((e as Error).message);
      onReady(null);
    } finally {
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <Field label={label} hint={hint}>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <button type="button" onClick={() => ref.current?.click()} disabled={state === 'uploading'}
        className="w-full h-11 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#2E7D32] text-sm text-gray-600 flex items-center justify-center gap-2">
        {state === 'uploading' ? <Loader2 size={15} className="animate-spin" /> : state === 'done' ? <Check size={15} className="text-[#2E7D32]" /> : <Upload size={15} />}
        {state === 'done' ? name : state === 'uploading' ? 'Envoi…' : `Choisir ${kind === 'logo' ? 'le logo' : 'la photo'}`}
      </button>
      {state === 'error' && <p role="alert" className="text-xs text-red-600 mt-1">{error}</p>}
    </Field>
  );
}

export default function NfcOrderPage() {
  const { offer: offerCode = 'standard' } = useParams();
  const navigate = useNavigate();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [maxQty, setMaxQty] = useState(5);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [info, setInfo] = useState<PrintedInfo>({ name: '', title: '', phone: '', email: '', profile_url: '' });
  const [portfolioId, setPortfolioId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [city, setCity] = useState('');
  const [template, setTemplate] = useState<TemplateId>('classique');
  const [finish, setFinish] = useState<FinishId>('noir');
  const [customColors, setCustomColors] = useState(false);
  const [colors, setColors] = useState<CardColors>(DEFAULT_COLORS);
  const [photo, setPhoto] = useState<{ localUrl: string; url: string } | null>(null);
  const [logo, setLogo] = useState<{ localUrl: string; url: string } | null>(null);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [errorLink, setErrorLink] = useState(false);

  // Images utilisées par le rendu
  const [imgs, setImgs] = useState<{ portefoliaLogo: HTMLImageElement | null; mark: HTMLImageElement | null; photo: HTMLImageElement | null; clientLogo: HTMLImageElement | null }>({ portefoliaLogo: null, mark: null, photo: null, clientLogo: null });
  const [fontsReady, setFontsReady] = useState(false);
  const logoFace = useMemo(newFaceCanvas, []);
  const infoFace = useMemo(newFaceCanvas, []);
  const logoView = useRef<HTMLCanvasElement>(null);
  const infoView = useRef<HTMLCanvasElement>(null);

  // Chargement : compte obligatoire
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate(`/auth?redirect=${encodeURIComponent(`/nfc/commander/${offerCode}`)}`, { replace: true });
      return;
    }
    (async () => {
      try {
        const [offersRes, meRes, cardsRes] = await Promise.all([
          fetch(`${NFC_API_BASE}/api/nfc/offers`),
          fetch(`${NFC_API_BASE}/api/users/me`, { headers: authHeaders() }),
          fetch(`${NFC_API_BASE}/api/nfc/cards/mine`, { headers: authHeaders() }),
        ]);
        if (meRes.status === 401 || cardsRes.status === 401) {
          navigate(`/auth?redirect=${encodeURIComponent(`/nfc/commander/${offerCode}`)}`, { replace: true });
          return;
        }
        const offersJson = await offersRes.json();
        const o: Offer | undefined = (offersJson.offers || []).find((x: Offer) => x.code === offerCode);
        if (!o) { setLoadError('Cette offre n\'existe pas ou n\'est plus proposée.'); return; }
        if (o.is_quote) { navigate('/nfc/devis', { replace: true }); return; }
        setOffer(o);
        setMaxQty(offersJson.max_quantity || 5);
        const me = (await meRes.json()).user || {};
        const cardsJson = await cardsRes.json();
        const pf: Portfolio[] = cardsJson.portfolios || [];
        setPortfolios(pf);
        const first = pf.find((p) => p.est_public) || pf[0];
        if (first) setPortfolioId(first.id);
        setInfo((prev) => ({
          ...prev,
          name: [me.prenom, me.nom].filter(Boolean).join(' '),
          email: me.email || '',
          phone: me.phone || '',
        }));
      } catch {
        setLoadError('Chargement impossible. Vérifiez votre connexion et réessayez.');
      } finally {
        setLoading(false);
      }
    })();
  }, [offerCode, navigate]);

  useEffect(() => {
    Promise.all([loadImage('/nfc-card/logo-portefolia.webp').catch(() => null), loadImage('/nfc-card/logo-p.webp').catch(() => null)])
      .then(([portefoliaLogo, mark]) => setImgs((i) => ({ ...i, portefoliaLogo, mark })));
    const fonts = document.fonts as FontFaceSet | undefined;
    if (!fonts?.load) { setFontsReady(true); return; }
    Promise.all([fonts.load('800 136px Inter'), fonts.load('600 72px Inter'), fonts.load('400 60px Inter')])
      .catch(() => {}).finally(() => setFontsReady(true));
  }, []);

  useEffect(() => { if (photo) loadImage(photo.localUrl).then((p) => setImgs((i) => ({ ...i, photo: p }))).catch(() => {}); else setImgs((i) => ({ ...i, photo: null })); }, [photo]);
  useEffect(() => { if (logo) loadImage(logo.localUrl).then((l) => setImgs((i) => ({ ...i, clientLogo: l }))).catch(() => {}); else setImgs((i) => ({ ...i, clientLogo: null })); }, [logo]);

  const slug = portfolios.find((p) => p.id === portfolioId)?.url_slug || '';
  const printedInfo: PrintedInfo = { ...info, profile_url: slug ? `portefolia.tech/portfolio/${slug}` : '' };
  const opts = offer?.options;
  const design: DesignChoice = {
    template: opts?.allow_templates ? template : 'classique',
    finish,
    colors: opts?.allow_colors && customColors ? colors : null,
  };

  // Redessine l'aperçu à chaque changement
  useEffect(() => {
    if (!offer) return;
    const l = logoFace.getContext('2d');
    const v = infoFace.getContext('2d');
    if (!l || !v) return;
    drawLogoFace(l, offer.code, design, imgs);
    drawInfoFace(v, offer.code, design, printedInfo, imgs);
    for (const [view, face] of [[logoView.current, logoFace], [infoView.current, infoFace]] as const) {
      if (!view) continue;
      const ctx = view.getContext('2d');
      if (ctx) { ctx.clearRect(0, 0, view.width, view.height); ctx.drawImage(face, 0, 0, view.width, view.height); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer, imgs, fontsReady, JSON.stringify(design), JSON.stringify(printedInfo)]);

  const submit = async () => {
    if (!offer || submitting) return;
    setError('');
    setErrorLink(false);
    if (!portfolioId) { setError('Choisissez le portfolio que la carte ouvrira.'); return; }
    if (opts?.allow_logo && !logo) { setError('Ajoutez votre logo.'); return; }
    if (design.template === 'photo' && !photo) { setError('Ajoutez votre photo pour le gabarit « Photo ».'); return; }
    setSubmitting(true);
    try {
      const palette = paletteFor(design);
      const logoPrintPalette = offer.options.print_faces === 'both' ? palette : null;
      const [pf, pb, prf, prb] = await Promise.all([
        canvasToPng(toPreviewCanvas(logoFace)),
        canvasToPng(toPreviewCanvas(infoFace)),
        canvasToPng(toPrintCanvas(logoFace, logoPrintPalette)),
        canvasToPng(toPrintCanvas(infoFace, palette)),
      ]);
      const form = new FormData();
      form.append('offer_code', offer.code);
      form.append('quantity', String(quantity));
      form.append('portfolio_id', String(portfolioId));
      form.append('city', city);
      form.append('info', JSON.stringify({ name: info.name, title: info.title, phone: info.phone, email: info.email }));
      form.append('design', JSON.stringify({
        ...design,
        photo_url: photo?.url || undefined,
        logo_url: logo?.url || undefined,
        notes: notes || undefined,
      }));
      form.append('preview_front', pf, 'preview_front.png');
      form.append('preview_back', pb, 'preview_back.png');
      form.append('print_front', prf, 'print_front.png');
      form.append('print_back', prb, 'print_back.png');
      const res = await fetch(`${NFC_API_BASE}/api/nfc/orders`, { method: 'POST', headers: authHeaders(), body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Commande impossible, réessayez.');
        setErrorLink(res.status === 409 && !!data?.reference);
        return;
      }
      navigate(`/nfc/precommande/${encodeURIComponent(data.reference)}?t=${data.token}`);
    } catch {
      setError('Connexion impossible. Vérifiez votre réseau et réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F9F9F9]"><Loader2 size={28} className="animate-spin text-[#2E7D32]" /></div>;
  }

  if (loadError || !offer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F9F9] p-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center max-w-sm space-y-3">
          <AlertTriangle className="mx-auto text-amber-500" />
          <p className="text-sm text-gray-700">{loadError || 'Offre introuvable.'}</p>
          <Link to="/nfc-types" className="text-sm font-semibold text-[#2E7D32]">Voir les offres</Link>
        </div>
      </div>
    );
  }

  const total = (offer.price || 0) * quantity;

  return (
    <div className="min-h-screen" style={{ background: '#F9F9F9', fontFamily: 'Inter, sans-serif' }}>
      <header style={{ background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 60%, #1BC29A 100%)' }}>
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link to="/nfc-types" className="inline-flex items-center gap-1.5 text-white/75 hover:text-white text-sm mb-3"><ArrowLeft size={15} /> Toutes les offres</Link>
          <h1 className="text-2xl font-bold text-white">Carte {offer.name}</h1>
          <p className="text-white/80 text-sm">{offer.tagline} · {formatFcfa(offer.price || 0)} la carte</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-[1fr_440px] gap-6 items-start">
        <div className="space-y-4">
          {!offer.available && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Rupture de stock pour cette offre. <Link to="/nfc-types#liste-attente" className="font-semibold underline">Laissez-nous votre e-mail</Link> pour être prévenu(e) du retour des cartes.
            </div>
          )}

          <Section n={1} title="Informations imprimées">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nom sur la carte"><input className={inputCls} value={info.name} maxLength={80} onChange={(e) => setInfo({ ...info, name: e.target.value })} /></Field>
              <Field label="Poste / fonction"><input className={inputCls} value={info.title} maxLength={80} onChange={(e) => setInfo({ ...info, title: e.target.value })} placeholder="Développeuse web" /></Field>
              <Field label="Téléphone"><input className={inputCls} type="tel" value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} placeholder="77 123 45 67" /></Field>
              <Field label="E-mail"><input className={inputCls} type="email" value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} /></Field>
            </div>
            {portfolios.length === 0 ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
                Créez d'abord votre portfolio : c'est lui que la carte ouvrira. <Link to="/dashboard/portfolios" className="font-semibold underline">Créer mon portfolio</Link>
              </div>
            ) : (
              <Field label="Portfolio ouvert par la carte" hint="Modifiable à tout moment depuis votre espace, sans réimprimer la carte.">
                <select className={inputCls} value={portfolioId ?? ''} onChange={(e) => setPortfolioId(Number(e.target.value))}>
                  {portfolios.map((p) => <option key={p.id} value={p.id}>{p.titre || p.url_slug}{p.est_public ? '' : ' (privé)'}</option>)}
                </select>
              </Field>
            )}
          </Section>

          {(opts?.allow_templates || opts?.allow_colors || opts?.allow_photo || opts?.allow_logo) && (
            <Section n={2} title="Personnalisation">
              {opts?.allow_logo && (
                <AssetPicker kind="logo" label="Votre logo" hint="PNG d'au moins 1000 px de large (fond transparent) ou SVG." onReady={setLogo} />
              )}
              {opts?.allow_templates && (
                <Field label="Gabarit de la face infos">
                  <div className="grid grid-cols-3 gap-2">
                    {TEMPLATES.map((t) => (
                      <button key={t.id} type="button" onClick={() => setTemplate(t.id)}
                        className="rounded-xl border p-3 text-left"
                        style={template === t.id ? { borderColor: '#2E7D32', background: '#F0FFF4' } : { borderColor: '#E5E7EB' }}>
                        <p className="text-sm font-semibold text-gray-900">{t.label}</p>
                        <p className="text-[11px] text-gray-500">{t.hint}</p>
                      </button>
                    ))}
                  </div>
                </Field>
              )}
              {opts?.allow_photo && (
                <AssetPicker kind="photo" label={template === 'photo' ? 'Votre photo' : 'Votre photo (pour le gabarit « Photo »)'} hint="Photo nette, visage centré. JPG, PNG ou WebP." onReady={setPhoto} />
              )}
              {opts?.allow_colors && (
                <Field label="Couleurs">
                  <div className="flex flex-wrap gap-2">
                    {FINISHES.map((f) => (
                      <button key={f.id} type="button" onClick={() => { setFinish(f.id); setCustomColors(false); }}
                        className="h-9 px-3 rounded-full border text-xs font-semibold flex items-center gap-1.5"
                        style={!customColors && finish === f.id ? { borderColor: '#2E7D32', color: '#1B5E20' } : { borderColor: '#E5E7EB', color: '#374151' }}>
                        <span className="w-4 h-4 rounded-full border border-gray-300" style={{ background: f.swatch }} /> {f.label}
                      </button>
                    ))}
                    <button type="button" onClick={() => setCustomColors(true)}
                      className="h-9 px-3 rounded-full border text-xs font-semibold"
                      style={customColors ? { borderColor: '#2E7D32', color: '#1B5E20' } : { borderColor: '#E5E7EB', color: '#374151' }}>
                      Mes couleurs
                    </button>
                  </div>
                  {customColors && (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {(['bg', 'text', 'accent'] as const).map((k) => (
                        <label key={k} className="flex items-center gap-2 text-xs text-gray-700">
                          <input type="color" value={colors[k]} onChange={(e) => setColors({ ...colors, [k]: e.target.value })} className="w-9 h-9 rounded border border-gray-200" />
                          {{ bg: 'Fond', text: 'Texte', accent: 'Accent' }[k]}
                        </label>
                      ))}
                    </div>
                  )}
                </Field>
              )}
              {opts?.allow_notes && (
                <Field label="Notes pour notre designer (optionnel)" hint="Couleurs de votre charte, éléments à mettre en avant… Vous validerez un bon à tirer avant impression.">
                  <textarea rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-[#FAFAFA] text-sm outline-none focus:border-[#2E7D32] resize-none" />
                </Field>
              )}
            </Section>
          )}

          <Section n={opts?.allow_templates || opts?.allow_colors || opts?.allow_logo ? 3 : 2} title="Quantité et livraison">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nombre de cartes identiques">
                <select className={inputCls} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}>
                  {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} carte{n > 1 ? 's' : ''}</option>)}
                </select>
              </Field>
              <Field label="Ville (optionnel)"><input className={inputCls} value={city} maxLength={80} onChange={(e) => setCity(e.target.value)} placeholder="Dakar" /></Field>
            </div>
          </Section>
        </div>

        {/* Aperçu + récapitulatif */}
        <aside className="lg:sticky lg:top-4 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 flex items-center gap-1.5"><ImageIcon size={13} /> Aperçu de votre carte</p>
            <div>
              <canvas ref={logoView} width={1024} height={646} className="w-full rounded-xl shadow-md" />
              <p className="text-[11px] text-gray-400 mt-1 text-center">
                {offer.options.print_faces === 'info' ? 'Face logo (imprimée en usine)' : 'Face logo'}
              </p>
            </div>
            <div>
              <canvas ref={infoView} width={1024} height={646} className="w-full rounded-xl shadow-md" />
              <p className="text-[11px] text-gray-400 mt-1 text-center">Face infos</p>
            </div>
            {offer.options.needs_design && (
              <p className="text-[11px] text-gray-500 bg-gray-50 rounded-lg px-3 py-2">Aperçu indicatif : notre designer prépare le visuel final et vous l'envoie en bon à tirer pour validation.</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: '#F0FFF4' }}>
              <span className="text-sm text-gray-600">{quantity} × {formatFcfa(offer.price || 0)}</span>
              <span className="text-lg font-black" style={{ color: '#1B5E20' }}>{formatFcfa(total)}</span>
            </div>
            {error && (
              <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {error}{errorLink && <> <Link to="/dashboard/nfc-cards" className="font-semibold underline">Voir mes commandes</Link></>}
              </p>
            )}
            <button onClick={submit} disabled={submitting || !offer.available || portfolios.length === 0}
              className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #2E7D32, #1BC29A)' }}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShoppingBag size={16} />}
              Commander et payer avec Wave
            </button>
            <p className="text-[11px] text-center text-gray-400">Paiement Wave à l'étape suivante. Vérifiez bien l'orthographe : ces informations seront imprimées.</p>
          </div>
        </aside>
      </main>
    </div>
  );
}
