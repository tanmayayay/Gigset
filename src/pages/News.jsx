import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, ExternalLink, Layers, LayoutList, Clock, Newspaper } from 'lucide-react';
import { EmptyState } from '../components/ui';
import SwipeDeck from '../components/news/SwipeDeck';
import NewsCover, { topicOf } from '../components/news/NewsCover';
import NewsReader from '../components/news/NewsReader';
import { CATEGORY_LABELS, REGIONS, fromLive, fromArticle, kindOf, snapshotOf, tidy } from '../lib/news';
import { Directory, NewsLive } from '../lib/api';
import { timeAgo } from '../lib/format';
import { useStore } from '../store/store';
import './news.css';

// v2: older saved choices are ignored so every device starts on its own default.
const MODE_KEY = 'strings.newsMode.v2';

/** Phones and tablets (touch, no hover) open on the swipe deck; computers on the list. */
function defaultMode() {
  try {
    const touch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    return touch || window.innerWidth < 768 ? 'swipe' : 'list';
  } catch {
    return 'list';
  }
}

export default function News() {
  const { isBookmarked, toggleBookmark, pushToast, user } = useStore();
  const [mode, setModeState] = useState(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY);
      return saved === 'swipe' || saved === 'list' ? saved : defaultMode();
    } catch { return defaultMode(); }
  });
  // Remember a choice only when the person makes one; otherwise each device uses its default.
  const setMode = useCallback((m) => {
    setModeState(m);
    try { localStorage.setItem(MODE_KEY, m); } catch { /* ignore */ }
  }, []);
  const [topic, setTopic] = useState('all');
  const [region, setRegion] = useState('all');
  const [reading, setReading] = useState(null);
  const [live, setLive] = useState([]);
  const [articles, setArticles] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);


  useEffect(() => {
    let off = false;
    setLoading(true);
    setError('');
    Promise.allSettled([NewsLive.get(), Directory.articles({ take: 40 })]).then(([l, a]) => {
      if (off) return;
      if (l.status === 'fulfilled') { setLive(l.value.items || []); setUpdatedAt(l.value.updatedAt || null); }
      if (a.status === 'fulfilled') setArticles(a.value.items || []);
      if (l.status === 'rejected' && a.status === 'rejected') setError(a.reason?.message || 'Could not load stories.');
      setLoading(false);
    });
    return () => { off = true; };
  }, [reloadKey]);

  const all = useMemo(() => {
    const seen = new Set();
    const merged = [...live.map(fromLive), ...articles.map(fromArticle)];
    return merged.filter((it) => {
      const k = it.title.toLowerCase().slice(0, 60);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [live, articles]);

  const inRegion = useMemo(() => (region === 'all' ? all : all.filter((it) => it.region === region)), [all, region]);
  const cats = useMemo(() => {
    const n = {};
    inRegion.forEach((it) => { n[it.category] = (n[it.category] || 0) + 1; });
    return Object.entries(n).sort((x, y) => y[1] - x[1]);
  }, [inRegion]);
  const items = useMemo(
    () => (topic === 'all' ? inRegion : inRegion.filter((it) => it.category === topic)),
    [inRegion, topic],
  );

  const isSaved = useCallback((it) => isBookmarked(kindOf(it), it.rawId), [isBookmarked]);
  const save = useCallback((it) => {
    toggleBookmark(kindOf(it), it.rawId, it.isLive ? snapshotOf(it) : undefined);
  }, [toggleBookmark]);
  const unsave = useCallback((it) => { if (isBookmarked(kindOf(it), it.rawId)) toggleBookmark(kindOf(it), it.rawId); }, [isBookmarked, toggleBookmark]);
  const read = useCallback((it) => setReading(it), []);

  const toggleSaveList = (e, it) => {
    e.stopPropagation();
    const now = toggleBookmark(kindOf(it), it.rawId, it.isLive ? snapshotOf(it) : undefined);
    pushToast(now ? 'Saved for later.' : 'Removed from saved.');
  };

  const [hero, ...rest] = items;

  return (
    <div className="news-page">
      <header className="news-head">
        <div>
          <span className="news-kicker"><span className="dot" /> Strings Daily</span>
          <h1>Today in Indian music</h1>
          <p>
            {all.length} stories{updatedAt ? ` · updated ${timeAgo(updatedAt)}` : ''} · swipe right to open, up to save, left to pass
          </p>
        </div>
        <div className="news-mode" role="tablist" aria-label="View">
          <button role="tab" aria-selected={mode === 'swipe'} className={mode === 'swipe' ? 'on' : ''} onClick={() => setMode('swipe')}>
            <Layers size={15} /> Swipe
          </button>
          <button role="tab" aria-selected={mode === 'list'} className={mode === 'list' ? 'on' : ''} onClick={() => setMode('list')}>
            <LayoutList size={15} /> List
          </button>
        </div>
      </header>

      {user && user.content && !user.content.hasBirthDate && (
        <div className="news-age-note">Add your date of birth so stories suit your age. <Link to="/settings">Add it in Settings</Link></div>
      )}

      <div className="news-region" role="tablist" aria-label="Region">
        {REGIONS.map((r) => (
          <button key={r.id} role="tab" aria-selected={region === r.id} className={region === r.id ? 'on' : ''} onClick={() => { setRegion(r.id); setTopic('all'); }}>
            {r.label}
          </button>
        ))}
      </div>
      <div className="news-topics">
        <button className={`filter-chip${topic === 'all' ? ' active' : ''}`} onClick={() => setTopic('all')}>
          All <span className="news-topic-n">{inRegion.length}</span>
        </button>
        {cats.map(([c, n]) => (
          <button key={c} className={`filter-chip${topic === c ? ' active' : ''}`} onClick={() => setTopic(c)}>
            {CATEGORY_LABELS[c] || c} <span className="news-topic-n">{n}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="deck-skel shimmer-strip" />
      ) : error ? (
        <EmptyState
          icon={<Clock size={22} />}
          title="Could not load stories"
          text={error}
          action={<button className="btn btn-blue btn-sm" onClick={() => setReloadKey((k) => k + 1)}>Retry</button>}
        />
      ) : items.length === 0 ? (
        <EmptyState icon={<Newspaper size={22} />} title="No stories here" text="Try a different topic — new stories land every few hours." />
      ) : mode === 'swipe' ? (
        <SwipeDeck
          key={`${region}-${topic}`}
          items={items}
          isSaved={isSaved}
          onSave={(it) => { save(it); }}
          onUnsave={unsave}
          onRead={read}
          onSwitchToList={() => setMode('list')}
        />
      ) : (
        <div className="news-list">
          {hero && (
            <article className="news-hero" onClick={() => read(hero)}>
              <NewsCover item={hero} large />
              <div className="news-hero-text">
                <span className="news-pill">{topicOf(hero)}</span>
                <h2>{hero.title}</h2>
                {hero.excerpt && <p>{tidy(hero.excerpt)}</p>}
                <div className="news-row-meta">
                  <span>{hero.source}{hero.publishedAt ? ` · ${timeAgo(hero.publishedAt)}` : ''}</span>
                  <SaveBtn it={hero} saved={isSaved(hero)} onClick={toggleSaveList} light />
                </div>
              </div>
            </article>
          )}
          <div className="news-grid">
            {rest.map((it) => (
              <article key={it.id} className="news-tile" onClick={() => read(it)}>
                <div className="news-tile-cover"><NewsCover item={it} /></div>
                <div className="news-tile-body">
                  <span className="news-pill subtle">{topicOf(it)}</span>
                  <h3>{it.title}</h3>
                  <div className="news-row-meta">
                    <span>
                      {it.source}{it.publishedAt ? ` · ${timeAgo(it.publishedAt)}` : ''}
                      {it.isLive && <ExternalLink size={11} style={{ marginLeft: 4, verticalAlign: -1 }} />}
                    </span>
                    <SaveBtn it={it} saved={isSaved(it)} onClick={toggleSaveList} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
      {reading && (
        <NewsReader
          item={reading}
          saved={isSaved(reading)}
          onToggleSave={(it) => { const now = toggleBookmark(kindOf(it), it.rawId, it.isLive ? snapshotOf(it) : undefined); pushToast(now ? 'Saved for later.' : 'Removed from saved.'); }}
          onClose={() => setReading(null)}
        />
      )}
    </div>
  );
}

function SaveBtn({ it, saved, onClick, light }) {
  return (
    <button
      className={`news-save${saved ? ' on' : ''}${light ? ' light' : ''}`}
      onClick={(e) => onClick(e, it)}
      aria-label={saved ? 'Remove from saved' : 'Save for later'}
      aria-pressed={saved}
    >
      <Bookmark size={15} fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
}
