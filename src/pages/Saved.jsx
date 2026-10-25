import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Newspaper, Handshake, Image as ImageIcon, MessageSquare, Music } from 'lucide-react';
import { PageHead, Avatar, Tag, EmptyState } from '../components/ui';
import { Opps, Posts, Directory, Tracks } from '../lib/api';
import { useStore } from '../store/store';

/* Bookmarks store {kind, id} locally. Resolve each id against the real API.
 * Entries that no longer resolve (e.g. pre-launch demo bookmarks) are dropped. */

function useResolvedBookmarks(bookmarks) {
  const [resolved, setResolved] = useState({});
  useEffect(() => {
    let alive = true;
    (async () => {
      const out = {};
      let articles = [];
      if (bookmarks.some((b) => b.kind === 'article')) {
        try {
          const r = await Directory.articles({ take: 100 });
          articles = r.items || [];
        } catch {
          articles = [];
        }
      }
      await Promise.all(bookmarks.map(async (b) => {
        const key = `${b.kind}:${b.id}`;
        let item = null;
        try {
          if (b.kind === 'opp') item = await Opps.get(b.id);
          else if (b.kind === 'post' || b.kind === 'media') item = await Posts.get(b.id);
          else if (b.kind === 'track') item = await Tracks.get(b.id);
          else if (b.kind === 'article') item = articles.find((a) => a.id === b.id) || null;
          else if (b.kind === 'live') item = b.data ? { id: b.id, ...b.data } : null;
        } catch {
          item = null;
        }
        out[key] = item || null;
      }));
      if (alive) setResolved(out);
    })();
    return () => { alive = false; };
  }, [bookmarks]);
  return resolved;
}

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'gighub', label: 'Gighub', kinds: ['media', 'track'] },
  { id: 'collab', label: 'Collab', kinds: ['opp'] },
  { id: 'news', label: 'News', kinds: ['article', 'live'] },
  { id: 'posts', label: 'Posts', kinds: ['post'] },
];

