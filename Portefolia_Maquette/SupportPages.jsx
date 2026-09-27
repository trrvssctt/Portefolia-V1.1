// SupportPages.jsx — FAQ, Contact, Documentation. window.FaqScreen, ContactScreen, DocsScreen
const { useState: useSt } = React;

// ── FAQ ────────────────────────────────────────────────────────
const FAQ_DATA = [
  { cat: 'Démarrage', icon: 'rocket', items: [
    ['Comment créer mon premier portfolio ?', "Inscrivez-vous gratuitement, cliquez sur « Nouveau portfolio », choisissez un template et renseignez vos informations. Votre portfolio est en ligne en quelques minutes sur portefolia.tech/votre-nom."],
    ['Le compte gratuit est-il vraiment gratuit ?', "Oui. La formule Gratuite permet de créer 1 portfolio avec un template, sans carte bancaire requise et sans limite de durée."],
    ['Puis-je utiliser mon propre nom de domaine ?', "Les domaines personnalisés (ex. awandiaye.com) sont disponibles dès la formule Pro."],
  ]},
  { cat: 'Paiement & Wave', icon: 'waves', items: [
    ['Quels moyens de paiement acceptez-vous ?', "Wave, Orange Money et carte bancaire (Visa / Mastercard). Wave est le moyen le plus rapide au Sénégal."],
    ['Combien de temps pour valider un paiement Wave ?', "La plupart des paiements Wave sont validés en moins de 30 minutes. Vous recevez une confirmation par email et SMS."],
    ['Comment obtenir une facture ?', "Une facture est générée automatiquement après chaque paiement validé, téléchargeable depuis votre espace « Paiements »."],
  ]},
  { cat: 'Cartes NFC', icon: 'wifi', items: [
    ['Comment fonctionne la carte NFC ?', "Approchez la carte d'un smartphone : votre portfolio s'ouvre instantanément, sans application. Un QR code de secours est aussi imprimé au dos."],
    ['Quel est le délai de livraison ?', "Comptez 5 à 7 jours ouvrés pour une livraison à Dakar, un peu plus pour les autres régions."],
    ['Puis-je commander plusieurs cartes ?', "Oui, dès la formule Pro les cartes sont illimitées. Des tarifs dégressifs s'appliquent à partir de 10 cartes pour les équipes."],
  ]},
  { cat: 'Compte & confidentialité', icon: 'shield', items: [
    ['Comment rendre un portfolio privé ?', "Depuis « Mes portfolios », basculez la visibilité sur Privé. Seules les personnes disposant du lien pourront y accéder."],
    ['Mes données sont-elles protégées ?', "Vos données sont chiffrées et hébergées de façon sécurisée. Vous gardez le contrôle de ce que chaque visiteur peut voir."],
  ]},
];

function FaqItem({ q, a, open, onToggle }) {
  return (
    <div className="border border-line rounded-xl overflow-hidden bg-white">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-zinc-50/60 transition-colors">
        <span className="font-semibold text-ink text-[15px] flex-1">{q}</span>
        <Icon name="chevron" size={18} className="text-muted shrink-0 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && <div className="px-5 pb-5 -mt-1"><p className="text-sm text-ink/65 leading-relaxed" style={{ textWrap: 'pretty' }}>{a}</p></div>}
    </div>
  );
}

function FaqScreen({ go }) {
  const [openK, setOpenK] = useSt('0-0');
  const [query, setQuery] = useSt('');
  const q = query.trim().toLowerCase();
  return (
    <MarketingPage go={go} active="faq">
      <PageHero go={go} crumb="FAQ" eyebrow="Centre d'aide" title="Questions fréquentes" subtitle="Tout ce qu'il faut savoir sur Portefolia, les cartes NFC et les paiements.">
        <div className="relative max-w-md mx-auto mt-7">
          <Icon name="search" size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher une question…" className="w-full h-12 pl-11 pr-4 rounded-xl border border-line bg-white outline-none text-sm focus:border-ink/30" />
        </div>
      </PageHero>

      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-14 space-y-10">
        {FAQ_DATA.map((cat, ci) => {
          const items = cat.items.map((it, ii) => ({ q: it[0], a: it[1], key: `${ci}-${ii}` }))
            .filter(it => !q || it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q));
          if (items.length === 0) return null;
          return (
            <section key={cat.cat}>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-tint)', color: 'var(--accent-600)' }}><Icon name={cat.icon} size={16} /></span>
                <h2 className="text-base font-bold text-ink">{cat.cat}</h2>
              </div>
              <div className="space-y-2.5">
                {items.map(it => <FaqItem key={it.key} q={it.q} a={it.a} open={openK === it.key} onToggle={() => setOpenK(openK === it.key ? null : it.key)} />)}
              </div>
            </section>
          );
        })}
      </div>

      {/* Still need help */}
      <section className="max-w-3xl mx-auto px-5 sm:px-8 pb-20">
        <div className="rounded-2xl border border-line p-7 text-center bg-zinc-50/60">
          <h3 className="text-lg font-bold text-ink">Vous ne trouvez pas votre réponse ?</h3>
          <p className="text-sm text-muted mt-1.5">Notre équipe support à Dakar vous répond sous 24 h.</p>
          <button onClick={() => go('contact')} className="mt-5 h-11 px-5 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-2" style={{ background: 'var(--accent)' }}><Icon name="message" size={15} /> Contacter le support</button>
        </div>
      </section>
    </MarketingPage>
  );
}

