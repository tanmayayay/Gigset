import { createHash } from 'node:crypto';
import Parser from 'rss-parser';

// ---------------------------------------------------------------------------
// Gigset news collector.
//
// Pulls headlines from public RSS feeds (no API keys), normalises them into one
// shape, classifies each story into a Gigset category, and de-duplicates.
// We only keep what a reader needs to decide whether to open the story:
// headline, a short excerpt, the cover image the publisher itself supplies,
// and the link back to the publisher. Full article text is never copied.
//
// Feed URLs are public and can change without notice: a dead feed is skipped
// and reported by GET /api/news/health, it never breaks the others.
// ---------------------------------------------------------------------------

import { rateText } from './contentRating.js';

export const CATEGORIES = {
  bollywood: 'Bollywood & Regional',
  indie: 'Indie & Hip-hop',
  classical: 'Classical & Folk',
  live: 'Live & Festivals',
  industry: 'Industry & Streaming',
  pop: 'Pop & Charts',
  rock: 'Rock & Alternative',
  electronic: 'Electronic & Dance',
  general: 'Music',
};

const gnews = (q, gl = 'IN') =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-${gl}&gl=${gl}&ceid=${gl}%3Aen`;

// `google: true` feeds carry "Headline - Publisher" titles and no image/excerpt.
export const FEEDS = [
  // ---------------- India ----------------
  { id: 'rsi', name: 'Rolling Stone India', url: 'https://rollingstoneindia.com/feed/', region: 'india', category: 'general' },
  { id: 'hindu-music', name: 'The Hindu', url: 'https://www.thehindu.com/entertainment/music/feeder/default.rss', region: 'india', category: 'classical' },
  { id: 'ie-ent', name: 'Indian Express', url: 'https://indianexpress.com/section/entertainment/feed/', region: 'india', category: 'bollywood' },
  { id: 'ht-ent', name: 'Hindustan Times', url: 'https://www.hindustantimes.com/feeds/rss/entertainment/rssfeed.xml', region: 'india', category: 'bollywood' },
  { id: 'film-companion', name: 'Film Companion', url: 'https://www.filmcompanion.in/feed', region: 'india', category: 'bollywood' },
  { id: 'bollywood-hungama', name: 'Bollywood Hungama', url: 'https://www.bollywoodhungama.com/rss/news.xml', region: 'india', category: 'bollywood' },
  { id: 'homegrown', name: 'Homegrown', url: 'https://homegrown.co.in/feed', region: 'india', category: 'indie' },
  { id: 'g-in-bollywood', name: 'Google News', url: gnews('bollywood music songs'), region: 'india', category: 'bollywood', google: true },
  { id: 'g-in-regional', name: 'Google News', url: gnews('punjabi OR tamil OR telugu OR malayalam music'), region: 'india', category: 'bollywood', google: true },
  { id: 'g-in-indie', name: 'Google News', url: gnews('indian indie music OR desi hip hop'), region: 'india', category: 'indie', google: true },
  { id: 'g-in-classical', name: 'Google News', url: gnews('carnatic OR hindustani classical music concert'), region: 'india', category: 'classical', google: true },
  { id: 'g-in-live', name: 'Google News', url: gnews('music festival india OR concert india'), region: 'india', category: 'live', google: true },
  { id: 'g-in-industry', name: 'Google News', url: gnews('india music industry streaming labels'), region: 'india', category: 'industry', google: true },
  // ---------------- World ----------------
  { id: 'billboard', name: 'Billboard', url: 'https://www.billboard.com/feed/', region: 'world', category: 'pop' },
  { id: 'pitchfork', name: 'Pitchfork', url: 'https://pitchfork.com/feed/feed-news/rss', region: 'world', category: 'indie' },
  { id: 'nme', name: 'NME', url: 'https://www.nme.com/feed', region: 'world', category: 'rock' },
  { id: 'rs-music', name: 'Rolling Stone', url: 'https://www.rollingstone.com/music/feed/', region: 'world', category: 'pop' },
  { id: 'consequence', name: 'Consequence', url: 'https://consequence.net/feed/', region: 'world', category: 'rock' },
  { id: 'stereogum', name: 'Stereogum', url: 'https://www.stereogum.com/feed/', region: 'world', category: 'indie' },
  { id: 'mbw', name: 'Music Business Worldwide', url: 'https://www.musicbusinessworldwide.com/feed/', region: 'world', category: 'industry' },
  { id: 'variety-music', name: 'Variety', url: 'https://variety.com/v/music/feed/', region: 'world', category: 'industry' },
  { id: 'dancing-astronaut', name: 'Dancing Astronaut', url: 'https://dancingastronaut.com/feed/', region: 'world', category: 'electronic' },
  { id: 'edm', name: 'EDM.com', url: 'https://edm.com/.rss/full/', region: 'world', category: 'electronic' },
  { id: 'guardian-music', name: 'The Guardian', url: 'https://www.theguardian.com/music/rss', region: 'world', category: 'pop' },
  { id: 'g-w-live', name: 'Google News', url: gnews('music festival lineup OR world tour announced', 'US'), region: 'world', category: 'live', google: true },
  { id: 'g-w-industry', name: 'Google News', url: gnews('record labels streaming royalties music business', 'US'), region: 'world', category: 'industry', google: true },
];

// First match wins, so order matters (most specific first).
const RULES = [
  ['classical', /\b(carnatic|hindustani|raga|raag|sitar|tabla|sarod|santoor|veena|ghazal|qawwali|sufi|thumri|bhajan|folk|classical)\b/i],
  ['live', /\b(concert|tour|festival|gig|live show|live music|headline[sd]?|line-?up|tickets?|sold[- ]out|sunburn|nh7|lollapalooza|coachella|glastonbury|residency|arena)\b/i],
  ['industry', /\b(label|streaming|spotify|royalt(y|ies)|revenue|copyright|licen[cs](e|ing)|acquir\w*|merger|invest\w*|market share|industry|earnings|subscription|piracy|lawsuit|sues?|court|artificial intelligence|\bai\b|ipo)\b/i],
  ['electronic', /\b(electronic|edm|techno|house music|dj|djs|dance music|rave|synth|trance|dubstep|bass music)\b/i],
  ['rock', /\b(rock|metal|punk|grunge|alternative|prog)\b/i],
  ['indie', /\b(indie|hip-?hop|rap|rapper|underground|independent artist|lo-?fi|ep\b|debut single)\b/i],
  ['bollywood', /\b(bollywood|playback|soundtrack|film|movie|ott|web series|k-?drama|tamil|telugu|kollywood|tollywood|punjabi|malayalam|kannada)\b/i],
  ['pop', /\b(pop|chart|billboard|hot 100|grammy|vma|mtv|number one|no\. ?1|album of the year)\b/i],
];

export function classify(text, fallback = 'general') {
  const t = String(text || '');
  for (const [cat, re] of RULES) if (re.test(t)) return cat;
  return fallback;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—' };

export function stripHtml(html) {
  return String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

/** Short, publisher-supplied teaser: never more than ~320 chars. */
export function excerptOf(raw, title = '') {
  let t = stripHtml(raw)
    .replace(/\s*The post .{0,200}? appeared first on .{0,80}$/i, '')
    .replace(/\s*(Continue reading|Read more|Read the full story)\b.*$/i, '')
    .replace(/\s*\[…\]\s*$|\s*\[\.\.\.\]\s*$|\s*…\s*$/g, '')
    .trim();
  if (!t) return '';
  const head = title.toLowerCase().replace(/\W+/g, '').slice(0, 40);
  if (head && t.toLowerCase().replace(/\W+/g, '').startsWith(head) && t.length < title.length + 60) return '';
  if (t.length > 320) {
    const cut = t.slice(0, 320);
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
    t = end > 140 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(' '))}…`;
  }
  return t;
}

