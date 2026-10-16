import { Router } from 'express';
import { asyncHandler } from '../lib/http.js';
import { optionalAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { allowedRatings, levelFor } from '../lib/contentRating.js';
import { CATEGORIES, FEEDS, collect, enrichImages } from '../lib/newsFeed.js';

const router = Router();

// Public multi-source music-news feed (India + world). No API keys.
// Stale-while-revalidate: once we have a cache, requests are answered at once
// and a refresh runs in the background when the cache is older than the TTL.

const TTL_MS = 60 * 60 * 1000; // 1h

let cache = { updatedAt: 0, items: [], status: [] };
let inflight = null;

function refresh() {
  if (inflight) return inflight;
  inflight = (async () => {
    const { items, status } = await collect(FEEDS);
    if (items.length) {
      cache = { updatedAt: Date.now(), items, status };
      // Fill in missing images without holding up the response.
      enrichImages(items).catch(() => {});
    } else {
      cache = { ...cache, status };
    }
  })()
    .catch(() => {})
    .finally(() => { inflight = null; });
  return inflight;
}

const stale = () => Date.now() - cache.updatedAt > TTL_MS;

// GET /api/news/live — public. Optional ?region=india|world & ?category=slug
router.get(
  '/live',
  optionalAuth,
  asyncHandler(async (req, res) => {
    if (cache.items.length === 0) await refresh();
    else if (stale()) refresh(); // background

    let items = cache.items;
    const { region, category } = req.query;
    if (region === 'india' || region === 'world') items = items.filter((i) => i.region === region);
    if (typeof category === 'string' && CATEGORIES[category]) items = items.filter((i) => i.category === category);

    // Age-aware filtering: signed-in people get a level from their birth date; visitors get the standard one.
    let who = {};
    if (req.user) {
      who = (await prisma.user.findUnique({ where: { id: req.user.id }, select: { birthDate: true, contentOpen: true } })) || {};
    }
    const allowed = new Set(allowedRatings(levelFor(who)));
    items = items.filter((i) => allowed.has(i.rating || 'family'));

    res.json({
      updatedAt: cache.updatedAt ? new Date(cache.updatedAt).toISOString() : null,
      categories: CATEGORIES,
      items,
    });
  })
);

// GET /api/news/health — which feeds are alive.
router.get('/health', (req, res) => {
  res.json({
    updatedAt: cache.updatedAt ? new Date(cache.updatedAt).toISOString() : null,
    count: cache.items.length,
    feeds: cache.status,
  });
});

export default router;
