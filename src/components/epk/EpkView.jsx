import { BadgeCheck, MapPin, Music2, ExternalLink, Quote } from 'lucide-react';
import './epk.css';

const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

/** One press kit, three looks. `tpl` is classic | stage | minimal. Pure presentation — no fetching. */
export default function EpkView({ kit, tpl = 'classic', compact = false }) {
  const hero = kit.avatarUrl;
  const Portrait = () => hero
    ? <img className="ek-portrait" src={hero} alt={kit.name} />
    : <div className="ek-portrait ek-initials" aria-hidden="true">{initials(kit.name)}</div>;

  return (
    <div className={`ek ek-${tpl}${compact ? ' ek-compact' : ''}`} style={{ '--ek-tint': kit.tint }}>
      <header className="ek-head">
        {tpl !== 'minimal' && <Portrait />}
        <div className="ek-head-text">
          <p className="ek-kicker">Electronic press kit</p>
          <h1 className="ek-name">{kit.name}{kit.verified && <BadgeCheck className="ek-check" size={tpl === 'minimal' ? 22 : 26} />}</h1>
          <p className="ek-line"><span>{kit.label}</span>{kit.city && <span><MapPin size={13} /> {kit.city}</span>}</p>
          {kit.headline && kit.headline !== kit.label && <p className="ek-headline">{kit.headline}</p>}
        </div>
      </header>

      {kit.stats.length > 0 && (
        <div className="ek-stats">
          {kit.stats.map((s) => <div key={s.label}><b>{s.value}</b><span>{s.label}</span></div>)}
        </div>
      )}

      <section className="ek-sec">
        <h2>About</h2>
        <p className="ek-about">{kit.about}</p>
        {kit.tags.length > 0 && <div className="ek-tags">{kit.tags.map((t) => <span key={t}>{t}</span>)}</div>}
      </section>

      {kit.details.length > 0 && (
        <section className="ek-sec">
          <h2>The details</h2>
          <div className="ek-groups">
            {kit.details.map((g) => (
              <div key={g.title} className="ek-group">
                <h3>{g.title}</h3>
                {g.rows.length > 0 && <dl>{g.rows.map((r) => <div key={r.label}><dt>{r.label}</dt><dd>{r.value}</dd></div>)}</dl>}
                {g.tags.map((t) => (
                  <div key={t.label} className="ek-tagrow"><small>{t.label}</small><div className="ek-tags">{t.values.map((v) => <span key={v}>{v}</span>)}</div></div>
                ))}
                {g.notes.map((n) => <p key={n.label} className="ek-note"><small>{n.label}</small>{n.text}</p>)}
              </div>
            ))}
          </div>
        </section>
      )}

      {kit.samples.length > 0 && (
        <section className="ek-sec">
          <h2>Listen &amp; watch</h2>
          <ul className="ek-links">
            {kit.samples.map((s, i) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer"><Music2 size={15} /><b>{i === 0 ? 'Featured' : `Sample ${i}`}</b><span>{s.kind}</span><ExternalLink size={13} /></a></li>
            ))}
          </ul>
        </section>
      )}

      {kit.gallery.length > 0 && (
        <section className="ek-sec">
          <h2>Gallery</h2>
          <div className="ek-gallery">{kit.gallery.map((g) => <img key={g.id} src={g.url} alt={g.caption || `${kit.name} photo`} loading="lazy" />)}</div>
        </section>
      )}

      {kit.quotes.length > 0 && (
        <section className="ek-sec">
          <h2>What collaborators say</h2>
          <div className="ek-quotes">
            {kit.quotes.map((q) => (
              <blockquote key={q.id}><Quote size={16} />{q.body}<cite>{q.name}{q.rating ? ` · ${'★'.repeat(Math.round(q.rating))}` : ''}</cite></blockquote>
            ))}
          </div>
        </section>
      )}

      {kit.links.length > 0 && (
        <section className="ek-sec">
          <h2>Find {kit.first} online</h2>
          <ul className="ek-links">
            {kit.links.map((l) => (
              <li key={l.key}><a href={l.href} target="_blank" rel="noopener noreferrer"><b>{l.label}</b><span>{l.href.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').slice(0, 38)}</span><ExternalLink size={13} /></a></li>
            ))}
          </ul>
        </section>
      )}

      <footer className="ek-foot"><span>Press kit generated on Gigset</span><span>{kit.name} · gigset</span></footer>
    </div>
  );
}
