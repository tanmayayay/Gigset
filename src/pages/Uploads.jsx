import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Trash2, Image as ImageIcon, Briefcase, Users, Grid3x3 } from 'lucide-react';
import { PageHead, EmptyState, Modal } from '../components/ui';
import { useStore } from '../store/store';
import { Mine, Posts, Opps, Communities } from '../lib/api';
import './uploads.css';

const when = (iso) => { try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };
const short = (t, n = 90) => (t && t.length > n ? `${t.slice(0, n)}…` : t || '');

function Confirm({ text, busy, onYes, onNo }) {
  return (
    <div className="up-confirm">
      <span>{text}</span>
      <div><button className="btn btn-ghost btn-sm" onClick={onNo} disabled={busy}>Keep it</button>
        <button className="btn btn-sm up-danger" onClick={onYes} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</button></div>
    </div>
  );
}

export default function Uploads() {
  const { pushToast } = useStore();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('posts');
  const [open, setOpen] = useState(null); // a post shown large
  const [ask, setAsk] = useState(null); // `${kind}:${id}` awaiting confirmation
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    Mine.uploads().then(setData).catch((e) => { pushToast(e.message || 'Could not load your uploads.', 'error'); setData({ posts: [], comments: [], communityPosts: [], gigs: [] }); });
  }, [pushToast]);
  useEffect(() => { load(); }, [load]);

  const drop = (key, fn, after) => async () => {
    setBusy(true);
    try { await fn(); after(); pushToast('Deleted.'); setAsk(null); setOpen(null); }
    catch (e) { pushToast(e.message || 'Could not delete that.', 'error'); }
    setBusy(false);
  };
  const strip = (field, id) => setData((d) => ({ ...d, [field]: d[field].filter((x) => x.id !== id) }));

  const tabs = useMemo(() => [
    { id: 'posts', label: 'Posts', icon: Grid3x3, n: data?.posts.length },
    { id: 'comments', label: 'Comments', icon: MessageCircle, n: data?.comments.length },
    { id: 'community', label: 'Community', icon: Users, n: data?.communityPosts.length },
    { id: 'gigs', label: 'Gigs', icon: Briefcase, n: data?.gigs.length },
  ], [data]);

  return (
    <div className="uploads">
      <PageHead title="Your uploads" sub="Everything you have shared on Gigset. Delete anything you no longer want up." />
      <div className="up-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => { setTab(t.id); setAsk(null); }}>
            <t.icon size={15} /> {t.label}{t.n != null && <em>{t.n}</em>}
          </button>
        ))}
      </div>

      {!data ? <p className="up-faint">Loading…</p> : (
        <>
          {tab === 'posts' && (data.posts.length === 0
            ? <EmptyState icon={<ImageIcon size={22} />} title="No posts yet" text="Share a photo or an update from Home and it will show up here." action={<button className="btn btn-blue btn-sm" onClick={() => navigate('/home')}>Go to Home</button>} />
            : <div className="up-grid">
                {data.posts.map((p) => (
                  <button key={p.id} className={`up-tile${p.mediaUrl ? '' : ' text'}`} onClick={() => setOpen(p)} aria-label="Open post">
                    {p.mediaUrl ? <img src={p.mediaUrl} alt="" loading="lazy" /> : <span>{short(p.body, 110)}</span>}
                    <i className="up-hover"><b><Heart size={15} fill="currentColor" /> {p._count.likes}</b><b><MessageCircle size={15} fill="currentColor" /> {p._count.comments}</b></i>
                  </button>
                ))}
              </div>)}

          {tab === 'comments' && (data.comments.length === 0
            ? <EmptyState icon={<MessageCircle size={22} />} title="No comments yet" text="Comments you write on posts and in communities appear here." />
            : <div className="up-list">
                {data.comments.map((c) => {
                  const key = `c:${c.kind}:${c.id}`;
                  return (
                    <div key={key} className="up-row">
                      <div className="up-main">
                        <p>{c.body}</p>
                        <small>{c.kind === 'community' ? `On “${short(c.on.text, 50)}” in ${c.on.by || 'a community'}` : `On ${c.on.by ? `${c.on.by}'s` : 'a'} post${c.on.text ? `: “${short(c.on.text, 50)}”` : ''}`} · {when(c.createdAt)}</small>
                        {ask === key && <Confirm text="Delete this comment?" busy={busy} onNo={() => setAsk(null)}
                          onYes={drop(key, () => (c.kind === 'community' ? Communities.removeComment(c.id) : Posts.removeComment(c.id)), () => strip('comments', c.id))} />}
                      </div>
                      {ask !== key && <button className="up-del" onClick={() => setAsk(key)} aria-label="Delete comment"><Trash2 size={16} /></button>}
                    </div>
                  );
                })}
              </div>)}

          {tab === 'community' && (data.communityPosts.length === 0
            ? <EmptyState icon={<Users size={22} />} title="No community posts" text="Threads you start in a community will be listed here." action={<button className="btn btn-blue btn-sm" onClick={() => navigate('/community')}>Open Community</button>} />
            : <div className="up-list">
                {data.communityPosts.map((p) => {
                  const key = `cp:${p.id}`;
                  return (
                    <div key={p.id} className="up-row">
                      {p.mediaUrl && <img className="up-thumb" src={p.mediaUrl} alt="" loading="lazy" />}
                      <div className="up-main">
                        <b>{p.title}</b>
                        {p.body && <p>{short(p.body, 140)}</p>}
                        <small>{p.group?.name} · {p.score} points · {p.commentCount} comments · {when(p.createdAt)}</small>
                        {ask === key && <Confirm text="Delete this thread?" busy={busy} onNo={() => setAsk(null)}
                          onYes={drop(key, () => Communities.removePost(p.id), () => strip('communityPosts', p.id))} />}
                      </div>
                      {ask !== key && <button className="up-del" onClick={() => setAsk(key)} aria-label="Delete thread"><Trash2 size={16} /></button>}
                    </div>
                  );
                })}
              </div>)}

          {tab === 'gigs' && (data.gigs.length === 0
            ? <EmptyState icon={<Briefcase size={22} />} title="No gigs posted" text="Opportunities you post in Collab will be listed here." action={<button className="btn btn-blue btn-sm" onClick={() => navigate('/collab')}>Open Collab</button>} />
            : <div className="up-list">
                {data.gigs.map((g) => {
                  const key = `g:${g.id}`;
                  return (
                    <div key={g.id} className="up-row">
                      <div className="up-main">
                        <b>{g.title}</b>
                        <small>{[g.genre, g.city].filter(Boolean).join(' · ')} · {g._count.applications} applied · {g.status.toLowerCase()} · {when(g.createdAt)}</small>
                        {ask === key && <Confirm text="Delete this gig and its applications?" busy={busy} onNo={() => setAsk(null)}
                          onYes={drop(key, () => Opps.remove(g.id), () => strip('gigs', g.id))} />}
                      </div>
                      {ask !== key && <button className="up-del" onClick={() => setAsk(key)} aria-label="Delete gig"><Trash2 size={16} /></button>}
                    </div>
                  );
                })}
              </div>)}
        </>
      )}

      {open && (
        <Modal title="Your post" onClose={() => { setOpen(null); setAsk(null); }}>
          {open.mediaUrl && <img className="up-big" src={open.mediaUrl} alt="" />}
          {open.body && <p className="up-body">{open.body}</p>}
          <p className="up-faint"><Heart size={13} /> {open._count.likes} · <MessageCircle size={13} /> {open._count.comments} · {when(open.createdAt)}{open.visibility === 'CONNECTIONS' ? ' · Connections only' : ''}</p>
          {ask === `p:${open.id}`
            ? <Confirm text="Delete this post with its likes and comments?" busy={busy} onNo={() => setAsk(null)} onYes={drop('p', () => Posts.remove(open.id), () => strip('posts', open.id))} />
            : <button className="btn btn-ghost up-danger-line" onClick={() => setAsk(`p:${open.id}`)}><Trash2 size={15} /> Delete post</button>}
        </Modal>
      )}
    </div>
  );
}
