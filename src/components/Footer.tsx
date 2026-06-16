import { Link } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';

const COLS = [
  {
    title: 'Produit',
    links: [
      { label: 'Fonctionnalités', to: '/' },
      { label: 'Tarifs',          to: '/upgrade' },
      { label: 'Cartes NFC',      to: '/nfc-types' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'FAQ',           to: '/faq' },
      { label: 'Contact',       to: '/contact' },
      { label: 'Documentation', to: '/docs' },
    ],
  },
  {
    title: 'Entreprise',
    links: [
      { label: 'À propos',  to: '/apropos' },
      { label: 'Blog',      to: '/blog' },
      { label: 'Carrières', to: '/carrieres' },
    ],
  },
];

const Footer = () => (
  <footer className="border-t border-[#E7E7EA] bg-white">
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 grid sm:grid-cols-4 gap-8">

      {/* Brand */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <span
            className="w-8 h-8 rounded-[9px] flex items-center justify-center text-white shrink-0"
            style={{ background: 'linear-gradient(140deg, #2E7D32, #1B5E20)' }}
          >
            <LayoutGrid size={16} strokeWidth={2.2} />
          </span>
          <span className="text-[19px] font-bold tracking-tight text-[#18181B]">Portefolia</span>
        </div>
        <p className="text-sm text-[#71717A] max-w-[200px] leading-relaxed">
          La nouvelle génération de cartes de visite professionnelles.
        </p>
        <div className="flex gap-2 mt-4">
          {['LinkedIn', 'Twitter', 'Instagram'].map(s => (
            <span
              key={s}
              className="w-9 h-9 rounded-full border border-[#E7E7EA] flex items-center justify-center text-[11px] font-bold text-[#71717A] hover:text-[#18181B] hover:border-[#18181B]/30 transition-colors cursor-pointer"
            >
              {s[0]}
            </span>
          ))}
        </div>
      </div>

      {/* Link columns */}
      {COLS.map(col => (
        <div key={col.title}>
          <h4 className="text-sm font-semibold text-[#18181B] mb-3">{col.title}</h4>
          <ul className="space-y-2">
            {col.links.map(l => (
              <li key={l.label}>
                <Link
                  to={l.to}
                  className="text-sm text-[#71717A] hover:text-[#18181B] transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>

    <div className="border-t border-[#E7E7EA]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between text-xs text-[#71717A]">
        <span>© {new Date().getFullYear()} Portefolia. Tous droits réservés.</span>
        <span>Dakar, Sénégal</span>
      </div>
    </div>
  </footer>
);

export default Footer;
