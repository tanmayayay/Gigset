// Invite codes: a link like  …/#/epk/abc?ref=K7M2QXD  remembers who invited the visitor,
// then the code is claimed once they have an account.
const KEY = 'gigset.ref';

/** Call once at startup: remember ?ref=CODE from the page address. */
export function captureRef() {
  try {
    const src = `${window.location.search}${window.location.hash}`;
    const m = /[?&]ref=([A-Za-z0-9]{4,12})\b/.exec(src);
    if (m) localStorage.setItem(KEY, m[1].toUpperCase());
  } catch { /* storage unavailable */ }
}
export const pendingRef = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const clearRef = () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } };

/** Public one-sheet link that carries my invite code. */
export function epkLink(personId, code) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/epk/${personId}${code ? `?ref=${code}` : ''}`;
}
export function inviteLink(code) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/${code ? `?ref=${code}` : ''}`;
}
