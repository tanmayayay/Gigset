import { BadgeCheck, Music2, ExternalLink, Mail, Phone, Star, ArrowUpRight } from 'lucide-react';
import './epk.css';

const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
const longestWord = (n = '') => Math.max(4, ...n.split(/\s+/).map((w) => w.length));

/** Bar heights for the decorative sound-wave: the same name always gives the same shape. */
function waveBars(seed = '') {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const out = [];
  for (let i = 0; i < 28; i += 1) { h = (h * 1103515245 + 12345) >>> 0; out.push(18 + ((h >>> 8) % 70) * (0.55 + 0.45 * Math.sin(i / 3))); }
  return out;
}

/** Decorative sound-wave used where a profile has no photo. */
function Wave({ seed = '' }) {
  return (
    <svg className="ek-wave" viewBox="0 0 280 100" preserveAspectRatio="none" aria-hidden="true">
      {waveBars(seed).map((v, i) => <rect key={i} x={i * 10 + 2} y={50 - v / 2} width="5" height={v} rx="2.5" />)}
    </svg>
  );
}

/**
 * One press kit, three looks (classic = Pop, stage = Neon, minimal = Mono). Pure presentation.
 * A sparse profile still fills the page: a band with role, city and genres, an "at a glance" card
 * built from what every profile has, and a closing call to book or collaborate.
 */