// ── Contact ────────────────────────────────────────────────────
function ContactScreen({ go }) {
  const [sent, setSent] = useSt(false);
  const [subject, setSubject] = useSt('Question générale');
  const subjects = ['Question générale', 'Paiement & facturation', 'Carte NFC', 'Partenariat', 'Support technique'];
  const channels = [
    { icon: 'mail', label: 'Email', value: 'support@portefolia.tech', sub: 'Réponse sous 24 h' },
    { icon: 'phone', label: 'Téléphone', value: '+221 33 800 12 34', sub: 'Lun–Ven, 9h–18h' },
    { icon: 'message', label: 'WhatsApp', value: '+221 77 000 12 34', sub: 'Réponse rapide' },
    { icon: 'pin', label: 'Bureau', value: 'Sacré-Cœur 3, Dakar', sub: 'Sur rendez-vous' },
  ];
  return (
    <MarketingPage go={go} active="contact">
      <PageHero go={go} crumb="Contact" eyebrow="Nous écrire" title="Parlons de votre projet" subtitle="Une question, un partenariat, un besoin pour votre équipe ? Notre équipe basée à Dakar vous répond." />
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-14 grid lg:grid-cols-[1fr_1.2fr] gap-10 items-start">
        {/* Channels */}
        <div className="space-y-3">
          {channels.map(c => (
            <div key={c.label} className="flex items-center gap-3.5 rounded-2xl border border-line p-4">
              <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-tint)', color: 'var(--accent-600)' }}><Icon name={c.icon} size={19} /></span>
              <div className="min-w-0"><p className="text-xs text-muted">{c.label}</p><p className="font-semibold text-ink text-[15px] truncate">{c.value}</p><p className="text-xs text-muted">{c.sub}</p></div>
            </div>
          ))}
        </div>
        {/* Form */}
        <div className="rounded-2xl border border-line p-6 sm:p-7" style={{ boxShadow: 'var(--shadow-card)' }}>
          {sent ? (
            <div className="text-center py-10">
              <span className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: 'var(--accent-tint)', color: 'var(--accent)' }}><Icon name="checkcircle" size={28} /></span>
              <h3 className="text-lg font-bold text-ink">Message envoyé</h3>
              <p className="text-sm text-muted mt-1.5">Merci ! Nous revenons vers vous sous 24 h ouvrées.</p>
              <button onClick={() => setSent(false)} className="mt-5 text-sm font-semibold hover:underline" style={{ color: 'var(--accent-600)' }}>Envoyer un autre message</button>
            </div>
          ) : (
            <React.Fragment>
              <h3 className="font-bold text-ink mb-5">Envoyez-nous un message</h3>
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><label className="text-xs font-semibold text-muted uppercase tracking-wide">Nom complet</label><input className="mt-1.5 w-full h-11 px-3.5 rounded-xl border border-line outline-none text-sm focus:border-ink/30" defaultValue="" placeholder="Awa Ndiaye" /></div>
                  <div><label className="text-xs font-semibold text-muted uppercase tracking-wide">Email</label><input className="mt-1.5 w-full h-11 px-3.5 rounded-xl border border-line outline-none text-sm focus:border-ink/30" placeholder="vous@email.com" /></div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-wide">Sujet</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {subjects.map(s => <button key={s} onClick={() => setSubject(s)} className={`px-3 h-9 rounded-full text-xs font-medium transition-colors ${subject === s ? 'text-white' : 'border border-line text-ink/70 hover:bg-zinc-50'}`} style={subject === s ? { background: 'var(--ink-nav)' } : undefined}>{s}</button>)}
                  </div>
                </div>
                <div><label className="text-xs font-semibold text-muted uppercase tracking-wide">Message</label><textarea rows={4} className="mt-1.5 w-full px-3.5 py-3 rounded-xl border border-line outline-none text-sm focus:border-ink/30 resize-none" placeholder="Décrivez votre demande…"></textarea></div>
                <button onClick={() => setSent(true)} className="w-full h-12 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ background: 'var(--accent)' }}><Icon name="send" size={15} /> Envoyer le message</button>
              </div>
            </React.Fragment>
          )}
        </div>
      </div>
    </MarketingPage>
  );
}

