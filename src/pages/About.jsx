import { Link } from 'react-router-dom';
import { Target, Layers, MapPin, ArrowRight } from 'lucide-react';
import { PageHead, Tag } from '../components/ui';
import { STAKEHOLDER_GROUPS } from '../data/demo';

export default function About() {
  return (
    <div>
      <PageHead title="About Gigset" sub="Tying the music industry together." />
      <div className="post-card" style={{ padding: 28 }}>
        <h4 style={{ fontSize: 16, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}><Target size={17} style={{ color: 'var(--blue)' }} /> Our mission</h4>
        <p style={{ color: 'var(--text-dim)', fontSize: 15, lineHeight: 1.75 }}>Gigset exists to remove the two biggest frictions in the Indian music industry: artists cannot easily be found or booked, and the people who need musical talent and services cannot easily find or vet it. We give every stakeholder — performer, venue, engineer, school, or brand — one verified profile, one place to be discovered, and one feed of the news and opportunities relevant to them.</p>
      </div>

      <div className="post-card" style={{ padding: 28 }}>
        <h4 style={{ fontSize: 16, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}><Layers size={17} style={{ color: 'var(--blue)' }} /> Where we are</h4>
        <p style={{ color: 'var(--text-dim)', fontSize: 14.5, lineHeight: 1.7, marginBottom: 16 }}>This is the Phase 1 prototype of the Gigset concept — built to demonstrate the sitemap, feature set, and stakeholder model. The build ships in three phases:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['Phase 1 — Network (this prototype)', 'Profiles, feeds, Gighub discovery, Collab marketplace, communities, daily news, messaging.', 'blue'],
            ['Phase 2 — Marketplace depth', 'Applicant review, subscriptions, profile analytics, expanded search, brand placements.', 'sky'],
            ['Phase 3 — Services', 'Structured booking workflow, live streaming, artist management & broker services.', 'indigo'],
          ].map(([t, d, c]) => (
            <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Tag color={c}>{t.split(' — ')[0]}</Tag>
              <div><b style={{ fontSize: 13.5 }}>{t.split(' — ')[1]}</b><p style={{ fontSize: 13, color: 'var(--text-dim)' }}>{d}</p></div>
            </div>
          ))}
        </div>
      </div>

      <div className="post-card" style={{ padding: 28 }}>
        <h4 style={{ fontSize: 16, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={17} style={{ color: 'var(--blue)' }} /> Who it serves</h4>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
          {STAKEHOLDER_GROUPS.map((g) => <Tag key={g.name} color="gray">{g.name}</Tag>)}
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.7, marginTop: 14 }}>Launching across India&apos;s major music hubs — Mumbai, Delhi-NCR, Bengaluru, Pune and Chandigarh — with the wider NAAD Infinity 360° ecosystem (OTT, ticketing, academies, production facilities) on the horizon.</p>
        <Link to="/support" className="btn btn-blue btn-sm" style={{ marginTop: 16 }}>Contact & support <ArrowRight size={14} /></Link>
      </div>
    </div>
  );
}
