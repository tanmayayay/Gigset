import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import { X, Bookmark, RotateCcw, ArrowRight, Clock, Sparkles, PartyPopper, List, Flame, Headphones, ThumbsDown } from 'lucide-react';
import NewsCover, { topicOf } from './NewsCover';
import { timeAgo } from '../../lib/format';

const SWIPED_KEY = 'gigset.newsSwiped';
const PREFS_KEY = 'gigset.newsPrefs';
const THRESHOLD = 110;

const today = () => new Date().toISOString().slice(0, 10);
function readJSON(k, fb) { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } }
function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } }

const readMins = (it) => Math.max(1, Math.round(((it.body || it.excerpt || '').split(/\s+/).length) / 200));

/* Top card: draggable, with SAVE / PASS / READ stamps that fade in as you drag. */
function TopCard({ item, command, onCommit, onReact }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-14, 0, 14]);
  const openO = useTransform(x, [30, THRESHOLD], [0, 1]);
  const passO = useTransform(x, [-THRESHOLD, -30], [1, 0]);
  const saveO = useTransform(y, [-THRESHOLD, -30], [1, 0]);
  const busy = useRef(false);

  const fly = useCallback(async (dir) => {
    if (busy.current) return;
    busy.current = true;
    const w = window.innerWidth;
    const to = dir === 'open' ? { x: w } : dir === 'pass' ? { x: -w } : { y: -window.innerHeight };
    await Promise.all(Object.entries(to).map(([k, v]) => animate(k === 'x' ? x : y, v, { duration: 0.32, ease: [0.3, 0.7, 0.4, 1] })));
    onCommit(dir);
  }, [x, y, onCommit]);

  useEffect(() => { if (command) fly(command.dir); }, [command, fly]);

  const onDragEnd = (_e, info) => {
    const { offset, velocity } = info;
    if (offset.x > THRESHOLD || velocity.x > 700) fly('open');
    else if (offset.x < -THRESHOLD || velocity.x < -700) fly('pass');
    else if (offset.y < -THRESHOLD || velocity.y < -700) fly('save');
    else {
      animate(x, 0, { type: 'spring', stiffness: 420, damping: 30 });
      animate(y, 0, { type: 'spring', stiffness: 420, damping: 30 });
    }
  };

  return (
    <motion.article
      className="deck-card top"
      style={{ x, y, rotate }}
      drag
      dragElastic={0.9}
      dragMomentum={false}
      onDragEnd={onDragEnd}
      initial={{ scale: 0.96, y: 14, opacity: 0.6 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      aria-roledescription="News card"
      aria-label={item.title}
    >
      <CardBody item={item} onReact={onReact} />
      <motion.span className="stamp open" style={{ opacity: openO }}>OPEN</motion.span>
      <motion.span className="stamp pass" style={{ opacity: passO }}>PASS</motion.span>
      <motion.span className="stamp save" style={{ opacity: saveO }}>SAVE</motion.span>
    </motion.article>
  );
}

function CardBody({ item, onReact }) {
  const topic = topicOf(item);
  return (
    <>
      <div className="deck-cover">
        <NewsCover item={item} large />
        <div className="deck-cover-meta">
          <span className="deck-topic">{topic}</span>
          {item.isLive && <span className="deck-live">LIVE</span>}
        </div>
      </div>
      <div className="deck-body">
        <div className="deck-src">
          <b>{item.source || 'Gigset newsroom'}</b>
          {item.publishedAt && <span><Clock size={12} /> {timeAgo(item.publishedAt)}</span>}
          {!item.isLive && <span>· {readMins(item)} min read</span>}
        </div>
        <h2>{item.title}</h2>
        {item.excerpt && <p>{item.excerpt.replace(/\s*The post .*appeared first on .*$/, '')}</p>}
        {onReact && (
          <div className="deck-react" onPointerDown={(e) => e.stopPropagation()}>
            <span>React</span>
            <button onClick={() => onReact('fire')}><Flame size={14} /> Big news</button>
            <button onClick={() => onReact('more')}><Headphones size={14} /> More like this</button>
            <button onClick={() => onReact('less')}><ThumbsDown size={14} /> Less of this</button>
          </div>
        )}
      </div>
    </>
  );
}

export default function SwipeDeck({ items, isSaved, onSave, onUnsave, onRead, onSwitchToList }) {
  const [swiped, setSwiped] = useState(() => {
    const s = readJSON(SWIPED_KEY, null);
    return s && s.date === today() ? s.ids : [];
  });
  const [prefs, setPrefs] = useState(() => readJSON(PREFS_KEY, {}));
  const [history, setHistory] = useState([]); // [{ id, dir }]
  const [command, setCommand] = useState(null);
  const [announce, setAnnounce] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => { writeJSON(SWIPED_KEY, { date: today(), ids: swiped }); }, [swiped]);
  useEffect(() => { writeJSON(PREFS_KEY, prefs); }, [prefs]);

  // Remaining stories, gently re-ranked by what you've shown interest in.
  const queue = useMemo(() => {
    const left = items.filter((it) => !swiped.includes(it.id));
    return left
      .map((it, i) => ({ it, s: (prefs[topicOf(it)] || 0) * 3 - i * 0.15 }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.it);
  }, [items, swiped, prefs]);

  const top = queue[0];
  const done = items.length - queue.length;
  const savedCount = items.filter((it) => isSaved(it)).length;

  const bump = (topic, n) => setPrefs((p) => ({ ...p, [topic]: Math.max(-4, Math.min(8, (p[topic] || 0) + n)) }));

  const commit = useCallback((dir) => {
    if (!top) return;
    setCommand(null);
    const topic = topicOf(top);
    if (dir === 'save') { if (!isSaved(top)) onSave(top); bump(topic, 2); }
    if (dir === 'pass') bump(topic, -1);
    if (dir === 'open') { bump(topic, 2); onRead(top); }
    setHistory((h) => [...h.slice(-30), { id: top.id, dir, wasSaved: isSaved(top) }]);
    setSwiped((s) => [...s, top.id]);
    setAnnounce(`${dir === 'save' ? 'Saved' : dir === 'pass' ? 'Passed' : 'Opened'}: ${top.title}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top, isSaved, onSave, onRead]);

  const undo = useCallback(() => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setSwiped((s) => s.filter((id) => id !== last.id));
    if (last.dir === 'save' && !last.wasSaved) {
      const it = items.find((x) => x.id === last.id);
      if (it) onUnsave(it);
    }
    setAnnounce('Brought the last story back');
  }, [history, items, onUnsave]);

  const go = useCallback((dir) => {
    if (!top || command) return;
    setCommand({ dir, n: Date.now() });
  }, [top, command]);

  const react = (kind) => {
    if (!top) return;
    const topic = topicOf(top);
    if (kind === 'less') { bump(topic, -2); setToast(`Showing less ${topic}`); go('pass'); }
    else { bump(topic, kind === 'fire' ? 1 : 3); setToast(kind === 'fire' ? 'Noted — big story' : `More ${topic} coming up`); }
    setTimeout(() => setToast(null), 1800);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input,textarea,select,[contenteditable]')) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); go('open'); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go('pass'); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); go('save'); }
      else if (e.key.toLowerCase() === 'z' || e.key === 'Backspace') { e.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, undo]);

  const mix = Object.entries(prefs).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const savedToday = items.filter((it) => isSaved(it)).slice(-6).reverse();

  return (
    <div className="deck-shell">
    <div className="deck-wrap">
      <div className="deck-progress" aria-hidden="true">
        <span style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
      </div>
      <div className="deck-meta">
        <span><b>{Math.min(done + 1, items.length)}</b> of {items.length} today</span>
        <span className="deck-saved"><Bookmark size={13} fill="currentColor" /> {savedCount} saved</span>
      </div>

      <div className="deck-stage">
        {top ? (
          <>
            {queue.slice(1, 3).reverse().map((it, i, arr) => {
              const depth = arr.length - i; // 2 = furthest back
              return (
                <div key={it.id} className="deck-card behind" style={{ transform: `translateY(${depth * 12}px) scale(${1 - depth * 0.045})`, opacity: 1 - depth * 0.18 }} aria-hidden="true">
                  <CardBody item={it} />
                </div>
              );
            })}
            <TopCard key={top.id} item={top} command={command} onCommit={commit} onReact={react} />
          </>
        ) : (
          <motion.div className="deck-done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <PartyPopper size={40} />
            <h2>You’re all caught up</h2>
            <p>You went through {items.length} stories and saved {savedCount}. Fresh headlines land every few hours.</p>
            <div className="deck-done-actions">
              <button className="btn btn-blue btn-sm" onClick={() => { setSwiped([]); setHistory([]); }}>
                <RotateCcw size={14} /> Start over
              </button>
              <button className="btn btn-ghost btn-sm" onClick={onSwitchToList}><List size={14} /> Browse as list</button>
            </div>
          </motion.div>
        )}
        <AnimatePresence>
          {toast && (
            <motion.div className="deck-toast" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Sparkles size={14} /> {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="deck-controls">
        <button className="dc undo" onClick={undo} disabled={!history.length} aria-label="Undo last swipe (Z)" title="Undo (Z)"><RotateCcw size={24} strokeWidth={2.6} /></button>
        <button className="dc pass" onClick={() => go('pass')} disabled={!top} aria-label="Pass (left arrow)" title="Pass (←)"><X size={26} strokeWidth={3} /></button>
        <button className="dc save" onClick={() => go('save')} disabled={!top} aria-label="Save for later (up arrow)" title="Save (↑)"><Bookmark size={24} strokeWidth={2.6} /></button>
        <button className="dc open" onClick={() => go('open')} disabled={!top} aria-label="Open story (right arrow)" title="Open (→)"><ArrowRight size={26} strokeWidth={3} /></button>
      </div>
      <div className="sr-only" aria-live="polite">{announce}</div>
    </div>

    <aside className="deck-side">
      <div className="deck-side-card">
        <h4><Bookmark size={15} /> Saved for later</h4>
        {savedToday.length ? (
          <ul className="deck-saved-list">
            {savedToday.map((it) => (
              <li key={it.id}>
                <button onClick={() => onRead(it)}>
                  <b>{it.title}</b>
                  <span>{it.source}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="deck-side-empty">Swipe up on a story and it lands here — and in your Saved tab.</p>
        )}
      </div>
      <div className="deck-side-card">
        <h4><Sparkles size={15} /> Your mix</h4>
        {mix.length ? (
          <div className="deck-mix">
            {mix.map(([t]) => <span key={t}>{t}</span>)}
            <button onClick={() => setPrefs({})}>Reset</button>
          </div>
        ) : (
          <p className="deck-side-empty">Gigset learns what you like as you swipe and react, then brings those topics forward.</p>
        )}
      </div>
      <div className="deck-side-card">
        <h4>Shortcuts</h4>
        <ul className="deck-keys">
          <li><kbd>→</kbd> Open story</li>
          <li><kbd>←</kbd> Pass</li>
          <li><kbd>↑</kbd> Save for later</li>
          <li><kbd>Z</kbd> Undo</li>
        </ul>
      </div>
    </aside>
    </div>
  );
}
