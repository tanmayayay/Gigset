import { sectionsFor, roleLabel, metaFor, headlineOf, isFilled, fmtValue } from './profileSchema';
import { samplesOf } from '../components/profile/Samples';

export const EPK_TEMPLATES = [
  { id: 'classic', name: 'Classic', blurb: 'Editorial one-sheet. Clean, printable, easy to read.' },
  { id: 'stage', name: 'Stage', blurb: 'Dark and bold, with your photo front and centre.' },
  { id: 'minimal', name: 'Minimal', blurb: 'Monochrome and typographic. Lets the facts speak.' },
];
export const isTemplate = (t) => EPK_TEMPLATES.some((x) => x.id === t);
const KEY = 'gigset.epkTemplate';
export const savedTemplate = () => { try { const t = localStorage.getItem(KEY); return isTemplate(t) ? t : 'classic'; } catch { return 'classic'; } };
export const saveTemplate = (t) => { try { localStorage.setItem(KEY, t); } catch { /* ignore */ } };
/** Public link to someone's press kit (HashRouter). */
export const epkUrl = (id, tpl) => `${location.origin}${location.pathname}#/epk/${id}${tpl ? `?t=${tpl}` : ''}`;

const safeHref = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : null; } catch { return null; } };

/**
 * Turn a profile into a press kit. The bare minimum (name + role) always produces a valid kit;
 * every extra piece of profile information adds a section.
 */
export function buildEpk(person, { posts = [], reviews = null } = {}) {
  const role = person.stakeholderType;
  const meta = metaFor(role);
  const d = person.detail?.data || {};
  const label = roleLabel(role);
  const first = (person.name || '').split(' ')[0] || 'This profile';

  // Tags: the first couple of tag-type answers (genres, instruments, skills…).
  const fields = sectionsFor(role).flatMap((s) => s.fields.map((f) => ({ ...f, section: s.title })));
  const tags = [];
  for (const f of fields) if (f.type === 'tags' && Array.isArray(d[f.key])) tags.push(...d[f.key]);
  const uniqueTags = [...new Set(tags)].slice(0, 10);

  // Every filled answer, grouped by the profile section it came from.
  const details = sectionsFor(role)
    .map((s) => ({
      title: s.title,
      rows: s.fields
        .filter((f) => f.type !== 'url' && f.type !== 'longtext' && f.type !== 'tags' && isFilled(d[f.key]))
        .map((f) => ({ label: f.label, value: fmtValue(f, d[f.key]) })),
      tags: s.fields.filter((f) => f.type === 'tags' && isFilled(d[f.key]) && !d[f.key].every((v) => uniqueTags.includes(v))).map((f) => ({ label: f.label, values: d[f.key] })),
      notes: s.fields.filter((f) => f.type === 'longtext' && isFilled(d[f.key])).map((f) => ({ label: f.label, text: String(d[f.key]) })),
    }))
    .filter((s) => s.rows.length || s.tags.length || s.notes.length);

  const links = fields.filter((f) => f.type === 'url' && isFilled(d[f.key]) && !/^(featured|sample\d)Url$/.test(f.key))
    .map((f) => ({ key: f.key, label: f.label.replace(/ \(.*\)$/, ''), href: safeHref(d[f.key]) })).filter((l) => l.href);

  const samples = samplesOf(d).map((s) => ({ kind: s.embed.kind, src: s.embed.src, url: s.url, tall: s.embed.tall }));
  const gallery = posts.filter((p) => p.mediaUrl).slice(0, 6).map((p) => ({ id: p.id, url: p.mediaUrl, caption: p.body && p.body !== '📸' ? p.body : '' }));
  const quotes = (reviews?.items || []).filter((r) => (r.body || '').trim().length >= 12).slice(0, 3)
    .map((r) => ({ id: r.id, body: r.body.trim(), rating: r.rating, name: r.reviewer?.name || 'A collaborator' }));

  const years = Number(d.experienceYears);
  const stats = [];
  const followers = person._count?.followers ?? 0;
  const postCount = person._count?.posts ?? 0;
  if (Number.isFinite(years) && years > 0) stats.push({ value: `${years}+`, label: 'Years' });
  if (followers > 0) stats.push({ value: followers >= 1000 ? `${(followers / 1000).toFixed(1)}k` : String(followers), label: 'Followers' });
  if (reviews?.count > 0) stats.push({ value: String(reviews.average), label: `Rating · ${reviews.count}` });
  if (postCount > 0) stats.push({ value: String(postCount), label: 'Posts' });
  if (person.verificationStatus === 'VERIFIED') stats.push({ value: '✓', label: 'Verified' });

  const headline = headlineOf(person) || [d.artistType || d.venueType, (d.genres || d.genresHosted || [])[0]].filter(Boolean).join(' · ') || label;
  const bio = (person.bio || '').trim();
  const about = bio || `${person.name} is ${/^[aeiou]/i.test(label) ? 'an' : 'a'} ${label.toLowerCase()}${person.city ? ` based in ${person.city}` : ''}${uniqueTags.length ? `, working with ${uniqueTags.slice(0, 3).join(', ')}` : ''}. Find them on Gigset to collaborate or book.`;

  // How complete is the kit, and what would improve it?
  const checks = [
    { key: 'photo', done: !!person.avatarUrl, tip: 'Add a profile photo' },
    { key: 'headline', done: !!headlineOf(person), tip: 'Write a one-line headline' },
    { key: 'bio', done: bio.length >= 40, tip: 'Write a bio (40+ characters)' },
    { key: 'city', done: !!person.city, tip: 'Set your city' },
    { key: 'details', done: details.reduce((n, s) => n + s.rows.length + s.tags.length, 0) >= 4, tip: `Fill in your ${label.toLowerCase()} details` },
    { key: 'links', done: links.length > 0, tip: 'Add Instagram, Spotify or a website' },
    { key: 'samples', done: samples.length > 0, tip: 'Add a YouTube, Spotify or SoundCloud sample' },
    { key: 'gallery', done: gallery.length > 0, tip: 'Post a few photos' },
    { key: 'reviews', done: quotes.length > 0, tip: 'Collect a review from a past collaborator' },
    { key: 'verified', done: person.verificationStatus === 'VERIFIED', tip: 'Get verified' },
  ];
  const strength = { pct: Math.round((checks.filter((c) => c.done).length / checks.length) * 100), checks, tips: checks.filter((c) => !c.done).map((c) => c.tip) };

  return {
    id: person.id, name: person.name, first, label, tint: meta.tint, city: person.city || '', avatarUrl: person.avatarUrl || '',
    verified: person.verificationStatus === 'VERIFIED', headline, about, aboutIsAuto: !bio, tags: uniqueTags, stats, details, links,
    samples, gallery, quotes, strength, bookable: meta.bookable, profilePath: `/profile/${person.id}`,
  };
}
