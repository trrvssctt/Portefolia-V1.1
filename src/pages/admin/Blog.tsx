import { useEffect, useState, useMemo } from 'react';
import AdminFooter from '@/components/admin/AdminFooter';
import {
  BookOpen, Plus, Search, Eye, Pencil, Trash2,
  X, Save, FileText, Globe, FileEdit, RefreshCw,
  AlignLeft, Tag,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const CARD_STYLE = { borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' };
const ADMIN_GRAD = 'linear-gradient(135deg, #1B5E20, #2E7D32)';

const STATUS_PILL: Record<string, { c: string; bg: string; label: string }> = {
  published: { c: '#2E7D32', bg: '#EAF5EB', label: 'Publié' },
  draft:     { c: '#B45309', bg: '#FEF3E2', label: 'Brouillon' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toSlug = (str: string) =>
  str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
     .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

// ─── Field component ──────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full h-10 px-3 rounded-lg border border-[#E7E7EA] bg-white text-sm text-[#18181B] outline-none focus:border-[#2E7D32] focus:ring-2 focus:ring-[#2E7D32]/10 transition-colors placeholder:text-zinc-300';
const textareaCls = 'w-full px-3 py-2.5 rounded-lg border border-[#E7E7EA] bg-white text-sm text-[#18181B] outline-none focus:border-[#2E7D32] focus:ring-2 focus:ring-[#2E7D32]/10 transition-colors resize-none placeholder:text-zinc-300';

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminBlog() {
  const [items, setItems]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [q, setQ]                 = useState('');
  const [page, setPage]           = useState(1);
  const [limit]                   = useState(50);
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [editing, setEditing]     = useState<any>(null);
  const [deleteId, setDeleteId]   = useState<number | null>(null);
  const [deleting, setDeleting]   = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (q) params.set('q', q);
      const res = await fetch(`${API_BASE}/api/admin/articles?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      setItems(j.articles || []);
    } catch { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page]);

  // ── Derived list ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = items;
    if (statusFilter !== 'all') list = list.filter(a => a.status === statusFilter);
    if (q) {
      const lq = q.toLowerCase();
      list = list.filter(a => a.title?.toLowerCase().includes(lq) || a.slug?.toLowerCase().includes(lq));
    }
    return list;
  }, [items, statusFilter, q]);

  const totalPublished = items.filter(a => a.status === 'published').length;
  const totalDraft     = items.filter(a => a.status === 'draft').length;

  // ── Save ──────────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const token  = localStorage.getItem('token');
      const method = editing.id ? 'PUT' : 'POST';
      const url    = editing.id
        ? `${API_BASE}/api/admin/articles/${editing.id}`
        : `${API_BASE}/api/admin/articles`;
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      if (!res.ok) throw new Error('Save failed');
      await load();
      setEditing(null);
    } catch { alert('Erreur lors de la sauvegarde'); }
    setSaving(false);
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (deleteId === null) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/articles/${deleteId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Delete failed');
      await load();
      setDeleteId(null);
    } catch { alert('Erreur lors de la suppression'); }
    setDeleting(false);
  };

  const newArticle = () =>
    setEditing({ title: '', slug: '', excerpt: '', content: '', meta_title: '', meta_description: '', status: 'draft' });

  const drawerOpen = editing !== null;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F8F8' }}>

      {/* ── CSS for drawer ───────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .drawer-enter { animation: slideInRight 0.25s cubic-bezier(0.32,0.72,0,1) both; }
      `}</style>

      {/* ── AdminHeader ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: ADMIN_GRAD }}>
        <div className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative max-w-[1180px] mx-auto px-5 sm:px-8 py-7 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3.5 flex-1 min-w-0 pl-10 md:pl-0">
            <span className="w-12 h-12 rounded-2xl bg-white/[0.12] flex items-center justify-center text-white shrink-0">
              <BookOpen size={24} strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">Blog</h1>
              <p className="text-white/65 text-sm mt-0.5">
                {loading ? 'Chargement…' : `${totalPublished} publié${totalPublished > 1 ? 's' : ''} · ${totalDraft} brouillon${totalDraft > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => load()} disabled={loading}
              className="h-10 px-4 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-semibold flex items-center gap-1.5 transition-colors">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>
            <button onClick={newArticle}
              className="h-10 px-4 rounded-lg bg-white text-[#1B5E20] text-sm font-bold flex items-center gap-1.5 hover:bg-white/90 transition-colors">
              <Plus size={14} /> Nouvel article
            </button>
          </div>
        </div>
      </div>

      {/* ── AdminBody ───────────────────────────────────────────────────────────── */}
      <div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-7 flex-1 space-y-6">

        {/* ── KPI strip ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total articles', value: items.length,    icon: FileText, c: '#1565C0', bg: '#E8F1FD' },
            { label: 'Publiés',        value: totalPublished,  icon: Globe,    c: '#2E7D32', bg: '#EAF5EB' },
            { label: 'Brouillons',     value: totalDraft,      icon: FileEdit, c: '#B45309', bg: '#FEF3E2' },
          ].map(k => (
            <div key={k.label} className="bg-white p-4 flex items-center gap-3.5" style={CARD_STYLE}>
              <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: k.bg, color: k.c }}>
                <k.icon size={18} />
              </span>
              <div>
                {loading
                  ? <div className="h-7 w-12 bg-zinc-100 rounded animate-pulse" />
                  : <p className="text-2xl font-extrabold text-[#18181B] leading-none tabular-nums">{k.value}</p>}
                <p className="text-xs text-zinc-400 mt-1">{k.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter bar ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Status tabs */}
          <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl shrink-0" style={CARD_STYLE}>
            {([['all','Tous'], ['published','Publiés'], ['draft','Brouillons']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setStatusFilter(k)}
                className="px-3.5 h-8 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
                style={statusFilter === k
                  ? { background: '#1B5E20', color: '#fff' }
                  : { border: '1px solid #E7E7EA', color: '#71717A' }}>
                {label}
                {k === 'published' && <span className="ml-1.5 opacity-70">{totalPublished}</span>}
                {k === 'draft' && <span className="ml-1.5 opacity-70">{totalDraft}</span>}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input type="search" placeholder="Rechercher par titre ou slug…"
              value={q} onChange={e => setQ(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#E7E7EA] bg-white text-sm text-[#18181B] outline-none focus:border-[#2E7D32] focus:ring-2 focus:ring-[#2E7D32]/10 transition-colors placeholder:text-zinc-300"
              style={CARD_STYLE} />
          </div>
          <button onClick={() => load()}
            className="h-10 px-4 rounded-xl text-sm font-bold text-white shrink-0 flex items-center gap-1.5 transition-colors"
            style={{ background: '#1B5E20' }}>
            <Search size={13} /> Rechercher
          </button>
        </div>

        {/* ── Articles table ────────────────────────────────────────────────────── */}
        <div className="bg-white overflow-hidden" style={CARD_STYLE}>
          <div className="px-5 py-3.5 border-b border-[#E7E7EA] flex items-center justify-between">
            <span className="text-sm font-bold text-[#18181B]">
              Articles
              {!loading && <span className="ml-2 text-xs font-medium text-zinc-400">({filtered.length})</span>}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[640px]">
              <thead>
                <tr className="text-xs font-bold uppercase tracking-wide text-zinc-400 border-b border-[#E7E7EA] bg-zinc-50/60">
                  <th className="px-5 py-3">Titre</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 hidden md:table-cell">Extrait</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7EA]">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-5 py-4">
                        <div className="h-8 bg-zinc-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#EAF5EB', color: '#2E7D32' }}>
                          <BookOpen size={22} />
                        </span>
                        <p className="text-sm text-zinc-400">
                          {q || statusFilter !== 'all' ? 'Aucun article ne correspond aux filtres' : 'Aucun article — créez le premier'}
                        </p>
                        {!q && statusFilter === 'all' && (
                          <button onClick={newArticle}
                            className="mt-1 h-9 px-4 rounded-lg text-sm font-bold text-white flex items-center gap-1.5"
                            style={{ background: '#2E7D32' }}>
                            <Plus size={13} /> Nouvel article
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(article => {
                    const sp = STATUS_PILL[article.status] ?? STATUS_PILL.draft;
                    return (
                      <tr key={article.id} className="hover:bg-zinc-50/50 transition-colors group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: '#EAF5EB', color: '#2E7D32' }}>
                              <AlignLeft size={14} />
                            </span>
                            <p className="font-semibold text-[#18181B] line-clamp-1 max-w-[200px]">{article.title || '—'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <code className="text-[11px] font-mono text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                            {article.slug || '—'}
                          </code>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ color: sp.c, background: sp.bg }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: sp.c }} />
                            {sp.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <p className="text-xs text-zinc-500 line-clamp-1 max-w-[200px]">{article.excerpt || '—'}</p>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-zinc-400 whitespace-nowrap hidden sm:table-cell">
                          {article.created_at ? formatDate(article.created_at) : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {article.slug && (
                              <a href={`/blog/${article.slug}`} target="_blank" rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-[#1565C0] hover:bg-[#E8F1FD] transition-colors"
                                title="Voir">
                                <Eye size={14} />
                              </a>
                            )}
                            <button onClick={() => setEditing(article)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-[#2E7D32] hover:bg-[#EAF5EB] transition-colors"
                              title="Éditer">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setDeleteId(article.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-[#C62828] hover:bg-[#FEECEC] transition-colors"
                              title="Supprimer">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && items.length === limit && (
            <div className="px-5 py-3 border-t border-[#E7E7EA] flex items-center justify-between">
              <span className="text-xs text-zinc-400">Page {page}</span>
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <button onClick={() => setPage(p => p - 1)}
                    className="h-8 px-3 rounded-lg border border-[#E7E7EA] text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">
                    ← Précédent
                  </button>
                )}
                <button onClick={() => setPage(p => p + 1)}
                  className="h-8 px-3 rounded-lg border border-[#E7E7EA] text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">
                  Suivant →
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
      <AdminFooter />

      {/* ── Editor drawer ─────────────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div className="drawer-enter w-full sm:w-[520px] max-w-full bg-white flex flex-col h-full overflow-hidden shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-center gap-3 px-5 py-4 text-white" style={{ background: ADMIN_GRAD }}>
              <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <BookOpen size={17} />
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base leading-tight">
                  {editing?.id ? 'Modifier l\'article' : 'Nouvel article'}
                </h3>
                <p className="text-white/65 text-xs mt-0.5 truncate">
                  {editing?.id ? `ID #${editing.id} · ${editing.slug || 'slug non défini'}` : 'Remplissez les champs ci-dessous'}
                </p>
              </div>
              <button onClick={() => setEditing(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0">
                <X size={16} />
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

              {/* Titre */}
              <Field label="Titre *">
                <input type="text" placeholder="Titre de l'article" value={editing?.title ?? ''}
                  onChange={e => {
                    const title = e.target.value;
                    setEditing((prev: any) => ({
                      ...prev,
                      title,
                      ...(prev.id ? {} : { slug: toSlug(title) }),
                    }));
                  }}
                  className={inputCls} />
              </Field>

              {/* Slug */}
              <Field label="Slug (URL)">
                <div className="relative">
                  <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  <input type="text" placeholder="mon-article-url" value={editing?.slug ?? ''}
                    onChange={e => setEditing((prev: any) => ({ ...prev, slug: e.target.value }))}
                    className={`${inputCls} pl-8 font-mono`} />
                </div>
              </Field>

              {/* Statut */}
              <Field label="Statut">
                <select value={editing?.status ?? 'draft'}
                  onChange={e => setEditing((prev: any) => ({ ...prev, status: e.target.value }))}
                  className={inputCls}>
                  <option value="draft">Brouillon</option>
                  <option value="published">Publié</option>
                </select>
              </Field>

              {/* Excerpt */}
              <Field label="Résumé (excerpt)">
                <textarea rows={3} placeholder="Court résumé affiché dans les listes…"
                  value={editing?.excerpt ?? ''}
                  onChange={e => setEditing((prev: any) => ({ ...prev, excerpt: e.target.value }))}
                  className={textareaCls} />
              </Field>

              {/* Content */}
              <Field label="Contenu (HTML)">
                <textarea rows={10} placeholder="<p>Contenu de l'article en HTML…</p>"
                  value={editing?.content ?? ''}
                  onChange={e => setEditing((prev: any) => ({ ...prev, content: e.target.value }))}
                  className={textareaCls} />
              </Field>

              <div className="border-t border-[#E7E7EA] pt-4 space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">SEO</p>

                {/* Meta title */}
                <Field label="Meta title">
                  <input type="text" placeholder="Titre pour les moteurs de recherche"
                    value={editing?.meta_title ?? ''}
                    onChange={e => setEditing((prev: any) => ({ ...prev, meta_title: e.target.value }))}
                    className={inputCls} />
                  {editing?.meta_title && (
                    <p className="text-[11px] text-zinc-400 mt-1">
                      {editing.meta_title.length}/60 caractères
                      {editing.meta_title.length > 60 && <span className="ml-1 font-bold text-[#C62828]">· Trop long</span>}
                    </p>
                  )}
                </Field>

                {/* Meta description */}
                <Field label="Meta description">
                  <textarea rows={3} placeholder="Description pour les moteurs de recherche…"
                    value={editing?.meta_description ?? ''}
                    onChange={e => setEditing((prev: any) => ({ ...prev, meta_description: e.target.value }))}
                    className={textareaCls} />
                  {editing?.meta_description && (
                    <p className="text-[11px] text-zinc-400 mt-1">
                      {editing.meta_description.length}/160 caractères
                      {editing.meta_description.length > 160 && <span className="ml-1 font-bold text-[#C62828]">· Trop long</span>}
                    </p>
                  )}
                </Field>
              </div>
            </div>

            {/* Drawer footer */}
            <div className="px-5 py-4 border-t border-[#E7E7EA] bg-zinc-50/60 flex items-center gap-2">
              <button onClick={() => setEditing(null)}
                className="h-10 px-4 rounded-lg border border-[#E7E7EA] text-sm font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors">
                Annuler
              </button>
              <div className="flex-1" />
              {editing?.id && (
                <button onClick={() => setDeleteId(editing.id)}
                  className="h-10 px-4 rounded-lg text-sm font-semibold text-[#C62828] hover:bg-[#FEECEC] transition-colors flex items-center gap-1.5">
                  <Trash2 size={13} /> Supprimer
                </button>
              )}
              <button onClick={save} disabled={saving || !editing?.title}
                className="h-10 px-5 rounded-lg text-sm font-bold text-white flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                style={{ background: '#2E7D32' }}>
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ──────────────────────────────────────────────────── */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(16,24,40,0.55)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm bg-white sm:rounded-2xl rounded-t-2xl overflow-hidden" style={CARD_STYLE}>
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ background: '#FEECEC', color: '#C62828' }}>
                <Trash2 size={22} />
              </div>
              <h3 className="text-base font-bold text-[#18181B]">Supprimer cet article ?</h3>
              <p className="text-sm text-zinc-500 mt-1.5">Cette action est irréversible.</p>
            </div>
            <div className="px-6 pb-6 flex items-center gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 h-10 rounded-xl border border-[#E7E7EA] text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">
                Annuler
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                className="flex-1 h-10 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
                style={{ background: '#C62828' }}>
                {deleting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
