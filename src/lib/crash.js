import { apiBaseUrl } from './api';

/* Crash reporting: errors from TheGigSet's own code are sent to the backend,
   which writes them to the server log ("[client-error]" in Render → Logs).
   Errors from browser extensions are ignored: they never mention our own files. */

const MAX_PER_PAGE = 5;
let sent = 0;
const seen = new Set();

function ours(stack) {
  return typeof stack === 'string' && stack.includes(window.location.origin) && !/chrome-extension:|moz-extension:|safari-extension:/.test(stack);
}

export function reportError(error, where = 'window') {
  try {
    const message = String(error?.message || error || '').slice(0, 300);
    const stack = String(error?.stack || '').slice(0, 2000);
    if (!message || !ours(stack) || sent >= MAX_PER_PAGE || seen.has(message)) return;
    seen.add(message);
    sent += 1;
    fetch(`${apiBaseUrl()}/api/client-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ message, stack, where, page: window.location.pathname, ua: navigator.userAgent.slice(0, 200) }),
    }).catch(() => {});
  } catch { /* reporting must never break the page */ }
}

export function installCrashReporting() {
  window.addEventListener('error', (e) => reportError(e.error || { message: e.message, stack: `${e.filename}:${e.lineno}` }, 'error'));
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, 'promise'));
}
