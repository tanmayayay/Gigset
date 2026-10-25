import { useEffect, useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Bookmark, Share2, ChevronRight } from 'lucide-react';
import { Tag, EmptyState } from '../components/ui';
import { Directory } from '../lib/api';
import { timeAgo } from '../lib/format';
import { useStore } from '../store/store';

export default function NewsArticle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isBookmarked, toggleBookmark, pushToast } = useStore();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Directory.article(id)
      .then((a) => {
        if (cancelled) return;
        setArticle(a);
        if (a.category) {
          Directory.articles({ category: a.category, take: 4 })
            .then((d) => {
              if (!cancelled) setRelated((d.items || []).filter((x) => x.id !== a.id).slice(0, 3));
            })
            .catch(() => {});
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Could not load the story.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="article-layout">
        <div>
          <div className="skel-line shimmer-strip" style={{ width: '30%' }} />
          <div className="skel-line shimmer-strip" style={{ width: '90%', height: 28 }} />
          <div className="skel-line shimmer-strip" style={{ width: '100%' }} />
          <div className="skel-line shimmer-strip" style={{ width: '100%' }} />
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <EmptyState
        icon={<Clock size={22} />}
        title="Article not found"
        text={error || 'This story may have been moved.'}
        action={<button className="btn btn-blue btn-sm" onClick={() => navigate('/news')}>Back to News</button>}
      />
    );
  }

  const saved = isBookmarked('article', article.id);
  const authorName = article.author?.name || 'Gigset newsroom';
  const words = (article.body || '').split(/\s+/).filter(Boolean).length;
  const paragraphs = (article.body || '').split(/\n+/).filter((p) => p.trim());

  return (
    <div className="article-layout">
      <div>
        <button className="wall-back" onClick={() => navigate('/news')}><ArrowLeft size={15} /> All news</button>
        <div className="article-hero">
          <div style={{ position: 'relative' }}>
            {article.category && <Tag color="gray">{article.category}</Tag>}
            <h1>{article.title}</h1>
            <p>By {authorName} · Published {timeAgo(article.publishedAt || article.createdAt)} · {Math.max(1, Math.round(words / 200))} min read</p>
          </div>
        </div>
        <div className="article-body">
          {article.excerpt && <p className="lede">{article.excerpt}</p>}
          {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          <div className="divider" />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { const s = toggleBookmark('article', article.id); pushToast(s ? 'Article saved.' : 'Removed from saved.'); }}
              style={saved ? { color: 'var(--amber)', borderColor: 'var(--amber)' } : undefined}
            >
              <Bookmark size={14} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save article'}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                try {
                  navigator.clipboard.writeText(window.location.href);
                  pushToast('Share link copied to clipboard.');
                } catch {
                  pushToast('Could not copy the link.', 'error');
                }
              }}
            >
              <Share2 size={14} /> Share
            </button>
          </div>
        </div>
      </div>
      <div>
        <div className="side-card">
          <h4>More in {article.category || 'News'}</h4>
          {related.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>No related stories yet.</p>
          ) : related.map((r) => (
            <Link key={r.id} to={`/news/${r.id}`} className="mini-list-item" style={{ alignItems: 'flex-start' }}>
              <div><b style={{ fontWeight: 500, lineHeight: 1.4 }}>{r.title}</b><span>{timeAgo(r.publishedAt || r.createdAt)}</span></div>
              <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--text-faint)', flexShrink: 0 }} />
            </Link>
          ))}
        </div>
        <div className="side-card">
          <h4>Daily digest</h4>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 12 }}>Ten stories, every morning at 6 AM. Never miss what moves the industry.</p>
          <button className="btn btn-blue btn-sm" style={{ width: '100%' }} onClick={() => pushToast('Subscribed — see you at 6 AM.')}>Get the digest</button>
        </div>
      </div>
    </div>
  );
}
