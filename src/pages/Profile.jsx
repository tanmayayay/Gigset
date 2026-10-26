import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Handshake, MessageCircle, UserPlus, UserCheck, Pencil, UserX, MapPin, Camera, Check, Share2, Star, FileText,
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
import EpkModal from '../components/epk/EpkModal';
import { Profiles, Posts, Convos, Reviews, Safety } from '../lib/api';
import { useStore } from '../store/store';
import { uploadAvatar } from '../lib/uploadImage';
import { metaFor, glanceFacts, headlineOf, completeness } from '../lib/profileSchema';
import { useCountUp } from '../lib/useCountUp';
import '../components/profile/profile.css';
import '../components/profile/portfolio.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const compact = (n) => (n >= 10000 ? `${(n / 1000).toFixed(0)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

function BigStat({ value, label }) {
  const n = useCountUp(value, true, 1500);
  return <div><b>{compact(n)}</b><span>{label}</span></div>;
}

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
  const [params] = useSearchParams();
  const { userId, user, refreshProfile, pushToast } = useStore();

  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [feedPosts, setFeedPosts] = useState([]);
  const [following, setFollowing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [epkOpen, setEpkOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [shareCard, setShareCard] = useState(null);
  const [rv, setRv] = useState(null);
  const [iBlocked, setIBlocked] = useState(false);
  const photoInput = useRef(null);
  const heroRef = useRef(null);
  const [stuck, setStuck] = useState(false);
  const [spy, setSpy] = useState('about');

  const isSelf = !!userId && id === userId;
  const tab = params.get('tab') || 'overview';

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


  // Sticky sub-nav: show the mini identity once the hero scrolls away, and track which section is on screen.
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return undefined;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting), { rootMargin: '-70px 0px 0px 0px', threshold: 0 });
    io.observe(hero);
    return () => io.disconnect();
  }, [person]);
  useEffect(() => {
    const els = [...document.querySelectorAll('.pfo-sec')];
    if (!els.length) return undefined;
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setSpy(vis.target.dataset.sec);
    }, { rootMargin: '-35% 0px -55% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [person, loading]);
  // Old ?tab= links scroll to the matching section.
  useEffect(() => {
    if (!person || tab === 'overview') return;
    const map = { posts: 'posts', media: 'work', reviews: 'reviews', insights: 'insights' };
    const t = setTimeout(() => document.getElementById(map[tab] || 'about')?.scrollIntoView({ behavior: 'smooth' }), 400);
    return () => clearTimeout(t);
  }, [person, tab]);
  const goTo = useCallback((sid) => document.getElementById(sid)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), []);

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
  const sections = [
    { id: 'about', label: 'Overview' },
    { id: 'work', label: 'Work' },
    { id: 'details', label: 'Details' },
    { id: 'posts', label: 'Posts', count: feedPosts.length },
    { id: 'reviews', label: 'Reviews', count: rv?.count || 0 },
    ...(isSelf ? [{ id: 'insights', label: 'Insights' }] : []),
  ];

  return (
    <div className="pfo" style={{ '--pf-tint': meta.tint }}>
      <section className="pfo-hero" ref={heroRef}>
        <div className="pfo-orb a" aria-hidden="true" /><div className="pfo-orb b" aria-hidden="true" /><div className="pfo-grain" aria-hidden="true" />
        <motion.div className="pfo-hero-in" initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}>
          <div className="pfo-photo">
            <Avatar name={person.name} src={person.avatarUrl} size={148} />
            {isSelf && (
              <>
                <input ref={photoInput} type="file" accept="image/*" hidden onChange={(e) => { quickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
                <button className="pfo-photo-btn" onClick={() => photoInput.current?.click()} disabled={uploading} aria-label="Change profile photo"><Camera size={16} /></button>
              </>
            )}
          </div>
          <div className="pfo-badges">
            <span className="pfo-chip"><RoleIcon size={13} /> {meta.label}</span>
            {person.city && <span className="pfo-chip"><MapPin size={13} /> {person.city}</span>}
            {person.foundingMember && <span className="pfo-chip gold"><Star size={12} fill="currentColor" /> Founding member</span>}
            {rv?.count > 0 && <button className="pfo-chip" onClick={() => goTo('reviews')}><Stars value={rv.average} size={12} /> {rv.average} &middot; {rv.count}</button>}
            {person.visibility !== 'PUBLIC' && isSelf && <span className="pfo-chip">{person.visibility === 'PRIVATE' ? 'Only you can see this' : 'Connections only'}</span>}
          </div>
          <h1 className="pfo-name">{person.name}{verified && <Verified size={34} />}</h1>
          {headline && <p className="pfo-headline">{headline}</p>}
          <div className="pfo-actions">
            {isSelf ? (
              <>
                <button className="pfo-btn solid" onClick={() => setEditing(true)}><Pencil size={16} /> Edit profile</button>
                <button className="pfo-btn" onClick={() => setEpkOpen(true)}><FileText size={16} /> Generate EPK</button>
                <button className="pfo-btn" onClick={openShare}><Share2 size={16} /> Share</button>
              </>
            ) : (
              <>
                <button className="pfo-btn solid" onClick={() => navigate(`/collab?with=${person.id}`)}><Handshake size={16} /> Collab / Book</button>
                <button className="pfo-btn" onClick={toggleFollow}>{following ? <><UserCheck size={16} /> Following</> : <><UserPlus size={16} /> Follow</>}</button>
                <button className="pfo-btn" onClick={openChat}><MessageCircle size={16} /> Message</button>
                <button className="pfo-btn" onClick={() => setEpkOpen(true)}><FileText size={16} /> Press kit</button>
                <button className="pfo-btn icon" onClick={openShare} aria-label="Share profile"><Share2 size={16} /></button>
                {userId && <SafetyMenu person={person} blocked={iBlocked} onBlockChange={(b) => { setIBlocked(b); if (b) setFollowing(false); }} />}
              </>
            )}
          </div>
          <div className="pfo-stats">
            <BigStat value={followers} label="Followers" />
            <BigStat value={person._count?.following ?? 0} label="Following" />
            <BigStat value={postsCount} label="Posts" />
            {rv?.count > 0 && <div><b>{rv.average}</b><span>Rating</span></div>}
          </div>
        </motion.div>
      </section>

      <nav className={`pfo-nav${stuck ? ' stuck' : ''}`} aria-label="Profile sections">
        <div className="pfo-nav-in">
          <div className="pfo-mini"><Avatar name={person.name} src={person.avatarUrl} size={30} /><b>{person.name}</b></div>
          <div className="pfo-anchors">
            {sections.map((x) => <button key={x.id} className={spy === x.id ? 'on' : ''} onClick={() => goTo(x.id)}>{x.label}{x.count > 0 && <em>{x.count}</em>}</button>)}
          </div>
          {isSelf
            ? <button className="pfo-cta" onClick={() => setEditing(true)}>Edit</button>
            : <button className="pfo-cta" onClick={() => navigate(`/collab?with=${person.id}`)}>Collab / Book</button>}
        </div>
      </nav>

      <Section id="about" title={isSelf && !person.bio ? 'Tell your story.' : `Meet ${first}.`}>
        {person.bio ? <p className="pfo-lead">{person.bio}</p>
          : <p className="pfo-lead dim">{isSelf ? <>Add a bio so people know who you are. <button className="pfo-link" onClick={() => setEditing(true)}>Write it now</button></> : `${first} hasn't written a bio yet.`}</p>}
        <div className="pfo-specs">
          {facts.map((f) => <div key={f.key}><span>{f.label}</span><b>{f.value}</b></div>)}
          <div><span>Role</span><b>{meta.label}</b></div>
          {person.city && <div><span>Based in</span><b>{person.city}</b></div>}
          <div><span>Verification</span><b>{verified ? 'Verified' : person.verificationStatus === 'PENDING' ? 'Pending' : 'Not yet verified'}</b></div>
          {since && <div><span>On Gigset since</span><b>{MONTHS[since.getMonth()]} {since.getFullYear()}</b></div>}
        </div>
        {isSelf && <div className="pfo-self"><Strength person={person} postsCount={postsCount} /></div>}
      </Section>

      <Section id="work" title="The work.">
        <Samples data={person.detail?.data} />
        {mediaPosts.length > 0 ? (
          <div className="pfo-reel" aria-label="Photos and clips">
            {mediaPosts.map((p) => (
              <figure key={p.id}>
                <img src={p.mediaUrl} alt={p.body || ''} loading="lazy" />
                {p.body && <figcaption>{p.body}</figcaption>}
              </figure>
            ))}
          </div>
        ) : <p className="pfo-lead dim small">{isSelf ? 'Share photos and clips from Home and they show up here as your showcase.' : 'No photos or clips yet.'}</p>}
      </Section>

      <Section id="details" title="The details.">
        <RoleDetails person={person} onEdit={isSelf ? () => setEditing(true) : undefined} />
      </Section>

      <Section id="posts" title="Latest.">
        {feedPosts.length ? <div className="pfo-feed">{feedPosts.map((p) => <PostCard key={p.id} post={p} />)}</div>
          : <EmptyState icon={<MessageCircle size={22} />} title="No posts yet" text={`${first} hasn't posted anything yet.`} />}
      </Section>

      <Section id="reviews" title="What people say.">
        <ReviewsTab personId={id} isSelf={isSelf} data={rv} onChanged={loadReviews} />
      </Section>

      {isSelf && (
        <Section id="insights" title="Your numbers.">
          <Insights />
        </Section>
      )}

      <AnimatePresence>
        {epkOpen && <EpkModal personId={person.id} person={person} onClose={() => setEpkOpen(false)} onEditProfile={isSelf ? () => { setEpkOpen(false); setEditing(true); } : undefined} />}
        {editing && <EditProfile person={person} onClose={() => setEditing(false)} onSaved={async () => { await load(); await refreshProfile(); setEditing(false); }} />}
        {shareCard && <ShareModal card={shareCard} title={isSelf ? 'Share your profile' : `Share ${first}`} onClose={() => setShareCard(null)} />}
      </AnimatePresence>
    </div>
  );
}

function Section({ id, title, children }) {
  return (
    <motion.section id={id} className="pfo-sec" data-sec={id} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}>
      <h2>{title}</h2>
      {children}
    </motion.section>
  );
}
