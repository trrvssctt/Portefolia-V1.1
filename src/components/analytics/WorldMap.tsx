import React from 'react';

interface WorldMapProps {
  data?: Array<{ country?: string; count?: number }>;
}

export const WorldMap: React.FC<WorldMapProps> = ({ data = [] }) => {
  // Minimal placeholder: show top countries list
  const top = (data || []).slice(0, 6);
  return (
    <div className="p-4 bg-white/5 rounded-lg">
      <h4 className="font-medium mb-3">Top pays</h4>
      <div className="grid grid-cols-2 gap-2">
        {top.length === 0 && <div className="col-span-2 text-sm text-gray-400">Aucune donnée</div>}
        {top.map((c, i) => (
          <div key={i} className="flex items-center justify-between p-2 bg-white/3 rounded">
            <span className="text-sm">{c.country || 'Inconnu'}</span>
            <span className="text-sm text-gray-300">{c.count || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorldMap;
