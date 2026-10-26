import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Gigset API client — every request to the Express backend goes through here.
// Authenticated requests carry `Authorization: Bearer <supabase access token>`;
// the token is read from the live Supabase session (auto-refreshed).
// ---------------------------------------------------------------------------

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

export function apiBaseUrl() {
  return API_BASE;
}

/** Start the first screen's requests while the page code is still downloading. */
export function prefetchBoot() {
  try {
    const signedIn = Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k));
    const h = window.location.hash;
    if (!signedIn || !(h === '' || h === '#/' || h.startsWith('#/home'))) return;
    const quiet = (p) => p.catch(() => {});
    quiet(import('../pages/Home')); // fetch the Home screen's code in parallel with its data
    quiet(api('/api/profiles/me', { fresh: true }));
    quiet(api('/api/posts?take=40', { auth: 'optional' }));
    quiet(api('/api/stories', { auth: false }));
    quiet(api('/api/news/live', { auth: false }));
    quiet(api('/api/profiles?take=24', { auth: false }));
    quiet(api('/api/opportunities?status=OPEN&take=12', { auth: false }));
  } catch { /* prefetch is best effort */ }
}

/** Wake the API (free hosts sleep when idle) while the page is still loading. */
export function warmUpApi() {
  try { fetch(`${API_BASE}/api/health`, { mode: 'cors', cache: 'no-store' }).catch(() => {}); } catch { /* ignore */ }
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Called on 401s — the store wires this to sign the user out. */
let unauthorizedHandler = null;
export function onUnauthorized(fn) {
  unauthorizedHandler = fn;
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// ---- GET cache --------------------------------------------------------------
// Repeat reads inside a short window are answered from memory and identical
// in-flight requests are shared, so moving between pages feels instant and the
// server isn't asked the same question twice. Any write clears the cache so
// nothing shown after an action is stale. Chat and notifications are never cached.
const cache = new Map(); // key -> { t, data }
const inflight = new Map(); // key -> Promise
const NEVER = /^\/api\/(conversations|notifications)/;
const LONG = /^\/api\/news\/live/;
const ttlFor = (path) => (NEVER.test(path) ? 0 : LONG.test(path) ? 300000 : 20000);

export function clearApiCache() {
  cache.clear();
  inflight.clear();
}

export function api(path, opts = {}) {
  const { method = 'GET', auth = true, fresh = false } = opts;
  if (method !== 'GET') {
    return request(path, opts).then((d) => { clearApiCache(); return d; });
  }
  const ttl = ttlFor(path);
  if (!ttl) return request(path, opts);
  const key = `${auth ? 'a' : 'p'}:${path}`;
  const hit = cache.get(key);
  if (!fresh && hit && Date.now() - hit.t < ttl) return Promise.resolve(hit.data);
  if (inflight.has(key)) return inflight.get(key);
  const pr = request(path, opts)
    .then((d) => { cache.set(key, { t: Date.now(), data: d }); return d; })
    .finally(() => inflight.delete(key));
  inflight.set(key, pr);
  return pr;
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = await getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else if (auth !== 'optional') {
      throw Object.assign(new ApiError('Not signed in.', 401, null), { code: 'NO_SESSION' });
    }
  }
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new ApiError(`Cannot reach the Gigset API at ${API_BASE}. Is the backend running?`, 0, null);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    if (res.status === 401 && unauthorizedHandler) {
      try {
        unauthorizedHandler();
      } catch {
        /* ignore */
      }
    }
    throw new ApiError((data && data.error) || `Request failed (${res.status})`, res.status, data);
  }
  return data;
}

function qs(params = {}) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') s.set(k, String(v));
  }
  const str = s.toString();
  return str ? `?${str}` : '';
}

// ---------------------------------------------------------------------------
// Resource helpers — the contract page components use.
// Shapes mirror the backend responses: { items, total, take, skip } for lists.
// ---------------------------------------------------------------------------