const BAD_IMG = /(gravatar|pixel|1x1|spacer|blank\.|feedburner|doubleclick|\/ads?\/|logo)/i;

function cleanImg(u) {
  if (!u || typeof u !== 'string') return '';
  let url = u.trim().replace(/&amp;/g, '&');
  if (url.startsWith('//')) url = `https:${url}`;
  if (url.startsWith('http://')) url = `https://${url.slice(7)}`;
  if (!/^https:\/\//.test(url) || BAD_IMG.test(url) || url.length > 800) return '';
  return url;
}

export function pickImage(it) {
  const mc = Array.isArray(it.mediaContent) ? it.mediaContent : it.mediaContent ? [it.mediaContent] : [];
  for (const m of mc) {
    const a = m?.$ || {};
    if (a.url && (!a.medium || a.medium === 'image') && (!a.type || a.type.startsWith('image'))) {
      const u = cleanImg(a.url);
      if (u) return u;
    }
  }
  const th = Array.isArray(it.mediaThumbnail) ? it.mediaThumbnail[0] : it.mediaThumbnail;
  if (th?.$?.url && cleanImg(th.$.url)) return cleanImg(th.$.url);
  if (it.enclosure?.url && /image/i.test(it.enclosure.type || 'image') && cleanImg(it.enclosure.url)) return cleanImg(it.enclosure.url);
  const html = `${it.contentEncoded || ''} ${it.content || ''}`;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? cleanImg(m[1]) : '';
}

/** Google News titles look like "Headline - Publisher". */
export function parseGoogleTitle(title) {
  const m = String(title || '').match(/^(.*\S)\s+[-–—]\s+([^-–—]{2,60})$/);
  return m ? { title: m[1].trim(), source: m[2].trim() } : { title: String(title || '').trim(), source: '' };
}

const toISO = (d) => {
  const t = Date.parse(d);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
};

const idOf = (url) => `n_${createHash('sha1').update(url).digest('hex').slice(0, 14)}`;

export function normalizeItem(it, feed) {
  if (!it?.title || !it?.link) return null;
  let title = stripHtml(it.title);
  let source = feed.name;
  if (feed.google) {
    const g = parseGoogleTitle(title);
    title = g.title;
    if (g.source) source = g.source;
  }
  if (!title) return null;
  const excerpt = feed.google ? '' : excerptOf(it.contentSnippet || it.summary || it.contentEncoded || it.content || '', title);
  return {
    id: idOf(it.link),
    title,
    excerpt,
    url: it.link,
    source,
    publishedAt: toISO(it.isoDate || it.pubDate),
    image: feed.google ? '' : pickImage(it),
    region: feed.region,
    category: classify(`${title} ${excerpt}`, feed.category),
    // family | sensitive | mature: decides who sees it (see contentRating.js)
    rating: rateText(`${title} ${excerpt}`),
  };
}

const normUrl = (u) => String(u).replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
const normTitle = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 70);

