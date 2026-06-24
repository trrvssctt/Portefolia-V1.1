import { useState, useEffect, useCallback } from 'react';
import { Mail, Trash2, CheckCheck, RefreshCw, ChevronDown, ChevronUp, Circle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

interface Message {
  id: number;
  nom: string;
  email: string;
  sujet: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const SUBJECT_COLORS: Record<string, string> = {
  'Paiement & facturation': 'bg-amber-100 text-amber-800',
  'Carte NFC':              'bg-blue-100 text-blue-800',
  'Partenariat':            'bg-purple-100 text-purple-800',
  'Support technique':      'bg-red-100 text-red-800',
  'Question générale':      'bg-gray-100 text-gray-700',
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ContactMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [unread, setUnread]     = useState(0);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter]     = useState<'all' | 'unread'>('all');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/contact/admin`, { headers });
      const d = await res.json();
      setMessages(d.messages || []);
      setUnread(d.unread || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: number) => {
    await fetch(`${API_BASE}/api/contact/admin/${id}/read`, { method: 'PATCH', headers });
    setMessages(ms => ms.map(m => m.id === id ? { ...m, is_read: true } : m));
    setUnread(u => Math.max(0, u - 1));
  };

  const del = async (id: number) => {
    if (!confirm('Supprimer ce message ?')) return;
    await fetch(`${API_BASE}/api/contact/admin/${id}`, { method: 'DELETE', headers });
    setMessages(ms => ms.filter(m => m.id !== id));
  };

  const toggle = (id: number) => {
    setExpanded(e => e === id ? null : id);
    const msg = messages.find(m => m.id === id);
    if (msg && !msg.is_read) markRead(id);
  };

  const displayed = filter === 'unread' ? messages.filter(m => !m.is_read) : messages;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Mail className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Messages de contact</h1>
            <p className="text-sm text-gray-500">{unread} non lu{unread > 1 ? 's' : ''} · {messages.length} au total</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-2 rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'unread'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {f === 'all' ? 'Tous' : `Non lus (${unread})`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun message{filter === 'unread' ? ' non lu' : ''}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(m => (
            <div key={m.id}
              className={`rounded-xl border transition-all ${m.is_read ? 'border-gray-200 bg-white' : 'border-green-200 bg-green-50/40'}`}>
              {/* Row */}
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => toggle(m.id)}>
                <Circle className={`w-2.5 h-2.5 shrink-0 ${m.is_read ? 'text-gray-300' : 'text-green-600 fill-green-600'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{m.nom}</span>
                    <span className="text-xs text-gray-400">{m.email}</span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${SUBJECT_COLORS[m.sujet] || 'bg-gray-100 text-gray-700'}`}>
                      {m.sujet}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{m.message}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0 hidden sm:block">{fmtDate(m.created_at)}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {!m.is_read && (
                    <button onClick={e => { e.stopPropagation(); markRead(m.id); }}
                      className="p-1.5 rounded-lg hover:bg-green-100 text-green-700 transition-colors" title="Marquer comme lu">
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={e => { e.stopPropagation(); del(m.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors" title="Supprimer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expanded === m.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {/* Expanded message */}
              {expanded === m.id && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-100 mt-0">
                  <p className="text-xs text-gray-400 mb-2 pt-3">{fmtDate(m.created_at)}</p>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {m.message}
                  </div>
                  <a href={`mailto:${m.email}?subject=Re: ${m.sujet}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:underline">
                    <Mail className="w-4 h-4" /> Répondre à {m.email}
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
