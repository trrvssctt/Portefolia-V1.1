import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowLeft, BookOpen } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const BLOG_CATS = ['Tous', 'Conseils carrière', 'Produit', 'NFC & tech', 'Études de cas'];

function BlogImg({ src, className }: { src?: string; className: string }) {
  const [ok, setOk] = useState(!!src);
  if (src && ok) {
    return (
      <div className={`overflow-hidden bg-zinc-100 ${className}`}>
        <img src={src} onError={() => setOk(false)}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
      </div>
    );
  }
  return (
    <div className={`flex items-center justify-center bg-[#E8F5E9] ${className}`}>
      <BookOpen size={28} className="text-[#1B5E20] opacity-50" />
    </div>
  );
}

function PostCard({ post }: { post: any }) {
  const slug = post.slug || String(post.id);
  const date = post.published_at || post.created_at;
  const category = post.category || 'Produit';
  return (
    <Link to={`/blog/${slug}`}
      className="group rounded-2xl border border-[#E7E7EA] overflow-hidden flex flex-col hover:shadow-[0_8px_30px_rgba(16,24,40,0.07)] transition-shadow">
      <BlogImg src={post.cover_image_url || post.image} className="h-44" />
      <div className="p-5 flex flex-col flex-1">
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#1B5E20' }}>{category}</span>
        <h3 className="font-bold text-[#18181B] mt-1.5 leading-snug">{post.title}</h3>
        <p className="text-sm text-[#18181B]/60 mt-2 leading-relaxed flex-1">{post.excerpt}</p>
        <div className="flex items-center gap-2 mt-4 text-xs text-[#71717A]">
          {post.author && <span className="font-medium text-[#18181B]/80">{post.author}</span>}
          {post.author && date && <span>·</span>}
          {date && <span>{new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
        </div>
      </div>
    </Link>
  );
}

export default function Blog() {
  const [items, setItems]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat]       = useState('Tous');

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/articles?limit=20`)
      .then(r => r.json())
      .then(j => setItems(j.articles || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const displayed = cat === 'Tous'
    ? items
    : items.filter(p => (p.category || '').toLowerCase() === cat.toLowerCase());

  const [featured, ...rest] = displayed;

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <header className="relative overflow-hidden border-b border-[#E7E7EA]">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(70% 60% at 50% -20%, #E8F5E9, transparent 70%)' }} />
        <div className="relative max-w-4xl mx-auto px-5 sm:px-8 pt-14 sm:pt-20 pb-12 text-center">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#71717A] hover:text-[#18181B] transition-colors mb-5">
            <ArrowLeft size={13} /> Accueil <span className="text-[#D4D4D8] mx-1">/</span>
            <span className="text-[#18181B]">Blog</span>
          </Link>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-3" style={{ color: '#1B5E20' }}>Le journal</p>
          <h1 className="font-serif text-[#18181B] leading-[1.0] tracking-tight mx-auto"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>Le blog Portefolia</h1>
          <p className="mt-4 text-lg text-[#18181B]/65 max-w-xl mx-auto leading-relaxed">
            Conseils carrière, nouveautés produit et coulisses de la tech NFC.
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-12">

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {BLOG_CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-3.5 h-9 rounded-full text-sm font-medium transition-colors ${cat === c ? 'text-white' : 'border border-[#E7E7EA] text-[#18181B]/70 hover:bg-zinc-50'}`}
              style={cat === c ? { background: '#18181B' } : undefined}>
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-2xl border border-[#E7E7EA] overflow-hidden animate-pulse">
                <div className="h-44 bg-zinc-100" />
                <div className="p-5 space-y-2">
                  <div className="h-3 bg-zinc-100 rounded w-20" />
                  <div className="h-4 bg-zinc-100 rounded w-full" />
                  <div className="h-3 bg-zinc-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#71717A] text-sm">Aucun article disponible pour l'instant.</p>
          </div>
        ) : (
          <>
            {/* Featured article (first post, Tous only) */}
            {cat === 'Tous' && featured && (
              <Link to={`/blog/${featured.slug || featured.id}`}
                className="group grid md:grid-cols-2 gap-6 rounded-2xl border border-[#E7E7EA] overflow-hidden mb-10 hover:shadow-[0_10px_36px_rgba(16,24,40,0.08)] transition-shadow">
                <BlogImg src={featured.cover_image_url || featured.image} className="h-52 md:h-full" />
                <div className="p-6 sm:p-8 flex flex-col justify-center">
                  <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md self-start"
                    style={{ background: '#E8F5E9', color: '#1B5E20' }}>
                    {featured.category || 'Produit'}
                  </span>
                  <h2 className="font-serif text-[#18181B] leading-tight tracking-tight mt-3"
                    style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}>{featured.title}</h2>
                  <p className="text-[#18181B]/60 mt-3 leading-relaxed">{featured.excerpt}</p>
                  {(featured.author || featured.published_at) && (
                    <div className="flex items-center gap-2 mt-5 text-sm text-[#71717A]">
                      {featured.author && <span className="font-medium text-[#18181B]">{featured.author}</span>}
                      {featured.author && featured.published_at && <span>·</span>}
                      {featured.published_at && <span>{new Date(featured.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                    </div>
                  )}
                </div>
              </Link>
            )}

            {/* Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(cat === 'Tous' ? rest : displayed).map(post => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </>
        )}

        {/* Newsletter strip */}
        <div className="mt-12 rounded-2xl border border-[#E7E7EA] p-7 sm:p-8 flex flex-col sm:flex-row items-center gap-5 bg-zinc-50/60">
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-bold text-[#18181B] text-lg">Recevez nos articles</h3>
            <p className="text-sm text-[#71717A] mt-1">Un email par mois, zéro spam. Conseils carrière et nouveautés.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              placeholder="vous@email.com"
              className="flex-1 sm:w-56 h-11 px-3.5 rounded-xl border border-[#E7E7EA] outline-none text-sm focus:border-[#18181B]/30"
            />
            <button className="h-11 px-5 rounded-xl text-sm font-semibold text-white shrink-0"
              style={{ background: '#2E7D32' }}>S'abonner</button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
