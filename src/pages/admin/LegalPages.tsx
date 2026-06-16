import { useEffect, useState } from 'react';
import AdminFooter from '@/components/admin/AdminFooter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
const defaultSlugs = ['mentions-legales','rgpd','cgu','cgv'];

export default function LegalPages() {
  const [pages, setPages] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/pages`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      setPages(j.pages || []);
    } catch (e) { console.error(e); setPages([]); }
  };

  useEffect(() => { load(); }, []);

  const edit = async (slug: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/public/pages/${slug}`);
      const j = await res.json();
      setEditing(j.page || { slug, title: '', content: '' });
    } catch (e) { setEditing({ slug, title: '', content: '' }); }
  };

  const save = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/pages/${editing.slug}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(editing) });
      if (!res.ok) throw new Error('Save failed');
      await load();
      setEditing(null);
    } catch (e) { console.error(e); alert('Erreur'); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-10">
        <h1 className="text-2xl font-bold mb-6">Pages légales</h1>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex gap-2">
              {defaultSlugs.map(s => (
                <Button key={s} onClick={() => edit(s)}>{s}</Button>
              ))}
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Édition</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <Label>Slug</Label>
                  <Input value={editing.slug} disabled />
                </div>
                <div>
                  <Label>Title</Label>
                  <Input value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} />
                </div>
                <div>
                  <Label>Contenu (HTML)</Label>
                  <Textarea value={editing.content || ''} onChange={e => setEditing({ ...editing, content: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={save}>Enregistrer</Button>
                  <Button variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">Choisissez une page à éditer.</div>
            )}
          </CardContent>
        </Card>
      </div>
      <AdminFooter />
    </div>
  );
}
