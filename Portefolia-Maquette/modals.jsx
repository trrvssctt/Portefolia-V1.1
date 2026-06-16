// modals.jsx — unified modal system. window.ModalShell, window.ModalRoot
const { useState: useS } = React;

// ── Shared shell ───────────────────────────────────────────────
// size: 'sm' | 'md' | 'lg'  ·  tone: 'accent' | 'danger' | 'wave'
function ModalShell({ icon, title, subtitle, tone = 'accent', size = 'md', onClose, children, footer }) {
  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-3xl' };
  const tones = {
    accent: { bg: 'var(--accent-tint)', fg: 'var(--accent-600)' },
    danger: { bg: '#FEE2E2', fg: '#DC2626' },
    wave: { bg: '#E0F2FE', fg: '#0284C7' },
  };
  const tn = tones[tone] || tones.accent;
  return (
    <div className="modal-overlay fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(16,24,40,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal-card bg-white w-full ${widths[size]} sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[94vh] sm:max-h-[90vh] overflow-hidden`}>
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-line shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {icon && <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: tn.bg, color: tn.fg }}><Icon name={icon} size={18} /></span>}
            <div className="min-w-0">
              <h2 className="font-semibold text-ink text-sm leading-tight">{title}</h2>
              {subtitle && <p className="text-xs text-muted mt-0.5 truncate">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-zinc-100 transition-colors shrink-0"><Icon name="x" size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-line shrink-0 flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

const btnGhost = "h-10 px-4 rounded-[10px] border border-line text-sm font-medium text-ink hover:bg-zinc-50 transition-colors";
const btnPrimary = "h-10 px-5 rounded-[10px] text-sm font-semibold text-white transition-colors flex items-center gap-1.5";

// ── Confirmation (destructive / generic) ───────────────────────
function ConfirmModal({ title, message, detail, confirmLabel = 'Confirmer', tone = 'danger', icon = 'trash', onClose, onConfirm }) {
  const accent = tone === 'danger' ? '#DC2626' : 'var(--accent)';
  return (
    <ModalShell icon={icon} title={title} tone={tone} size="sm" onClose={onClose}
      footer={<React.Fragment>
        <button onClick={onClose} className={btnGhost}>Annuler</button>
        <button onClick={() => { onConfirm && onConfirm(); onClose(); }} className={btnPrimary} style={{ background: accent }}>
          <Icon name={icon} size={15} /> {confirmLabel}
        </button>
      </React.Fragment>}>
      <p className="text-sm text-ink/75 leading-relaxed">{message}</p>
      {detail && (
        <div className="mt-4 rounded-xl border border-line bg-zinc-50 px-4 py-3 text-sm">
          {detail}
        </div>
      )}
      {tone === 'danger' && <p className="mt-4 text-xs text-muted flex items-center gap-1.5"><Icon name="shield" size={13} /> Cette action est irréversible.</p>}
    </ModalShell>
  );
}

// ── Share portfolio ────────────────────────────────────────────
function ShareModal({ portfolio, onClose }) {
  const p = portfolio || { title: 'Awa Ndiaye', slug: 'awa-ndiaye' };
  const url = `portefolia.tech/${p.slug}`;
  const [copied, setCopied] = useS(false);
  const socials = [
    { key: 'linkedin', label: 'LinkedIn', icon: 'linkedin' },
    { key: 'twitter', label: 'X', icon: 'twitter' },
    { key: 'mail', label: 'Email', icon: 'mail' },
    { key: 'phone', label: 'WhatsApp', icon: 'phone' },
  ];
  return (
    <ModalShell icon="share" title="Partager le portfolio" subtitle={p.title} onClose={onClose}>
      {/* QR */}
      <div className="flex flex-col items-center">
        <div className="w-40 h-40 rounded-2xl border border-line p-3 bg-white">
          <div className="w-full h-full rounded-lg grid place-items-center" style={{
            background: 'conic-gradient(from 0deg, #18181B 0 25%, transparent 0 50%, #18181B 0 75%, transparent 0)',
            backgroundSize: '14px 14px', backgroundColor: '#fff' }}>
            <span className="w-12 h-12 rounded-lg flex items-center justify-center text-white" style={{ background: 'var(--accent)' }}><Icon name="layout" size={22} stroke={2.2} /></span>
          </div>
        </div>
        <p className="text-xs text-muted mt-3 flex items-center gap-1.5"><Icon name="qr" size={13} /> Scannez pour ouvrir le portfolio</p>
      </div>
      {/* Link */}
      <div className="mt-6">
        <label className="text-xs font-semibold text-muted uppercase tracking-wide">Lien public</label>
        <div className="mt-1.5 flex gap-2">
          <div className="flex-1 h-11 px-3.5 rounded-xl border border-line bg-zinc-50 flex items-center text-sm text-ink font-mono truncate">{url}</div>
          <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }}
            className={btnPrimary + ' shrink-0'} style={{ background: copied ? 'var(--accent-600)' : 'var(--accent)' }}>
            <Icon name={copied ? 'check' : 'copy'} size={15} /> {copied ? 'Copié' : 'Copier'}
          </button>
        </div>
      </div>
      {/* Socials */}
      <div className="mt-6">
        <label className="text-xs font-semibold text-muted uppercase tracking-wide">Partager via</label>
        <div className="grid grid-cols-4 gap-2.5 mt-2.5">
          {socials.map(s => (
            <button key={s.key} className="flex flex-col items-center gap-2 py-3.5 rounded-xl border border-line hover:bg-zinc-50 hover:border-ink/20 transition-colors">
              <Icon name={s.icon} size={20} className="text-ink/70" />
              <span className="text-xs font-medium text-ink/70">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}

// ── Order NFC card ─────────────────────────────────────────────
function OrderNFCModal({ go, onClose }) {
  const d = window.DATA;
  const portfolios = d.portfoliosGrid.filter(p => p.public);
  const [sel, setSel] = useS(portfolios[0]?.id);
  const [qty, setQty] = useS(1);
  const finishes = [
    { key: 'matte', label: 'Noir mat', sub: 'Finition premium', dark: true },
    { key: 'white', label: 'Blanc', sub: 'Élégant & sobre' },
    { key: 'accent', label: 'Couleur', sub: 'Aux couleurs du portfolio' },
  ];
  const [finish, setFinish] = useS('matte');
  const unit = 30000;
  const total = (unit * qty).toLocaleString('fr-FR');
  return (
    <ModalShell icon="wifi" title="Commander une carte NFC" subtitle="Livraison sous 5 à 7 jours à Dakar" onClose={onClose}
      footer={<React.Fragment>
        <div className="mr-auto"><p className="text-xs text-muted">Total</p><p className="text-lg font-bold text-ink leading-none">{total} F CFA</p></div>
        <button onClick={onClose} className={btnGhost}>Annuler</button>
        <button onClick={() => { onClose(); go('nfc'); }} className={btnPrimary} style={{ background: 'var(--accent)' }}><Icon name="cart" size={15} /> Commander</button>
      </React.Fragment>}>
      {/* Portfolio */}
      <label className="text-xs font-semibold text-muted uppercase tracking-wide">Portfolio lié</label>
      <div className="mt-2 space-y-2">
        {portfolios.map(p => (
          <button key={p.id} onClick={() => setSel(p.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${sel === p.id ? '' : 'border-line hover:bg-zinc-50'}`}
            style={sel === p.id ? { borderColor: 'var(--accent)', background: 'var(--accent-tint)' } : undefined}>
            <span className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: p.accent ? 'linear-gradient(140deg,var(--accent),var(--accent-600))' : 'linear-gradient(140deg,#52525B,#27272A)' }}>{p.title[0]}</span>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium text-ink truncate">{p.title}</p><p className="text-xs text-muted">/{p.slug}</p></div>
            <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: sel === p.id ? 'var(--accent)' : '#D4D4D8' }}>{sel === p.id && <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent)' }}></span>}</span>
          </button>
        ))}
      </div>
      {/* Finish */}
      <label className="text-xs font-semibold text-muted uppercase tracking-wide block mt-6">Finition</label>
      <div className="grid grid-cols-3 gap-2.5 mt-2">
        {finishes.map(f => (
          <button key={f.key} onClick={() => setFinish(f.key)}
            className={`p-3 rounded-xl border text-left transition-colors ${finish === f.key ? '' : 'border-line hover:bg-zinc-50'}`}
            style={finish === f.key ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 1px var(--accent)' } : undefined}>
            <div className="w-full h-10 rounded-lg mb-2 flex items-center justify-center" style={{ background: f.dark ? 'linear-gradient(140deg,#1A1A1F,#2A2D3A)' : f.key === 'accent' ? 'linear-gradient(140deg,var(--accent),var(--accent-600))' : '#fff', border: f.key === 'white' ? '1px solid #E4E4E7' : 'none' }}>
              <Icon name="wifi" size={14} className={f.dark || f.key === 'accent' ? 'text-white/80 rotate-90' : 'text-ink/40 rotate-90'} />
            </div>
            <p className="text-xs font-semibold text-ink">{f.label}</p>
            <p className="text-[11px] text-muted leading-tight">{f.sub}</p>
          </button>
        ))}
      </div>
      {/* Qty */}
      <div className="flex items-center justify-between mt-6">
        <div><label className="text-xs font-semibold text-muted uppercase tracking-wide">Quantité</label><p className="text-xs text-muted mt-0.5">{unit.toLocaleString('fr-FR')} F CFA / carte</p></div>
        <div className="flex items-center gap-1 border border-line rounded-xl p-1">
          <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-ink"><Icon name="x" size={14} className="rotate-45" /></button>
          <span className="w-10 text-center text-sm font-semibold tabular-nums">{qty}</span>
          <button onClick={() => setQty(q => q + 1)} className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-ink"><Icon name="plus" size={14} /></button>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Upgrade / Wave payment ─────────────────────────────────────
function UpgradeModal({ plan, go, onClose }) {
  const target = window.DATA.plans.find(p => p.name === plan) || window.DATA.plans[1];
  const [method, setMethod] = useS('wave');
  const methods = [
    { key: 'wave', label: 'Wave', sub: 'Mobile money', color: '#1DC1F2' },
    { key: 'om', label: 'Orange Money', sub: 'Mobile money', color: '#FF7900' },
    { key: 'card', label: 'Carte bancaire', sub: 'Visa · Mastercard', color: '#1A1A1F' },
  ];
  return (
    <ModalShell icon="rocket" title={`Passer à la formule ${target.name}`} subtitle="Paiement sécurisé" tone="wave" onClose={onClose}
      footer={<React.Fragment>
        <button onClick={onClose} className={btnGhost}>Annuler</button>
        <button onClick={() => { onClose(); go('dashboard'); }} className={btnPrimary} style={{ background: method === 'wave' ? '#1DC1F2' : method === 'om' ? '#FF7900' : 'var(--accent)' }}>
          <Icon name="lock" size={15} /> Payer {target.price} F
        </button>
      </React.Fragment>}>
      {/* Summary */}
      <div className="rounded-xl border border-line p-4 flex items-center justify-between" style={{ background: 'var(--accent-tint)' }}>
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: 'var(--accent)' }}><Icon name="sparkles" size={19} /></span>
          <div><p className="font-bold text-ink text-sm">Formule {target.name}</p><p className="text-xs text-ink/60">{target.desc}</p></div>
        </div>
        <div className="text-right shrink-0"><p className="text-lg font-bold text-ink leading-none">{target.price}</p><p className="text-[11px] text-ink/60 mt-0.5">F CFA / mois</p></div>
      </div>
      {/* Features recap */}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
        {target.features.slice(0, 4).map(f => (
          <li key={f} className="flex items-center gap-1.5 text-xs text-ink/70"><Icon name="check" size={13} style={{ color: 'var(--accent-600)' }} stroke={3} /> {f}</li>
        ))}
      </ul>
      {/* Payment method */}
      <label className="text-xs font-semibold text-muted uppercase tracking-wide block mt-6">Moyen de paiement</label>
      <div className="space-y-2 mt-2">
        {methods.map(m => (
          <button key={m.key} onClick={() => setMethod(m.key)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${method === m.key ? '' : 'border-line hover:bg-zinc-50'}`}
            style={method === m.key ? { borderColor: m.color, boxShadow: `0 0 0 1px ${m.color}` } : undefined}>
            <span className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ background: m.color }}>{m.label.slice(0, 2)}</span>
            <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-ink">{m.label}</p><p className="text-xs text-muted">{m.sub}</p></div>
            <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: method === m.key ? m.color : '#D4D4D8' }}>{method === m.key && <span className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }}></span>}</span>
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted flex items-center gap-1.5"><Icon name="shield" size={13} /> Paiement chiffré. Annulation possible à tout moment.</p>
    </ModalShell>
  );
}

// ── Invite member (Business) ───────────────────────────────────
function InviteMemberModal({ go, onClose }) {
  const [role, setRole] = useS('Designer');
  const roles = ['Designer', 'Commercial', 'Développeur', 'Directeur'];
  return (
    <ModalShell icon="userplus" title="Inviter un collaborateur" subtitle="Sahel Studio · 27 places disponibles" onClose={onClose}
      footer={<React.Fragment>
        <button onClick={onClose} className={btnGhost}>Annuler</button>
        <button onClick={() => { onClose(); go('business-join'); }} className={btnPrimary} style={{ background: 'var(--accent)' }}><Icon name="send" size={15} /> Envoyer l'invitation</button>
      </React.Fragment>}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">Adresse email</label>
          <div className="relative mt-1.5">
            <Icon name="mail" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input placeholder="collaborateur@sahelstudio.sn" className="w-full h-11 pl-9 pr-3 rounded-xl border border-line outline-none text-sm text-ink placeholder:text-muted focus:border-ink/30" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">Rôle</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {roles.map(r => (
              <button key={r} onClick={() => setRole(r)}
                className={`px-3.5 h-9 rounded-full text-sm font-medium transition-colors ${role === r ? 'text-white' : 'border border-line text-ink/70 hover:bg-zinc-50'}`}
                style={role === r ? { background: 'var(--ink-nav)' } : undefined}>{r}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">Limite de portfolios</label>
          <div className="mt-1.5 h-11 px-3.5 rounded-xl border border-line flex items-center justify-between">
            <span className="text-sm text-ink">5 portfolios maximum</span>
            <Icon name="chevron" size={16} className="text-muted" />
          </div>
        </div>
        <div className="rounded-xl border border-line bg-zinc-50 p-3.5 flex items-start gap-2.5">
          <Icon name="mail" size={15} className="text-muted shrink-0 mt-0.5" />
          <p className="text-xs text-ink/60 leading-relaxed">Le collaborateur recevra un email avec un lien sécurisé pour créer son compte et rejoindre l'espace <strong className="text-ink">Sahel Studio</strong>.</p>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Root dispatcher ────────────────────────────────────────────
function ModalRoot({ modal, ctx, close }) {
  if (!modal) return null;
  const { type, props = {} } = modal;
  const common = { onClose: close, go: ctx.go };
  switch (type) {
    case 'create': return <CreatePortfolioModal plan={ctx.plan} go={ctx.go} onClose={close} onCreate={props.onCreate} />;
    case 'edit': return <CreatePortfolioModal plan={ctx.plan} go={ctx.go} onClose={close} onCreate={props.onCreate} editPortfolio={props.portfolio} />;
    case 'confirm': return <ConfirmModal {...props} onClose={close} />;
    case 'share': return <ShareModal {...props} onClose={close} />;
    case 'order-nfc': return <OrderNFCModal {...common} />;
    case 'upgrade': return <UpgradeModal plan={props.plan} {...common} />;
    case 'invite': return <InviteMemberModal {...common} />;
    default: return null;
  }
}

Object.assign(window, { ModalShell, ConfirmModal, ShareModal, OrderNFCModal, UpgradeModal, InviteMemberModal, ModalRoot });
