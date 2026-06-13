import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function Blog() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/articles?limit=20`);
      const j = await res.json();
      setItems(j.articles || []);
    } catch (e) { console.error(e); setItems([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-4xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-6">Blog</h1>
      {loading ? <div>Chargement…</div> : (
        <div className="space-y-6">
          {items.map(a => (
            <article key={a.id} className="p-4 border rounded">
              <h2 className="text-xl font-semibold"><Link to={`/blog/${a.slug}`}>{a.title}</Link></h2>
              <p className="text-sm text-gray-500">{new Date(a.published_at || a.created_at).toLocaleDateString('fr-FR')}</p>
              <p className="mt-2 text-gray-700">{a.excerpt}</p>
              <div className="mt-3">
                <Link to={`/blog/${a.slug}`} className="text-primary-600 underline">Lire</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
