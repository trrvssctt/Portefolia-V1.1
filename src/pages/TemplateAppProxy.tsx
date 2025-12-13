import React, { useMemo, useState } from 'react';

const TemplateAppProxy: React.FC = () => {
  const envUrl = (import.meta.env.VITE_TEMPLATE_APP_URL as string) || '';
  const defaultUrl = `${window.location.origin}/Tempate-Portefolio`;
  const iframeSrc = useMemo(() => envUrl || defaultUrl, [envUrl]);
  const [iframeError, setIframeError] = useState(false);

  const openInNewTab = () => {
    window.open(iframeSrc, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Template-Portfolio</h2>
        <p className="text-gray-700 mb-6">Si l'application Template-Portfolio est en cours d'exécution (serveur de dev séparé), elle s'affichera ci-dessous.</p>

        <div className="w-full h-[80vh] border rounded overflow-hidden bg-white">
          {!iframeError ? (
            <iframe
              title="Template-Portfolio"
              src={iframeSrc}
              className="w-full h-full"
              onError={() => setIframeError(true)}
            />
          ) : (
            <div className="p-6">
              <p className="text-red-600 mb-4">L'iframe n'a pas pu charger l'application.</p>
              <p className="mb-4">Vérifiez que vous avez lancé l'application Template-Portfolio :</p>
              <pre className="text-sm bg-gray-100 p-3 rounded">cd Tempate-Portefolio
npm install
npm run dev</pre>
              <div className="mt-4">
                <button onClick={openInNewTab} className="bg-[#28A745] text-white px-4 py-2 rounded">Ouvrir dans un nouvel onglet</button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <strong>Astuce :</strong> si le serveur de dev de Template-Portfolio tourne sur un port différent, définissez `VITE_TEMPLATE_APP_URL` dans votre `.env` (ex. <code>VITE_TEMPLATE_APP_URL=http://localhost:5173</code>) et redémarrez le dev server.
        </div>
      </div>
    </div>
  );
};

export default TemplateAppProxy;
