import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/http.js';
import { ageFrom } from '../lib/contentRating.js';

/* Sitemap for search engines. robots.txt on the website points here.
   Lists the public pages and the press kit of every public, adult, active profile. */
const router = Router();
export const SITE_URL = (process.env.SITE_URL || 'https://thegigset.com').replace(/\/+$/, '');

/** May this profile's press kit appear in search results? */
export const isIndexable = (u) => u.visibility === 'PUBLIC' && !u.suspendedAt && (ageFrom(u.birthDate) ?? 0) >= 18;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let cache = { at: 0, xml: '' };

router.get('/sitemap.xml', asyncHandler(async (_req, res) => {
  if (Date.now() - cache.at > 60 * 60 * 1000) {
    const users = await prisma.user.findMany({
      where: { visibility: 'PUBLIC', suspendedAt: null, birthDate: { not: null } },
      select: { id: true, visibility: true, suspendedAt: true, birthDate: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 45000,
    });
    const pages = [
      { loc: `${SITE_URL}/`, priority: '1.0' },
      { loc: `${SITE_URL}/about`, priority: '0.5' },
      { loc: `${SITE_URL}/support`, priority: '0.3' },
      ...users.filter(isIndexable).map((u) => ({ loc: `${SITE_URL}/epk/${u.id}`, lastmod: u.updatedAt.toISOString().slice(0, 10), priority: '0.8' })),
    ];
    cache = {
      at: Date.now(),
      xml: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${esc(p.loc)}</loc>${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ''}<priority>${p.priority}</priority></url>`).join('\n')}\n</urlset>\n`,
    };
  }
  res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(cache.xml);
}));

export default router;
