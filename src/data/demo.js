// ============================================================
// GIGSET — demo data
// Realistic Indian music & live-event industry content.
// ============================================================

export const CITIES = ['Mumbai', 'Delhi-NCR', 'Bengaluru', 'Pune', 'Chandigarh', 'Hyderabad', 'Chennai', 'Kolkata'];

export const STAKEHOLDER_GROUPS = [
  { name: 'Performers', desc: 'Artists, bands & instrumentalists', icon: 'Mic' },
  { name: 'Venues & spaces', desc: 'Gig venues, jam pads, recording studios', icon: 'Building2' },
  { name: 'Buyers of talent', desc: 'Organisers, festivals & brands', icon: 'Briefcase' },
  { name: 'Crew & technical', desc: 'Sound, lighting & stage crew', icon: 'SlidersHorizontal' },
  { name: 'Institutions & agencies', desc: 'Schools, societies & management', icon: 'GraduationCap' },
];

export const PEOPLE = [
  {
    id: 'meera', name: 'Meera Iyer', role: 'Vocalist', city: 'Mumbai', type: 'Performer',
    verified: true, idVerified: true, pastGigs: 132, responseRate: 96, rating: 4.9,
    followers: 4820, profileViews: 1240, skills: ['Playback singing', 'Session vocals', 'Hindustani classical', 'Live performance', 'Jingles'],
    tagline: 'Playback & session vocalist — Hindustani-trained, pop-fluent, available for session work across Mumbai.',
    bio: 'Meera has spent six years moving between playback sessions, jingle work, and her own live sets — trained in Hindustani classical vocals but just as comfortable fronting a pop or fusion band. She\u2019s currently building a small catalogue of original acoustic work alongside session bookings.',
    achievements: ['120+ sessions logged', 'Resident vocalist, Piano Man Studios', 'Verified on Gigset'],
    heroGradient: 'linear-gradient(135deg,#123B82,#2A63EE 55%,#0EA5E9)',
    experience: [
      { title: 'Resident vocalist', org: 'Piano Man Studios, Mumbai', period: '2022 — present' },
      { title: 'Session vocalist (playback & jingles)', org: 'Independent', period: '2020 — present' },
      { title: 'Lead vocalist', org: 'The Monsoon Project (band)', period: '2019 — 2021' },
    ],
  },
  {
    id: 'rohan', name: 'Rohan Verma', role: 'Live sound engineer', city: 'Delhi-NCR', type: 'Crew',
    verified: true, idVerified: true, pastGigs: 88, responseRate: 91, rating: 4.8,
    followers: 1930, profileViews: 640, skills: ['FOH mixing', 'Monitor world', 'Line-array systems', 'Festival load-ins'],
    tagline: 'Live sound engineer — FOH and monitor world, festival and arena scale.',
    bio: 'Rohan has run front-of-house for festival mainstages and monitor world for touring acts across North India. He specialises in line-array systems and fast, clean festival load-ins.',
    achievements: ['40+ festival load-ins', 'Line-array certified', 'Verified on Gigset'],
    heroGradient: 'linear-gradient(135deg,#0B2E63,#0EA5E9 60%,#38BDF8)',
    experience: [
      { title: 'FOH engineer', org: 'Freelance — festivals & touring', period: '2021 — present' },
      { title: 'Monitor engineer', org: 'Depot 48 live calendar', period: '2019 — 2021' },
    ],
  },
  {
    id: 'anjali', name: 'Anjali Kulkarni', role: 'Session guitarist', city: 'Pune', type: 'Performer',
    verified: true, idVerified: true, pastGigs: 74, responseRate: 98, rating: 5.0,
    followers: 3120, profileViews: 980, skills: ['Session guitar', 'Nylon-string', 'Baritone guitar', 'Film demos', 'Arranging'],
    tagline: 'Session guitarist — nylon, steel-string and baritone, Pune-based.',
    bio: 'Anjali records session guitar parts for independent producers and film demos out of her home studio in Pune, with a growing sideline arranging folk melodies for acoustic guitar.',
    achievements: ['Featured session player, 3 independent EPs', 'Turnaround under 48 hours', 'Verified on Gigset'],
    heroGradient: 'linear-gradient(135deg,#1E1B6B,#4F46E5 55%,#2A63EE)',
    experience: [
      { title: 'Session guitarist', org: 'Independent — film & indie', period: '2020 — present' },
      { title: 'Guitar faculty', org: 'Private studio, Pune', period: '2018 — present' },
    ],
  },
  {
    id: 'karan', name: 'Karan Bedi', role: 'Lighting designer', city: 'Chandigarh', type: 'Crew',
    verified: true, idVerified: false, pastGigs: 61, responseRate: 87, rating: 4.7,
    followers: 1140, profileViews: 410, skills: ['Lighting design', 'RGBW wash', 'Arena rigs', 'Wedding setups'],
    tagline: 'Lighting designer for arena shows, college fests and the wedding circuit.',
    bio: 'Karan designs and operates lighting for arena-scale shows and high-volume wedding events across Punjab and North India. Known for fast rig plots and dependable wedding-season crews.',
    achievements: ['25+ arena shows', 'Wedding-season crew lead', 'Verified on Gigset'],
    heroGradient: 'linear-gradient(135deg,#3B0764,#4F46E5 55%,#2A63EE)',
    experience: [
      { title: 'Lighting designer & operator', org: 'Freelance', period: '2020 — present' },
    ],
  },
  {
    id: 'pianoman', name: 'Piano Man Studios', role: 'Venue', city: 'Mumbai', type: 'Venue',
    verified: true, idVerified: true, pastGigs: 400, responseRate: 99, rating: 4.9,
    followers: 9860, profileViews: 3200, skills: ['Live venue', '200 capacity', 'Open mics', 'Residencies'],
    tagline: 'Mumbai\u2019s listening room — 200-cap venue, residencies and open mics.',
    bio: 'Piano Man Studios is one of Mumbai\u2019s best-known small-format live venues, hosting residencies, open mics and touring indie acts through the year. Bookers look for acts with tight 45-minute sets.',
    achievements: ['400+ shows hosted', 'December open-mic calendar live', 'Verified on Gigset'],
    heroGradient: 'linear-gradient(135deg,#0E2E6B,#2A63EE 55%,#4F46E5)',
    experience: [{ title: 'Live music venue', org: 'Mumbai', period: '2015 — present' }],
  },
  {
    id: 'depot48', name: 'Depot 48', role: 'Venue', city: 'Delhi-NCR', type: 'Venue',
    verified: true, idVerified: true, pastGigs: 260, responseRate: 93, rating: 4.8,
    followers: 7240, profileViews: 2100, skills: ['Live venue', 'Festival weekends', '350 capacity', 'Outdoor stage'],
    tagline: 'Delhi-NCR\u2019s festival-ground venue — big weekends, outdoor stage.',
    bio: 'Depot 48 runs some of Delhi-NCR\u2019s busiest live weekends — multi-act bills, festival-format load-ins and a 3,000-cap outdoor stage for seasonal programming.',
    achievements: ['Festival weekends year-round', '3,000-cap outdoor stage', 'Verified on Gigset'],
    heroGradient: 'linear-gradient(135deg,#123B82,#0EA5E9 60%,#38BDF8)',
    experience: [{ title: 'Live music venue', org: 'Delhi-NCR', period: '2014 — present' }],
  },
  {
    id: 'sana', name: 'Sana Reddy', role: 'Drummer', city: 'Bengaluru', type: 'Performer',
    verified: true, idVerified: true, pastGigs: 96, responseRate: 94, rating: 4.9,
    followers: 5210, profileViews: 1540, rising: 34, skills: ['Drums', 'Carnatic-jazz fusion', 'Session drums', 'Live trio'],
    tagline: 'Drummer — Carnatic-jazz crossover trio, session and live.',
    bio: 'Sana leads a Carnatic-jazz crossover trio in Bengaluru and takes session drum work across South India. Her trio\u2019s new single is picking up festival attention this season.',
    achievements: ['Trio single — festival circuit buzz', '96 live shows', 'Verified on Gigset'],
    heroGradient: 'linear-gradient(135deg,#4F46E5,#0EA5E9 60%,#38BDF8)',
    experience: [
      { title: 'Drummer & bandleader', org: 'Sana Reddy Trio', period: '2021 — present' },
      { title: 'Session drummer', org: 'Independent', period: '2019 — present' },
    ],
  },
  {
    id: 'nsr', name: 'Noida School of Rock', role: 'Music school', city: 'Delhi-NCR', type: 'Institution',
    verified: true, idVerified: true, pastGigs: 120, responseRate: 90, rating: 4.7,
    followers: 6340, profileViews: 1890, skills: ['Music education', 'Production workshops', 'Student showcases'],
    tagline: 'Delhi-NCR music school — performance, production and live-sound training.',
    bio: 'Noida School of Rock runs performance and production programmes for working musicians, with term-end student showcases and short courses taught by touring engineers.',
    achievements: ['2,000+ students trained', 'January production workshop open', 'Verified on Gigset'],
    heroGradient: 'linear-gradient(135deg,#1E1B6B,#4F46E5 55%,#0EA5E9)',
    experience: [{ title: 'Music education', org: 'Delhi-NCR', period: '2012 — present' }],
  },
  {
    id: 'vikram', name: 'Vikram Nair', role: 'Stage manager', city: 'Bengaluru', type: 'Crew',
    verified: false, idVerified: true, pastGigs: 52, responseRate: 89, rating: 4.6,
    followers: 890, profileViews: 330, skills: ['Stage management', 'Arena builds', 'Crew coordination', 'Load-ins'],
    tagline: 'Stage manager — arena builds and multi-day festival operations.',
    bio: 'Vikram runs stage operations for arena builds and multi-day events around Bengaluru. Currently building a reliable stagehand roster for the wedding and fest season.',
    achievements: ['2-day arena builds', 'Crew coordination', 'ID-verified'],
    heroGradient: 'linear-gradient(135deg,#0B2E63,#4F46E5 60%,#0284C7)',
    experience: [{ title: 'Stage manager', org: 'Freelance — live events', period: '2020 — present' }],
  },
  {
    id: 'arjun', name: 'Arjun Mehta', role: 'DJ & electronic producer', city: 'Delhi-NCR', type: 'Performer',
    verified: true, idVerified: true, pastGigs: 143, responseRate: 92, rating: 4.8,
    followers: 8910, profileViews: 2760, rising: 28, skills: ['DJ sets', 'EDM production', 'Wedding & club circuit', 'Remixes'],
    tagline: 'DJ & producer — wedding and club circuit, Delhi-NCR.',
    bio: 'Arjun plays the Delhi-NCR wedding and club circuit through the season and produces EDM remixes of Bollywood catalogue tracks. High-volume, dependable, and quick on client briefs.',
    achievements: ['140+ club & wedding sets', 'Remix catalogue on streaming', 'Verified on Gigset'],
    heroGradient: 'linear-gradient(135deg,#3B0764,#0EA5E9 60%,#38BDF8)',
    experience: [{ title: 'DJ & producer', org: 'Independent — Delhi-NCR circuit', period: '2019 — present' }],
  },
  {
    id: 'zoya', name: 'Zoya Khan', role: 'Singer-songwriter', city: 'Hyderabad', type: 'Performer',
    verified: false, idVerified: true, pastGigs: 31, responseRate: 97, rating: 4.9,
    followers: 2980, profileViews: 1320, rising: 52, skills: ['Songwriting', 'Indie-pop', 'Hindi & English vocals', 'Open mics'],
    tagline: 'Indie singer-songwriter from Hyderabad — originals in Hindi and English.',
    bio: 'Zoya writes and performs original indie-pop in Hindi and English, building a following through open mics and small-room gigs across Hyderabad. Her debut EP drops this winter.',
    achievements: ['Debut EP — winter 2026', '30+ open-mic & small-room gigs', 'ID-verified'],
    heroGradient: 'linear-gradient(135deg,#7C2D12,#2A63EE 55%,#0EA5E9)',
    experience: [{ title: 'Singer-songwriter', org: 'Independent', period: '2023 — present' }],
  },
  {
    id: 'aditya', name: 'Aditya Rao', role: 'Tabla & percussionist', city: 'Chennai', type: 'Performer',
    verified: true, idVerified: false, pastGigs: 67, responseRate: 90, rating: 4.8,
    followers: 2140, profileViews: 720, rising: 21, skills: ['Tabla', 'Carnatic percussion', 'Fusion collaborations', 'Session percussion'],
    tagline: 'Tabla & percussion — Carnatic roots, fusion collaborations.',
    bio: 'Aditya is a Chennai-based tabla player working at the intersection of Carnatic tradition and contemporary fusion — session work, crossover bands and festival collaborations.',
    achievements: ['Festival fusion collaborations', 'Session percussion', 'Verified on Gigset'],
    heroGradient: 'linear-gradient(135deg,#123B82,#4F46E5 55%,#38BDF8)',
    experience: [{ title: 'Percussionist', org: 'Independent — Chennai', period: '2020 — present' }],
  },
  {
    id: 'kavya', name: 'Kavya Sharma', role: 'Brand partnerships, RealMe', city: 'Mumbai', type: 'Buyer',
    verified: true, idVerified: true, pastGigs: 24, responseRate: 88, rating: 4.7,
    followers: 1520, profileViews: 510, skills: ['Brand sponsorships', 'Artist partnerships', 'Campus activations'],
    tagline: 'Brand partnerships at RealMe — music sponsorships & campus tours.',
    bio: 'Kavya leads music and youth-culture partnerships for RealMe in India — artist sponsorships, campus gig tours and festival brand activations across metros.',
    achievements: ['12 campus tours activated', 'Festival sponsorships', 'Verified on Gigset'],
    heroGradient: 'linear-gradient(135deg,#0E2E6B,#2A63EE 55%,#0EA5E9)',
    experience: [{ title: 'Brand partnerships', org: 'RealMe India', period: '2022 — present' }],
  },
  {
    id: 'imran', name: 'Imran Sheikh', role: 'Talent booker', city: 'Kolkata', type: 'Buyer',
    verified: false, idVerified: true, pastGigs: 45, responseRate: 85, rating: 4.5,
    followers: 760, profileViews: 290, skills: ['Artist booking', 'Corporate events', 'Wedding sourcing'],
    tagline: 'Independent talent booker — corporate events & weddings, East India.',
    bio: 'Imran sources artists and crew for corporate events and weddings across East India, working with a tight roster of dependable performers and vendors.',
    achievements: ['45+ events booked', 'East-India vendor network', 'ID-verified'],
    heroGradient: 'linear-gradient(135deg,#1E1B6B,#0EA5E9 60%,#38BDF8)',
    experience: [{ title: 'Talent booker', org: 'Independent — Kolkata', period: '2021 — present' }],
  },
];
export const PEOPLE_BY_ID = Object.fromEntries(PEOPLE.map((p) => [p.id, p]));
export const ME_ID = 'meera';

