import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, Pause, Heart, Bookmark, MapPin, CalendarDays, ExternalLink, Clapperboard, LayoutPanelTop,
  Music, Disc3, AudioWaveform, Trash2, Upload, Volume2, VolumeX, Ticket, Film, Image as ImageIcon, Plus, X,
} from 'lucide-react';
import { PageHead, Avatar, Verified, EmptyState } from '../components/ui';
import PostCard from '../components/PostCard';
import { liveEvents, fmtLiveDateTime, viaLabel } from '../data/liveData';
import { Posts, Tracks } from '../lib/api';
import { supabase } from '../lib/supabase';
import { timeAgo } from '../lib/format';
import { useStore } from '../store/store';
import './gighub.css';

/* ============================================================
   Gighub — the music vault. GitHub-style file browser for
   tracks, beats and samples (audio), plus the clips & photos
   grid from post media below.
   ============================================================ */

const KIND_META = {
  TRACK: { label: 'Track', icon: Music, color: 'blue' },
  BEAT: { label: 'Beat', icon: Disc3, color: 'indigo' },
  SAMPLE: { label: 'Sample', icon: AudioWaveform, color: 'sky' },
};

const KIND_OPTIONS = ['TRACK', 'BEAT', 'SAMPLE'];

function fmtDuration(sec) {
  if (sec == null || !Number.isFinite(Number(sec))) return null;
  const s = Math.round(Number(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Read duration from the local file (no network) — nullable on failure.
function probeDuration(file) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    try {
      const url = URL.createObjectURL(file);
      const el = new Audio();
      el.preload = 'metadata';
      el.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        finish(el.duration && Number.isFinite(el.duration) ? Math.round(el.duration) : null);
      };
      el.onerror = () => { URL.revokeObjectURL(url); finish(null); };
      el.src = url;
      setTimeout(() => finish(null), 8000);
    } catch {
      finish(null);
    }
  });
}