export const Profiles = {
  list: (params = {}) => api(`/api/profiles${qs(params)}`, { auth: false }),
  // Sends the token when signed in so owners can open their own private profile.
  get: (id) => api(`/api/profiles/${id}`, { auth: 'optional' }),
  /** Live calendar: [{ date: 'YYYY-MM-DD', status: 'free'|'busy'|'booked' }] */
  availability: (id, days = 30) => api(`/api/profiles/${id}/availability?days=${days}`, { auth: 'optional' }),
  /** Owner: mark days busy or free again. */
  setAvailability: (dates, status) => api('/api/profiles/me/availability', { method: 'PUT', body: { dates, status } }),
  /** Owner: real profile analytics (views, followers, requests, top posts). */
  analytics: (days = 14) => api(`/api/profiles/me/analytics?days=${days}`, { fresh: true }),
  /** The caller's own profile — auto-provisioned on first sight. */
  me: () => api('/api/profiles/me', { fresh: true }),
  create: (data) => api('/api/profiles', { method: 'POST', body: data }),
  update: (id, data) => api(`/api/profiles/${id}`, { method: 'PATCH', body: data }),
  follow: (id) => api(`/api/profiles/${id}/follow`, { method: 'POST' }),
  unfollow: (id) => api(`/api/profiles/${id}/follow`, { method: 'DELETE' }),
  /** People the caller follows — for the Messages "new conversation" picker. */
  following: () => api('/api/profiles/me/following'),
  /** Mutual follows: the only people you can collab with. */
  connections: () => api('/api/profiles/me/connections', { fresh: true }),
  /** Permanently deletes the caller's account and everything they posted. */
  deleteMe: () => api('/api/profiles/me', { method: 'DELETE' }),
};

export const Posts = {
  list: (params = {}) => api(`/api/posts${qs(params)}`, { auth: 'optional' }),
  get: (id) => api(`/api/posts/${id}`, { auth: 'optional' }),
  create: ({ body, mediaUrl }) => api('/api/posts', { method: 'POST', body: { body, mediaUrl } }),
  like: (id) => api(`/api/posts/${id}/like`, { method: 'POST' }),
  unlike: (id) => api(`/api/posts/${id}/like`, { method: 'DELETE' }),
  comments: (id, params = {}) => api(`/api/posts/${id}/comments${qs(params)}`, { auth: false }),
  comment: (id, body) => api(`/api/posts/${id}/comments`, { method: 'POST', body: { body } }),
};

export const Stories = {
  list: () => api('/api/stories', { auth: false }),
  create: ({ mediaUrl, caption }) => api('/api/stories', { method: 'POST', body: { mediaUrl, caption } }),
  remove: (id) => api(`/api/stories/${id}`, { method: 'DELETE' }),
};

export const Opps = {
  list: (params = {}) => api(`/api/opportunities${qs(params)}`, { auth: 'optional' }),
  get: (id) => api(`/api/opportunities/${id}`, { auth: 'optional' }),
  create: (data) => api('/api/opportunities', { method: 'POST', body: data }),
  apply: (id, message, intent) => api(`/api/opportunities/${id}/apply`, { method: 'POST', body: { message, intent } }),
  applications: (id, params = {}) => api(`/api/opportunities/${id}/applications${qs(params)}`),
  setApplicationStatus: (appId, status) =>
    api(`/api/opportunities/applications/${appId}`, { method: 'PATCH', body: { status } }),
};

export const Bookings = {
  list: (params = {}) => api(`/api/bookings${qs(params)}`),
  create: (data) => api('/api/bookings', { method: 'POST', body: data }),
  setStatus: (id, status) => api(`/api/bookings/${id}`, { method: 'PATCH', body: { status } }),
};

export const Convos = {
  list: () => api('/api/conversations'),
  /** Find-or-create a 1:1 conversation with another user. Returns { id, created }. */
  open: (userId) => api('/api/conversations', { method: 'POST', body: { userId } }),
  messages: (id, params = {}) => api(`/api/conversations/${id}/messages${qs(params)}`),
  send: (id, body) => api(`/api/conversations/${id}/messages`, { method: 'POST', body: { body } }),
  /** Light "anything new?" pulse: unread counts + messages that arrived since `since`. */
  live: (since) => api(`/api/conversations/live${since ? qs({ since }) : ''}`),
  /** Tell the sender you have seen their messages (turns their ticks blue). */
  markRead: (id) => api(`/api/conversations/${id}/read`, { method: 'POST', body: {} }),
};

export const Account = {
  prefs: () => api('/api/account/prefs', { fresh: true }),
  setPrefs: (data) => api('/api/account/prefs', { method: 'PATCH', body: data }),
  referral: () => api('/api/account/referral', { fresh: true }),
  claimReferral: (code) => api('/api/account/referral/claim', { method: 'POST', body: { code } }),
};