// ── Documentation ──────────────────────────────────────────────
const DOC_CATS = [
  { icon: 'rocket', title: 'Premiers pas', desc: 'Créer un compte, votre premier portfolio, choisir un template.', n: 8 },
  { icon: 'layout', title: 'Éditeur de portfolio', desc: 'Sections, projets, expériences, compétences et personnalisation.', n: 14 },
  { icon: 'wifi', title: 'Cartes NFC', desc: 'Commander, activer et associer une carte à un portfolio.', n: 6 },
  { icon: 'waves', title: 'Paiements & formules', desc: 'Wave, Orange Money, factures et changement de formule.', n: 9 },
  { icon: 'building', title: 'Espace Business', desc: 'Inviter des membres, gérer les rôles et la marque entreprise.', n: 11 },
  { icon: 'bar', title: 'Analytics', desc: 'Comprendre vues, scans NFC et contacts collectés.', n: 5 },
];
const DOC_POPULAR = [
  'Connecter un domaine personnalisé',
  'Activer ma carte NFC pour la première fois',
  'Comprendre mes statistiques de vues',
  'Passer de Starter à Pro',
  'Rendre un portfolio public ou privé',
];

function DocsScreen({ go }) {
  return (
    <MarketingPage go={go} active="docs">
      <PageHero go={go} crumb="Documentation" eyebrow="Centre de ressources" title="Documentation" subtitle="Guides, tutoriels et bonnes pratiques pour tirer le meilleur de Portefolia.">
        <div className="relative max-w-md mx-auto mt-7">
          <Icon name="search" size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input placeholder="Rechercher dans la documentation…" className="w-full h-12 pl-11 pr-4 rounded-xl border border-line bg-white outline-none text-sm focus:border-ink/30" />
        </div>
      </PageHero>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {DOC_CATS.map(c => (
            <button key={c.title} className="group text-left rounded-2xl border border-line p-6 hover:shadow-[0_8px_30px_rgba(16,24,40,0.07)] hover:border-ink/15 transition-all">
              <span className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-tint)', color: 'var(--accent-600)' }}><Icon name={c.icon} size={20} /></span>
              <h3 className="font-bold text-ink flex items-center gap-1.5">{c.title}</h3>
              <p className="text-sm text-ink/60 mt-1.5 leading-relaxed">{c.desc}</p>
              <p className="text-xs font-semibold mt-4 flex items-center gap-1" style={{ color: 'var(--accent-600)' }}>{c.n} articles <Icon name="arrow" size={13} className="group-hover:translate-x-0.5 transition-transform" /></p>
            </button>
          ))}
        </div>

        {/* Popular */}
        <div className="mt-12 grid lg:grid-cols-[1.4fr_1fr] gap-6">
          <div className="rounded-2xl border border-line overflow-hidden">
            <div className="px-5 py-3.5 border-b border-line flex items-center gap-2"><Icon name="star" size={15} style={{ color: 'var(--accent-600)' }} /><h3 className="font-bold text-ink text-sm">Articles populaires</h3></div>
            <div className="divide-y divide-line">
              {DOC_POPULAR.map(a => (
                <button key={a} className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-zinc-50/60 transition-colors group">
                  <Icon name="file" size={15} className="text-muted shrink-0" />
                  <span className="text-sm text-ink flex-1">{a}</span>
                  <Icon name="arrow" size={15} className="text-zinc-300 group-hover:text-ink/50 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl p-6 text-white relative overflow-hidden" style={{ background: 'var(--admin-grad)' }}>
            <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
            <div className="relative">
              <Icon name="message" size={24} />
              <h3 className="font-bold text-lg mt-3">Besoin d'aide ?</h3>
              <p className="text-white/70 text-sm mt-1.5 leading-relaxed">Notre équipe support répond à toutes vos questions techniques.</p>
              <button onClick={() => go('contact')} className="mt-5 h-10 px-4 rounded-lg bg-white text-sm font-semibold inline-flex items-center gap-2" style={{ color: '#1B5E20' }}>Contacter le support <Icon name="arrow" size={14} /></button>
            </div>
          </div>
        </div>
      </div>
    </MarketingPage>
  );
}

Object.assign(window, { FaqScreen, ContactScreen, DocsScreen });