// deterministic pseudo-random from a string — used for availability, sparkline etc.
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}
export function initials(name) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}
const AVATAR_COLORS = ['#2A63EE', '#0EA5E9', '#4F46E5', '#3B82F6', '#0284C7', '#6366F1'];
export function avatarColor(name) { return AVATAR_COLORS[name.length % AVATAR_COLORS.length]; }

// ---------- mock AI match score ----------
// Deterministic "algorithm": type fit + city fit + keyword overlap with the viewer's skills.
export function matchScore(opp, viewerId) {
  const viewer = PEOPLE_BY_ID[viewerId] || PEOPLE_BY_ID[ME_ID];
  let score = 52; const reasons = [];
  if (opp.type === viewer.type) { score += 17; reasons.push(`Matches your stakeholder type (${viewer.type})`); }
  if (opp.city === viewer.city) { score += 13; reasons.push(`In your city (${viewer.city}) — no travel needed`); }
  const text = `${opp.title} ${opp.desc} ${(opp.keywords || []).join(' ')}`.toLowerCase();
  const hits = viewer.skills.filter((s) => s.toLowerCase().split(' ').some((w) => w.length > 3 && text.includes(w.toLowerCase())));
  if (hits.length) { score += Math.min(12, hits.length * 4); reasons.push(`Uses your skills: ${hits.slice(0, 3).join(', ')}`); }
  if (opp.budget && /lakh/i.test(opp.budget)) { score += 3; reasons.push('Budget band fits experienced pros'); }
  score += hashStr(opp.id + viewer.id) % 7;
  score = Math.max(58, Math.min(98, score));
  if (!reasons.length) reasons.push('Popular with profiles similar to yours');
  reasons.push(`${opp.applicants || 0} people have applied so far`);
  return { score, reasons };
}

