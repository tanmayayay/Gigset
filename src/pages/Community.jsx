import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Flame, Sparkles, TrendingUp, Compass, Home as HomeIcon, Users, ArrowLeft, ShieldCheck, Pencil, Check, MessageSquarePlus } from 'lucide-react';
import { Avatar, Verified, EmptyState } from '../components/ui';
import { useStore } from '../store/store';
import { Communities } from '../lib/api';
import Thread from '../components/community/Thread';
import { PostComposer, NewCommunityModal } from '../components/community/Composers';
import { CommIcon, PostItem, ReportModal, compactNum } from '../components/community/Bits';
import { CATEGORIES, grad } from '../components/community/meta';
import '../components/community/community.css';

const SORTS = [['hot', 'Hot', Flame], ['new', 'New', Sparkles], ['top', 'Top', TrendingUp]];

function SortBar({ sort, setSort, id }) {
  return (
    <div className="cm-sorts" role="tablist">
      {SORTS.map(([k, label, Icon]) => (
        <button key={k} role="tab" aria-selected={sort === k} className={sort === k ? 'on' : ''} onClick={() => setSort(k)}>
          {sort === k && <motion.i layoutId={`sort-${id}`} className="cm-sort-bg" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
          <Icon size={14} /> <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

function PostSkeleton() {
  return [0, 1, 2].map((i) => <div className="cm-post skel" key={i}><div className="shimmer-strip" style={{ height: 14, width: '40%' }} /><div className="shimmer-strip" style={{ height: 20, width: '85%', marginTop: 12 }} /><div className="shimmer-strip" style={{ height: 14, width: '65%', marginTop: 10 }} /></div>);
}

function CommunityTile({ c, onOpen, onJoin }) {
  const joined = !!c.myRole;
  return (
    <motion.div className="cm-tile" whileHover={{ y: -4 }} onClick={() => onOpen(c.id)}>
      <div className="cm-tile-banner" style={{ background: grad(c.color) }}><CommIcon c={c} size={48} /></div>
      <div className="cm-tile-body">
        <h4>{c.name}</h4>
        <p>{c.desc || 'A place for conversation.'}</p>
        <div className="cm-tile-foot">
          <span><Users size={13} /> {compactNum(c.members)} · {compactNum(c.posts)} posts</span>
          <button className={`btn btn-sm ${joined ? 'btn-ghost' : 'btn-blue'}`} onClick={(e) => { e.stopPropagation(); onJoin(c); }}>{joined ? <><Check size={13} /> Joined</> : 'Join'}</button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Community() {
  const { userId, user, pushToast } = useStore();
  const [params, setParams] = useSearchParams();
  const cId = params.get('c');
  const pId = params.get('p');
  const tabParam = params.get('tab');

  const [all, setAll] = useState(null);
  const [cur, setCur] = useState(null);
  const [posts, setPosts] = useState(null);
  const [sort, setSort] = useState('hot');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('ALL');
  const [composer, setComposer] = useState(false);
  const [creating, setCreating] = useState(false);
  const [report, setReport] = useState(null);

  const mine = useMemo(() => (all || []).filter((c) => c.myRole), [all]);
  const view = cId ? 'community' : (tabParam || (all && mine.length === 0 ? 'popular' : 'home'));

  const loadAll = useCallback(async () => {
    try { setAll((await Communities.list({ take: 100 })).items); } catch (e) { pushToast(e.message || 'Could not load communities.', 'error'); setAll([]); }
  }, [pushToast]);
  useEffect(() => { loadAll(); }, [loadAll]);

  const loadCur = useCallback(async () => {
    if (!cId) { setCur(null); return; }
    try { setCur(await Communities.get(cId)); } catch (e) { pushToast(e.message || 'Community not found.', 'error'); setParams({}, { replace: true }); }
  }, [cId, pushToast, setParams]);
  useEffect(() => { loadCur(); }, [loadCur]);

  const loadPosts = useCallback(async () => {
    if (view === 'explore' || !all) return;
    setPosts(null);
    try {
      const res = cId ? await Communities.posts(cId, { sort }) : await Communities.feed({ scope: view === 'home' ? 'home' : 'popular', sort });
      setPosts(res.items);
    } catch (e) { pushToast(e.message || 'Could not load posts.', 'error'); setPosts([]); }
  }, [view, cId, sort, all, pushToast]);
  useEffect(() => { loadPosts(); }, [loadPosts]);

  const go = (next) => setParams(next, { replace: false });
  const openCommunity = (id) => go({ c: id });
  const openPost = (post) => { const n = new URLSearchParams(params); n.set('p', post.id); setParams(n); };
  const closePost = () => { const n = new URLSearchParams(params); n.delete('p'); setParams(n); };

  const toggleJoin = async (c) => {
    const joined = !!c.myRole;
    try {
      if (joined) await Communities.leave(c.id); else await Communities.join(c.id);
      pushToast(joined ? `Left ${c.name}.` : `Welcome to ${c.name}.`);
      await loadAll();
      if (cId === c.id) await loadCur();
    } catch (e) { pushToast(e.message, 'error'); }
  };

  const vote = async (post, v) => {
    const patch = (p) => (p.id === post.id ? { ...p, myVote: v, score: p.score + (v - p.myVote) } : p);
    setPosts((ps) => ps.map(patch));
    try { await Communities.votePost(post.id, v); } catch (e) { setPosts((ps) => ps.map((p) => (p.id === post.id ? post : p))); pushToast(e.message, 'error'); }
  };
  const syncFromThread = (next) => setPosts((ps) => (ps ? (next.removed ? ps.filter((p) => p.id !== next.id) : ps.map((p) => (p.id === next.id ? { ...p, ...next } : p))) : ps));

  const roleOf = (post) => (all || []).find((c) => c.id === post.groupId)?.myRole;
  const isMod = (r) => r === 'ADMIN' || r === 'COADMIN';

  const filtered = useMemo(() => (all || []).filter((c) => (cat === 'ALL' || c.category === cat) && (!q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase()))), [all, cat, q]);
  const trending = useMemo(() => [...(all || [])].filter((c) => !c.myRole).slice(0, 5), [all]);

  const feedHeader = (
    <>
      <div className="cm-hero">
        <div className="cm-hero-glow" aria-hidden="true" />
        <div>
          <h1>Communities</h1>
          <p>Talk shop, find collaborators and learn from people in the scene.</p>
        </div>
        <button className="btn btn-blue" onClick={() => setCreating(true)}><Plus size={16} /> Create community</button>
      </div>
      <div className="cm-tabs" role="tablist">
        {[['home', 'Home', HomeIcon], ['popular', 'Popular', Flame], ['explore', 'Explore', Compass]].map(([k, label, Icon]) => (
          <button key={k} role="tab" aria-selected={view === k} className={view === k ? 'on' : ''} onClick={() => go({ tab: k })}>
            {view === k && <motion.i layoutId="cm-tab-bg" className="cm-tab-bg" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
            <Icon size={15} /> <span>{label}</span>
          </button>
        ))}
      </div>
    </>
  );

  const composeBar = (
    <div className="cm-compose">
      <Avatar name={user?.name || 'You'} src={user?.avatarUrl} size={34} />
      <button onClick={() => setComposer(true)}><MessageSquarePlus size={16} /> Start a conversation{cur ? ` in ${cur.name}` : ''}…</button>
    </div>
  );

  const list = (
    <div className="cm-list">
      {posts === null && <PostSkeleton />}
      {posts && posts.length === 0 && (
        <EmptyState icon={<MessageSquarePlus size={22} />} title={view === 'home' ? 'Your home feed is empty' : 'Nothing here yet'}
          text={view === 'home' ? 'Join a few communities and their best posts show up here.' : 'Be the first to start a conversation.'}
          action={view === 'home' ? <button className="btn btn-blue btn-sm" onClick={() => go({ tab: 'explore' })}>Explore communities</button> : <button className="btn btn-blue btn-sm" onClick={() => setComposer(true)}>Create a post</button>} />
      )}
      <AnimatePresence initial={false}>
        {posts?.map((p) => (
          <PostItem key={p.id} post={p} showCommunity={!cId} myId={userId} canMod={isMod(cId ? cur?.myRole : roleOf(p))}
            onOpen={openPost} onOpenCommunity={openCommunity} onVote={vote} onReport={setReport}
            onRemoved={(id) => setPosts((ps) => ps.filter((x) => x.id !== id))}
            onPinned={(id, pinned) => setPosts((ps) => ps.map((x) => (x.id === id ? { ...x, pinned } : x)))} />
        ))}
      </AnimatePresence>
    </div>
  );

  const railMine = (
    <div className="cm-card">
      <h4>Your communities</h4>
      {mine.length === 0 && <p className="cm-muted">You haven&rsquo;t joined any yet.</p>}
      {mine.slice(0, 8).map((c) => (
        <button key={c.id} className="cm-row" onClick={() => openCommunity(c.id)}><CommIcon c={c} size={30} /><span><b>{c.name}</b><i>{compactNum(c.members)} members</i></span></button>
      ))}
    </div>
  );
  const railTrending = trending.length > 0 && (
    <div className="cm-card">
      <h4>Trending communities</h4>
      {trending.map((c) => (
        <div key={c.id} className="cm-row"><button className="cm-row-open" onClick={() => openCommunity(c.id)}><CommIcon c={c} size={30} /><span><b>{c.name}</b><i>{compactNum(c.members)} members</i></span></button><button className="btn btn-blue btn-xs" onClick={() => toggleJoin(c)}>Join</button></div>
      ))}
    </div>
  );
  const railSafety = (
    <div className="cm-card cm-safety">
      <h4><ShieldCheck size={15} /> Keep it respectful</h4>
      <p>Abusive, hateful or adult content is blocked automatically. Enough reports hide a post until our team reviews it.</p>
    </div>
  );

  if (all === null) return <div className="cm"><div className="cm-main"><PostSkeleton /></div></div>;

  return (
    <div className="cm">
      {view === 'community' && cur ? (
        <>
          <div className="cm-banner" style={{ background: grad(cur.color) }}>
            <button className="cm-back" onClick={() => go({ tab: 'popular' })}><ArrowLeft size={15} /> All communities</button>
          </div>
          <div className="cm-head">
            <CommIcon c={cur} size={72} />
            <div className="cm-head-txt">
              <h1>{cur.name}</h1>
              <span>{CATEGORIES.find((x) => x.id === cur.category)?.label || 'General'} · {compactNum(cur.members)} members · {compactNum(cur.posts)} posts</span>
            </div>
            <div className="cm-head-actions">
              {cur.myRole && <button className="btn btn-blue" onClick={() => setComposer(true)}><Plus size={15} /> Post</button>}
              <button className={`btn ${cur.myRole ? 'btn-ghost' : 'btn-blue'}`} onClick={() => toggleJoin(cur)}>{cur.myRole ? <><Check size={15} /> Joined</> : 'Join'}</button>
            </div>
          </div>
        </>
      ) : view === 'community' ? <div className="cm-banner" style={{ background: 'var(--border)' }} /> : feedHeader}

      <div className="cm-grid">
        <div className="cm-main">
          {view === 'explore' ? (
            <>
              <div className="cm-search"><Search size={16} /><input type="text" placeholder="Search communities" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              <div className="cm-cats">{CATEGORIES.map((c) => <button key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>{c.label}</button>)}</div>
              {filtered.length === 0 ? <EmptyState icon={<Compass size={22} />} title="No communities found" text="Try another search — or start the community yourself." action={<button className="btn btn-blue btn-sm" onClick={() => setCreating(true)}>Create community</button>} />
                : <div className="cm-tiles">{filtered.map((c) => <CommunityTile key={c.id} c={c} onOpen={openCommunity} onJoin={toggleJoin} />)}</div>}
            </>
          ) : (
            <>
              {(view !== 'community' || cur?.myRole) && composeBar}
              <SortBar sort={sort} setSort={setSort} id={view} />
              {list}
            </>
          )}
        </div>
        <aside className="cm-rail">
          {view === 'community' && cur ? (
            <>
              <div className="cm-card"><h4>About</h4><p className="cm-about">{cur.desc || 'No description yet.'}</p><div className="cm-stats"><div><b>{compactNum(cur.members)}</b><span>Members</span></div><div><b>{compactNum(cur.posts)}</b><span>Posts</span></div></div></div>
              {cur.rules?.length > 0 && (
                <div className="cm-card"><h4>Rules</h4><ol className="cm-rules">{cur.rules.map((r, i) => <li key={i}><b>{r.title}</b>{r.body && <span>{r.body}</span>}</li>)}</ol></div>
              )}
              <div className="cm-card"><h4>Moderators</h4>{cur.mods.map((m) => (
                <div key={m.id} className="cm-row"><Avatar name={m.name} src={m.avatarUrl} size={30} /><span><b>{m.name}{m.verificationStatus === 'VERIFIED' && <Verified size={12} />}</b><i>{m.role === 'ADMIN' ? 'Admin' : 'Moderator'}</i></span></div>
              ))}</div>
              {isMod(cur.myRole) && <button className="btn btn-ghost btn-sm" onClick={() => pushToast('Moderators can pin or remove posts from the ⋯ menu on any post.')}><Pencil size={13} /> Moderator tools</button>}
            </>
          ) : (<>{railMine}{railTrending}{railSafety}</>)}
        </aside>
      </div>

      {composer && <PostComposer communities={cur?.myRole ? [cur, ...mine.filter((c) => c.id !== cur.id)] : mine} initialId={cur?.myRole ? cur.id : undefined}
        onClose={() => setComposer(false)} onPosted={(p) => { setComposer(false); loadAll(); if (cId || view !== 'explore') setPosts((ps) => [p, ...(ps || [])]); }} />}
      {creating && <NewCommunityModal onClose={() => setCreating(false)} onCreated={async (c) => { setCreating(false); await loadAll(); go({ c: c.id }); pushToast(`${c.name} is live.`); }} />}
      {report && <ReportModal target={report} onClose={() => setReport(null)} />}
      <AnimatePresence>
        {pId && <Thread key={pId} postId={pId} onClose={closePost} onChanged={syncFromThread} onOpenCommunity={openCommunity} />}
      </AnimatePresence>
    </div>
  );
}
