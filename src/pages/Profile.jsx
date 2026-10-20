import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import {
  Handshake, MessageCircle, UserPlus, UserCheck, Pencil, UserX, MapPin, Camera, Image as ImageIcon, Check, Share2, Star,
} from 'lucide-react';
import { Avatar, Verified, EmptyState } from '../components/ui';
import PostCard from '../components/PostCard';
import RoleDetails from '../components/profile/RoleDetails';
import EditProfile from '../components/profile/EditProfile';
import Insights from '../components/profile/Insights';
import ShareModal from '../components/ShareModal';
import SafetyMenu from '../components/SafetyMenu';
import ReviewsTab, { Stars } from '../components/profile/Reviews';
import Samples from '../components/profile/Samples';
import { Profiles, Posts, Convos, Reviews, Safety } from '../lib/api';
import { useStore } from '../store/store';
import { uploadAvatar } from '../lib/uploadImage';
import { metaFor, glanceFacts, headlineOf, completeness } from '../lib/profileSchema';
import '../components/profile/profile.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const compact = (n) => (n >= 10000 ? `${(n / 1000).toFixed(0)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

function Strength({ person, postsCount }) {
  const { checks, pct } = completeness(person, { postsCount });
  const todo = checks.filter((c) => !c.done);
  return (
    <div className="pf-card">
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div className="pf-ring" style={{ '--p': pct }}><i>{pct}%</i></div>
        <div>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>Profile strength</b>
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 2 }}>{todo.length ? `${todo.length} step${todo.length === 1 ? '' : 's'} to a complete profile` : 'Your profile is complete'}</div>
        </div>
      </div>
      <ul className="pf-todo">
        {checks.map((c) => (
          <li key={c.label} className={c.done ? 'done' : ''}><span className="tick">{c.done && <Check size={11} strokeWidth={3} />}</span>{c.label}</li>
        ))}
      </ul>
    </div>
  );
}

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { userId, user, refreshProfile, pushToast } = useStore();

  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [feedPosts, setFeedPosts] = useState([]);
  const [following, setFollowing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [shareCard, setShareCard] = useState(null);
  const [rv, setRv] = useState(null);
  const [iBlocked, setIBlocked] = useState(false);
  const photoInput = useRef(null);

  const isSelf = !!userId && id === userId;
  const tab = params.get('tab') || 'overview';
  const setTab = (t) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true });

  const load = async () => {
    const p = await Profiles.get(id);
    setPerson(p);
    return p;
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);
    setPerson(null);
    setFeedPosts([]);
    setFollowing(false);
    setEditing(false);
    (async () => {
      try {
        const p = await Profiles.get(id);
        if (!alive) return;
        setPerson(p);
        Posts.list({ authorId: id, take: 20 }).then((pl) => { if (alive) setFeedPosts(pl.items || []); }).catch(() => {});
      } catch (e) {
        if (!alive) return;
        if (e.status === 404) setNotFound(true);
        else pushToast(e.message, 'error');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reviews (public) and whether I blocked this person.
  const loadReviews = () => Reviews.forUser(id, { take: 20 }).then(setRv).catch(() => setRv({ items: [], count: 0, average: null }));
  useEffect(() => { setRv(null); loadReviews(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!userId || isSelf) { setIBlocked(false); return undefined; }
    let alive = true;
    Safety.blocks().then((r) => { if (alive) setIBlocked((r.items || []).some((p) => p.id === id)); }).catch(() => {});
    return () => { alive = false; };
  }, [id, userId, isSelf]);

  // Whether the signed-in person already follows this profile.
  useEffect(() => {
    if (!userId || isSelf) return;
    let alive = true;
    Profiles.following().then((r) => { if (alive) setFollowing((r.items || []).some((p) => p.id === id)); }).catch(() => {});
    return () => { alive = false; };
  }, [id, userId, isSelf]);

  const toggleFollow = async () => {
    try {
      if (following) { await Profiles.unfollow(id); setFollowing(false); pushToast(`Unfollowed ${person.name}.`); }
      else { await Profiles.follow(id); setFollowing(true); pushToast(`Following ${person.name} — you'll see their posts in your feed.`); }
    } catch (e) { pushToast(e.message, 'error'); }
  };

  const openChat = async () => {
    try { const c = await Convos.open(id); navigate('/messages?c=' + c.id); }
    catch (e) { pushToast(e.message, 'error'); }
  };

  const openShare = () => setShareCard({
    kind: 'profile', person, facts: facts.map((f) => f.value), headline,
    founding: !!person.foundingMember, rating: rv?.count ? rv.average : null,
  });
  const quickPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(file, user?.authId || userId);
      await Profiles.update(id, { avatarUrl: url });
      await load();
      await refreshProfile();
      pushToast('Profile photo updated.');
    } catch (e) { pushToast(e.message || 'Could not update your photo.', 'error'); }
    finally { setUploading(false); }
  };


  // Old links (emails, notifications) used to open the Requests tab here; bookings now live in Collab.
  if (tab === 'requests') return <Navigate to="/collab?tab=bookings" replace />;

  if (loading) {
    return <div className="pf"><div className="pf-head"><div className="shimmer-strip" style={{ height: 170, borderRadius: 14 }} /></div></div>;
  }
  if (notFound || !person) {
    return (
      <EmptyState icon={<UserX size={22} />} title="Profile not found" text="This profile doesn't exist or isn't visible to you."
        action={<button className="btn btn-blue btn-sm" onClick={() => navigate('/home')}>Back to Home</button>} />
    );
  }

  const meta = metaFor(person.stakeholderType);
  const RoleIcon = meta.icon;
  const verified = person.verificationStatus === 'VERIFIED';
  const followers = person._count?.followers ?? 0;
  const postsCount = person._count?.posts ?? 0;
  const facts = glanceFacts(person.stakeholderType, person.detail?.data);
  const headline = headlineOf(person);
  const mediaPosts = feedPosts.filter((p) => p.mediaUrl);
  const since = person.createdAt ? new Date(person.createdAt) : null;
  const first = person.name.split(' ')[0];

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'posts', label: 'Posts' },
    { id: 'media', label: 'Media' },
    { id: 'reviews', label: 'Reviews', badge: 0, count: rv?.count || 0 },
    ...(isSelf ? [{ id: 'insights', label: 'Insights' }] : []),
  ];

  return (
    <div className="pf" style={{ '--pf-tint': meta.tint }}>
      <header className="pf-head">
        <div className="pf-top">
          <div className="pf-photo">
            <Avatar name={person.name} src={person.avatarUrl} size={104} />
            {isSelf && (
              <>
                <input ref={photoInput} type="file" accept="image/*" hidden onChange={(e) => { quickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
                <button className="pf-photo-btn" onClick={() => photoInput.current?.click()} disabled={uploading} aria-label="Change profile photo"><Camera size={15} /></button>
              </>
            )}
          </div>

          <div className="pf-id">
            <h1 className="pf-name">{person.name}{verified && <Verified size={20} />}</h1>
            <div className="pf-meta">
              <span className="pf-role"><RoleIcon size={13} /> {meta.label}</span>
              {person.city && <span className="pf-loc"><MapPin size={14} /> {person.city}</span>}
              {person.visibility !== 'PUBLIC' && isSelf && <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>· {person.visibility === 'PRIVATE' ? 'Only you can see this' : 'Connections only'}</span>}
            </div>
            {(person.foundingMember || rv?.count > 0) && (
              <div className="pf-badges">
                {person.foundingMember && <span className="founding" title="One of the first 1,000 people on Strings"><Star size={11} fill="currentColor" /> Founding member</span>}
                {rv?.count > 0 && <button className="rv-chip" onClick={() => setTab('reviews')}><Stars value={rv.average} size={12} /> {rv.average} · {rv.count}</button>}
              </div>
            )}
            {headline && <p className="pf-headline">{headline}</p>}
            <div className="pf-stats">
              <div><b>{compact(followers)}</b><span>Followers</span></div>
              <div><b>{compact(person._count?.following ?? 0)}</b><span>Following</span></div>
              <div><b>{compact(postsCount)}</b><span>Posts</span></div>
            </div>
          </div>
        </div>

        <div className="pf-actions">
          {isSelf ? (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}><Pencil size={14} /> Edit profile</button>
              <button className="btn btn-ghost btn-sm" onClick={openShare}><Share2 size={14} /> Share</button>
            </>
          ) : (
            <>
              <button className="btn btn-blue btn-sm" onClick={() => navigate(`/collab?with=${person.id}`)}><Handshake size={14} /> Collab / Book</button>
              <button className="btn btn-sm btn-ghost" onClick={toggleFollow}>
                {following ? <><UserCheck size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={openChat}><MessageCircle size={14} /> Message</button>
              <button className="btn btn-ghost btn-sm" onClick={openShare} aria-label="Share profile"><Share2 size={14} /></button>
              {userId && <SafetyMenu person={person} blocked={iBlocked} onBlockChange={(b) => { setIBlocked(b); if (b) setFollowing(false); }} />}
            </>
          )}
        </div>

        {facts.length > 0 && (
          <div className="pf-facts">
            {facts.map((f) => <div className="pf-fact" key={f.key}><span>{f.label}</span><b>{f.value}</b></div>)}
          </div>
        )}
      </header>

      <nav className="pf-tabs" aria-label="Profile sections">
        {tabs.map((t) => (
          <button key={t.id} className={`pf-tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}{t.count > 0 && <span className="pf-count">{t.count}</span>}{t.badge > 0 && <span className="dot">{t.badge}</span>}
          </button>
        ))}
      </nav>

      <div className="pf-grid">
        <div style={{ minWidth: 0 }}>
          {tab === 'overview' && (
            <>
              <div className="pf-card">
                <h3>About</h3>
                {person.bio ? <p className="pf-about" style={{ margin: 0 }}>{person.bio}</p>
                  : <p style={{ margin: 0, color: 'var(--text-faint)', fontSize: 14 }}>
                    {isSelf ? <>Tell people who you are. <button className="btn btn-ghost btn-xs" onClick={() => setEditing(true)}>Write your bio</button></> : `${first} hasn't written a bio yet.`}
                  </p>}
              </div>
              <Samples data={person.detail?.data} />
              <RoleDetails person={person} onEdit={isSelf ? () => setEditing(true) : undefined} />
            </>
          )}

          {tab === 'posts' && (
            feedPosts.length ? feedPosts.map((p) => <PostCard key={p.id} post={p} />)
              : <EmptyState icon={<MessageCircle size={22} />} title="No posts yet" text={`${first} hasn't posted anything yet.`} />
          )}

          {tab === 'media' && (
            mediaPosts.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 8 }}>
                {mediaPosts.map((p) => (
                  <div key={p.id} style={{ aspectRatio: '1', borderRadius: 14, overflow: 'hidden', background: 'var(--bg-softer)', border: '1px solid var(--border)' }}>
                    <img src={p.mediaUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                ))}
              </div>
            ) : <EmptyState icon={<ImageIcon size={22} />} title="No media yet" text="Posts with photos will appear here." />
          )}

          {tab === 'reviews' && <ReviewsTab personId={id} isSelf={isSelf} data={rv} onChanged={loadReviews} />}
          {tab === 'insights' && isSelf && <Insights />}
        </div>

        <aside style={{ minWidth: 0 }}>
          {isSelf && <Strength person={person} postsCount={postsCount} />}
          <div className="pf-card">
            <h3>At a glance</h3>
            <dl className="pf-rows" style={{ margin: 0, gridTemplateColumns: '1fr', gap: 12 }}>
              <div className="pf-row"><dt>Role</dt><dd>{meta.label}</dd></div>
              {person.city && <div className="pf-row"><dt>Based in</dt><dd>{person.city}</dd></div>}
              <div className="pf-row"><dt>Verification</dt><dd>{verified ? 'Verified by Strings' : person.verificationStatus === 'PENDING' ? 'Verification pending' : 'Member (not yet verified)'}</dd></div>
              {rv?.count > 0 && <div className="pf-row"><dt>Rating</dt><dd>{rv.average} / 5 from {rv.count} booking{rv.count === 1 ? '' : 's'}</dd></div>}
              {since && <div className="pf-row"><dt>On Strings since</dt><dd>{MONTHS[since.getMonth()]} {since.getFullYear()}</dd></div>}
            </dl>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {editing && <EditProfile person={person} onClose={() => setEditing(false)} onSaved={async () => { await load(); await refreshProfile(); setEditing(false); }} />}
        {shareCard && <ShareModal card={shareCard} title={isSelf ? 'Share your profile' : `Share ${first}`} onClose={() => setShareCard(null)} />}
      </AnimatePresence>
    </div>
  );
}
