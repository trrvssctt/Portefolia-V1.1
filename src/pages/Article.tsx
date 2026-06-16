import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function Article() {
  const { slug } = useParams();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/articles/${slug}`);
      if (!res.ok) return setArticle(null);
      const j = await res.json();
      setArticle(j.article || null);
    } catch (e) { console.error(e); setArticle(null); }
    setLoading(false);
  };

  useEffect(() => { if (slug) load(); }, [slug]);

  if (loading) return <div className="max-w-4xl mx-auto py-12">Chargement…</div>;
  if (!article) return <div className="max-w-4xl mx-auto py-12">Article introuvable</div>;

  return (
    <div className="max-w-4xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-4">{article.title}</h1>
      <p className="text-sm text-gray-500 mb-6">{new Date(article.published_at || article.created_at).toLocaleDateString('fr-FR')}</p>
      <div dangerouslySetInnerHTML={{ __html: article.content || '' }} />
    </div>
  );
}
