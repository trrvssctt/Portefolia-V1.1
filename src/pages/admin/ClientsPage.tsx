import { useState, useEffect } from 'react';
import { Download, UserPlus } from 'lucide-react';
import ClientsListView from '@/components/admin/clients/ClientsListView';
import ClientProfil360 from '@/components/admin/clients/ClientProfil360';
import { downloadClientsCSV } from '@/hooks/useClients';

export default function ClientsPage() {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  // Scroll automatique vers le profil à l'ouverture
  useEffect(() => {
    if (selectedClientId) {
      setTimeout(() => {
        document.getElementById('profil-360')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [selectedClientId]);

  const handleSelectClient = (id: number) => {
    setSelectedClientId((prev) => (prev === id ? null : id));
  };

  const handleExportCSV = () => {
    downloadClientsCSV().catch(console.error);
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)' }}
        className="px-6 py-4 flex items-center justify-between"
      >
        <div>
          <h1 className="text-white font-semibold text-lg">Gestion des Clients</h1>
          <p className="text-white/60 text-xs mt-0.5">
            Administration clients · Vue 360°
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            <Download size={13} />
            Exporter CSV
          </button>
        </div>
      </div>

      {/* ── Contenu ────────────────────────────────────────────────────────── */}
      <div className="px-6 py-5">

        {/* Liste */}
        <ClientsListView
          onSelectClient={handleSelectClient}
          selectedClientId={selectedClientId}
        />

        {/* Profil 360° inline sous la liste */}
        {selectedClientId !== null && (
          <div className="mt-4" id="profil-360">
            <ClientProfil360
              clientId={selectedClientId}
              onClose={() => setSelectedClientId(null)}
            />
          </div>
        )}

      </div>
    </div>
  );
}
