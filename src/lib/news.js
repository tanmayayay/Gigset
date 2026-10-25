// Shared news helpers: normalising live + newsroom stories into one card shape.

export const CATEGORY_LABELS = {
  bollywood: 'Bollywood & Regional',
  indie: 'Indie & Hip-hop',
  classical: 'Classical & Folk',
  live: 'Live & Festivals',
  industry: 'Industry & Streaming',
  pop: 'Pop & Charts',
  rock: 'Rock & Alternative',
  electronic: 'Electronic & Dance',
  general: 'Music',
  newsroom: 'Gigset newsroom',
};

export const REGIONS = [
  { id: 'all', label: 'All' },
  { id: 'india', label: 'India' },
  { id: 'world', label: 'World' },
];

export const tidy = (s = '') => s.replace(/\s*The post .*appeared first on .*$/, '').trim();

export function fromLive(n, i) {
  return {
    id: `live:${n.id || n.url || i}`,
    rawId: n.id || n.url,
    title: n.title || 'Untitled story',
    excerpt: tidy(n.excerpt || ''),
    url: n.url,
    source: n.source || 'Live feed',
    publishedAt: n.publishedAt || n.published_at || null,
    image: n.image || '',
    region: n.region || 'india',
    category: n.category || 'general',
    isLive: true,
  };
}

export function fromArticle(a) {
  return {
    id: `art:${a.id}`,
    rawId: a.id,
    title: a.title,
    excerpt: a.excerpt || '',
    body: a.body,
    category: 'newsroom',
    region: 'india',
    source: a.author?.name || 'Gigset newsroom',
    publishedAt: a.publishedAt || a.createdAt,
    image: '',
    isLive: false,
  };
}

export const kindOf = (it) => (it.isLive ? 'live' : 'article');
export const snapshotOf = (it) => ({
  title: it.title, url: it.url, source: it.source, publishedAt: it.publishedAt,
  image: it.image, excerpt: it.excerpt, category: it.category, region: it.region,
});
