const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-white mt-auto">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <div className="flex items-center gap-2">
              <img 
                src="/lovable-uploads/logo_portefolia_remove_bg.png" 
                alt="Portefolia" 
                className="h-6 w-auto"
              />
              <span className="text-sm font-medium text-gray-900">Portefolia Admin</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Panel d'administration • Version {import.meta.env.VITE_APP_VERSION || '1.0.0'}
            </p>
          </div>

          <div className="text-center md:text-right">
            <p className="text-sm text-gray-600">
              © {currentYear} Portefolia.tech. Tous droits réservés.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              <a 
                href="mailto:support@portefolia.tech" 
                className="hover:text-blue-600 transition-colors"
              >
                support@portefolia.tech
              </a>
              {' • '}
              <a 
                href="/admin/support" 
                className="hover:text-blue-600 transition-colors"
              >
                Support technique
              </a>
              {' • '}
              <a 
                href="/admin/docs" 
                className="hover:text-blue-600 transition-colors"
              >
                Documentation
              </a>
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-xs text-gray-500">
            Dernière mise à jour: {new Date().toLocaleDateString('fr-FR')} | 
            Serveur: {import.meta.env.VITE_API_BASE ? 'Production' : 'Développement'}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;