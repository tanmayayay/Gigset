import { useCallback, useEffect, useState } from 'react';
import { Search, Trash2, EyeOff, Eye, Lock } from 'lucide-react';
import { Admin } from '../../lib/api';
import { Confirm } from './People';
import { useStore } from '../../store/store';

const KINDS = [['posts', 'Feed posts'], ['community', 'Community posts'], ['opportunities', 'Gigs']];
const when = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export default function Content() {
  const { pushToast } = useStore();
  const [kind, setKind] = useState('posts');
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [ask, setAsk] = useState(null);
  const load = useCallback(() => { setData(null); Admin.content({ kind, search: q, take: 30 }).then(setData).catch((e) => pushToast(e.message, 'error')); }, [kind, q, pushToast]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const run = async (fn, ok) => { try { await fn(); pushToast(ok); setAsk(null); load(); } catch (e) { pushToast(e.message, 'error'); } };
  return (
    <div className="ad-stack">
      <div className="ad-row-head"><div><h2>Content</h2><p>Everything people have posted. Remove anything that does not belong.</p></div></div>
      <div className="ad-filters">
        <div className="ad-seg">{KINDS.map(([v, l]) => <button key={v} className={kind === v ? 'on' : ''} onClick={() => setKind(v)}>{l}</button>)}</div>
        <span className="ad-search"><Search size={15} /><input className="ad-input" placeholder="Search words" value={q} onChange={(e) => setQ(e.target.value)} /></span>
      </div>
      <div className="ad-list">
        {!data ? <div className="shimmer-strip" style={{ height: 160, borderRadius: 12 }} /> : data.items.length === 0 ? <p className="ad-empty">Nothing found.</p> : data.items.map((it) => (
          <div key={it.id} className={`ad-item${it.removed ? ' gone' : ''}`}>
            <div className="ad-item-main">
              <b>{kind === 'posts' ? (it.body || '(photo only)').slice(0, 160) : it.title}</b>
              {kind !== 'posts' && (it.body || it.description) && <p>{(it.body || it.description).slice(0, 160)}</p>}
              {it.mediaUrl && <a href={it.mediaUrl} target="_blank" rel="noopener noreferrer" className="ad-thumb"><img src={it.mediaUrl} alt="" loading="lazy" /></a>}
              <span>{(it.author || it.poster)?.name} · {when(it.createdAt)}{it.group ? ` · in ${it.group.name}` : ''}{it.city ? ` · ${it.city}` : ''}{it._count ? ` · ${it._count.likes ?? it._count.applications} ${it._count.likes != null ? 'likes' : 'applied'}` : ''}{it.status ? ` · ${it.status}` : ''}{it.visibility === 'CONNECTIONS' ? ' · connections only' : ''}{it.removed ? ' · removed' : ''}</span>
            </div>
            <div className="ad-item-act">
              {kind === 'posts' && <button className="btn btn-danger btn-sm" onClick={() => setAsk({ title: 'Delete this post?', text: 'It disappears for everyone, with its comments and likes.', go: () => run(() => Admin.deletePost(it.id), 'Post deleted.') })}><Trash2 size={14} /> Delete</button>}
              {kind === 'community' && (it.removed
                ? <button className="btn btn-ghost btn-sm" onClick={() => run(() => Admin.removeCommunityPost(it.id, false), 'Restored.')}><Eye size={14} /> Restore</button>
                : <button className="btn btn-danger btn-sm" onClick={() => run(() => Admin.removeCommunityPost(it.id, true), 'Hidden.')}><EyeOff size={14} /> Hide</button>)}
              {kind === 'opportunities' && <>
                {it.status === 'OPEN' && <button className="btn btn-ghost btn-sm" onClick={() => run(() => Admin.closeOpp(it.id), 'Gig closed.')}><Lock size={14} /> Close</button>}
                <button className="btn btn-danger btn-sm" onClick={() => setAsk({ title: 'Delete this gig?', text: 'Its applications are deleted too.', go: () => run(() => Admin.deleteOpp(it.id), 'Gig deleted.') })}><Trash2 size={14} /> Delete</button></>}
            </div>
          </div>
        ))}
      </div>
      {ask && <Confirm title={ask.title} text={ask.text} action="Yes, delete" danger onClose={() => setAsk(null)} onYes={ask.go} />}
    </div>
  );
}