export const Communities = {
  list: (params = {}) => api(`/api/communities${qs(params)}`),
  feed: (params = {}) => api(`/api/communities/feed${qs(params)}`, { fresh: true }),
  create: (data) => api('/api/communities', { method: 'POST', body: data }),
  get: (id) => api(`/api/communities/${id}`, { fresh: true }),
  update: (id, data) => api(`/api/communities/${id}`, { method: 'PATCH', body: data }),
  join: (id) => api(`/api/communities/${id}/join`, { method: 'POST' }),
  leave: (id) => api(`/api/communities/${id}/leave`, { method: 'POST' }),
  posts: (id, params = {}) => api(`/api/communities/${id}/posts${qs(params)}`, { fresh: true }),
  post: (id, data) => api(`/api/communities/${id}/posts`, { method: 'POST', body: data }),
  thread: (postId) => api(`/api/communities/posts/${postId}`, { fresh: true }),
  comment: (postId, body, parentId) => api(`/api/communities/posts/${postId}/comments`, { method: 'POST', body: { body, parentId } }),
  votePost: (postId, value) => api(`/api/communities/posts/${postId}/vote`, { method: 'POST', body: { value } }),
  voteComment: (commentId, value) => api(`/api/communities/comments/${commentId}/vote`, { method: 'POST', body: { value } }),
  removePost: (postId) => api(`/api/communities/posts/${postId}`, { method: 'DELETE' }),
  removeComment: (commentId) => api(`/api/communities/comments/${commentId}`, { method: 'DELETE' }),
  pin: (postId, pinned) => api(`/api/communities/posts/${postId}/pin`, { method: 'POST', body: { pinned } }),
};

export const Safety = {
  report: ({ targetType, targetId, reason, details }) => api('/api/reports', { method: 'POST', body: { targetType, targetId, reason, details } }),
  blocks: () => api('/api/blocks', { fresh: true }),
  block: (userId) => api('/api/blocks', { method: 'POST', body: { userId } }),
  unblock: (userId) => api(`/api/blocks/${userId}`, { method: 'DELETE' }),
};

export const Reviews = {
  forUser: (userId, params = {}) => api(`/api/reviews${qs({ userId, ...params })}`, { auth: false }),
  pending: () => api('/api/reviews/pending', { fresh: true }),
  create: ({ bookingId, rating, body }) => api('/api/reviews', { method: 'POST', body: { bookingId, rating, body } }),
};

export const Push = {
  key: () => api('/api/push/key', { auth: false }),
  subscribe: (sub) => api('/api/push/subscribe', { method: 'POST', body: sub }),
  unsubscribe: (endpoint) => api('/api/push/subscribe', { method: 'DELETE', body: { endpoint } }),
};

export const Notifs = {
  list: (params = {}) => api(`/api/notifications${qs(params)}`),
  markRead: (ids) => api('/api/notifications/read', { method: 'POST', body: ids ? { ids } : {} }),
};

export const Directory = {
  venues: (params = {}) => api(`/api/venues${qs(params)}`, { auth: false }),
  events: (params = {}) => api(`/api/events${qs(params)}`, { auth: false }),
  articles: (params = {}) => api(`/api/articles${qs(params)}`, { auth: false }),
  article: (id) => api(`/api/articles/${id}`, { auth: false }),
};

/* ---------- user-testing batch (2026-09-29) ---------- */

export const Tracks = {
  list: (params = {}) => api(`/api/tracks${qs(params)}`),
  get: (id) => api(`/api/tracks/${id}`),
  create: (data) => api('/api/tracks', { method: 'POST', body: data }),
  remove: (id) => api(`/api/tracks/${id}`, { method: 'DELETE' }),
  /** Star/unstar a track. Returns { liked }. */
  toggleLike: (id) => api(`/api/tracks/${id}/like`, { method: 'POST' }),
};

export const Groups = {
  list: (params = {}) => api(`/api/groups${qs(params)}`),
  create: (data) => api('/api/groups', { method: 'POST', body: data }),
  get: (id) => api(`/api/groups/${id}`),
  join: (id) => api(`/api/groups/${id}/join`, { method: 'POST' }),
  leave: (id) => api(`/api/groups/${id}/leave`, { method: 'POST' }),
  messages: (id, params = {}) => api(`/api/groups/${id}/messages${qs(params)}`),
  send: (id, body) => api(`/api/groups/${id}/messages`, { method: 'POST', body: { body } }),
  setRole: (id, userId, role) => api(`/api/groups/${id}/members/${userId}`, { method: 'PATCH', body: { role } }),
  removeMember: (id, userId) => api(`/api/groups/${id}/members/${userId}`, { method: 'DELETE' }),
};

export const NewsLive = {
  get: () => api('/api/news/live', { auth: 'optional' }),
};
