// Draws a shareable image (1080×1350, Instagram portrait) for a profile or a booked gig.
// Pure canvas — nothing is uploaded; the person saves or shares the PNG themselves.
import QRCode from 'qrcode';

const W = 1080;
const H = 1350;
const FONT = 'Inter, "Helvetica Neue", Arial, sans-serif';

const TINTS = { PERFORMER: '#7C5CFF', VENUE: '#14B8A6', BUYER: '#F59E0B', CREW: '#3B82F6', INSTITUTION: '#EC4899' };
const ROLE = { PERFORMER: 'Artist', VENUE: 'Venue', BUYER: 'Organiser', CREW: 'Crew', INSTITUTION: 'Institution' };

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous'; // needed so the canvas can still be exported
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx, text, maxWidth, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else line = test;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[\s.,;:!-]+$/, '')}…`;
  }
  return lines;
}

/**
 * kind: 'profile' | 'booked'
 * opts: { person, link, facts?: string[], headline?, founding?, rating?, booked?: { date, withName } }
 * Returns a PNG Blob.
 */
export async function drawShareCard({ kind = 'profile', person, link, facts = [], headline = '', founding = false, rating = null, booked = null }) {
  try { await document.fonts?.ready; } catch { /* fonts API missing */ }
  const tint = TINTS[person.stakeholderType] || '#2A63EE';
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background: deep navy with a role-coloured glow.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0B1530');
  bg.addColorStop(1, '#101E45');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.85, H * 0.12, 10, W * 0.85, H * 0.12, 640);
  glow.addColorStop(0, `${tint}66`);
  glow.addColorStop(1, `${tint}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Brand
  ctx.fillStyle = '#fff';
  ctx.font = `800 44px ${FONT}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Gigset', 72, 112);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.font = `500 26px ${FONT}`;
  ctx.fillText('India’s music & live-event network', 72, 152);

  const label = kind === 'booked' ? 'BOOKED' : (ROLE[person.stakeholderType] || 'Member').toUpperCase();
  ctx.font = `700 24px ${FONT}`;
  const lw = ctx.measureText(label).width + 44;
  ctx.fillStyle = tint;
  roundRect(ctx, W - 72 - lw, 76, lw, 56, 28);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(label, W - 72 - lw + 22, 113);

  // Photo
  const cx = W / 2;
  const cy = 455;
  const R = 165;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R + 12, 0, Math.PI * 2);
  ctx.fillStyle = tint;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  const photo = await loadImage(person.avatarUrl);
  if (photo) {
    const s = Math.max((R * 2) / photo.width, (R * 2) / photo.height);
    ctx.drawImage(photo, cx - (photo.width * s) / 2, cy - (photo.height * s) / 2, photo.width * s, photo.height * s);
  } else {
    ctx.fillStyle = '#1b2a57';
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.fillStyle = '#fff';
    ctx.font = `800 150px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText((person.name || '?').trim().slice(0, 1).toUpperCase(), cx, cy + 52);
  }
  ctx.restore();

  // Name + line under it
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  let size = 84;
  ctx.font = `800 ${size}px ${FONT}`;
  while (ctx.measureText(person.name).width > W - 160 && size > 44) { size -= 4; ctx.font = `800 ${size}px ${FONT}`; }
  ctx.fillText(person.name, cx, 725);

  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.font = `500 34px ${FONT}`;
  const sub = [ROLE[person.stakeholderType], person.city].filter(Boolean).join('  ·  ');
  ctx.fillText(sub, cx, 777);

  let y = 842;
  if (kind === 'booked' && booked) {
    ctx.fillStyle = '#fff';
    ctx.font = `700 46px ${FONT}`;
    ctx.fillText(`Locked in for ${booked.date}`, cx, y);
    if (booked.withName) {
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.font = `500 34px ${FONT}`;
      ctx.fillText(`with ${booked.withName}`, cx, y + 54);
    }
    y += 120;
  } else {
    if (headline) {
      ctx.fillStyle = 'rgba(255,255,255,.88)';
      ctx.font = `500 32px ${FONT}`;
      const lines = wrap(ctx, headline, W - 200, 2);
      lines.forEach((l, i) => ctx.fillText(l, cx, y + i * 42));
      y += lines.length * 42 + 6;
    }
    // fact chips
    const chips = facts.filter(Boolean).slice(0, 3);
    if (rating) chips.unshift(`★ ${rating}`);
    ctx.font = `600 28px ${FONT}`;
    const widths = chips.map((c) => ctx.measureText(c).width + 44);
    const total = widths.reduce((a, b) => a + b, 0) + (chips.length - 1) * 14;
    let x = cx - total / 2;
    chips.forEach((c, i) => {
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      roundRect(ctx, x, y, widths[i], 54, 27);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(c, x + 20, y + 36);
      x += widths[i] + 12;
    });
    ctx.textAlign = 'center';
  }

  if (founding) {
    ctx.textAlign = 'left';
    ctx.font = `700 24px ${FONT}`;
    const t = '\u2605  Founding member';
    const w = ctx.measureText(t).width + 40;
    ctx.fillStyle = 'rgba(250,204,21,.18)';
    roundRect(ctx, 72, 184, w, 50, 25);
    ctx.fill();
    ctx.fillStyle = '#FACC15';
    ctx.fillText(t, 92, 217);
    ctx.textAlign = 'center';
  }

  // Footer: QR + call to action
  const qr = await QRCode.toDataURL(link, { margin: 1, width: 280, color: { dark: '#0B1530', light: '#FFFFFF' } });
  const qrImg = await loadImage(qr);
  const fy = 1010;
  ctx.fillStyle = '#fff';
  roundRect(ctx, 72, fy, W - 144, 270, 36);
  ctx.fill();
  if (qrImg) ctx.drawImage(qrImg, 100, fy + 22, 226, 226);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0B1530';
  ctx.font = `800 44px ${FONT}`;
  ctx.fillText(kind === 'booked' ? 'Booked on Gigset' : `Book ${person.name.split(' ')[0]}`, 360, fy + 98);
  ctx.fillStyle = '#52607A';
  ctx.font = `500 29px ${FONT}`;
  ctx.fillText(kind === 'booked' ? 'Find and book India’s live talent.' : 'Scan to see availability & send a request.', 360, fy + 148);
  ctx.fillStyle = tint;
  ctx.font = `700 28px ${FONT}`;
  const short = link.replace(/^https?:\/\//, '').replace(/\?ref=.*/, '');
  ctx.fillText(short.length > 36 ? `${short.slice(0, 35)}…` : short, 360, fy + 204);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not draw the card.'))), 'image/png'));
}
