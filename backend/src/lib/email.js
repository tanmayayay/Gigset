// Transactional email through Resend (https://resend.com). Entirely optional:
// without RESEND_API_KEY + EMAIL_SECRET every function quietly does nothing.
//   RESEND_API_KEY  Resend API key
//   EMAIL_FROM      e.g. "Gigset <hello@yourdomain.in>"
//   EMAIL_SECRET    random string used to sign unsubscribe links
//   API_PUBLIC_URL  public API origin, e.g. https://strings-web.onrender.com
//   FRONTEND_URL    where the app lives (links in emails)
import crypto from 'node:crypto';

const key = () => process.env.RESEND_API_KEY;
const secret = () => process.env.EMAIL_SECRET;
export const emailEnabled = () => !!(key() && secret() && process.env.EMAIL_FROM);

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function unsubToken(userId, kind) {
  return crypto.createHmac('sha256', secret() || 'x').update(`${userId}:${kind}`).digest('hex').slice(0, 32);
}
export function unsubUrl(userId, kind) {
  const base = (process.env.API_PUBLIC_URL || '').replace(/\/+$/, '');
  return `${base}/api/email/unsubscribe?u=${encodeURIComponent(userId)}&k=${kind}&t=${unsubToken(userId, kind)}`;
}
export const appUrl = (path = '') => `${(process.env.FRONTEND_URL || '').replace(/\/+$/, '')}/#${path}`;

/** Shared, simple, dark-header layout that renders fine in Gmail/Outlook. */
export function layout({ title, intro, rows = [], cta, ctaUrl, unsubscribe }) {
  const list = rows.length
    ? `<table role="presentation" width="100%" style="margin:18px 0;border-collapse:collapse">${rows
        .map((r) => `<tr><td style="padding:10px 0;border-bottom:1px solid #eef0f6;font-size:14px;color:#52607a">${esc(r.label)}</td><td align="right" style="padding:10px 0;border-bottom:1px solid #eef0f6;font-size:15px;font-weight:700;color:#0b1530">${esc(r.value)}</td></tr>`)
        .join('')}</table>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#f3f5fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0b1530;padding:18px 24px;color:#fff;font-size:20px;font-weight:800;letter-spacing:.2px">Gigset</td></tr>
<tr><td style="padding:26px 24px 8px"><h1 style="margin:0 0 10px;font-size:20px;color:#0b1530">${esc(title)}</h1>
<p style="margin:0;font-size:15px;line-height:1.55;color:#33415c">${intro}</p>${list}
${cta && ctaUrl ? `<p style="margin:22px 0 6px"><a href="${esc(ctaUrl)}" style="display:inline-block;background:#2a63ee;color:#fff;text-decoration:none;font-weight:700;font-size:14.5px;padding:12px 22px;border-radius:12px">${esc(cta)}</a></p>` : ''}
</td></tr>
<tr><td style="padding:18px 24px 24px;font-size:12px;color:#8a94ab">You're getting this because you have a Gigset account.${unsubscribe ? ` <a href="${esc(unsubscribe)}" style="color:#8a94ab">Unsubscribe</a>` : ''}</td></tr>
</table></td></tr></table></body></html>`;
}
export { esc };

export async function sendEmail({ to, subject, html }) {
  if (!emailEnabled() || !to) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html }),
    });
    if (!r.ok) console.warn('[email] send failed', r.status);
    return r.ok;
  } catch (e) {
    console.warn('[email] send error', e?.message);
    return false;
  }
}
