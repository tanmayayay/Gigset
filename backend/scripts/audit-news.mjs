// Lists how the live news feeds are being rated, so the keyword lists can be tuned.
//   node scripts/audit-news.mjs            counts + every non-family headline
//   node scripts/audit-news.mjs mature     only the "mature" ones
import { matchedTerm } from '../src/lib/contentRating.js';
import { FEEDS, collect } from '../src/lib/newsFeed.js';

const only = process.argv[2];
const { items } = await collect(FEEDS);
const by = { family: 0, sensitive: 0, mature: 0 };
for (const i of items) by[i.rating] = (by[i.rating] || 0) + 1;
console.log(`${items.length} stories`, by, '\n');
for (const i of items) {
  if (i.rating === 'family') continue;
  if (only && i.rating !== only) continue;
  console.log(`[${i.rating.toUpperCase()}: ${matchedTerm(`${i.title} ${i.excerpt}`)}] ${i.source}: ${i.title}`);
}