function UploadCard({ userId, onUploaded }) {
  const { pushToast } = useStore();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('TRACK');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const upload = async () => {
    if (!title.trim()) { pushToast('Give your track a title.', 'error'); return; }
    if (!file) { pushToast('Choose an audio file first.', 'error'); return; }
    setUploading(true);
    let publicUrl;
    try {
      const path = `${userId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('gighub-audio').upload(path, file);
      if (error) throw error;
      publicUrl = supabase.storage.from('gighub-audio').getPublicUrl(path).data.publicUrl;
    } catch (e) {
      pushToast('Upload failed — the gighub-audio storage bucket may not exist yet.', 'error');
      setUploading(false);
      return;
    }
    try {
      const durationSec = await probeDuration(file);
      await Tracks.create({ title: title.trim(), kind, audioUrl: publicUrl, durationSec });
      setTitle('');
      setKind('TRACK');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      pushToast('Track uploaded.');
      onUploaded();
    } catch (e) {
      pushToast(e.message || 'Could not save the track.', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="side-card" style={{ marginBottom: 22 }}>
      <h4 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Upload size={15} style={{ color: 'var(--blue)' }} /> Upload to the vault
      </h4>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
        <input
          className="filter-select"
          placeholder="Track title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ flex: '2 1 180px' }}
          disabled={uploading}
        />
        <select
          className="filter-select"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          disabled={uploading}
        >
          {KIND_OPTIONS.map((k) => (
            <option key={k} value={k}>{KIND_META[k].label}</option>
          ))}
        </select>
        <label className="btn btn-ghost btn-sm" style={{ cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
          {file ? file.name.slice(0, 24) : 'Choose audio…'}
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            disabled={uploading}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        <button className="btn btn-blue btn-sm" onClick={upload} disabled={uploading}>
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: '10px 0 0' }}>
        MP3, WAV, OGG and friends — your file streams straight from the vault.
      </p>
    </div>
  );
}


/* ============================================================
   Reels & Posts. No grids, no lists:
   - Reels: a full-height vertical feed, one piece of content at a time (video autoplays,
     photos drift, tracks glow with a live visualiser, events show up as holo tickets).
   - Posts: big single cards, the same content at reading pace.
   ============================================================ */

const FILTERS = [['all', 'All'], ['video', 'Video'], ['photo', 'Photo'], ['audio', 'Audio']];

function isVideoUrl(url) {
  return /\.(mp4|mov|webm|m4v|ogv)(\?|#|$)/i.test(url || '');
}

const hueOf = (id) => String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
const artFor = (id) => { const h = hueOf(id); return `radial-gradient(120% 90% at 20% 10%, hsl(${h},85%,55%), transparent 60%), radial-gradient(100% 100% at 90% 90%, hsl(${(h + 70) % 360},80%,45%), transparent 60%), #0a0f24`; };

/** Mixes posts with media, tracks and live events into one stream. */
function buildStream(posts, tracks, events) {
  const media = posts.filter((p) => p.mediaUrl).map((p) => ({ type: isVideoUrl(p.mediaUrl) ? 'video' : 'photo', id: `p:${p.id}`, post: p }));
  const audio = tracks.map((t) => ({ type: 'audio', id: `t:${t.id}`, track: t }));
  const gigs = events.slice(0, 8).map((e, i) => ({ type: 'event', id: `e:${e.id || i}`, event: e }));
  const out = [];
  let mi = 0; let ai = 0; let gi = 0; let k = 0;
  while (mi < media.length || ai < audio.length || gi < gigs.length) {
    if (mi < media.length) out.push(media[mi++]);
    if (k % 2 === 1 && ai < audio.length) out.push(audio[ai++]);
    if (k % 4 === 3 && gi < gigs.length) out.push(gigs[gi++]);
    if (mi >= media.length) { if (ai < audio.length) out.push(audio[ai++]); else if (gi < gigs.length) out.push(gigs[gi++]); }
    k += 1;
  }
  return out;
}

function Visualizer({ id, playing }) {
  const bars = useMemo(() => Array.from({ length: 28 }, (_, i) => ({ h: 22 + Math.round(60 * Math.abs(Math.sin((i + hueOf(id)) * 1.3) * Math.cos(i * 0.45))), d: (i % 9) * 0.11 })), [id]);
  return <div className={`gh-viz${playing ? ' on' : ''}`} aria-hidden="true">{bars.map((b, i) => <i key={i} style={{ height: `${b.h}%`, animationDelay: `${b.d}s` }} />)}</div>;
}

function useActions() {
  const { pushToast, isBookmarked, toggleBookmark, userId } = useStore();
  const navigate = useNavigate();
  const needAuth = () => { if (!userId) { pushToast('Sign in to do that.', 'error'); return true; } return false; };
  const [likes, setLikes] = useState({}); // id -> { liked, delta }
  const like = async (item) => {
    if (needAuth()) return;
    const base = item.type === 'audio' ? !!item.track.likedByMe : !!item.post?.likedByMe;
    const cur = likes[item.id]?.liked ?? base;
    setLikes((m) => ({ ...m, [item.id]: { liked: !cur, delta: (m[item.id]?.delta || 0) + (cur ? -1 : 1) } }));
    try {
      if (item.type === 'audio') await Tracks.toggleLike(item.track.id);
      else if (cur) await Posts.unlike(item.post.id); else await Posts.like(item.post.id);
    } catch (e) {
      setLikes((m) => ({ ...m, [item.id]: { liked: cur, delta: (m[item.id]?.delta || 0) + (cur ? 1 : -1) } }));
      if (e.status !== 409) pushToast(e.message, 'error');
    }
  };
  const save = (item) => {
    const kind = item.type === 'audio' ? 'track' : 'media';
    const ref = item.type === 'audio' ? item.track.id : item.post.id;
    const now = toggleBookmark(kind, ref);
    pushToast(now ? 'Saved to your bookmarks.' : 'Removed from bookmarks.');
  };
  const saved = (item) => (item.type === 'audio' ? isBookmarked('track', item.track.id) : item.post ? isBookmarked('media', item.post.id) : false);
  const counts = (item) => {
    const base = item.type === 'audio' ? (item.track._count?.likes ?? 0) : (item.post?._count?.likes ?? 0);
    const baseLiked = item.type === 'audio' ? !!item.track.likedByMe : !!item.post?.likedByMe;
    const st = likes[item.id];
    return { n: base + (st?.delta || 0), liked: st?.liked ?? baseLiked };
  };
  return { like, save, saved, counts, navigate };
}

/* ---------- Reels ---------- */

function ReelActions({ item, act, owner, onDelete }) {
  const { n, liked } = act.counts(item);
  const author = item.type === 'audio' ? item.track.uploader : item.post?.author;
  return (
    <div className="gh-actions">
      {author && (
        <button className="gh-act av" onClick={() => act.navigate(`/profile/${author.id}`)} aria-label={`Open ${author.name}'s profile`}>
          <Avatar name={author.name} src={author.avatarUrl} size={42} />
        </button>
      )}
      <button className={`gh-act${liked ? ' on' : ''}`} onClick={() => act.like(item)} aria-label="Like"><Heart size={22} fill={liked ? 'currentColor' : 'none'} /><span>{n}</span></button>
      <button className={`gh-act${act.saved(item) ? ' on' : ''}`} onClick={() => act.save(item)} aria-label="Save"><Bookmark size={22} fill={act.saved(item) ? 'currentColor' : 'none'} /><span>Save</span></button>
      {owner && <button className="gh-act" onClick={onDelete} aria-label="Delete"><Trash2 size={20} /><span>Delete</span></button>}
    </div>
  );
}

function EventPoster({ e }) {
  const dt = fmtLiveDateTime(e.date);
  const where = [e.venue, e.city].filter(Boolean).join(' · ');
  return (
    <div className="gh-poster" style={{ background: artFor(e.id || e.title || 'ev') }}>
      <span className="gh-chip"><Ticket size={12} /> Live in India · {viaLabel(e)}</span>
      <h2>{e.title || 'Untitled event'}</h2>
      <div className="gh-poster-meta">
        {dt && <span><CalendarDays size={14} /> {dt}</span>}
        {where && <span><MapPin size={14} /> {where}</span>}
        {e.genre && <span><Music size={14} /> {e.genre}</span>}
      </div>
      {e.url && <a href={e.url} target="_blank" rel="noopener noreferrer" className="btn btn-blue">Get tickets <ExternalLink size={14} /></a>}
    </div>
  );
}

function Reel({ item, active, act, userId, audio, onDelete }) {
  const vref = useRef(null);
  const [muted, setMuted] = useState(true);
  const { track, post } = item;

  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    if (active) v.play().catch(() => {}); else { v.pause(); }
  }, [active]);

  const author = item.type === 'audio' ? track.uploader : post?.author;
  const text = item.type === 'audio' ? track.title : post?.body;
  const playing = item.type === 'audio' && audio.playingId === track.id;

  return (
    <article className={`gh-reel${active ? ' active' : ''}`} data-reel={item.id}>
      <div className={`gh-screen t-${item.type}`}>
        {item.type === 'video' && (
          <>
            <video ref={vref} src={post.mediaUrl} loop muted={muted} playsInline preload="metadata" onClick={() => { const v = vref.current; if (v.paused) v.play(); else v.pause(); }} />
            <button className="gh-sound" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
          </>
        )}
        {item.type === 'photo' && <img src={post.mediaUrl} alt={post.body || 'Photo'} />}
        {item.type === 'audio' && (
          <div className="gh-audio" style={{ background: artFor(track.id) }}>
            <span className="gh-chip"><Music size={12} /> {(track.kind || 'TRACK').toLowerCase()}</span>
            <div className={`gh-disc${playing ? ' spin' : ''}`}><Disc3 size={64} strokeWidth={1.2} /></div>
            <Visualizer id={track.id} playing={playing} />
            <button className="gh-play" onClick={() => audio.toggle(track)} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause size={26} /> : <Play size={26} />}</button>
            {track.durationSec != null && <span className="gh-dur">{fmtDuration(track.durationSec)}</span>}
          </div>
        )}
        {item.type === 'event' && <EventPoster e={item.event} />}
        {item.type !== 'event' && (
          <>
            <div className="gh-shade" />
            <div className="gh-caption">
              {author && <b onClick={() => act.navigate(`/profile/${author.id}`)}>{author.name}{author.verificationStatus === 'VERIFIED' && <Verified size={12} />}</b>}
              {text && <p>{text}</p>}
            </div>
          </>
        )}
        <span className="gh-hud tl" /><span className="gh-hud br" />
      </div>
      {item.type !== 'event' && <ReelActions item={item} act={act} owner={item.type === 'audio' && track.uploader?.id === userId} onDelete={() => onDelete(track)} />}
    </article>
  );
}

