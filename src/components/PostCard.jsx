import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Repeat2, Bookmark, Send, Share2, MoreHorizontal, Flag, EyeOff, Link2, UserPlus, Check } from 'lucide-react';
import { Avatar, Verified } from './ui';
import { useStore } from '../store/store';
import { Posts, Profiles } from '../lib/api';
import { ReportModal } from './SafetyMenu';
import { hashStr } from '../data/demo';
import './postcard.css';

function timeAgo(iso) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function typeLabel(t) {
  if (!t || typeof t !== 'string') return 'Member';
  return t.charAt(0) + t.slice(1).toLowerCase();
}

/* Brand-safe gradients for text-only "quote card" posts. Chosen
   deterministically from the post id so a post always looks the same. */
const CANVASES = [
  'linear-gradient(135deg,#0E2E6B 0%,#2A63EE 55%,#0EA5E9 100%)',
  'linear-gradient(135deg,#1F1147 0%,#4F46E5 55%,#A855F7 100%)',
  'linear-gradient(135deg,#3B0D2E 0%,#BE185D 50%,#F97316 100%)',
  'linear-gradient(135deg,#052E2B 0%,#0F766E 55%,#22C55E 100%)',
  'linear-gradient(135deg,#111827 0%,#334155 50%,#64748B 100%)',
  'linear-gradient(135deg,#431407 0%,#C2410C 50%,#FBBF24 100%)',
];

/* Short, single-thought posts become visual cards; long ones stay as text. */
function isQuoteCard(post) {
  const b = (post.body || '').trim();
  return !post.mediaUrl && b.length > 0 && b.length <= 200 && b.split('\n').length <= 4;
}