// ---------- availability: next 14 days ----------
// status: 'free' | 'busy' | 'booked' — deterministic per profile id
export function availability(id, days = 14) {
  const out = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const h = hashStr(id + d.toDateString()) % 10;
    const status = h < 4 ? 'free' : h < 7 ? 'busy' : 'booked';
    out.push({ date: d, status });
  }
  return out;
}

export const STAR_STORIES = [
  { kicker: '\u2605 Star story', headline: 'Independent artist releases in India crossed a new high this quarter', deck: 'Streaming platforms report a steady rise in independent, non-label releases from Indian artists, with regional-language tracks leading growth outside metro listenership.', gradient: 'linear-gradient(135deg,#0B2E63,#2A63EE 55%,#0EA5E9)', time: 'Published 6:00 AM today', articleId: 'indie-releases-surge' },
  { kicker: '\u2605 Star story', headline: 'Festival season bookings are up across second-tier cities', deck: 'Promoters point to growing demand in cities beyond the usual metro circuit, with venues in Chandigarh and Pune reporting earlier-than-usual booking activity.', gradient: 'linear-gradient(135deg,#123B82,#4F46E5 55%,#0EA5E9)', time: 'Published 6:00 AM today', articleId: 'festival-tier2-boom' },
  { kicker: '\u2605 Star story', headline: 'Fusion acts blending classical and electronic sounds gain festival slots', deck: 'A wave of acts pairing Hindustani and Carnatic training with electronic production are being booked across major festival line-ups this season.', gradient: 'linear-gradient(135deg,#0E2E6B,#0EA5E9 55%,#38BDF8)', time: 'Published 6:15 AM today', articleId: 'fusion-acts-rise' },
];

