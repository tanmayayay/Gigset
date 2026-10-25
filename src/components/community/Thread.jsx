import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, CornerDownRight, Minus, Plus, Flag, Trash2, Pin, Share2 } from 'lucide-react';
import { Avatar, Verified } from '../ui';
import { Communities } from '../../lib/api';
import { useStore } from '../../store/store';
import { timeAgo } from '../../lib/format';
import { checkText } from '../../lib/moderation';
import { CommIcon, VoteRail, ReportModal } from './Bits';

const MAX_DEPTH = 6;

function buildTree(flat) {
  const byId = new Map(flat.map((c) => [c.id, { ...c, kids: [] }]));
  const roots = [];
  byId.forEach((c) => {
    const parent = c.parentId && byId.get(c.parentId);
    (parent ? parent.kids : roots).push(c);
  });
  const sortKids = (arr) => { arr.sort((a, b) => b.score - a.score || new Date(a.createdAt) - new Date(b.createdAt)); arr.forEach((k) => sortKids(k.kids)); };
  sortKids(roots);
  return roots;
}

function Reply({ onSubmit, onCancel, placeholder = 'Add to the conversation…', autoFocus }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bad = text.trim() ? !checkText(text).ok : false;
  const send = async () => {
    if (!text.trim() || bad) return;
    setBusy(true);
    const ok = await onSubmit(text.trim());
    setBusy(false);
    if (ok) setText('');
  };
  return (
    <div className="cm-reply">
      <textarea rows={2} autoFocus={autoFocus} value={text} maxLength={4000} placeholder={placeholder} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send(); }} />
      {bad && <div className="cm-warn">Please keep it clean — abusive, hateful or adult language isn&rsquo;t allowed on Gigset.</div>}
      <div className="cm-reply-row">
        {onCancel && <button className="btn btn-ghost btn-xs" onClick={onCancel}>Cancel</button>}
        <button className="btn btn-blue btn-xs" disabled={!text.trim() || bad || busy} onClick={send}>{busy ? 'Posting…' : 'Comment'}</button>
      </div>
    </div>
  );
}

function Comment({ c, depth, myId, canMod, canComment, onVote, onReply, onRemove, onReport }) {
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const gone = c.removed || !c.author;
  return (
    <div className={`cm-c d${Math.min(depth, MAX_DEPTH)}`}>
      <div className="cm-c-rail" onClick={() => setCollapsed((x) => !x)} title={collapsed ? 'Expand' : 'Collapse'} />
      <div className="cm-c-main">
        <div className="cm-c-head">
          {gone ? <i className="cm-removed">[removed]</i> : (
            <>
              <Avatar name={c.author.name} src={c.author.avatarUrl} size={22} />
              <b>{c.author.name}</b>{c.author.verificationStatus === 'VERIFIED' && <Verified size={12} />}
            </>
          )}
          <span className="cm-dot">·</span><span>{timeAgo(c.createdAt)}</span>
          <button className="cm-ghost tiny" onClick={() => setCollapsed((x) => !x)} aria-label={collapsed ? 'Expand thread' : 'Collapse thread'}>{collapsed ? <Plus size={13} /> : <Minus size={13} />}</button>
        </div>
        {!collapsed && (
          <>
            {!gone && <p className="cm-c-body">{c.body}</p>}
            {!gone && (
              <div className="cm-c-actions">
                <VoteRail horizontal score={c.score} myVote={c.myVote} onVote={(v) => onVote(c, v)} />
                {canComment && depth < MAX_DEPTH + 3 && <button className="cm-ghost" onClick={() => setReplying((x) => !x)}><CornerDownRight size={14} /> Reply</button>}
                {c.author.id !== myId && <button className="cm-ghost" onClick={() => onReport({ type: 'COMMUNITY_COMMENT', id: c.id })}><Flag size={13} /> Report</button>}
                {(c.author.id === myId || canMod) && <button className="cm-ghost danger" onClick={() => onRemove(c)}><Trash2 size={13} /> Remove</button>}
              </div>
            )}
            {replying && <Reply autoFocus placeholder={`Reply to ${c.author?.name ?? 'comment'}…`} onCancel={() => setReplying(false)} onSubmit={async (t) => { const ok = await onReply(t, c.id); if (ok) setReplying(false); return ok; }} />}
            {c.kids.map((k) => <Comment key={k.id} c={k} depth={depth + 1} {...{ myId, canMod, canComment, onVote, onReply, onRemove, onReport }} />)}
          </>
        )}
      </div>
    </div>
  );
}

