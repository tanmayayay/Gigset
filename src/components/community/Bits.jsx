import { useState } from 'react';
import { ChevronUp, ChevronDown, MessageSquare, Share2, MoreHorizontal, Flag, Trash2, Pin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, Verified, Modal } from '../ui';
import { Communities, Safety } from '../../lib/api';
import { useStore } from '../../store/store';
import { timeAgo } from '../../lib/format';
import { grad, REPORT_REASONS } from './meta';

export const compactNum = (n) => (Math.abs(n) >= 10000 ? `${(n / 1000).toFixed(0)}k` : Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

export function CommIcon({ c, size = 40 }) {
  return (
    <span className="cm-icon" style={{ width: size, height: size, background: grad(c?.color), fontSize: size * 0.42 }}>
      {(c?.name || '?').trim().charAt(0).toUpperCase()}
    </span>
  );
}

/* Up / down vote with an animated score. `onVote(next)` is optimistic; parent owns the numbers. */
export function VoteRail({ score, myVote, onVote, horizontal = false }) {
  const press = (v) => onVote(myVote === v ? 0 : v);
  return (
    <div className={`cm-vote${horizontal ? ' h' : ''}${myVote === 1 ? ' up' : myVote === -1 ? ' down' : ''}`}>
      <button onClick={() => press(1)} aria-label="Upvote" aria-pressed={myVote === 1}><ChevronUp size={19} strokeWidth={2.6} /></button>
      <span className="cm-score" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.b key={score} initial={{ y: myVote === -1 ? -10 : 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.18 }}>{compactNum(score)}</motion.b>
        </AnimatePresence>
      </span>
      <button onClick={() => press(-1)} aria-label="Downvote" aria-pressed={myVote === -1}><ChevronDown size={19} strokeWidth={2.6} /></button>
    </div>
  );
}

export function ReportModal({ target, onClose }) {
  const { pushToast } = useStore();
  const [reason, setReason] = useState('INAPPROPRIATE');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      await Safety.report({ targetType: target.type, targetId: target.id, reason });
      pushToast('Thanks — we’ll take a look. Enough reports hide it automatically.');
      onClose();
    } catch (e) { pushToast(e.message, 'error'); setBusy(false); }
  };
  return (
    <Modal title="Report" onClose={onClose}>
      <div className="cm-report">
        {REPORT_REASONS.map(([k, label]) => (
          <label key={k} className={reason === k ? 'on' : ''}><input type="radio" name="rr" checked={reason === k} onChange={() => setReason(k)} /> {label}</label>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-blue btn-sm" disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Send report'}</button>
      </div>
    </Modal>
  );
}

export function PostMenu({ post, isMine, canMod, onReport, onRemoved, onPinned }) {
  const { pushToast } = useStore();
  const [open, setOpen] = useState(false);
  const remove = async () => {
    setOpen(false);
    try { await Communities.removePost(post.id); pushToast('Post removed.'); onRemoved?.(post.id); } catch (e) { pushToast(e.message, 'error'); }
  };
  const pin = async () => {
    setOpen(false);
    try { await Communities.pin(post.id, !post.pinned); pushToast(post.pinned ? 'Unpinned.' : 'Pinned to the top.'); onPinned?.(post.id, !post.pinned); } catch (e) { pushToast(e.message, 'error'); }
  };
  return (
    <span className="cm-menu">
      <button className="cm-ghost" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} aria-label="More"><MoreHorizontal size={17} /></button>
      {open && (
        <>
          <span className="cm-menu-bg" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <span className="cm-menu-pop" onClick={(e) => e.stopPropagation()}>
            {canMod && <button onClick={pin}><Pin size={14} /> {post.pinned ? 'Unpin' : 'Pin to top'}</button>}
            {!isMine && <button onClick={() => { setOpen(false); onReport(); }}><Flag size={14} /> Report</button>}
            {(isMine || canMod) && <button className="danger" onClick={remove}><Trash2 size={14} /> Remove</button>}
          </span>
        </>
      )}
    </span>
  );
}

export function PostItem({ post, showCommunity, myId, canMod, onOpen, onOpenCommunity, onVote, onRemoved, onPinned, onReport }) {
  const { pushToast } = useStore();
  const share = async (e) => {
    e.stopPropagation();
    const url = `${location.origin}${location.pathname}#/community?p=${post.id}`;
    try { await navigator.clipboard.writeText(url); pushToast('Link copied.'); } catch { pushToast(url); }
  };
  return (
    <motion.article className={`cm-post${post.pinned ? ' pinned' : ''}`} layout="position" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} onClick={() => onOpen(post)}>
      <VoteRail score={post.score} myVote={post.myVote} onVote={(v) => onVote(post, v)} />
      <div className="cm-post-main" onClick={(e) => e.target === e.currentTarget && onOpen(post)}>
        <div className="cm-post-meta">
          {showCommunity && post.group && (
            <button className="cm-chip-link" onClick={(e) => { e.stopPropagation(); onOpenCommunity(post.group.id); }}>
              <CommIcon c={post.group} size={20} /> <b>{post.group.name}</b>
            </button>
          )}
          <span className="cm-by"><Avatar name={post.author.name} src={post.author.avatarUrl} size={20} /> {post.author.name}{post.author.verificationStatus === 'VERIFIED' && <Verified size={12} />}</span>
          <span className="cm-dot">·</span><span>{timeAgo(post.createdAt)}</span>
          {post.pinned && <span className="cm-pin"><Pin size={11} /> Pinned</span>}
        </div>
        <h3 className="cm-title">{post.title}{post.flair && <span className="cm-flair">{post.flair}</span>}</h3>
        {post.body && <p className="cm-body clamp">{post.body}</p>}
        {post.mediaUrl && <img className="cm-media" src={post.mediaUrl} alt="" loading="lazy" />}
        <div className="cm-actions">
          <button className="cm-ghost" onClick={(e) => { e.stopPropagation(); onOpen(post); }}><MessageSquare size={15} /> {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}</button>
          <button className="cm-ghost" onClick={share}><Share2 size={15} /> Share</button>
          <PostMenu post={post} isMine={post.author.id === myId} canMod={canMod} onReport={() => onReport({ type: 'COMMUNITY_POST', id: post.id })} onRemoved={onRemoved} onPinned={onPinned} />
        </div>
      </div>
    </motion.article>
  );
}
