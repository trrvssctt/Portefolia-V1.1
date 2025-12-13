import React from 'react';

interface Session {
  ip?: string;
  duration_seconds?: number;
  events?: number;
}

interface SessionReplayPlayerProps {
  sessions?: Session[];
}

export const SessionReplayPlayer: React.FC<SessionReplayPlayerProps> = ({ sessions = [] }) => {
  return (
    <div className="p-4 bg-white/5 rounded-lg">
      {sessions.length === 0 ? (
        <div className="text-center text-gray-400 py-8">Aucune session enregistrée</div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-white/3 rounded">
              <div>
                <div className="text-sm">IP: {s.ip || 'unknown'}</div>
                <div className="text-xs text-gray-300">Durée: {s.duration_seconds || 0}s • Actions: {s.events || 0}</div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-white/10 rounded">Rejouer</button>
                <button className="px-3 py-1 bg-white/10 rounded">Télécharger</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionReplayPlayer;