export default function Saved() {
  const { bookmarks, toggleBookmark, pushToast } = useStore();
  const navigate = useNavigate();
  const resolved = useResolvedBookmarks(bookmarks);
  const [tab, setTab] = useState('all');

  const unsave = (kind, id) => { toggleBookmark(kind, id); pushToast('Removed from bookmarks.'); };
  const itemsFor = (kind) => bookmarks
    .filter((b) => b.kind === kind)
    .map((b) => resolved[`${b.kind}:${b.id}`])
    .filter(Boolean);

  const groups = [
    {
      kind: 'opp', title: 'Opportunities', icon: Handshake,
      items: itemsFor('opp'),
      render: (o) => (
        <div className="opp-card" key={o.id}>
          <b style={{ fontSize: 14.5 }}>{o.title}</b>
          <div style={{ margin: '6px 0' }}><Tag color="blue">{o.type || 'Opportunity'}</Tag> {o.city && <Tag color="sky">{o.city}</Tag>}</div>
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>{o.desc || o.description}</p>
        </div>
      ),
    },
    {
      kind: 'article', title: 'Articles', icon: Newspaper,
      items: itemsFor('article'),
      render: (a) => (
        <div className="article-card" key={a.id} onClick={() => navigate(`/news/${a.id}`)}>
          <Tag color="blue">{a.cat || a.category || 'News'}</Tag>
          <h4 style={{ fontSize: 15.5, margin: '8px 0 6px' }}>{a.title}</h4>
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>{a.excerpt}</p>
        </div>
      ),
    },
    {
      kind: 'live', title: 'Headlines saved from Gigset Daily', icon: Newspaper,
      items: itemsFor('live'),
      render: (n) => (
        <a className="article-card" key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
          <Tag color="indigo">{n.source || 'Live'}</Tag>
          <h4 style={{ fontSize: 15.5, margin: '8px 0 0' }}>{n.title}</h4>
        </a>
      ),
    },
    {
      kind: 'media', title: 'Gighub clips', icon: ImageIcon,
      items: itemsFor('media'),
      render: (p) => {
        const name = p.author?.name || 'Gigset member';
        const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(p.mediaUrl || '');
        return (
          <div className="media-tile" key={p.id} onClick={() => navigate(`/profile/${p.author?.id}`)} style={{ cursor: 'pointer' }}>
            <div className="media-thumb" style={{ aspectRatio: '16/9' }}>
              {p.mediaUrl && !isVideo && (
                <img src={p.mediaUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <div className="media-badges-row" style={{ position: 'relative' }}>
                <span className="media-kind-badge">{isVideo ? 'Video' : 'Photo'}</span>
              </div>
              <div className="media-overlay" style={{ position: 'relative' }}>
                <div className="who"><Avatar name={name} size={24} /><div><b>{name}</b></div></div>
                <p>{p.body}</p>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      kind: 'track', title: 'Tracks', icon: Music,
      items: itemsFor('track'),
      render: (t) => {
        const uname = t.uploader?.name || t.author?.name || 'Gigset member';
        return (
          <div className="media-tile" key={t.id}>
            <div className="media-thumb" style={{ aspectRatio: '16/9', background: 'var(--gradient-card)' }}>
              <div style={{ position: 'relative' }}><Tag color="blue">Track</Tag></div>
              <div style={{ position: 'relative', color: '#fff' }}>
                <b style={{ fontSize: 14.5, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title || 'Untitled track'}</b>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{uname}</div>
              </div>
              {t.audioUrl ? (
                <audio controls src={t.audioUrl} preload="none" style={{ width: '100%', position: 'relative' }} />
              ) : (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', position: 'relative' }}>No audio attached</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      kind: 'post', title: 'Posts', icon: MessageSquare,
      items: itemsFor('post'),
      render: (p) => {
        const name = p.author?.name || p.who || 'Gigset member';
        const sub = p.author ? `${p.author.stakeholderType || ''}`.trim() : `${p.role || ''} · ${p.time || ''}`;
        return (
          <div className="post-card" key={p.id}>
            <div className="post-head"><Avatar name={name} size={32} /><div className="who"><b>{name}</b><span>{sub}</span></div></div>
            <div className="post-body">{p.body}</div>
          </div>
        );
      },
    },
  ];

  const total = groups.reduce((a, g) => a + g.items.length, 0);
  const activeTab = TABS.find((t) => t.id === tab) || TABS[0];
  const visibleGroups = tab === 'all' ? groups : groups.filter((g) => activeTab.kinds.includes(g.kind));
  const visibleTotal = visibleGroups.reduce((a, g) => a + g.items.length, 0);

  return (
    <div>
      <PageHead title="Saved" sub="Your bookmarks collection — opportunities, articles, clips, tracks and posts, in one place." />
      <div className="filter-row">
        {TABS.map((t) => (
          <button key={t.id} className={`filter-chip${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {total === 0 ? (
        <EmptyState
          icon={<Bookmark size={22} />}
          title="Nothing saved yet"
          text="Tap Save on any opportunity, article, clip, track or post and it will land here for later."
          action={<button className="btn btn-blue btn-sm" onClick={() => navigate('/collab')}>Browse Collab</button>}
        />
      ) : visibleTotal === 0 ? (
        <EmptyState
          icon={<Bookmark size={22} />}
          title={`Nothing saved in ${activeTab.label}`}
          text="Tap Save on items across the app to build this folder."
        />
      ) : visibleGroups.filter((g) => g.items.length > 0).map((g) => (
        <div key={g.kind} style={{ marginBottom: 28 }}>
          <h4 style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <g.icon size={15} style={{ color: 'var(--blue)' }} /> {g.title} ({g.items.length})
          </h4>
          <div style={['media', 'track'].includes(g.kind) ? { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 } : undefined}>
            {g.items.map((item) => (
              <div key={item.id} style={{ position: 'relative' }}>
                {g.render(item)}
                <button
                  className="btn btn-ghost btn-xs"
                  style={{ position: 'absolute', top: 10, right: 10 }}
                  onClick={() => unsave(g.kind, item.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