/* Render #hashtags and @mentions as highlighted inline tokens. */
function RichText({ text }) {
  const parts = String(text || '').split(/(\s+)/);
  return parts.map((p, i) => (/^[#@][\p{L}\p{N}_]+/u.test(p)
    ? <span key={i} className="pc-tag">{p}</span>
    : p));
}

export default function PostCard({ post, onLike, onHide, following, onFollowChange }) {
  const { user, isBookmarked, toggleBookmark, pushToast } = useStore();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(!!post.likedByMe);
  const [likeDelta, setLikeDelta] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [burst, setBurst] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentCount, setCommentCount] = useState(post._count?.comments ?? 0);
  const [expanded, setExpanded] = useState(false);
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const lastTap = useRef(0);

  const author = post.author || {};
  const isMine = user && author.id === user.id;
  const likeCount = (post._count?.likes ?? 0) + likeDelta;
  const saved = isBookmarked('post', post.id);
  const quote = isQuoteCard(post) || (post.mediaUrl && imgFailed && (post.body || '').length <= 200);
  const canvas = CANVASES[hashStr(post.id || post.body || 'x') % CANVASES.length];
  const longBody = (post.body || '').length > 280;

  const openProfile = () => { if (author.id) navigate(`/profile/${author.id}`); };

  const setLike = async (want) => {
    if (likeBusy || want === liked) return;
    if (!user) { pushToast('Sign in to like posts.', 'error'); return; }
    const prevLiked = liked;
    const prevDelta = likeDelta;
    setLikeBusy(true);
    setLiked(want);
    setLikeDelta(prevDelta + (want ? 1 : -1));
    try {
      if (want) await Posts.like(post.id);
      else await Posts.unlike(post.id);
      onLike?.(post.id, want);
    } catch (e) {
      if (want && e.status === 409) {
        setLikeDelta(prevDelta); // already liked server-side
      } else {
        setLiked(prevLiked);
        setLikeDelta(prevDelta);
        pushToast(e.message || 'Could not update the like.', 'error');
      }
    }
    setLikeBusy(false);
  };

  /* Instagram-style double-tap on the media to like. */
  const onMediaTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      setBurst((b) => b + 1);
      setLike(true);
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  const toggleComments = async () => {
    if (commentsOpen) { setCommentsOpen(false); return; }
    setCommentsOpen(true);
    if (comments) return;
    try {
      const res = await Posts.comments(post.id, { take: 20 });
      setComments(res.items || []);
    } catch (e) {
      pushToast(e.message || 'Could not load comments.', 'error');
      setCommentsOpen(false);
    }
  };

  const addComment = async () => {
    const body = commentDraft.trim();
    if (!body) return;
    if (!user) { pushToast('Sign in to comment.', 'error'); return; }
    try {
      const c = await Posts.comment(post.id, body);
      setComments((cs) => [...(cs || []), c]);
      setCommentCount((n) => n + 1);
      setCommentDraft('');
    } catch (e) {
      pushToast(e.message || 'Could not post the comment.', 'error');
    }
  };

  const shareLink = `${window.location.origin}${window.location.pathname}#/profile/${author.id || ''}`;
  const share = async () => {
    const text = `${author.name || 'Someone'} on Gigset: “${(post.body || '').slice(0, 120)}”`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Gigset', text, url: shareLink });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${shareLink}`);
      pushToast('Link copied — paste it anywhere.');
    } catch { /* share sheet dismissed */ }
  };

  const follow = async () => {
    if (!user) { pushToast('Sign in to follow people.', 'error'); return; }
    try {
      if (following) await Profiles.unfollow(author.id);
      else await Profiles.follow(author.id);
      onFollowChange?.(author.id, !following);
      pushToast(following ? `Unfollowed ${author.name}.` : `Following ${author.name}.`);
    } catch (e) {
      if (e.status === 409) onFollowChange?.(author.id, true);
      else pushToast(e.message || 'Could not update follow.', 'error');
    }
  };

  const heartBurst = (
    <AnimatePresence>
      {burst > 0 && (
        <motion.span
          key={burst}
          className="pc-burst"
          initial={{ scale: 0.2, opacity: 0 }}
          animate={{ scale: [0.2, 1.25, 1], opacity: [0, 1, 1] }}
          exit={{ scale: 1.4, opacity: 0 }}
          transition={{ duration: 0.45 }}
          onAnimationComplete={() => setTimeout(() => setBurst(0), 380)}
        >
          <Heart size={84} fill="#fff" strokeWidth={0} />
        </motion.span>
      )}
    </AnimatePresence>
  );

  return (
    <article className="pc">
      <header className="pc-head">
        <button className="pc-avatar" onClick={openProfile} aria-label={`Open ${author.name || 'author'}'s profile`}>
          <Avatar name={author.name || 'Unknown'} src={author.avatarUrl} size={40} />
        </button>
        <div className="pc-who" onClick={openProfile}>
          <b>{author.name || 'Unknown'}{author.verificationStatus === 'VERIFIED' && <Verified size={14} />}</b>
          <span>{typeLabel(author.stakeholderType)}{author.city ? ` · ${author.city}` : ''} · {timeAgo(post.createdAt)}</span>
        </div>
        {!isMine && author.id && onFollowChange && (
          <button className={`pc-follow${following ? ' on' : ''}`} onClick={follow}>
            {following ? <><Check size={13} /> Following</> : <><UserPlus size={13} /> Follow</>}
          </button>
        )}
        <div className="pc-menu-wrap">
          <button className="pc-icon" onClick={() => setMenu((m) => !m)} aria-label="More options" aria-expanded={menu}>
            <MoreHorizontal size={18} />
          </button>
          {menu && (
            <>
              <div className="pc-menu-scrim" onClick={() => setMenu(false)} />
              <div className="pc-menu" role="menu">
                <button role="menuitem" onClick={() => { setMenu(false); navigator.clipboard?.writeText(shareLink); pushToast('Profile link copied.'); }}>
                  <Link2 size={15} /> Copy link
                </button>
                {!isMine && (
                  <button role="menuitem" onClick={() => { setMenu(false); setReporting(true); }}>
                    <Flag size={15} /> Report post
                  </button>
                )}
                {onHide && !isMine && (
                  <button role="menuitem" onClick={() => { setMenu(false); onHide(post.id); }}>
                    <EyeOff size={15} /> Not interested
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* caption above media, like LinkedIn — keeps context before the image */}
      {!quote && post.body && (
        <div className={`pc-body${longBody && !expanded ? ' clamp' : ''}`}>
          <RichText text={post.body} />
        </div>
      )}
      {!quote && longBody && !expanded && (
        <button className="pc-more" onClick={() => setExpanded(true)}>…see more</button>
      )}

      {post.mediaUrl && !imgFailed && (
        <div className={`pc-media${imgLoaded ? ' ready' : ''}`} onClick={onMediaTap}>
          <img
            src={post.mediaUrl}
            alt={post.body ? `Photo: ${post.body.slice(0, 80)}` : 'Post photo'}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgFailed(true)}
            draggable={false}
          />
          {heartBurst}
        </div>
      )}

      {quote && (
        <div className="pc-quote" style={{ background: canvas }} onClick={onMediaTap}>
          <p className={(post.body || '').length > 110 ? 'sm' : ''}><RichText text={post.body} /></p>
          <span className="pc-quote-by">— {author.name || 'Gigset member'}</span>
          {heartBurst}
        </div>
      )}

      <div className="pc-actions">
        <motion.button
          whileTap={{ scale: 0.8 }}
          className={`pc-act${liked ? ' liked' : ''}`}
          onClick={() => setLike(!liked)}
          aria-label={liked ? 'Unlike' : 'Like'}
          aria-pressed={liked}
        >
          <Heart size={20} fill={liked ? 'currentColor' : 'none'} />
        </motion.button>
        <button className="pc-act" onClick={toggleComments} aria-label="Comments" aria-expanded={commentsOpen}>
          <MessageCircle size={20} />
        </button>
        <button className="pc-act" onClick={() => pushToast('Reposted to your network.')} aria-label="Repost">
          <Repeat2 size={20} />
        </button>
        <button className="pc-act" onClick={share} aria-label="Share">
          <Share2 size={19} />
        </button>
        <motion.button
          whileTap={{ scale: 0.8 }}
          className={`pc-act pc-save${saved ? ' saved' : ''}`}
          onClick={() => {
            const nowSaved = toggleBookmark('post', post.id);
            pushToast(nowSaved ? 'Saved to your collection.' : 'Removed from saved.');
          }}
          aria-label={saved ? 'Remove from saved' : 'Save'}
          aria-pressed={saved}
        >
          <Bookmark size={20} fill={saved ? 'currentColor' : 'none'} />
        </motion.button>
      </div>
      <div className="pc-stats">
        <b>{likeCount.toLocaleString('en-IN')} {likeCount === 1 ? 'like' : 'likes'}</b>
        {commentCount > 0 && (
          <button onClick={toggleComments}>View {commentCount === 1 ? '1 comment' : `all ${commentCount} comments`}</button>
        )}
      </div>

      {commentsOpen && (
        <div className="pc-comments">
          {comments === null && <span className="pc-faint">Loading comments…</span>}
          {comments !== null && comments.length === 0 && <span className="pc-faint">No comments yet — start the conversation.</span>}
          {(comments || []).map((c) => (
            <div key={c.id} className="pc-comment">
              <Avatar name={c.author?.name || 'Unknown'} src={c.author?.avatarUrl} size={28} />
              <div>
                <b>
                  {c.author?.name || 'Unknown'}
                  {c.author?.verificationStatus === 'VERIFIED' && <Verified size={12} />}
                  <span className="pc-faint"> · {timeAgo(c.createdAt)}</span>
                </b>
                <div>{c.body}</div>
              </div>
            </div>
          ))}
          <div className="pc-comment-input">
            <Avatar name={user?.name || 'You'} src={user?.avatarUrl} size={28} />
            <input
              type="text"
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addComment()}
              placeholder="Add a comment…"
              aria-label="Write a comment"
            />
            <button onClick={addComment} disabled={!commentDraft.trim()} aria-label="Send comment">
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
      {reporting && <ReportModal targetType="POST" targetId={post.id} label="this post" onClose={() => setReporting(false)} />}
    </article>
  );
}
