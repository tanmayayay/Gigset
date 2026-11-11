// Live inbox: one small poll that keeps message badges, the bell and pop-ups fresh.
// A module-level store (not React state) so Shell and Messages share the same pulse.
import { plainBody } from './cutRef';
import { useSyncExternalStore } from 'react';
import { Convos } from './api';

const VISIBLE_MS = 5000;
const HIDDEN_MS = 30000;

let state = { unreadMessages: 0, unreadNotifications: 0, popups: [] };
const subs = new Set();
const listeners = new Set(); // (incoming message) => void
let timer = null;
let running = false;
let since = null;
let busy = false;
let me = null;
let active = null; // conversation the person is looking at
let muted = false; // settings.notifMessages === false
const seen = new Set();
let popSeq = 0;

function set(patch) {
  state = { ...state, ...patch };
  subs.forEach((f) => f());
}

export function useLiveInbox() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state);
}

/** Subscribe to every newly arrived message (used by the open chat to refresh itself). */
export function onIncoming(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setActiveConversation(id) { active = id; }
export function setMessagePopupsMuted(v) { muted = !!v; }
export function dismissPopup(id) { set({ popups: state.popups.filter((p) => p.id !== id) }); }

/** The chat page lowers the badge right away after reading, before the next pulse. */
export function adjustUnreadMessages(delta) {
  set({ unreadMessages: Math.max(0, state.unreadMessages + delta) });
}

function schedule() {
  clearTimeout(timer);
  if (!running) return;
  const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
  timer = setTimeout(refreshLive, hidden ? HIDDEN_MS : VISIBLE_MS);
}

export async function refreshLive() {
  if (!running || busy) return;
  busy = true;
  try {
    const r = await Convos.live(since);
    if (!running) return;
    const first = since == null;
    if (r.now) since = r.now;
    const fresh = (r.incoming || []).filter((m) => m.sender?.id !== me && !seen.has(m.id));
    (r.incoming || []).forEach((m) => seen.add(m.id));
    if (seen.size > 500) { [...seen].slice(0, 250).forEach((x) => seen.delete(x)); }
    set({ unreadMessages: r.unreadMessages || 0, unreadNotifications: r.unreadNotifications || 0 });
    if (!first && fresh.length) {
      const watching = typeof document !== 'undefined' && document.visibilityState === 'visible';
      fresh.forEach((m) => listeners.forEach((f) => f(m)));
      const toShow = fresh.filter((m) => !muted && !(watching && active && m.conversationId === active));
      if (toShow.length) {
        const add = toShow.slice(-3).map((m) => ({
          id: `p${++popSeq}`, conversationId: m.conversationId, name: m.sender?.name || 'New message',
          avatarUrl: m.sender?.avatarUrl, body: plainBody(m.body),
        }));
        set({ popups: [...state.popups, ...add].slice(-3) });
        add.forEach((p) => setTimeout(() => dismissPopup(p.id), 7000));
      }
    }
  } catch { /* offline or signed out: try again next tick */ } finally {
    busy = false;
    schedule();
  }
}

function wake() { if (running) { clearTimeout(timer); refreshLive(); } }

export function startLiveInbox(userId) {
  if (running) stopLiveInbox();
  me = userId; running = true; since = null;
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('focus', wake);
  window.addEventListener('online', wake);
  refreshLive();
}

export function stopLiveInbox() {
  running = false; clearTimeout(timer); busy = false;
  document.removeEventListener('visibilitychange', wake);
  window.removeEventListener('focus', wake);
  window.removeEventListener('online', wake);
  seen.clear();
  set({ unreadMessages: 0, unreadNotifications: 0, popups: [] });
}
