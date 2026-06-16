// Profil.jsx — user profile / account settings. window.ProfilScreen
function Field({ label, value, type }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</label>
      <div className="mt-1.5 h-11 px-3.5 rounded-xl border border-line bg-white flex items-center text-sm text-ink">
        {type === 'password' ? '••••••••••' : value}
      </div>
    </div>
  );
}

function ProfilScreen({ go }) {
  const d = window.DATA;
  const [tab, setTab] = React.useState('infos');
  const tabs = [
    { key: 'infos', label: 'Informations', icon: 'user' },
    { key: 'security', label: 'Sécurité', icon: 'shield' },
    { key: 'prefs', label: 'Préférences', icon: 'sliders' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--canvas)' }}>
      <UserNav active="profil" go={go} />
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
        <h1 className="text-2xl sm:text-[28px] font-bold text-ink tracking-tight">Mon profil</h1>
        <p className="text-muted text-sm mt-1">Gérez vos informations personnelles et la sécurité de votre compte.</p>

        <div className="grid lg:grid-cols-[280px_1fr] gap-6 lg:gap-8 mt-8 items-start">
          {/* Identity card */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-line p-6 text-center">
              <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-white text-2xl font-bold"
                style={{ background: 'linear-gradient(140deg, var(--accent), var(--accent-600))' }}>
                {d.profile.prenom[0]}{d.profile.nom[0]}
              </div>
              <h2 className="mt-4 font-semibold text-ink text-lg">{d.profile.prenom} {d.profile.nom}</h2>
              <p className="text-sm text-muted">{d.profile.email}</p>
              <span className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'var(--accent-tint)', color: 'var(--accent-600)' }}>
                <Icon name="sparkles" size={12} /> Formule Pro
              </span>
              <button className="mt-5 w-full h-10 rounded-[10px] border border-line text-sm font-medium text-ink hover:bg-zinc-50 transition-colors flex items-center justify-center gap-1.5">
                <Icon name="edit" size={15} /> Changer la photo
              </button>
            </div>
            {/* Side nav tabs */}
            <div className="bg-white rounded-2xl border border-line p-2">
              {tabs.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`w-full flex items-center gap-2.5 h-10 px-3 rounded-xl text-sm font-medium transition-colors ${tab === t.key ? '' : 'text-ink/70 hover:bg-zinc-50'}`}
                  style={tab === t.key ? { background: 'var(--accent-tint)', color: 'var(--accent-600)' } : undefined}>
                  <Icon name={t.icon} size={16} /> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-2xl border border-line p-6 sm:p-7">
            {tab === 'infos' && (
              <div>
                <h3 className="font-semibold text-ink">Informations personnelles</h3>
                <p className="text-sm text-muted mt-0.5 mb-6">Ces informations apparaissent sur vos portfolios.</p>
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="Prénom" value={d.profile.prenom} />
                  <Field label="Nom" value={d.profile.nom} />
                  <Field label="Email" value={d.profile.email} />
                  <Field label="Téléphone" value="+221 77 123 45 67" />
                  <Field label="Localisation" value="Dakar, Sénégal" />
                  <Field label="Métier" value="Product Designer" />
                </div>
                <div className="flex justify-end gap-2 mt-7 pt-6 border-t border-line">
                  <button className="h-10 px-4 rounded-[10px] border border-line text-sm font-medium text-ink hover:bg-zinc-50 transition-colors">Annuler</button>
                  <button className="h-10 px-5 rounded-[10px] text-sm font-semibold text-white transition-colors" style={{ background: 'var(--accent)' }}>Enregistrer</button>
                </div>
              </div>
            )}
            {tab === 'security' && (
              <div>
                <h3 className="font-semibold text-ink">Sécurité</h3>
                <p className="text-sm text-muted mt-0.5 mb-6">Modifiez votre mot de passe et gérez la connexion.</p>
                <div className="space-y-5 max-w-md">
                  <Field label="Mot de passe actuel" value="" type="password" />
                  <Field label="Nouveau mot de passe" value="" type="password" />
                  <Field label="Confirmer le mot de passe" value="" type="password" />
                </div>
                <div className="flex items-center justify-between mt-7 pt-6 border-t border-line">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-tint)', color: 'var(--accent-600)' }}><Icon name="shield" size={17} /></span>
                    <div><p className="text-sm font-medium text-ink">Double authentification</p><p className="text-xs text-muted">Recommandée pour sécuriser votre compte</p></div>
                  </div>
                  <button className="relative w-12 h-7 rounded-full" style={{ background: 'var(--accent)' }}><span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white shadow"></span></button>
                </div>
              </div>
            )}
            {tab === 'prefs' && (
              <div>
                <h3 className="font-semibold text-ink">Préférences</h3>
                <p className="text-sm text-muted mt-0.5 mb-6">Notifications et confidentialité.</p>
                <div className="divide-y divide-line">
                  {[
                    ['Emails de performance', 'Recevoir un résumé hebdomadaire des vues', true],
                    ['Nouveaux contacts', 'Être notifié quand un contact est collecté', true],
                    ['Profil indexable', 'Autoriser les moteurs de recherche', false],
                    ['Newsletter Portefolia', 'Conseils et nouveautés produit', false],
                  ].map(([t, s, on]) => (
                    <div key={t} className="flex items-center justify-between py-4">
                      <div><p className="text-sm font-medium text-ink">{t}</p><p className="text-xs text-muted">{s}</p></div>
                      <button className="relative w-12 h-7 rounded-full transition-colors" style={{ background: on ? 'var(--accent)' : '#D4D4D8' }}>
                        <span className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: on ? '26px' : '4px' }}></span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
window.ProfilScreen = ProfilScreen;
