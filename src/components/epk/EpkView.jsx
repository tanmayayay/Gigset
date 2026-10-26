import { BadgeCheck, Music2, ExternalLink, Mail, Phone, Star } from 'lucide-react';
import './epk.css';

const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

/** One press kit, three poster looks (classic = Pop, stage = Neon, minimal = Mono). Pure presentation. */
export default function EpkView({ kit, tpl = 'classic', compact = false }) {
  const on = (k) => !kit.hide.includes(k);
  const hasDetails = kit.details.length > 0;
  const contact = kit.email || kit.phone;
  return (
    <div className={`ek ek-${tpl}${compact ? ' ek-compact' : ''}`} style={{ '--ek-acc': kit.tint }}>
      <div className="ek-blob b1" /><div className="ek-blob b2" />
      <header className="ek-hero">
        <div className="ek-hero-text">
          <span className="ek-pill">{kit.label}{kit.city ? ` · ${kit.city}` : ''}</span>
          <h1 className="ek-name">{kit.name}{kit.verified && <BadgeCheck className="ek-check" />}</h1>
          {kit.headline && kit.headline !== kit.label && <p className="ek-headline">{kit.headline}</p>}
          {kit.tags.length > 0 && <div className="ek-tags">{kit.tags.map((t) => <span key={t}>{t}</span>)}</div>}
        </div>
        <div className="ek-photo">
          {kit.avatarUrl ? <img src={kit.avatarUrl} alt={kit.name} /> : <span className="ek-initials">{initials(kit.name)}</span>}
        </div>
      </header>

      {kit.stats.length > 0 && (
        <div className="ek-stats">{kit.stats.map((s) => <div key={s.label}><b>{s.value}</b><span>{s.label}</span></div>)}</div>
      )}

      <div className="ek-grid">
        <section className="ek-card ek-bio"><h2>Bio</h2><p>{kit.about}</p></section>

        {on('highlights') && kit.milestones.length > 0 && (
          <section className="ek-card ek-hl"><h2>Highlights</h2>
            <ul>{kit.milestones.map((m) => <li key={m}><Star size={13} />{m}</li>)}</ul>
          </section>
        )}

        {on('details') && hasDetails && (
          <section className="ek-card ek-det"><h2>The details</h2>
            {kit.details.map((g) => (
              <div key={g.title} className="ek-group">
                {g.rows.length > 0 && <dl>{g.rows.map((r) => <div key={r.label}><dt>{r.label}</dt><dd>{r.value}</dd></div>)}</dl>}
                {g.tags.map((t) => <div key={t.label} className="ek-tagrow"><small>{t.label}</small><div className="ek-tags">{t.values.map((v) => <span key={v}>{v}</span>)}</div></div>)}
                {g.notes.map((n) => <p key={n.label} className="ek-note"><small>{n.label}</small>{n.text}</p>)}
              </div>
            ))}
          </section>
        )}

        {on('listen') && kit.samples.length > 0 && (
          <section className="ek-card ek-listen"><h2>Listen &amp; watch</h2>
            <ul className="ek-links">{kit.samples.map((s, i) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer"><Music2 size={15} /><b>{i === 0 ? 'Featured' : `Sample ${i}`}</b><span>{s.kind}</span><ExternalLink size={12} /></a></li>
            ))}</ul>
          </section>
        )}

        {on('reviews') && kit.quotes.length > 0 && (
          <section className="ek-card ek-rev"><h2>What people say</h2>
            {kit.quotes.map((q) => <blockquote key={q.id}>“{q.body}”<cite>{q.name}{q.rating ? ` · ${'★'.repeat(Math.round(q.rating))}` : ''}</cite></blockquote>)}
          </section>
        )}

        {on('links') && kit.links.length > 0 && (
          <section className="ek-card ek-on"><h2>Follow</h2>
            <ul className="ek-links">{kit.links.map((l) => (
              <li key={l.key}><a href={l.href} target="_blank" rel="noopener noreferrer"><b>{l.label}</b><span>{l.href.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').slice(0, 30)}</span><ExternalLink size={12} /></a></li>
            ))}</ul>
          </section>
        )}

        {on('contact') && contact && (
          <section className="ek-card ek-contact"><h2>Book {kit.first}</h2>
            {kit.email && <p><Mail size={15} /><a href={`mailto:${kit.email}`}>{kit.email}</a></p>}
            {kit.phone && <p><Phone size={15} />{kit.phone}</p>}
          </section>
        )}
      </div>

      <footer className="ek-foot"><span>{kit.name}</span><span>Made with Gigset</span></footer>
    </div>
  );
}