export function dedupe(items) {
  const urls = new Set();
  const titles = new Set();
  const out = [];
  // Prefer entries that carry an image/excerpt when the same story appears twice.
  const rich = (x) => (x.image ? 2 : 0) + (x.excerpt ? 1 : 0);
  for (const it of [...items].sort((a, b) => rich(b) - rich(a))) {
    const u = normUrl(it.url);
    const t = normTitle(it.title);
    if (urls.has(u) || (t && titles.has(t))) continue;
    urls.add(u);
    if (t) titles.add(t);
    out.push(it);
  }
  return out;
}

/** Newest first, but never three stories in a row from the same publisher. */
export function spread(items) {
  const pool = [...items].sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
  const out = [];
  while (pool.length) {
    const [s1, s2] = [out[out.length - 1]?.source, out[out.length - 2]?.source];
    let i = pool.findIndex((x) => !(x.source === s1 && x.source === s2));
    if (i < 0) i = 0;
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

const makeParser = () =>
  new Parser({
    timeout: 12000,
    headers: {
      'User-Agent': 'GigsetNewsBot/1.0 (+https://tanmayayay.github.io/gigset-web)',
      Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
    },
    customFields: {
      item: [
        ['media:content', 'mediaContent', { keepArray: true }],
        ['media:thumbnail', 'mediaThumbnail'],
        ['content:encoded', 'contentEncoded'],
      ],
    },
  });

const DAY = 864e5;

/**
 * Fetch every feed (in parallel; one failure never affects the rest) and
 * return { items, status } where status explains what each feed did.
 */
export async function collect(feeds = FEEDS, { perFeed = 10, maxItems = 140, maxAgeDays = 21 } = {}) {
  const parser = makeParser();
  const settled = await Promise.allSettled(
    feeds.map(async (feed) => {
      const parsed = await parser.parseURL(feed.url);
      const items = (parsed.items || []).slice(0, perFeed * 2).map((it) => normalizeItem(it, feed)).filter(Boolean);
      return items.slice(0, perFeed);
    }),
  );
  const status = [];
  const merged = [];
  settled.forEach((r, i) => {
    const f = feeds[i];
    if (r.status === 'fulfilled') {
      merged.push(...r.value);
      status.push({ id: f.id, name: f.name, region: f.region, ok: true, count: r.value.length, withImage: r.value.filter((x) => x.image).length });
    } else {
      status.push({ id: f.id, name: f.name, region: f.region, ok: false, count: 0, error: String(r.reason?.message || r.reason).slice(0, 140) });
    }
  });

  let items = dedupe(merged);
  const cutoff = Date.now() - maxAgeDays * DAY;
  const fresh = items.filter((x) => !x.publishedAt || Date.parse(x.publishedAt) >= cutoff);
  if (fresh.length >= 40) items = fresh;
  // Per-publisher cap keeps one prolific site from filling the deck.
  const per = {};
  items = spread(items).filter((x) => (per[x.source] = (per[x.source] || 0) + 1) <= 12);
  return { items: items.slice(0, maxItems), status };
}

// ---- og:image enrichment ---------------------------------------------------

const ogCache = new Map(); // url -> image ('' when none)

async function fetchOg(url, timeoutMs = 4000) {
  if (ogCache.has(url)) return ogCache.get(url);
  let img = '';
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'GigsetNewsBot/1.0 (+https://tanmayayay.github.io/gigset-web)', Accept: 'text/html' },
      redirect: 'follow',
    });
    if (res.ok && /html/i.test(res.headers.get('content-type') || '')) {
      const html = (await res.text()).slice(0, 120000);
      const m =
        html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i) ||
        html.match(/<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
      if (m) img = cleanImg(m[1]);
    }
  } catch {
    /* slow or blocked page: leave the generated cover */
  }
  if (ogCache.size > 3000) ogCache.clear();
  ogCache.set(url, img);
  return img;
}

/** Fill in missing images from each article's own og:image tag (publisher-supplied). */
export async function enrichImages(items, { limit = 30, concurrency = 6 } = {}) {
  const todo = items.filter((x) => !x.image && !/news\.google\.com/.test(x.url)).slice(0, limit);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, todo.length) }, async () => {
      while (i < todo.length) {
        const it = todo[i++];
        const img = await fetchOg(it.url);
        if (img) it.image = img;
      }
    }),
  );
}
