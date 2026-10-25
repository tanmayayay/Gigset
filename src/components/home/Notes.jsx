import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Lock, Plus, X, ImagePlus, Trash2, MessageCircle, ChevronLeft, ChevronRight, Radio } from 'lucide-react';
import { Avatar, Modal, Verified } from '../ui';
import { downscale } from '../ComposerModals';
import { Convos, Stories } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/store';
import './notes.css';

const SEEN_KEY = 'gigset.vaultSeen';
const DURATION = 6000;
const SPIN_MS = 3600;

const readSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; } };

export function timeLeft(expiresAt) {
  const ms = Date.parse(expiresAt) - Date.now();
  if (ms <= 0) return 'expired';
  const h = Math.floor(ms / 3600e3);
  const m = Math.floor((ms % 3600e3) / 60e3);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

/* Notes: photo notes from members that fade after 12 hours.
   Shown as a self-rotating holo wheel: the card in front is live, the rest orbit behind it. */
export default function NotesWheel() {
  const { user, pushToast } = useStore();
  const [groups, setGroups] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [seen, setSeen] = useState(readSeen);
  const [openAt, setOpenAt] = useState(null);
  const [adding, setAdding] = useState(false);
  const [active, setActive] = useState(0);
  const [hold, setHold] = useState(false);
  const drag = useRef(null);

  const load = useCallback(() => {
    Stories.list().then((r) => setGroups(r.items || [])).catch(() => {}).finally(() => setLoaded(true));
  }, []);
  useEffect(() => { load(); }, [load]);

  const markSeen = useCallback((id) => {
    setSeen((s) => {
      if (s.includes(id)) return s;
      const next = [...s, id].slice(-500);
      try { localStorage.setItem(SEEN_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const allSeen = (g) => g.stories.every((x) => seen.includes(x.id));
  const ordered = useMemo(() => [...groups].sort((a, b) => Number(allSeen(a)) - Number(allSeen(b))), [groups, seen]); // eslint-disable-line react-hooks/exhaustive-deps
  const items = useMemo(() => [{ add: true }, ...ordered], [ordered]);
  const n = items.length;
  // Start on the first unseen note rather than on "Add yours".
  const [started, setStarted] = useState(false);
  useEffect(() => { if (loaded && !started) { setStarted(true); if (ordered.length) setActive(1); } }, [loaded, started, ordered.length]);

  const step = useCallback((d) => setActive((a) => (((a + d) % n) + n) % n), [n]);

  // Auto-rotate unless the person is interacting, a note is open, the tab is hidden or motion is reduced.
  useEffect(() => {
    if (n < 3 || hold || openAt !== null || adding) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(() => { if (!document.hidden) step(1); }, SPIN_MS);
    return () => clearInterval(id);
  }, [n, hold, openAt, adding, step]);

  const press = (i) => {
    if (i !== active) { setActive(i); return; }
    if (items[i].add) { if (user) setAdding(true); else pushToast('Sign in to post a note.', 'error'); }
    else setOpenAt(i - 1);
  };

  const onDown = (e) => { drag.current = e.clientX; };
  const onUp = (e) => {
    if (drag.current == null) return;
    const dx = e.clientX - drag.current;
    drag.current = null;
    if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
  };

  const cur = items[active] || items[0];
  const liveCount = ordered.length;

  return (
    <section className="notes" aria-label="Notes" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)}>
      <header className="notes-head">
        <h3><Radio size={15} /> Notes</h3>
        <span className="notes-sub"><i className="notes-dot" /> {liveCount} live · fade after 12h</span>
      </header>

      <div className="notes-stage" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; }}>
        <div className="notes-floor" aria-hidden="true" />
        <div className="notes-ring" aria-hidden="true" />
        {items.map((it, i) => {
          let d = i - active;
          if (d > n / 2) d -= n;
          if (d < -n / 2) d += n;
          const ad = Math.abs(d);
          if (ad > 3) return null;
          const front = d === 0;
          const done = !it.add && allSeen(it);
          const latest = it.add ? null : it.stories[it.stories.length - 1];
          const style = {
            transform: `translateX(${d * 96}px) translateZ(${-ad * 90}px) rotateY(${-d * 34}deg) scale(${front ? 1 : 0.86 - ad * 0.04})`,
            opacity: front ? 1 : Math.max(0.25, 0.8 - ad * 0.2),
            zIndex: 10 - ad,
            filter: front ? 'none' : `saturate(.85) blur(${ad * 0.4}px)`,
          };
          return (
            <button
              key={it.add ? 'add' : it.author.id}
              className={`note-card${front ? ' front' : ''}${it.add ? ' add' : ''}${done ? ' seen' : ''}`}
              style={style}
              onClick={() => press(i)}
              aria-label={it.add ? 'Post a note' : `${it.author.name}, ${it.stories.length} ${it.stories.length === 1 ? 'note' : 'notes'}`}
              tabIndex={front ? 0 : -1}
            >
              {it.add ? (
                <span className="note-face add"><Plus size={30} strokeWidth={1.8} /><b>Post a note</b></span>
              ) : (
                <span className="note-face" style={{ backgroundImage: `url(${latest.mediaUrl})` }}>
                  <span className="note-scan" />
                  <span className="note-corner tl" /><span className="note-corner br" />
                  {it.stories.length > 1 && <span className="note-count">{it.stories.length}</span>}
                  <span className="note-cap">
                    <Avatar name={it.author.name} src={it.author.avatarUrl} size={22} />
                    <em>{it.author.id === user?.id ? 'You' : it.author.name.split(' ')[0]}</em>
                  </span>
                </span>
              )}
            </button>
          );
        })}
        {loaded && n === 1 && <p className="notes-empty">No notes yet. Drop the first photo from tonight.</p>}
      </div>

      <footer className="notes-foot">
        <button className="notes-nav" onClick={() => step(-1)} aria-label="Previous note"><ChevronLeft size={16} /></button>
        <div className="notes-meta">
          {cur?.add ? <b>Post a note</b> : (
            <>
              <b>{cur.author.id === user?.id ? 'You' : cur.author.name}{cur.author.verificationStatus === 'VERIFIED' && <Verified size={12} />}</b>
              <span>{cur.stories[cur.stories.length - 1].caption || timeLeft(cur.stories[cur.stories.length - 1].expiresAt)}</span>
            </>
          )}
        </div>
        <div className="notes-pips" aria-hidden="true">{items.slice(0, 12).map((_, i) => <i key={i} className={i === active ? 'on' : ''} />)}</div>
        <button className="notes-nav" onClick={() => step(1)} aria-label="Next note"><ChevronRight size={16} /></button>
      </footer>

      {openAt !== null && (
        <NoteViewer groups={ordered} start={openAt} me={user} onSeen={markSeen} onClose={() => setOpenAt(null)} onChanged={load} />
      )}
      {adding && <NoteAddModal onClose={() => setAdding(false)} onAdded={() => { setAdding(false); load(); }} />}
    </section>
  );
}

function NoteAddModal({ onClose, onAdded }) {
  const { user, authUser, pushToast } = useStore();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);
  const input = useRef(null);

  useEffect(() => {
    if (!file) { setPreview(null); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (f) => {
    if (!f) return;
    if (!/^image\//.test(f.type)) { pushToast('Please choose an image.', 'error'); return; }
    if (f.size > 15 * 1024 * 1024) { pushToast('That image is over 15 MB.', 'error'); return; }
    setFile(f);
  };

  const submit = async () => {
    if (!file || saving) return;
    setSaving(true);
    try {
      const small = await downscale(file);
      const ext = small.type === 'image/gif' ? 'gif' : 'jpg';
      const path = `${authUser?.id || user.id}/vault-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('post-media').upload(path, small, { contentType: small.type, cacheControl: '31536000' });
      if (error) throw new Error('Photo upload failed. Check that the post-media bucket is set up.');
      const mediaUrl = supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl;
      await Stories.create({ mediaUrl, caption: caption.trim() || undefined });
      pushToast('Note posted for 12 hours.');
      onAdded();
    } catch (e) {
      pushToast(e.message || 'Could not post your note.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add a note" onClose={onClose}>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
      {preview ? (
        <div className="vault-preview">
          <img src={preview} alt="Your note photo" />
          <button className="vault-preview-x" onClick={() => setFile(null)} aria-label="Remove photo"><X size={16} /></button>
        </div>
      ) : (
        <button className="vault-drop" onClick={() => input.current?.click()}>
          <ImagePlus size={26} />
          <b>Choose a photo</b>
          <span>Soundcheck, rehearsal, tonight’s crowd. It disappears in 12 hours.</span>
        </button>
      )}
      <input
        className="vault-caption"
        placeholder="Add a caption (optional)"
        maxLength={140}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
      />
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-blue" disabled={!file || saving} onClick={submit}>
          <Lock size={14} /> {saving ? 'Posting…' : 'Post note'}
        </button>
      </div>
    </Modal>
  );
}

/* Full-screen viewer: one image at a time, progress bars, tap zones, keyboard. */
function NoteViewer({ groups, start, me, onSeen, onClose, onChanged }) {
  const [gi, setGi] = useState(start);
  const [si, setSi] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const navigate = useNavigate();
  const { pushToast } = useStore();

  const g = groups[gi];
  const story = g?.stories[si];

  const next = useCallback(() => {
    setProgress(0);
    if (g && si < g.stories.length - 1) { setSi(si + 1); return; }
    if (gi < groups.length - 1) { setGi(gi + 1); setSi(0); return; }
    onClose();
  }, [g, si, gi, groups.length, onClose]);

  const prev = useCallback(() => {
    setProgress(0);
    if (si > 0) { setSi(si - 1); return; }
    if (gi > 0) { setGi(gi - 1); setSi(groups[gi - 1].stories.length - 1); }
  }, [si, gi, groups]);

  useEffect(() => { if (story) onSeen(story.id); }, [story, onSeen]);

  useEffect(() => {
    if (paused || !story) return undefined;
    const t0 = performance.now() - progress * DURATION;
    let raf;
    const tick = (t) => {
      const v = (t - t0) / DURATION;
      if (v >= 1) { next(); return; }
      setProgress(v);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gi, si, paused, next]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === ' ') { e.preventDefault(); setPaused((x) => !x); }
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [next, prev, onClose]);

  if (!g || !story) return null;
  const mine = g.author.id === me?.id;

  const remove = async () => {
    setPaused(true);
    try {
      await Stories.remove(story.id);
      pushToast('Note removed.');
      onChanged();
      onClose();
    } catch (e) { pushToast(e.message || 'Could not remove it.', 'error'); setPaused(false); }
  };

  return createPortal(
    <div className="vv-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={`${g.author.name} 's note`}>
      <button className="vv-close" onClick={onClose} aria-label="Close"><X size={22} /></button>
      <button className="vv-side" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Previous" disabled={gi === 0 && si === 0}><ChevronLeft size={22} /></button>
      <div
        className="vv-card"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        <img className="vv-img" src={story.mediaUrl} alt={story.caption || `Story by ${g.author.name}`} />
        <div className="vv-shade" />
        <div className="vv-bars">
          {g.stories.map((x, i) => (
            <span key={x.id}><i style={{ width: `${i < si ? 100 : i === si ? progress * 100 : 0}%` }} /></span>
          ))}
        </div>
        <div className="vv-top">
          <Avatar name={g.author.name} src={g.author.avatarUrl} size={34} />
          <div className="vv-who">
            <b>{g.author.name}{g.author.verificationStatus === 'VERIFIED' && <Verified size={13} />}</b>
            <span><Lock size={11} /> {timeLeft(story.expiresAt)}</span>
          </div>
          {mine && <button className="vv-icon" onClick={remove} aria-label="Delete this story"><Trash2 size={16} /></button>}
        </div>
        <button className="vv-zone l" onClick={prev} aria-label="Previous" tabIndex={-1} />
        <button className="vv-zone r" onClick={next} aria-label="Next" tabIndex={-1} />
        <div className="vv-bottom">
          {story.caption && <p>{story.caption}</p>}
          {!mine && (
            <div className="vv-actions">
              <button className="vv-btn" onClick={async () => {
                try { const c = await Convos.open(g.author.id); onClose(); navigate(`/messages?c=${c.id}`); }
                catch { onClose(); navigate(`/profile/${g.author.id}`); }
              }}><MessageCircle size={15} /> Message</button>
              <button className="vv-btn ghost" onClick={() => { onClose(); navigate(`/profile/${g.author.id}`); }}>View profile</button>
            </div>
          )}
        </div>
      </div>
      <button className="vv-side" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Next"><ChevronRight size={22} /></button>
    </div>,
    document.body,
  );
}