export default function EpkView({ kit, tpl = 'classic', compact = false }) {
  const on = (k) => !kit.hide.includes(k);
  const contact = kit.email || kit.phone;
  // A follower count of 3 reads as weak on a press kit: show it only once it means something.
  const stats = kit.stats.filter((s) => !(s.label === 'Followers' && kit.followers < 25) && s.label !== 'Verified');
  const showStats = stats.length >= 2;
  const facts = [
    ['Role', kit.label],
    kit.city && ['Based in', kit.city],
    ['Open to', kit.bookable ? 'Bookings and collabs' : 'Collaborations'],
    kit.since && ['On TheGigSet since', String(kit.since)],
    !showStats && stats[0] && [stats[0].label, stats[0].value],
  ].filter(Boolean);
  // Enough words to run the full width even for a bare profile.
  const bandWords = [kit.label, kit.city, ...kit.tags.slice(0, 4), kit.bookable ? 'Open to bookings' : 'Open to collabs', 'Press kit'].filter(Boolean);
  const band = Array.from({ length: Math.max(2, Math.ceil(14 / bandWords.length)) }, () => bandWords).flat();
  const detRows = kit.details.reduce((n, g) => n + g.rows.length + g.tags.length * 2 + g.notes.length * 2, 0);
  const detFew = detRows < 4;
  const bioSize = kit.about.length > 420 ? 'long' : kit.about.length > 200 ? 'mid' : 'short';

  // Half-width cards pair up; a lone one at the end spans the row so there is never a hole.
  const halves = [
    on('details') && kit.details.length > 0 && detFew && 'det',
    on('highlights') && kit.milestones.length > 0 && 'hl',
    on('listen') && kit.samples.length > 0 && 'listen',
    on('links') && kit.links.length > 0 && 'links',
    on('contact') && contact && 'contact',
  ].filter(Boolean);
  const wide = (k) => halves.length % 2 === 1 && halves[halves.length - 1] === k;

  return (
    <div className={`ek ek-${tpl}${compact ? ' ek-compact' : ''}`} style={{ '--ek-acc': kit.tint, '--ek-n': longestWord(kit.name) }}>
      <div className="ek-pattern" aria-hidden="true" />
      <header className="ek-hero">
        <div className="ek-hero-text">
          <span className="ek-pill">{kit.label}{kit.city ? ` · ${kit.city}` : ''}</span>
          <h1 className="ek-name">{kit.name}{kit.verified && <BadgeCheck className="ek-check" aria-label="Verified" />}</h1>
          {kit.headline && kit.headline !== kit.label && <p className="ek-headline">{kit.headline}</p>}
          {kit.tags.length > 0 && <div className="ek-tags">{kit.tags.slice(0, 6).map((t) => <span key={t}>{t}</span>)}</div>}
        </div>
        <div className={`ek-photo${kit.avatarUrl ? '' : ' empty'}`}>
          {kit.avatarUrl
            ? <img src={kit.avatarUrl} alt={kit.name} />
            : <><Wave seed={kit.name} /><span className="ek-initials">{initials(kit.name)}</span></>}
        </div>
      </header>

      <div className="ek-band" aria-hidden="true"><div>{band.map((b, i) => <em key={i}>{b}</em>)}</div></div>

      {showStats && (
        <div className="ek-stats">{stats.map((s) => <div key={s.label}><b>{s.value}</b><span>{s.label}</span></div>)}</div>
      )}

      <div className="ek-grid">
        <section className={`ek-card ek-bio ek-bio-${bioSize}`}><h2>About</h2><p>{kit.about}</p></section>

        <section className="ek-card ek-facts"><h2>At a glance</h2>
          <dl>{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        </section>

        {on('details') && kit.details.length > 0 && (
          <section className={`ek-card ek-det${detFew ? (wide('det') ? ' ek-wide ek-det-few' : ' ek-det-few') : ' ek-wide'}`}><h2>The details</h2>
            {kit.details.map((g) => (
              <div key={g.title} className="ek-group">
                {g.rows.length > 0 && <dl>{g.rows.map((r) => <div key={r.label}><dt>{r.label}</dt><dd>{r.value}</dd></div>)}</dl>}
                {g.tags.map((t) => <div key={t.label} className="ek-tagrow"><small>{t.label}</small><div className="ek-tags">{t.values.map((v) => <span key={v}>{v}</span>)}</div></div>)}
                {g.notes.map((n) => <p key={n.label} className="ek-note"><small>{n.label}</small>{n.text}</p>)}
              </div>
            ))}
          </section>
        )}

        {halves.includes('hl') && (
          <section className={`ek-card ek-hl${wide('hl') ? ' ek-wide' : ''}`}><h2>Highlights</h2>
            <ul>{kit.milestones.map((m) => <li key={m}><Star size={14} />{m}</li>)}</ul>
          </section>
        )}

        {halves.includes('listen') && (
          <section className={`ek-card ek-listen${wide('listen') ? ' ek-wide' : ''}`}><h2>Listen &amp; watch</h2>
            <ul className="ek-links">{kit.samples.map((s, i) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer"><Music2 size={15} /><b>{i === 0 ? 'Featured' : `Sample ${i}`}</b><span>{s.kind}</span><ExternalLink size={12} /></a></li>
            ))}</ul>
          </section>
        )}

        {on('reviews') && kit.quotes.length > 0 && (
          <section className="ek-card ek-rev ek-wide"><h2>What people say</h2>
            {kit.quotes.map((q) => <blockquote key={q.id}>“{q.body}”<cite>{q.name}{q.rating ? ` · ${'★'.repeat(Math.round(q.rating))}` : ''}</cite></blockquote>)}
          </section>
        )}

        {halves.includes('links') && (
          <section className={`ek-card ek-on${wide('links') ? ' ek-wide' : ''}`}><h2>Follow</h2>
            <ul className="ek-links">{kit.links.map((l) => (
              <li key={l.key}><a href={l.href} target="_blank" rel="noopener noreferrer"><b>{l.label}</b><span>{l.href.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').slice(0, 30)}</span><ExternalLink size={12} /></a></li>
            ))}</ul>
          </section>
        )}

        {halves.includes('contact') && (
          <section className={`ek-card ek-contact${wide('contact') ? ' ek-wide' : ''}`}><h2>Book {kit.first}</h2>
            {kit.email && <p><Mail size={15} /><a href={`mailto:${kit.email}`}>{kit.email}</a></p>}
            {kit.phone && <p><Phone size={15} />{kit.phone}</p>}
          </section>
        )}
      </div>

      <section className="ek-cta">
        <div><small>Work with {kit.first}</small><b>{kit.bookable ? 'Book, collaborate or say hello' : 'Collaborate or say hello'} on TheGigSet</b></div>
        <span className="ek-cta-url">thegigset.com<ArrowUpRight size={16} /></span>
      </section>

      <footer className="ek-foot"><span>{kit.name}</span><span>Press kit · Made with TheGigSet</span></footer>
    </div>
  );
}