export const HOME_FEED = [
  { id: 'post-1', who: 'Rohan Verma', pid: 'rohan', role: 'Live sound engineer · Delhi-NCR', time: '2h', body: 'Wrapped a 3-day festival load-in at Depot 48. Looking for a second FOH engineer for the Chandigarh leg next month — DM if you\u2019re free the last weekend.', tags: [['Call-out', 'blue']], likes: 24, comments: 6 },
  { id: 'post-2', who: 'Anjali Kulkarni', pid: 'anjali', role: 'Session guitarist · Pune', time: '5h', body: 'New acoustic session up on my profile — nylon-string arrangement of a Marathi folk tune. Open to session work for anyone recording in Pune this month.', tags: [['Release', 'sky']], likes: 58, comments: 11 },
  { id: 'post-3', who: 'Karan Bedi', pid: 'karan', role: 'Lighting designer · Chandigarh', time: '6h', body: 'Looking to connect with stage managers in Punjab for the upcoming wedding season — high volume, steady work.', tags: [['Call-out', 'blue']], likes: 15, comments: 3 },
  { id: 'post-4', who: 'Piano Man Studios', pid: 'pianoman', role: 'Venue · Mumbai', time: '1d', body: 'Open mic slots for December are live. Priority to acts who\u2019ve played with us before, but new performers welcome — apply through Collab.', tags: [['Venue update', 'indigo']], likes: 112, comments: 19 },
  { id: 'post-5', who: 'Neemrana Music Foundation', pid: null, role: 'Organisation · Rajasthan', time: '1d', body: 'Announcing our annual folk-fusion residency — applications open for instrumentalists across genres. Two-week residency, travel covered.', tags: [['Workshop', 'sky']], likes: 67, comments: 9 },
  { id: 'post-6', who: 'Noida School of Rock', pid: 'nsr', role: 'Music school · Delhi-NCR', time: '1d', body: 'Enrolment open for our January production workshop — mixing, mastering and live sound basics, taught by working engineers.', tags: [['Workshop', 'blue']], likes: 41, comments: 4 },
  { id: 'post-7', who: 'Sana Reddy', pid: 'sana', role: 'Drummer · Bengaluru', time: '1d', body: 'New single out with my trio — a Carnatic-jazz crossover EP. Would love feedback from other rhythm section players.', tags: [['Release', 'indigo']], likes: 73, comments: 14 },
  { id: 'post-8', who: 'Arjun Mehta', pid: 'arjun', role: 'DJ & producer · Delhi-NCR', time: '2d', body: 'Wedding season calendar is filling fast — two December weekends left for full-night DJ + percussion sets. Brands, my campus-tour slots for October are open too.', tags: [['Call-out', 'blue']], likes: 96, comments: 12 },
  { id: 'post-9', who: 'Zoya Khan', pid: 'zoya', role: 'Singer-songwriter · Hyderabad', time: '2d', body: 'Played my first 200-cap room last night in Hyderabad and the room sang the chorus back. Debut EP tracking starts next week — thank you to everyone here who shared open-mic leads.', tags: [['Update', 'sky']], likes: 143, comments: 22 },
];

export const MEDIA_ITEMS = [
  { id: 'm1', who: 'Meera Iyer', pid: 'meera', role: 'Vocalist · Mumbai', type: 'video', kind: 'Performance', caption: 'Closing set from Friday\u2019s Piano Man show — full band, live strings.', likes: 214, gradient: 'linear-gradient(135deg,#123B82,#4F46E5)' },
  { id: 'm2', who: 'Anjali Kulkarni', pid: 'anjali', role: 'Session guitarist · Pune', type: 'photo', kind: 'Service showcase', caption: 'Studio rig for this week\u2019s session bookings — nylon, steel-string and a baritone.', likes: 88, gradient: 'linear-gradient(135deg,#0EA5E9,#4F46E5)' },
  { id: 'm3', who: 'Karan Bedi', pid: 'karan', role: 'Lighting designer · Chandigarh', type: 'photo', kind: 'Service showcase', caption: 'Rig plot from last weekend\u2019s arena show — full RGBW wash and haze.', likes: 56, gradient: 'linear-gradient(135deg,#4F46E5,#2A63EE)' },
  { id: 'm4', who: 'Sana Reddy', pid: 'sana', role: 'Drummer · Bengaluru', type: 'video', kind: 'Performance', caption: 'Carnatic-jazz crossover trio — new single, live take.', likes: 301, gradient: 'linear-gradient(135deg,#4F46E5,#0EA5E9)' },
  { id: 'm5', who: 'Depot 48', pid: 'depot48', role: 'Venue · Delhi-NCR', type: 'video', kind: 'Performance', caption: 'Recap reel from last month\u2019s festival weekend.', likes: 449, gradient: 'linear-gradient(135deg,#123B82,#0EA5E9)' },
  { id: 'm6', who: 'Rohan Verma', pid: 'rohan', role: 'Live sound engineer · Delhi-NCR', type: 'photo', kind: 'Service showcase', caption: 'FOH setup for a 3,000-cap outdoor stage — line array and monitor world.', likes: 64, gradient: 'linear-gradient(135deg,#0EA5E9,#3B82F6)' },
  { id: 'm7', who: 'Aditya Rao', pid: 'aditya', role: 'Tabla & percussionist · Chennai', type: 'video', kind: 'Performance', caption: 'Tabla × modular synth — rehearsal excerpt for the December fusion bill.', likes: 187, gradient: 'linear-gradient(135deg,#123B82,#4F46E5)' },
  { id: 'm8', who: 'Noida School of Rock', pid: 'nsr', role: 'Music school · Delhi-NCR', type: 'video', kind: 'Performance', caption: 'Student showcase from this term\u2019s live-performance workshop.', likes: 126, gradient: 'linear-gradient(135deg,#123B82,#4F46E5)' },
  { id: 'm9', who: 'Piano Man Studios', pid: 'pianoman', role: 'Venue · Mumbai', type: 'video', kind: 'Performance', caption: 'Open mic highlight — new vocalist we\u2019re watching this month.', likes: 180, gradient: 'linear-gradient(135deg,#2A63EE,#4F46E5)' },
];

