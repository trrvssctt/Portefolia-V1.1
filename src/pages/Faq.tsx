import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Rocket, Waves, Wifi, Shield, ChevronDown, Search, MessageCircle, ArrowLeft } from 'lucide-react';

const FAQ_DATA = [
  { cat: 'Démarrage', Icon: Rocket, items: [
    ['Comment créer mon premier portfolio ?', "Inscrivez-vous gratuitement, cliquez sur « Nouveau portfolio », choisissez un template et renseignez vos informations. Votre portfolio est en ligne en quelques minutes sur portefolia.tech/votre-nom."],
    ['Le compte gratuit est-il vraiment gratuit ?', "Oui. La formule Gratuite permet de créer 1 portfolio avec un template, sans carte bancaire requise et sans limite de durée."],
    ['Puis-je utiliser mon propre nom de domaine ?', "Les domaines personnalisés (ex. awandiaye.com) sont disponibles dès la formule Pro."],
  ]},
  { cat: 'Paiement & Wave', Icon: Waves, items: [
    ['Quels moyens de paiement acceptez-vous ?', "Wave, Orange Money et carte bancaire (Visa / Mastercard). Wave est le moyen le plus rapide au Sénégal."],
    ['Combien de temps pour valider un paiement Wave ?', "La plupart des paiements Wave sont validés en moins de 30 minutes. Vous recevez une confirmation par email et SMS."],
    ['Comment obtenir une facture ?', "Une facture est générée automatiquement après chaque paiement validé, téléchargeable depuis votre espace « Paiements »."],
  ]},
  { cat: 'Cartes NFC', Icon: Wifi, items: [
    ["Comment fonctionne la carte NFC ?", "Approchez la carte d'un smartphone : votre portfolio s'ouvre instantanément, sans application. Un QR code de secours est aussi imprimé au dos."],
    ['Quel est le délai de livraison ?', "Comptez 5 à 7 jours ouvrés pour une livraison à Dakar, un peu plus pour les autres régions."],
    ['Puis-je commander plusieurs cartes ?', "Oui, dès la formule Pro les cartes sont illimitées. Des tarifs dégressifs s'appliquent à partir de 10 cartes pour les équipes."],
  ]},
  { cat: 'Compte & confidentialité', Icon: Shield, items: [
    ['Comment rendre un portfolio privé ?', "Depuis « Mes portfolios », basculez la visibilité sur Privé. Seules les personnes disposant du lien pourront y accéder."],
    ['Mes données sont-elles protégées ?', "Vos données sont chiffrées et hébergées de façon sécurisée. Vous gardez le contrôle de ce que chaque visiteur peut voir."],
  ]},
];

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="border border-[#E7E7EA] rounded-xl overflow-hidden bg-white">
      <button onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-zinc-50/60 transition-colors">
        <span className="font-semibold text-[#18181B] text-[15px] flex-1">{q}</span>
        <ChevronDown size={18} className="text-[#71717A] shrink-0 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <div className="px-5 pb-5 -mt-1">
          <p className="text-sm text-[#18181B]/65 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function Faq() {
  const [openKey, setOpenKey] = useState<string | null>('0-0');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <header className="relative overflow-hidden border-b border-[#E7E7EA]">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(70% 60% at 50% -20%, #E8F5E9, transparent 70%)' }} />
        <div className="relative max-w-4xl mx-auto px-5 sm:px-8 pt-14 sm:pt-20 pb-12 text-center">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#71717A] hover:text-[#18181B] transition-colors mb-5">
            <ArrowLeft size={13} /> Accueil <span className="text-[#D4D4D8] mx-1">/</span>
            <span className="text-[#18181B]">FAQ</span>
          </Link>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-3" style={{ color: '#1B5E20' }}>Centre d'aide</p>
          <h1 className="font-serif text-[#18181B] leading-[1.0] tracking-tight mx-auto"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>Questions fréquentes</h1>
          <p className="mt-4 text-lg text-[#18181B]/65 max-w-xl mx-auto leading-relaxed">
            Tout ce qu'il faut savoir sur Portefolia, les cartes NFC et les paiements.
          </p>
          <div className="relative max-w-md mx-auto mt-7">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#71717A]" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher une question…"
              className="w-full h-12 pl-11 pr-4 rounded-xl border border-[#E7E7EA] bg-white outline-none text-sm focus:border-[#18181B]/30"
            />
          </div>
        </div>
      </header>

      {/* FAQ content */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-14 space-y-10">
        {FAQ_DATA.map((section, ci) => {
          const items = section.items
            .map((it, ii) => ({ q: it[0], a: it[1], key: `${ci}-${ii}` }))
            .filter(it => !q || it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q));
          if (items.length === 0) return null;
          const { Icon } = section;
          return (
            <section key={section.cat}>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: '#E8F5E9', color: '#1B5E20' }}>
                  <Icon size={16} />
                </span>
                <h2 className="text-base font-bold text-[#18181B]">{section.cat}</h2>
              </div>
              <div className="space-y-2.5">
                {items.map(it => (
                  <FaqItem
                    key={it.key}
                    q={it.q}
                    a={it.a}
                    open={openKey === it.key}
                    onToggle={() => setOpenKey(openKey === it.key ? null : it.key)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Still need help */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8 pb-20">
        <div className="rounded-2xl border border-[#E7E7EA] p-7 text-center bg-zinc-50/60">
          <h3 className="text-lg font-bold text-[#18181B]">Vous ne trouvez pas votre réponse ?</h3>
          <p className="text-sm text-[#71717A] mt-1.5">Notre équipe support à Dakar vous répond sous 24 h.</p>
          <Link to="/contact"
            className="mt-5 h-11 px-5 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-2"
            style={{ background: '#2E7D32' }}>
            <MessageCircle size={15} /> Contacter le support
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
