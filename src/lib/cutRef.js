// A reply to a cut travels as a normal message whose text starts with `[cut:<image url>]`.
// The chat shows it as a small picture card above the reply. Only our own storage links are ever drawn.
const RE = /^\[cut:(https?:\/\/[^\s\]]+)\]\n?/;
const origin = (() => { try { return new URL(import.meta.env.VITE_SUPABASE_URL).origin; } catch { return null; } })();

export const withCut = (url, text) => `[cut:${url}]\n${text}`;

export function parseCut(body) {
  const m = typeof body === 'string' ? body.match(RE) : null;
  if (!m) return { cut: null, text: body };
  let ok = false;
  try { ok = !!origin && new URL(m[1]).origin === origin; } catch { ok = false; }
  return { cut: ok ? m[1] : null, text: body.slice(m[0].length) };
}

/** One-line version for lists, pop-ups and notifications. */
export function plainBody(body) {
  const { text } = parseCut(body);
  return text === body ? body : `↩ Replied to your cut: ${text}`;
}