export const OPPORTUNITIES = [
  { id: 'opp-1', title: 'Bassist needed for wedding season', type: 'Performer', city: 'Mumbai', desc: '3–4 weddings across December, comfortable with Bollywood and Punjabi sets. Rehearsals in Andheri, travel to venues covered.', postedBy: 'pianoman', posted: 'Piano Man Studios', budget: '₹25k–40k / event', applicants: 18, keywords: ['bass', 'wedding', 'bollywood', 'live performance'] },
  { id: 'opp-2', title: 'FOH engineer, single weekend gig', type: 'Crew', city: 'Chandigarh', desc: 'Festival load-out, one day, experience with line-array systems preferred. Crew meals and stay covered.', postedBy: 'rohan', posted: 'Rohan Verma', budget: '₹18k / day', applicants: 9, keywords: ['FOH', 'live sound', 'line-array', 'festival'] },
  { id: 'opp-3', title: 'Venue for monthly jazz night', type: 'Venue', city: 'Bengaluru', desc: 'Looking for a 100–150 capacity venue open to a recurring Thursday jazz slot. Trio format, low-volume PA.', postedBy: 'sana', posted: 'Sana Reddy', budget: 'Revenue share', applicants: 6, keywords: ['jazz', 'venue', 'recurring', 'trio'] },
  { id: 'opp-4', title: 'Session guitarist for film demo', type: 'Performer', city: 'Pune', desc: 'One-day session, acoustic and electric parts, reference tracks provided. Quick turnaround appreciated.', postedBy: 'anjali', posted: 'Anjali Kulkarni', budget: '₹12k / session', applicants: 22, keywords: ['guitar', 'session', 'film', 'acoustic'] },
  { id: 'opp-5', title: 'Lighting crew for college fest', type: 'Crew', city: 'Delhi-NCR', desc: '2-day college festival, 4-person lighting crew needed, budget confirmed. Rig provided, design input welcome.', postedBy: 'nsr', posted: 'Noida School of Rock', budget: '₹8k / day / person', applicants: 14, keywords: ['lighting', 'college fest', 'crew'] },
  { id: 'opp-6', title: 'Female vocalist for corporate gala, Mumbai', type: 'Performer', city: 'Mumbai', desc: '45-minute Hindi–English retro set for a 500-guest corporate gala. Backing tracks or 3-piece band — your call.', postedBy: 'imran', posted: 'Imran Sheikh', budget: '₹60k / set', applicants: 31, keywords: ['vocalist', 'playback singing', 'corporate', 'live performance'] },
  { id: 'opp-7', title: 'Campus tour opener slots — 6 cities', type: 'Performer', city: 'Delhi-NCR', desc: 'RealMe campus tour needs 20-minute opener acts across 6 cities. Great exposure + fixed fee per show. Indie and hip-hop preferred.', postedBy: 'kavya', posted: 'Kavya Sharma (RealMe)', budget: '₹20k / show + travel', applicants: 47, keywords: ['indie', 'hip-hop', 'campus', 'tour', 'live performance'] },
  { id: 'opp-8', title: 'Stagehands for 2-day arena build', type: 'Crew', city: 'Bengaluru', desc: 'Need 6 experienced stagehands for a 2-day arena setup next weekend. Paid daily, meals included, PPE provided.', postedBy: 'vikram', posted: 'Vikram Nair', budget: '₹3.5k / day', applicants: 11, keywords: ['stagehand', 'arena', 'load-in', 'crew'] },
];

