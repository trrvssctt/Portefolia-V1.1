// app.jsx — root router + Tweaks + portfolio creation modal
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#2E7D32",
  "displayFont": "Éditorial",
  "density": "Confort",
  "plan": "Pro"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = React.useState(() => localStorage.getItem('pf_screen2') || 'landing');
  const [modal, setModal] = React.useState(null);
  const [activeTemplate, setActiveTemplate] = React.useState(() => {
    const id = localStorage.getItem('pf_template') || 't1';
    return window.TEMPLATES.find(x => x.id === id) || window.TEMPLATES[0];
  });

  const plan = t.plan || 'Pro';

  const go = React.useCallback((key) => {
    if (!window.SCREENS[key]) return;
    setScreen(key);
    localStorage.setItem('pf_screen2', key);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const openModal = React.useCallback((type, props = {}) => setModal({ type, props }), []);
  const closeModal = React.useCallback(() => setModal(null), []);

  // optional deep-link / preview hook
  React.useEffect(() => {
    const m = localStorage.getItem('pf_open_modal');
    if (m) { localStorage.removeItem('pf_open_modal'); setModal({ type: m, props: {} }); }
  }, []);

  const handleCreate = (tpl, title) => {
    setActiveTemplate(tpl);
    localStorage.setItem('pf_template', tpl.id);
    setModal(null);
    go('portfolio');
  };

  React.useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--accent', t.accent);
    r.style.setProperty('--accent-600', t.accent === '#2E7D32' ? '#1B5E20' : `color-mix(in srgb, ${t.accent} 78%, #000)`);
    r.style.setProperty('--accent-tint', `color-mix(in srgb, ${t.accent} 9%, #fff)`);
    r.setAttribute('data-display', t.displayFont === 'Éditorial' ? 'serif' : 'sans');
    r.style.fontSize = t.density === 'Compact' ? '15px' : '16px';
  }, [t.accent, t.displayFont, t.density]);

  const ctx = { go, openModal, plan, activeTemplate };
  const render = window.SCREENS[screen] || window.SCREENS.landing;

  return (
    <React.Fragment>
      {render(ctx)}
      <PrototypeLauncher current={screen} go={go} />

      <ModalRoot
        modal={modal && modal.type === 'create' ? { ...modal, props: { ...modal.props, onCreate: handleCreate } } : modal && modal.type === 'edit' ? { ...modal, props: { ...modal.props, onCreate: handleCreate } } : modal}
        ctx={ctx} close={closeModal} />

      <TweaksPanel>
        <TweakSection label="Simulation" />
        <TweakRadio label="Formule de l'utilisateur" value={plan}
          options={['Gratuit', 'Starter', 'Pro', 'Business']}
          onChange={(v) => setTweak('plan', v)} />
        <p style={{ fontSize: 11, color: '#71717A', margin: '-4px 4px 4px', lineHeight: 1.4 }}>
          Change le nombre de templates débloqués dans le modal de création.
        </p>
        <TweakSection label="Identité visuelle" />
        <TweakColor label="Couleur d'accent (UI)" value={t.accent}
          options={['#2E7D32', '#43A047', '#1B5E20', '#0E7490']}
          onChange={(v) => setTweak('accent', v)} />
        <TweakSection label="Portfolio public" />
        <TweakRadio label="Titre (Éditorial)" value={t.displayFont}
          options={['Éditorial', 'Moderne']}
          onChange={(v) => setTweak('displayFont', v)} />
        <TweakSection label="Mise en page" />
        <TweakRadio label="Densité" value={t.density}
          options={['Confort', 'Compact']}
          onChange={(v) => setTweak('density', v)} />
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
