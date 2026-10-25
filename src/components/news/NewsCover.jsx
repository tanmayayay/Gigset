import { Mic2, Radio, Disc3, Ticket, TrendingUp, Newspaper, Music } from 'lucide-react';
import { hashStr } from '../../data/demo';
import { CATEGORY_LABELS } from '../../lib/news';

/* Generated editorial cover for stories that ship without an image.
   Brand motif: flowing "strings" over a deep gradient, with a category icon. */
const PALETTES = [
  ['#071634', '#2A63EE', '#0EA5E9'],
  ['#1F1147', '#4F46E5', '#A855F7'],
  ['#3B0D2E', '#BE185D', '#F97316'],
  ['#052E2B', '#0F766E', '#22C55E'],
  ['#0B1020', '#334155', '#94A3B8'],
  ['#2A0A0A', '#B91C1C', '#FB923C'],
];

const ICONS = { 'Industry & Streaming': TrendingUp, 'Live & Festivals': Ticket, 'Bollywood & Regional': Disc3, 'Pop & Charts': Disc3, 'Indie & Hip-hop': Mic2, 'Rock & Alternative': Mic2, 'Electronic & Dance': Radio, Industry: TrendingUp, Artists: Mic2, 'Live music': Ticket, Events: Ticket, 'Pop culture': Disc3, 'Music industry': TrendingUp };

export function topicOf(item) {
  if (item.category && item.category !== 'general' && CATEGORY_LABELS[item.category]) return CATEGORY_LABELS[item.category];
  const t = `${item.title || ''} ${item.excerpt || ''}`.toLowerCase();
  if (/concert|tour|festival|gig|live|stage|tickets?/.test(t)) return 'Live music';
  if (/label|stream|royalt|spotify|revenue|deal|industry|copyright|music rights/.test(t)) return 'Industry';
  if (/album|single|song|track|ep\b|release/.test(t)) return 'New music';
  if (/film|bollywood|movie|k-?drama|series|ott/.test(t)) return 'Pop culture';
  return CATEGORY_LABELS[item.category] || item.category || 'Music';
}

export default function NewsCover({ item, height = '100%', large = false }) {
  const seed = hashStr(item.id || item.url || item.title || 'x');
  const [a, b, c] = PALETTES[seed % PALETTES.length];
  const topic = topicOf(item);
  const Icon = ICONS[topic] || (topic === 'New music' ? Music : topic === 'Music' ? Radio : Newspaper);
  const off = (seed % 40) - 20;

  if (item.image) {
    return (
      <div className="nc" style={{ height }}>
        <img src={item.image} alt="" loading="lazy" />
      </div>
    );
  }
  return (
    <div className="nc" style={{ height, background: `radial-gradient(120% 90% at 85% 0%, ${c} 0%, ${b} 40%, ${a} 100%)` }} aria-hidden="true">
      <svg viewBox="0 0 400 260" preserveAspectRatio="none" className="nc-strings">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path
            key={i}
            d={`M-20 ${200 - i * 22 + off} C 90 ${120 - i * 18}, 220 ${260 - i * 30 - off}, 420 ${110 - i * 14}`}
            stroke="#fff"
            strokeOpacity={0.08 + i * 0.035}
            strokeWidth={1.4 + (i % 3) * 0.6}
            fill="none"
          />
        ))}
      </svg>
      <span className="nc-icon"><Icon size={large ? 38 : 26} strokeWidth={1.6} /></span>
      <span className="nc-mark">{(item.source || 'Gigset').replace(/^The /, '').slice(0, 1)}</span>
    </div>
  );
}