export const NEWS_ARTICLES = [
  {
    id: 'indie-releases-surge', cat: 'Industry', time: '6:00 AM',
    title: 'Independent artist releases in India crossed a new high this quarter',
    deck: 'Streaming platforms report a steady rise in independent, non-label releases from Indian artists, with regional-language tracks leading growth outside metro listenership.',
    author: 'Gigset Newsroom', gradient: 'linear-gradient(135deg,#0B2E63,#2A63EE 55%,#0EA5E9)',
    body: [
      'Independent, non-label releases from Indian artists hit a new quarterly high, according to streaming data shared with Gigset this week — continuing a run that has seen the indie catalogue roughly double in three years.',
      'The most striking part of the growth is where it is coming from. Regional-language tracks — Punjabi, Tamil, Telugu, Bengali and Marathi — are leading the expansion, with listenership growth strongest outside the metro cities that once defined the industry\u2019s centre of gravity.',
      '\u201cThe entry cost of a release has collapsed,\u201d one Mumbai-based distributor told Gigset. \u201cA home studio, a distributor account, and a phone camera for content — that is a release pipeline now. The constraint is discovery, not production.\u201d',
      'That discovery gap is exactly where platforms, playlists and — increasingly — short-form video decide which releases break out. Artists interviewed for this piece said a single viral clip now moves more units than a month of playlist pitching.',
      'What to watch: whether the coming festival season converts streaming momentum into live bookings for independent acts, and whether regional-language headliners start commanding metro festival slots at the same rate as Hindi and English acts.',
    ],
  },
  {
    id: 'festival-tier2-boom', cat: 'Events', time: '6:00 AM',
    title: 'Festival season bookings are up across second-tier cities',
    deck: 'Promoters point to growing demand in cities beyond the usual metro circuit, with venues in Chandigarh and Pune reporting earlier-than-usual booking activity.',
    author: 'Gigset Newsroom', gradient: 'linear-gradient(135deg,#123B82,#4F46E5 55%,#0EA5E9)',
    body: [
      'Promoters across Chandigarh, Pune, Kochi and Indore say festival-season bookings are running ahead of last year\u2019s pace — with several venues reporting that prime October–December weekends sold out weeks earlier than usual.',
      'The shift reflects a maturing live market. Audiences in second-tier cities, long served by touring metro acts, are now sustaining home-grown bills — and local crews, sound vendors and stage managers are seeing steadier calendars as a result.',
      'For artists, the practical takeaway is routing: a weekend that pairs a Chandigarh college fest with a Delhi-NCR club date is now a viable mini-tour, where two years ago the middle date would not have existed.',
      'Crew members interviewed said the crunch point is technical labour — experienced FOH engineers and lighting designers are booked out first, a bottleneck that keeps recurring every season.',
    ],
  },
  {
    id: 'fusion-acts-rise', cat: 'Pop culture', time: '6:15 AM',
    title: 'Fusion acts blending classical and electronic sounds gain festival slots',
    deck: 'A wave of acts pairing Hindustani and Carnatic training with electronic production are being booked across major festival line-ups this season.',
    author: 'Gigset Newsroom', gradient: 'linear-gradient(135deg,#0E2E6B,#0EA5E9 55%,#38BDF8)',
    body: [
      'Festival programmers say one of the clearest booking trends this season is the rise of fusion acts — artists pairing Hindustani or Carnatic training with electronic production, live looping and modular synthesis.',
      'The format travels well: it reads as distinctly Indian to international bookers while feeling current to younger domestic audiences. Several such acts have moved from afternoon discovery slots to evening main-stage billing in a single season.',
      'Behind the scenes, the trend is creating session demand for classical instrumentalists — tabla, flute and violin players comfortable with click tracks and in-ear monitoring are suddenly among the most-booked session musicians in the country.',
      'Watch for the backlash cycle too: as the sound gets more commercial, the acts that keep their classical rigour intact are the ones programmers say they rebook.',
    ],
  },
  {
    id: 'session-demand-remote', cat: 'Industry', time: '7:00 AM',
    title: 'Session musician demand rises as home-studio production grows',
    deck: 'More independent producers are hiring session players remotely, changing how session work gets booked outside traditional studio networks.',
    author: 'Gigset Newsroom', gradient: 'linear-gradient(135deg,#1E1B6B,#2A63EE 55%,#0EA5E9)',
    body: [
      'The home-studio boom has quietly rewired session work. Independent producers who once booked a day at a commercial studio now hire guitarists, percussionists and vocalists remotely — stems in, stems out, no travel.',
      'Session players say the new workflow rewards speed and communication over studio pedigree: 48-hour turnarounds, clean DI tracks, and the ability to take direction over a video call.',
      'Rates are bifurcating. Top-tier players with broadcast credits command a premium; everyone else competes on turnaround and reliability. Platforms that verify credits and track response times are starting to matter in who gets the call.',
      'The losers in the shift are mid-tier commercial studios in metros, several of which have pivoted to rehearsal rooms, podcast recording, or education to fill the diary.',
    ],
  },
  {
    id: 'college-openmic-record', cat: 'Events', time: '7:20 AM',
    title: 'College music societies report record turnout for open-mic circuits',
    deck: 'Campus-level gig circuits are increasingly acting as a first stage for upcoming performers before they reach commercial venues.',
    author: 'Gigset Newsroom', gradient: 'linear-gradient(135deg,#0B2E63,#0EA5E9 60%,#38BDF8)',
    body: [
      'College music societies across Delhi-NCR, Pune and Bengaluru report record turnout for open-mic nights this semester — with several circuits now running weekly bills that draw crowds in the hundreds.',
      'For upcoming artists, the campus circuit has become the de facto first stage: low stakes, real audiences, and a direct line to the city\u2019s commercial venues, whose bookers increasingly scout college bills.',
      'Societies say their biggest constraint is technical — reliable PA, a decent mixer and someone who knows how to run them. The good campus gigs are the ones with a crew, not just a stage.',
      'Expect the pipeline to formalise: at least two college festivals this season are running judged band competitions with commercial venue slots as prizes.',
    ],
  },
  {
    id: 'brand-music-spends', cat: 'Industry', time: '8:05 AM',
    title: 'Brands raise music sponsorship budgets ahead of wedding season',
    deck: 'Electronics and beverage brands are expanding artist partnerships and campus tours as the October–February live calendar fills up.',
    author: 'Gigset Newsroom', gradient: 'linear-gradient(135deg,#123B82,#2A63EE 55%,#4F46E5)',
    body: [
      'Brand managers say music sponsorship budgets for the October–February season are up year-on-year, with electronics and beverage brands leading the expansion into campus tours and indie-artist partnerships.',
      'The playbook has shifted from logo-on-stage to artist-led content: brands want acts who can carry a campus tour, generate social content, and show up reliably across a dozen cities.',
      'For artists, brand gigs remain the steadiest money in the live calendar — fixed fees, professional production, and audiences that actually show up. The trade-off is creative constraint and exclusivity clauses worth reading carefully.',
      'Managers advise upcoming acts to treat brand relationships as long-cycle: the campus tour you play this year is the festival sponsorship you negotiate next year.',
    ],
  },
  {
    id: 'wedding-season-economics', cat: 'Industry', time: '8:40 AM',
    title: 'The economics of wedding-season gigging, explained by the people playing it',
    deck: 'December weddings remain the single biggest paycheque in Indian live music — but the circuit rewards reliability more than virtuosity.',
    author: 'Gigset Newsroom', gradient: 'linear-gradient(135deg,#3B0764,#4F46E5 55%,#2A63EE)',
    body: [
      'Ask working musicians where the money is and most will point to the same place: the December wedding season, when a tight band can earn in six weeks what a club residency pays in six months.',
      'But the circuit has its own physics. Bandleaders say clients book reliability — on-time load-ins, clean Bollywood and Punjabi sets, zero drama — far more than they book virtuosity. The best wedding musicians are logistics people who happen to play well.',
      'Rates vary wildly by city and by who is asking. Veterans advise younger players to quote per-event with travel and stay itemised, and to get advances in writing before blocking December dates.',
      'The emerging wrinkle: corporate-style production values are creeping into weddings, which means more work for lighting designers, sound engineers and stage managers — the crew side of the circuit is growing faster than the artist side.',
    ],
  },
  {
    id: 'playback-ai-debate', cat: 'Pop culture', time: '9:15 AM',
    title: 'Playback singers and AI vocals: where the industry draws the line',
    deck: 'As synthetic vocals improve, music directors and singers are negotiating new norms — and new contracts — around AI in playback.',
    author: 'Gigset Newsroom', gradient: 'linear-gradient(135deg,#0E2E6B,#4F46E5 55%,#0EA5E9)',
    body: [
      'Few topics divide the industry right now like AI vocals. Demo-quality synthetic singing is already common in pre-production; the argument is about what happens next — and who gets paid.',
      'Singers\u2019 associations are pushing for consent-and-compensation norms: no synthetic replica of a voice without permission, and a fee structure when replicas are used. Several recent contracts reviewed by Gigset now include AI clauses as standard.',
      'Music directors are more sanguine, describing AI vocals as a sketching tool — like a temp track that happens to sing in tune. \u201cNobody releases the sketch,\u201d one prominent director said. \u201cThe final vocal is still a human performance.\u201d',
      'The consensus emerging: AI will compress the demo and jingle layer of session work first, while premium playback and live performance — where the human is the product — remain insulated the longest.',
    ],
  },
  {
    id: 'venue-licensing-guide', cat: 'Industry', time: '9:50 AM',
    title: 'What it actually takes to open a live music venue in India',
    deck: 'Licensing, sound limits, and the economics of a 200-cap room — a practical primer for aspiring venue operators.',
    author: 'Gigset Newsroom', gradient: 'linear-gradient(135deg,#1E1B6B,#0EA5E9 60%,#38BDF8)',
    body: [
      'Everyone loves the idea of opening a venue; fewer love the paperwork. Operators say licensing — excise, performance permissions, fire and safety — is the first mountain, and it varies sharply by city and state.',
      'Then comes the sound question. Residential noise complaints are the most common reason small venues curtail programming, which is why the successful rooms invest early in acoustic treatment and strict curfews rather than fighting neighbours show by show.',
      'The economics of a 200-cap room are unforgiving: bar revenue carries the P&L, ticket splits rarely do. The venues that survive treat live music as the marketing and the bar as the business — or build a food programme strong enough to stand alone.',
      'The opportunity operators keep naming: second-tier cities, where licensing is simpler, rents are lower, and audiences are underserved. The next great Indian venue may not be in a metro at all.',
    ],
  },
  {
    id: 'crew-shortage-season', cat: 'Events', time: '10:30 AM',
    title: 'The crew crunch: why good sound engineers are booked out first every season',
    deck: 'Experienced FOH engineers, lighting designers and stage managers are the scarcest resource in the live calendar — and the least visible.',
    author: 'Gigset Newsroom', gradient: 'linear-gradient(135deg,#0B2E63,#2A63EE 55%,#38BDF8)',
    body: [
      'Every festival season surfaces the same bottleneck: there are more stages than there are experienced crew to run them. FOH engineers and lighting designers with arena credits are typically booked out weeks before the artists they mix.',
      'The pipeline problem is structural. Sound and lighting have no glamour layer — no streaming royalties, no fan followings — so young talent drifts toward performance or production, and the crew bench stays thin.',
      'Veterans say the fix is training plus dignity: paid apprenticeships on real shows, credits that travel with a crew member\u2019s name, and day rates that reflect the fact that a bad mix ruins a good band.',
      'For event managers, the practical lesson is to book crew before artists — the good ones go first, and a great band with a bad mix is just an expensive rehearsal.',
    ],
  },
];

