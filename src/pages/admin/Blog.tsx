import { useEffect, useState } from 'react';
import AdminFooter from '@/components/admin/AdminFooter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function AdminBlog() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (q) params.set('q', q);
      const res = await fetch(`${API_BASE}/api/admin/articles?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      setItems(j.articles || []);
    } catch (e) { console.error(e); setItems([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page]);

  const newArticle = () => setEditing({ title: '', slug: '', excerpt: '', content: '', meta_title: '', meta_description: '', status: 'draft' });

  const save = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!editing) return;
      const method = editing.id ? 'PUT' : 'POST';
      const url = editing.id ? `${API_BASE}/api/admin/articles/${editing.id}` : `${API_BASE}/api/admin/articles`;
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(editing) });
      if (!res.ok) throw new Error('Save failed');
      await load();
      setEditing(null);
    } catch (e) { console.error(e); alert('Erreur'); }
  };

  const remove = async (id: number) => {
    if (!confirm('Supprimer cet article ?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/articles/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Delete failed');
      await load();
    } catch (e) { console.error(e); alert('Erreur'); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Blog</h1>
          <div>
            <Button onClick={newArticle}>Nouvel article</Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex gap-4 items-end">
              <div>
                <Label>Recherche</Label>
                <Input value={q} onChange={e => setQ(e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <Select onValueChange={() => {}}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="published">Publié</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Button onClick={() => load()}>Rechercher</Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Articles ({items.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <div>Chargement…</div> : (
                  <div className="space-y-4">
                    {items.map(it => (
                      <div key={it.id} className="p-4 border rounded flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{it.title}</div>
                          <div className="text-sm text-gray-500">{it.slug} — {it.status}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => setEditing(it)}>Éditer</Button>
                          <Button variant="destructive" onClick={() => remove(it.id)}>Supprimer</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>{editing ? (editing.id ? 'Éditer' : 'Nouveau') : 'Éditeur'}</CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <div className="space-y-3">
                    <div>
                      <Label>Titre</Label>
                      <Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} />
                    </div>
                    <div>
                      <Label>Slug</Label>
                      <Input value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value })} />
                    </div>
                    <div>
                      <Label>Excerpt</Label>
                      <Textarea value={editing.excerpt} onChange={e => setEditing({ ...editing, excerpt: e.target.value })} />
                    </div>
                    <div>
                      <Label>Contenu (HTML)</Label>
                      <Textarea value={editing.content} onChange={e => setEditing({ ...editing, content: e.target.value })} />
                    </div>
                    <div>
                      <Label>Meta title</Label>
                      <Input value={editing.meta_title} onChange={e => setEditing({ ...editing, meta_title: e.target.value })} />
                    </div>
                    <div>
                      <Label>Meta description</Label>
                      <Textarea value={editing.meta_description} onChange={e => setEditing({ ...editing, meta_description: e.target.value })} />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select onValueChange={(v) => setEditing({ ...editing, status: v })}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Brouillon</SelectItem>
                          <SelectItem value="published">Publié</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={save}>Enregistrer</Button>
                      <Button variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Sélectionnez un article ou créez-en un nouveau.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
      <AdminFooter />
    </div>
  );
}