function ReelsView({ stream, act, userId, audio, onDelete }) {
  const [activeId, setActiveId] = useState(null);
  const box = useRef(null);

  useEffect(() => {
    const root = box.current;
    if (!root) return undefined;
    const io = new IntersectionObserver((entries) => {
      const best = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (best) setActiveId(best.target.dataset.reel);
    }, { root, threshold: [0.55, 0.8] });
    root.querySelectorAll('[data-reel]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [stream]);

  const go = (d) => {
    const els = [...(box.current?.querySelectorAll('[data-reel]') || [])];
    const i = els.findIndex((el) => el.dataset.reel === activeId);
    els[Math.max(0, Math.min(els.length - 1, (i < 0 ? 0 : i) + d))]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  useEffect(() => {
    const onKey = (e) => {
      if (/input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); go(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="gh-reels" ref={box} tabIndex={0} aria-label="Reels">
      {stream.map((item) => <Reel key={item.id} item={item} active={activeId === item.id || (activeId == null && item === stream[0])} act={act} userId={userId} audio={audio} onDelete={onDelete} />)}
      <div className="gh-end">You are at the end of the signal ✦</div>
    </div>
  );
}

/* ---------- Posts ---------- */

function AudioPost({ item, act, userId, audio, onDelete }) {
  const t = item.track;
  const playing = audio.playingId === t.id;
  const { n, liked } = act.counts(item);
  const meta = KIND_META[t.kind] || KIND_META.TRACK;
  return (
    <article className="gh-post">
      <header>
        <Avatar name={t.uploader?.name || '?'} src={t.uploader?.avatarUrl} size={38} />
        <div onClick={() => t.uploader && act.navigate(`/profile/${t.uploader.id}`)} style={{ cursor: 'pointer' }}>
          <b>{t.uploader?.name}{t.uploader?.verificationStatus === 'VERIFIED' && <Verified size={12} />}</b>
          <span>{meta.label} · {timeAgo(t.createdAt)}</span>
        </div>
      </header>
      <div className="gh-audio sq" style={{ background: artFor(t.id) }}>
        <div className={`gh-disc${playing ? ' spin' : ''}`}><Disc3 size={56} strokeWidth={1.2} /></div>
        <Visualizer id={t.id} playing={playing} />
        <button className="gh-play" onClick={() => audio.toggle(t)} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause size={24} /> : <Play size={24} />}</button>
      </div>
      <footer>
        <b>{t.title}</b>
        <div>
          <button className={liked ? 'on' : ''} onClick={() => act.like(item)} aria-label="Like"><Heart size={18} fill={liked ? 'currentColor' : 'none'} /> {n}</button>
          <button className={act.saved(item) ? 'on' : ''} onClick={() => act.save(item)} aria-label="Save"><Bookmark size={18} fill={act.saved(item) ? 'currentColor' : 'none'} /></button>
          {t.uploader?.id === userId && <button onClick={() => onDelete(t)} aria-label="Delete"><Trash2 size={17} /></button>}
        </div>
      </footer>
    </article>
  );
}

function PostsView({ stream, act, userId, audio, onDelete }) {
  return (
    <div className="gh-posts">
      {stream.map((item) => {
        if (item.type === 'audio') return <AudioPost key={item.id} item={item} act={act} userId={userId} audio={audio} onDelete={onDelete} />;
        if (item.type === 'event') return <div className="gh-post ev" key={item.id}><EventPoster e={item.event} /></div>;
        return <PostCard key={item.id} post={item.post} />;
      })}
    </div>
  );
}

export default function Gighub() {
  const { userId, pushToast } = useStore();
  const [mode, setMode] = useState(() => { try { return localStorage.getItem('strings.ghMode') === 'posts' ? 'posts' : 'reels'; } catch { return 'reels'; } });
  const [filter, setFilter] = useState('all');
  const [tracks, setTracks] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const audioEl = useRef(null);
  const act = useActions();

  const setModeSaved = (m) => { setMode(m); try { localStorage.setItem('strings.ghMode', m); } catch { /* ignore */ } };

  const load = useCallback(async () => {
    setLoading(true);
    const [t, p] = await Promise.allSettled([Tracks.list({ take: 50 }), Posts.list({ take: 60 })]);
    setTracks(t.status === 'fulfilled' ? t.value.items || [] : []);
    setPosts(p.status === 'fulfilled' ? p.value.items || [] : []);
    if (t.status === 'rejected' && p.status === 'rejected') pushToast(p.reason?.message || 'Could not load Gighub.', 'error');
    setLoading(false);
  }, [pushToast]);
  useEffect(() => { load(); }, [load]);

  // One shared audio player for every track card.
  const audio = useMemo(() => ({
    playingId,
    toggle: (t) => {
      const el = audioEl.current;
      if (!el) return;
      if (playingId === t.id) { el.pause(); setPlayingId(null); return; }
      el.src = t.audioUrl;
      el.play().then(() => setPlayingId(t.id)).catch(() => pushToast('Could not play that track.', 'error'));
    },
  }), [playingId, pushToast]);

  const onDelete = async (t) => {
    if (!window.confirm(`Delete "${t.title}"? This can't be undone.`)) return;
    try {
      await Tracks.remove(t.id);
      setTracks((l) => l.filter((x) => x.id !== t.id));
      if (playingId === t.id) { audioEl.current?.pause(); setPlayingId(null); }
      pushToast('Track deleted.');
    } catch (e) { pushToast(e.message, 'error'); }
  };

  const stream = useMemo(() => {
    const all = buildStream(posts, tracks, liveEvents);
    return filter === 'all' ? all : all.filter((i) => i.type === filter);
  }, [posts, tracks, filter]);

  return (
    <div className="gh">
      <PageHead
        title="Gighub"
        sub="Reels, tracks and posts from the scene."
        action={userId ? <button className="btn btn-blue btn-sm" onClick={() => setUploading((u) => !u)}>{uploading ? <><X size={14} /> Close</> : <><Plus size={14} /> Upload</>}</button> : null}
      />
      {uploading && userId && <UploadCard userId={userId} onUploaded={() => { setUploading(false); load(); }} />}
      <audio ref={audioEl} onEnded={() => setPlayingId(null)} />

      <div className="gh-bar">
        <div className="gh-mode" role="tablist" aria-label="View">
          <button role="tab" aria-selected={mode === 'reels'} className={mode === 'reels' ? 'on' : ''} onClick={() => setModeSaved('reels')}><Clapperboard size={15} /> Reels</button>
          <button role="tab" aria-selected={mode === 'posts'} className={mode === 'posts' ? 'on' : ''} onClick={() => setModeSaved('posts')}><LayoutPanelTop size={15} /> Posts</button>
        </div>
        <div className="gh-filters">
          {FILTERS.map(([v, l]) => <button key={v} className={filter === v ? 'on' : ''} onClick={() => setFilter(v)}>{v === 'video' ? <Film size={13} /> : v === 'photo' ? <ImageIcon size={13} /> : v === 'audio' ? <AudioWaveform size={13} /> : null}{l}</button>)}
        </div>
      </div>

      {loading ? (
        <div className="gh-skel"><span className="spinner" /></div>
      ) : stream.length === 0 ? (
        <EmptyState icon={<Clapperboard size={22} />} title={filter === 'all' ? 'Nothing in the feed yet' : `No ${filter} yet`} text={filter === 'audio' ? 'Upload a track, beat or sample and it plays here.' : 'Share a photo, clip or track and it shows up here.'} />
      ) : mode === 'reels' ? (
        <ReelsView stream={stream} act={act} userId={userId} audio={audio} onDelete={onDelete} />
      ) : (
        <PostsView stream={stream} act={act} userId={userId} audio={audio} onDelete={onDelete} />
      )}
    </div>
  );
}