export const COMMUNITIES = [
  {
    id: 'guitarists', name: 'Guitarists of India', icon: '🎸', members: 1240, color: 'blue',
    desc: 'Nylon, steel-string, electric — gear talk, session leads, and technique threads.',
    wall: [
      { who: 'Anjali Kulkarni', pid: 'anjali', time: '3h', body: 'Anyone else finding baritone guitar getting more session requests lately? Had three bookings just for that this month.', replies: 6 },
      { who: 'Dev Malhotra', pid: null, time: '1d', body: 'What\u2019s everyone using for a compact pedalboard for wedding-circuit gigs? Trying to cut my rig down.', replies: 14 },
      { who: 'Anjali Kulkarni', pid: 'anjali', time: '2d', body: 'Sharing a quick voicing trick for nylon-string arrangements of Hindi film songs — works well for solo sets.', replies: 9 },
    ],
  },
  {
    id: 'crew', name: 'Live Sound & Lighting Crew', icon: '🎚️', members: 860, color: 'sky',
    desc: 'FOH, monitors, rigging and lighting design — the people who make the show actually work.',
    wall: [
      { who: 'Rohan Verma', pid: 'rohan', time: '5h', body: 'Line-array vs point-source for a 2,000-cap outdoor stage — what\u2019s everyone\u2019s go-to these days?', replies: 11 },
      { who: 'Karan Bedi', pid: 'karan', time: '1d', body: 'Posted my rig plot from last weekend\u2019s arena show in Gighub if anyone wants to talk through the RGBW wash setup.', replies: 5 },
    ],
  },
  {
    id: 'wedding', name: 'Wedding Circuit Musicians', icon: '💍', members: 2010, color: 'indigo',
    desc: 'Booking talk, setlists, and logistics for India\u2019s biggest live-music circuit.',
    wall: [
      { who: 'Piano Man Studios', pid: 'pianoman', time: '2h', body: 'December is filling up fast — if you\u2019re looking for wedding-season slots, get your profile updated this week.', replies: 8 },
      { who: 'Vikram Nair', pid: 'vikram', time: '1d', body: 'Any stage managers around Bengaluru free for a 3-day wedding event next month? Big setup, good budget.', replies: 13 },
    ],
  },
  {
    id: 'vocalists', name: 'Independent Vocalists', icon: '🎤', members: 1530, color: 'blue',
    desc: 'Playback, session, and live vocalists trading notes on technique and bookings.',
    wall: [
      { who: 'Meera Iyer', pid: 'meera', time: '4h', body: 'Anyone have tips for keeping voice health steady through a heavy wedding-season booking schedule?', replies: 17 },
      { who: 'Sana Reddy', pid: 'sana', time: '1d', body: 'Our Carnatic-jazz single is finally out — would love feedback from other vocalists doing crossover work.', replies: 10 },
    ],
  },
  {
    id: 'educators', name: 'Music Educators & Schools', icon: '🎓', members: 640, color: 'sky',
    desc: 'For music schools, instructors, and workshop organisers comparing notes on curriculum and student showcases.',
    wall: [
      { who: 'Noida School of Rock', pid: 'nsr', time: '1d', body: 'Our January production workshop just opened enrolment — happy to share our curriculum outline if any other schools are building something similar.', replies: 4 },
    ],
  },
];

