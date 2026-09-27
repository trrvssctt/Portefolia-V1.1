// Formules.jsx — pricing card (shared) + Formules screen. window.PlanCard, window.FormulesScreen
function PlanCard({ p, onChoose, compact }) {
  const popular = !!p.popular;
  const border = popular ? 'border-transparent' : 'border-line';
  return (
    <div className={`relative flex flex-col rounded-3xl bg-white border ${border} ${compact ? 'p-6' : 'p-7'} ${popular ? 'shadow-[0_20px_50px_-20px_rgba(16,24,40,0.25)]' : ''}`}
      style={popular ? { boxShadow: '0 0 0 2px var(--accent), 0 20px 50px -20px rgba(16,24,40,0.25)' } : undefined}>
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold uppercase tracking-wide text-white px-3 py-1 rounded-full"
          style={{ background: 'var(--accent)' }}>Le plus populaire</span>
      )}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-ink">{p.name}</h3>
        {p.tone === 'business' && <Icon name="building" size={18} className="text-muted" />}
        {p.tone === 'accent' && <Icon name="sparkles" size={18} style={{ color: 'var(--accent-600)' }} />}
        {p.tone === 'ink' && <Icon name="star" size={18} className="text-muted" />}
      </div>
      <div className="mt-4 flex items-end gap-1.5">
        <span className="font-serif text-ink tracking-tight leading-none" style={{ fontSize: compact ? '2.6rem' : '3.2rem' }}>{p.price}</span>
        <span className="text-sm text-muted mb-1.5">{p.price === '0' ? 'F CFA' : 'F CFA'}</span>
      </div>
      <p className="text-xs text-muted mt-1">{p.period}</p>
      <p className="text-sm text-ink/60 mt-4 leading-relaxed">{p.desc}</p>
      <button onClick={onChoose}
        className={`mt-6 h-11 rounded-xl text-sm font-semibold transition-colors ${popular ? 'text-white' : p.tone === 'business' ? 'text-white' : 'text-ink border border-line hover:bg-zinc-50'}`}
        style={popular ? { background: 'var(--accent)' } : p.tone === 'business' ? { background: 'var(--ink-nav)' } : undefined}>
        {p.cta}
      </button>
      {!compact && (
        <ul className="mt-6 space-y-3 pt-6 border-t border-line">
          {p.features.map(f => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-ink/75">
              <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'var(--accent-tint)' }}>
                <Icon name="check" size={11} style={{ color: 'var(--accent-600)' }} stroke={3} />
              </span>
              {f}
            </li>
          ))}
        </ul>
      )}
      {compact && (
        <ul className="mt-5 space-y-2">
          {p.features.slice(0, 4).map(f => (
            <li key={f} className="flex items-center gap-2 text-sm text-ink/70">
              <Icon name="check" size={14} style={{ color: 'var(--accent-600)' }} stroke={3} /> {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FormulesScreen({ go, openModal }) {
  const d = window.DATA;
  const [annual, setAnnual] = React.useState(false);
  const faqs = [
    ['Puis-je changer de formule à tout moment ?', 'Oui, vous pouvez passer à une formule supérieure ou inférieure quand vous le souhaitez. La différence est calculée au prorata.'],
    ['Comment se passe le paiement ?', 'Les paiements sont sécurisés via Wave et Orange Money. Vous recevez une facture après chaque règlement.'],
    ['Les cartes NFC sont-elles incluses ?', 'La commande des cartes NFC est disponible dès la formule Pro. Le prix unitaire est de 30 000 F CFA.'],
  ];
  return (
    <div className="min-h-screen" style={{ background: 'var(--canvas)' }}>
      <UserNav active="formules" go={go} />
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted mb-3">Formules</p>
          <h1 className="font-serif text-ink leading-[1.02] tracking-tight" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)' }}>
            Passez au niveau supérieur
          </h1>
          <p className="mt-4 text-ink/60">Débloquez cartes NFC illimitées, portfolios personnalisés et analytics avancées.</p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <span className={`text-sm font-medium ${!annual ? 'text-ink' : 'text-muted'}`}>Mensuel</span>
          <button onClick={() => setAnnual(a => !a)} className="relative w-12 h-7 rounded-full transition-colors"
            style={{ background: annual ? 'var(--accent)' : '#D4D4D8' }}>
            <span className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: annual ? '26px' : '4px' }}></span>
          </button>
          <span className={`text-sm font-medium flex items-center gap-2 ${annual ? 'text-ink' : 'text-muted'}`}>
            Annuel <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-tint)', color: 'var(--accent-600)' }}>−20%</span>
          </span>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6 mt-12 items-start max-w-5xl mx-auto">
          {d.plans.map(p => <PlanCard key={p.slug} p={p} onChoose={() => p.slug === 'free' ? go('dashboard') : openModal('upgrade', { plan: p.name })} />)}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mt-20">
          <h2 className="text-xl font-semibold text-ink text-center mb-8">Questions fréquentes</h2>
          <div className="space-y-3">
            {faqs.map(([q, a]) => (
              <div key={q} className="bg-white rounded-2xl border border-line p-5">
                <p className="font-semibold text-ink text-sm">{q}</p>
                <p className="mt-1.5 text-sm text-ink/60 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted mt-8">
            Une question ? <a className="font-semibold cursor-pointer hover:underline" style={{ color: 'var(--accent-600)' }}>support@portefolia.tech</a>
          </p>
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { PlanCard, FormulesScreen });