export default function Thread({ postId, onClose, onChanged, onOpenCommunity }) {
  const { userId, pushToast } = useStore();
  const [data, setData] = useState(null);
  const [comments, setComments] = useState([]);
  const [report, setReport] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await Communities.thread(postId);
      setData(d); setComments(d.comments);
    } catch (e) { setErr(e.message || 'This post is gone.'); }
  }, [postId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [onClose]);

  const tree = useMemo(() => buildTree(comments), [comments]);
  const post = data?.post;
  const role = data?.myRole;
  const canMod = role === 'ADMIN' || role === 'COADMIN';

  const votePost = async (v) => {
    const prev = post;
    const next = { ...post, myVote: v, score: post.score + (v - post.myVote) };
    setData((d) => ({ ...d, post: next })); onChanged?.(next);
    try { await Communities.votePost(post.id, v); } catch (e) { setData((d) => ({ ...d, post: prev })); onChanged?.(prev); pushToast(e.message, 'error'); }
  };
  const voteComment = async (c, v) => {
    setComments((cs) => cs.map((x) => (x.id === c.id ? { ...x, myVote: v, score: x.score + (v - x.myVote) } : x)));
    try { await Communities.voteComment(c.id, v); } catch (e) { setComments((cs) => cs.map((x) => (x.id === c.id ? c : x))); pushToast(e.message, 'error'); }
  };
  const addComment = async (text, parentId) => {
    try {
      const c = await Communities.comment(postId, text, parentId);
      setComments((cs) => [...cs, c]);
      const next = { ...post, commentCount: post.commentCount + 1 };
      setData((d) => ({ ...d, post: next })); onChanged?.(next);
      return true;
    } catch (e) { pushToast(e.message, 'error'); return false; }
  };
  const removeComment = async (c) => {
    try { await Communities.removeComment(c.id); setComments((cs) => cs.map((x) => (x.id === c.id ? { ...x, removed: true, author: null, body: '[removed]' } : x))); } catch (e) { pushToast(e.message, 'error'); }
  };
  const removePost = async () => {
    try { await Communities.removePost(post.id); pushToast('Post removed.'); onChanged?.({ ...post, removed: true }); onClose(); } catch (e) { pushToast(e.message, 'error'); }
  };
  const share = async () => {
    const url = `${location.origin}${location.pathname}#/community?p=${post.id}`;
    try { await navigator.clipboard.writeText(url); pushToast('Link copied.'); } catch { pushToast(url); }
  };

  return (
    <div className="cm-sheet-bg" onClick={onClose}>
      <motion.aside className="cm-sheet" role="dialog" aria-modal="true" aria-label="Post" onClick={(e) => e.stopPropagation()}
        initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}>
        <div className="cm-sheet-top">
          {post?.group && <button className="cm-chip-link" onClick={() => { onClose(); onOpenCommunity(post.group.id); }}><CommIcon c={post.group} size={22} /> <b>{post.group.name}</b></button>}
          <button className="cm-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {err && <div className="cm-empty">{err}</div>}
        {!data && !err && <div className="cm-empty"><span className="spinner" /></div>}
        {post && (
          <div className="cm-sheet-body">
            <div className="cm-post-meta">
              <span className="cm-by"><Avatar name={post.author.name} src={post.author.avatarUrl} size={26} /> <b>{post.author.name}</b>{post.author.verificationStatus === 'VERIFIED' && <Verified size={12} />}</span>
              <span className="cm-dot">·</span><span>{timeAgo(post.createdAt)}</span>
            </div>
            <h2 className="cm-title big">{post.title}{post.flair && <span className="cm-flair">{post.flair}</span>}</h2>
            {post.body && <p className="cm-body">{post.body}</p>}
            {post.mediaUrl && <img className="cm-media" src={post.mediaUrl} alt="" />}
            <div className="cm-actions">
              <VoteRail horizontal score={post.score} myVote={post.myVote} onVote={votePost} />
              <button className="cm-ghost" onClick={share}><Share2 size={15} /> Share</button>
              {canMod && <button className="cm-ghost" onClick={async () => { try { const r = await Communities.pin(post.id, !post.pinned); setData((d) => ({ ...d, post: { ...d.post, pinned: r.pinned } })); onChanged?.({ ...post, pinned: r.pinned }); } catch (e) { pushToast(e.message, 'error'); } }}><Pin size={14} /> {post.pinned ? 'Unpin' : 'Pin'}</button>}
              {post.author.id !== userId && <button className="cm-ghost" onClick={() => setReport({ type: 'COMMUNITY_POST', id: post.id })}><Flag size={14} /> Report</button>}
              {(post.author.id === userId || canMod) && <button className="cm-ghost danger" onClick={removePost}><Trash2 size={14} /> Remove</button>}
            </div>
            <div className="cm-thread-head"><b>{post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}</b></div>
            {role ? <Reply onSubmit={(t) => addComment(t)} /> : <div className="cm-join-hint">Join <b>{post.group?.name}</b> to join the conversation.</div>}
            <div className="cm-comments">
              {tree.length === 0 && <div className="cm-empty small">No comments yet. Start it off.</div>}
              {tree.map((c) => <Comment key={c.id} c={c} depth={0} myId={userId} canMod={canMod} canComment={!!role} onVote={voteComment} onReply={addComment} onRemove={removeComment} onReport={setReport} />)}
            </div>
          </div>
        )}
      </motion.aside>
      {report && <ReportModal target={report} onClose={() => setReport(null)} />}
    </div>
  );
}