export const CONVERSATIONS = [
  {
    id: 'c1', name: 'Rohan Verma', pid: 'rohan', preview: 'Sounds good — I\u2019ll send the tech rider tonight.', unread: true,
    thread: [
      { me: false, text: 'Hey! Saw your post about the FOH slot for the Chandigarh leg — still open?' },
      { me: true, text: 'Yes, still open! You free the last weekend of the month?' },
      { me: false, text: 'I am. Sounds good — I\u2019ll send the tech rider tonight.' },
    ],
  },
  {
    id: 'c2', name: 'Piano Man Studios', pid: 'pianoman', preview: 'We\u2019d love to have you back for the December open mic.', unread: true,
    thread: [
      { me: false, text: 'Hi Meera, loved your last set with us.' },
      { me: false, text: 'We\u2019d love to have you back for the December open mic.' },
      { me: true, text: 'I\u2019d love that — send me the dates whenever you have them.' },
    ],
  },
  {
    id: 'c3', name: 'Anjali Kulkarni', pid: 'anjali', preview: 'Let me know if Tuesday works for the session.', unread: false,
    thread: [
      { me: true, text: 'Loved the acoustic session you posted — any chance you\u2019re free for a collab?' },
      { me: false, text: 'Thank you! Yes, happy to. Let me know if Tuesday works for the session.' },
    ],
  },
];

export const NOTIFICATIONS = [
  { id: 'n1', text: '<b>Rohan Verma</b> sent you a message', time: '12 min ago', kind: 'message', link: '/messages' },
  { id: 'n2', text: '<b>Piano Man Studios</b> started following you', time: '1 hour ago', kind: 'follow', link: '/profile/pianoman' },
  { id: 'n3', text: 'New AI-matched opportunity: <b>Female vocalist for corporate gala, Mumbai</b> — 94% match', time: '3 hours ago', kind: 'opportunity', link: '/collab' },
  { id: 'n4', text: 'Your post reached <b>500 views</b>', time: 'Yesterday', kind: 'engagement', link: '/profile/meera' },
  { id: 'n5', text: '<b>Sana Reddy</b> liked your post', time: 'Yesterday', kind: 'engagement', link: '/profile/meera' },
  { id: 'n6', text: '<b>Anjali Kulkarni</b> accepted your connection request', time: '2 days ago', kind: 'follow', link: '/profile/anjali' },
  { id: 'n7', text: 'Your profile appeared in <b>12 searches</b> this week', time: '2 days ago', kind: 'engagement', link: '/profile/meera' },
  { id: 'n8', text: 'Today\u2019s news digest is ready — 10 new articles', time: '2 days ago', kind: 'news', link: '/news' },
];

export const HASHTAGS = [
  { tag: '#WeddingSeason2026', posts: '2.4k' },
  { tag: '#SessionWork', posts: '1.8k' },
  { tag: '#FestivalCircuit', posts: '1.2k' },
  { tag: '#LiveSound', posts: '986' },
  { tag: '#IndieReleases', posts: '874' },
  { tag: '#OpenMic', posts: '653' },
  { tag: '#CrewCall', posts: '542' },
  { tag: '#MusicEducation', posts: '431' },
];

// Upcoming gigs for countdown cards (Oct 2026 — after the Sept 26 demo)
export const UPCOMING_GIGS = [
  { id: 'g1', title: 'Monsoon Sessions — Live at Piano Man', venue: 'Piano Man Studios, Mumbai', date: '2026-10-03T19:00:00', gradient: 'linear-gradient(135deg,#123B82,#2A63EE 60%,#0EA5E9)', note: 'Full-band set with live strings' },
  { id: 'g2', title: 'Thursday Jazz Night', venue: 'Bengaluru (venue TBA)', date: '2026-10-09T20:00:00', gradient: 'linear-gradient(135deg,#1E1B6B,#4F46E5 60%,#0EA5E9)', note: 'Carnatic-jazz trio residency' },
  { id: 'g3', title: 'Depot 48 Festival Weekend', venue: 'Depot 48, Delhi-NCR', date: '2026-10-17T16:00:00', gradient: 'linear-gradient(135deg,#0B2E63,#0EA5E9 60%,#38BDF8)', note: '3-day outdoor stage' },
  { id: 'g4', title: 'Wedding Expo Showcase', venue: 'Chandigarh', date: '2026-10-24T18:00:00', gradient: 'linear-gradient(135deg,#3B0764,#4F46E5 60%,#2A63EE)', note: 'Vendor showcase + live demo' },
];

export const INTEREST_TAGS = ['Live sound', 'Session work', 'Weddings & events', 'Festivals', 'Music schools', 'Lighting & staging', 'Independent releases', 'Collaboration'];

export const ONBOARD_TYPES = [
  { name: 'Performer', icon: '🎤', desc: 'Artists, bands & instrumentalists' },
  { name: 'Venue', icon: '🏛️', desc: 'Gig venues, jam pads, studios' },
  { name: 'Buyer', icon: '💼', desc: 'Organisers, festivals, brands' },
  { name: 'Crew', icon: '🎛️', desc: 'Sound, lighting & stage crew' },
  { name: 'Institution', icon: '🎓', desc: 'Schools, societies & agencies' },
];

// profile analytics: 14-day views, deterministic
export function analyticsSeries(id) {
  const base = 18 + (hashStr(id) % 30);
  return Array.from({ length: 14 }, (_, i) => {
    const wave = Math.sin(i / 2.2) * 0.35 + 0.65;
    const noise = (hashStr(id + i) % 20) / 100;
    return Math.round(base * (wave + noise) + i * 1.6);
  });
}
