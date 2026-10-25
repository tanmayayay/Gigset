import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence, useInView, useScroll, useTransform, useMotionValueEvent } from 'framer-motion';
import {
  Mic, Building2, Briefcase, SlidersHorizontal, GraduationCap, ArrowRight, ChevronRight, ChevronLeft,
  BadgeCheck, Sparkles, Plus, Play, Heart, MapPin, CalendarCheck, Radio,
} from 'lucide-react';
import { useStore } from '../store/store';
import { Logo } from '../components/ui';
import AuthModal from '../components/AuthModal';
import { PEOPLE, CITIES, initials, avatarColor } from '../data/demo';
import '../landing.css';

/* ---------- helpers ---------- */
function useCountUp(target, start, duration = 1600) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return undefined;
    let raf; const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration]);
  return val;
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const ease = [0.2, 0.7, 0.2, 1];
function Reveal({ children, delay = 0, y = 36, className, as: Tag = 'div' }) {
  const M = motion[Tag];
  return <M className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-70px' }} transition={{ duration: 0.8, delay, ease }}>{children}</M>;
}

/* ============================================================
   NAV: frosted, slim, centred links
   ============================================================ */
function Nav({ onJoin, onLogin, onDemo }) {
  const { user } = useStore();
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const f = () => setSolid(window.scrollY > 8);
    f(); window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  return (
    <nav className={`ap-nav${solid ? ' solid' : ''}`}>
      <div className="ap-nav-in">
        <Link to="/" aria-label="Strings home" className="ap-logo"><Logo /></Link>
        <div className="ap-links">
          <a href="#story">Overview</a>
          <a href="#roles">Who it&rsquo;s for</a>
          <a href="#match">Match</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="ap-nav-cta">
          {user ? <button className="ap-pill" onClick={onDemo}>Open app</button> : (
            <>
              <button className="ap-textbtn" onClick={onLogin}>Sign in</button>
              <button className="ap-pill" onClick={onJoin}>Join</button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

/* ============================================================
   The device: a portfolio-style profile that changes per story step
   ============================================================ */
const WAVE = [30, 55, 40, 70, 48, 82, 60, 38, 66, 50, 78, 44, 36, 60, 52, 74, 46, 58, 40, 68];

function ScreenProfile() {
  return (
    <div className="dv-screen">
      <div className="dv-cover" />
      <div className="dv-body">
        <div className="dv-avatar">MI</div>
        <h4>Meera Iyer <BadgeCheck size={16} /></h4>
        <p>Vocalist &middot; Mumbai</p>
        <div className="dv-chips"><span>Bollywood</span><span>Sufi</span><span>Jazz</span></div>
        <div className="dv-stats"><div><b>2.4k</b><i>Followers</i></div><div><b>86</b><i>Gigs</i></div><div><b>4.9</b><i>Rating</i></div></div>
        <div className="dv-listen"><button aria-label="Play"><Play size={14} fill="currentColor" /></button><div className="dv-wave">{WAVE.map((h, i) => <i key={i} style={{ height: `${h}%`, animationDelay: `${(i % 8) * 0.1}s` }} />)}</div></div>
        <div className="dv-tiles"><i style={{ background: 'linear-gradient(135deg,#6a5cff,#22d3ee)' }} /><i style={{ background: 'linear-gradient(135deg,#ff7ab6,#ffb86b)' }} /><i style={{ background: 'linear-gradient(135deg,#34d399,#2a63ee)' }} /></div>
      </div>
    </div>
  );
}
function ScreenMatch() {
  const rows = [[PEOPLE[0], 94], [PEOPLE[1], 91], [PEOPLE[2], 88]];
  return (
    <div className="dv-screen pad">
      <h5><Sparkles size={14} /> Matched for you</h5>
      {rows.map(([p, pct]) => (
        <div className="dv-row" key={p.id}>
          <div className="av" style={{ background: p.heroGradient || avatarColor(p.name) }}>{initials(p.name)}</div>
          <div className="tx"><b>{p.name}</b><span>{p.role} &middot; {p.city}</span><div className="bar"><i style={{ width: `${pct}%` }} /></div></div>
          <strong>{pct}%</strong>
        </div>
      ))}
    </div>
  );
}
function ScreenBook() {
  const days = Array.from({ length: 35 }, (_, i) => i);
  const busy = new Set([3, 4, 11, 17, 18, 25]); const booked = new Set([9, 22]);
  return (
    <div className="dv-screen pad">
      <h5><CalendarCheck size={14} /> Availability</h5>
      <div className="dv-cal">{days.map((d) => <i key={d} className={booked.has(d) ? 'booked' : busy.has(d) ? 'busy' : 'free'}>{(d % 31) + 1}</i>)}</div>
      <button className="dv-req">Request 24 Oct</button>
    </div>
  );
}
function ScreenNotes() {
  return (
    <div className="dv-screen pad">
      <h5><Radio size={14} /> Notes</h5>
      <div className="dv-orbit">
        {[-1, 0, 1].map((d) => <span key={d} className={d === 0 ? 'front' : ''} style={{ zIndex: d === 0 ? 2 : 1, transform: `translateX(${d * 96}px) translateZ(${-Math.abs(d) * 60}px) rotateY(${-d * 30}deg)`, background: d === 0 ? 'linear-gradient(160deg,#6a5cff,#22d3ee)' : d < 0 ? 'linear-gradient(160deg,#ff7ab6,#7c5cff)' : 'linear-gradient(160deg,#34d399,#2a63ee)' }} />)}
      </div>
      <p className="dv-cap">Tonight&rsquo;s soundcheck <Heart size={12} /></p>
    </div>
  );
}
const SCREENS = { profile: ScreenProfile, match: ScreenMatch, book: ScreenBook, notes: ScreenNotes };

function Device({ screen = 'profile', style }) {
  const Screen = SCREENS[screen];
  return (
    <div className="dv" style={style}>
      <div className="dv-bar"><i /><i /><i /><span>strings.app</span></div>
      <AnimatePresence mode="wait">
        <motion.div key={screen} initial={{ opacity: 0, y: 14, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, ease }}>
          <Screen />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   HERO: giant type, device rises and levels out as you scroll
   ============================================================ */
function Hero({ onJoin, onDemo }) {
  const { user } = useStore();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'start 25%'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [24, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.86, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0.4, 1]);
  return (
    <header className="ap-hero">
      <div className="ap-glow" aria-hidden="true" />
      <motion.span className="ap-eyebrow" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>Introducing Strings</motion.span>
      <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.08, ease }}>
        Your music career,<br /><span className="ap-grad">beautifully connected.</span>
      </motion.h1>
      <motion.p className="ap-lede" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.2, ease }}>
        One profile that works like a portfolio. One network for artists, venues, organisers and crew across India. Gigs that find you.
      </motion.p>
      <motion.div className="ap-ctas" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3, ease }}>
        {user ? <button className="ap-btn" onClick={onDemo}>Open app</button> : <button className="ap-btn" onClick={onJoin}>Create your profile</button>}
        <button className="ap-link" onClick={() => document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' })}>See how it works <ChevronRight size={18} /></button>
      </motion.div>
      <div className="ap-stage" ref={ref}>
        <motion.div className="ap-device-wrap" style={{ rotateX, scale, opacity }}>
          <Device screen="profile" />
        </motion.div>
      </div>
    </header>
  );
}

/* ============================================================
   Scrollytelling: pinned device, copy changes as you scroll
   ============================================================ */
const STEPS = [
  { id: 'profile', kicker: 'Portfolio', title: 'A profile that works like a portfolio.', copy: 'Your sound, your samples, your story and your rating, laid out like a showcase. Embed tracks and videos so people can hear you before they ever message you.' },
  { id: 'match', kicker: 'Match', title: 'Gigs that find you.', copy: 'Every brief on Strings is scored against your craft, city and past work. The right opportunities rise to the top, the noise stays out.' },
  { id: 'book', kicker: 'Collab and book', title: 'From hello to booked, in one place.', copy: 'Check live availability, send a request with a budget and a date, and confirm. No more lost enquiries in group chats.' },
  { id: 'notes', kicker: 'Notes', title: 'Stay in the moment.', copy: 'Drop a photo note from soundcheck. It orbits the community for 12 hours, then fades. Fresh, social and never a chore.' },
];
function StoryScroll() {
  const ref = useRef(null);
  const [idx, setIdx] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => setIdx(Math.max(0, Math.min(STEPS.length - 1, Math.floor(v * STEPS.length * 0.999)))));
  const jump = (i) => {
    const el = ref.current; if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + (el.offsetHeight - window.innerHeight) * ((i + 0.5) / STEPS.length), behavior: 'smooth' });
  };
  const s = STEPS[idx];
  return (
    <section className="ap-story" id="story" ref={ref} style={{ height: `${STEPS.length * 85}vh` }}>
      <div className="ap-pin">
        <div className="ap-story-copy">
          <AnimatePresence mode="wait">
            <motion.div key={s.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} transition={{ duration: 0.45, ease }}>
              <span className="ap-kicker">{s.kicker}</span>
              <h2>{s.title}</h2>
              <p>{s.copy}</p>
            </motion.div>
          </AnimatePresence>
          <div className="ap-steps" role="tablist" aria-label="Product tour">
            {STEPS.map((x, i) => <button key={x.id} role="tab" aria-selected={i === idx} className={i === idx ? 'on' : ''} onClick={() => jump(i)} aria-label={x.kicker}><i /></button>)}
          </div>
        </div>
        <div className="ap-story-device"><Device screen={s.id} /></div>
      </div>
    </section>
  );
}

/* ============================================================
   Roles: horizontal showcase, like "take a closer look"
   ============================================================ */
const ROLES = [
  { icon: Mic, name: 'Artists', line: 'Bands, solo acts, DJs, producers.', tone: 'linear-gradient(140deg,#5b3df5,#22d3ee)', who: PEOPLE.find((p) => p.type === 'Performer') },
  { icon: Building2, name: 'Venues', line: 'Clubs, cafes, studios, open air.', tone: 'linear-gradient(140deg,#0ea5a4,#2a63ee)', who: PEOPLE.find((p) => p.type === 'Venue') },
  { icon: Briefcase, name: 'Organisers', line: 'Promoters, agencies, planners.', tone: 'linear-gradient(140deg,#f59e0b,#ef4444)', who: PEOPLE.find((p) => p.type === 'Buyer') },
  { icon: SlidersHorizontal, name: 'Crew', line: 'Sound, light, stage and video.', tone: 'linear-gradient(140deg,#7c3aed,#ec4899)', who: PEOPLE.find((p) => p.type === 'Crew') },
  { icon: GraduationCap, name: 'Institutions', line: 'Academies, labels, collectives.', tone: 'linear-gradient(140deg,#ec4899,#f97316)', who: PEOPLE.find((p) => p.type === 'Institution') },
];
function Roles({ onJoin }) {
  const rail = useRef(null);
  const by = (d) => rail.current?.scrollBy({ left: d * 420, behavior: 'smooth' });
  return (
    <section className="ap-roles" id="roles">
      <Reveal className="ap-head dark"><span className="ap-kicker">Who it&rsquo;s for</span><h2>Every seat at the table.</h2><p>Five kinds of people, one shared network.</p></Reveal>
      <div className="ap-rail" ref={rail}>
        {ROLES.map((r, i) => (
          <motion.button key={r.name} className="ap-tile" style={{ background: r.tone }} onClick={onJoin}
            initial={{ opacity: 0, x: 60 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.7, delay: i * 0.07, ease }} whileHover={{ y: -6 }}>
            <r.icon size={34} strokeWidth={1.5} />
            <h3>{r.name}</h3>
            <p>{r.line}</p>
            {r.who && <span className="ap-tile-who"><i style={{ background: r.who.heroGradient || avatarColor(r.who.name) }}>{initials(r.who.name)}</i><b>{r.who.name}</b><em>{r.who.city}</em></span>}
            <span className="ap-tile-go"><Plus size={18} /></span>
          </motion.button>
        ))}
      </div>
      <div className="ap-rail-nav"><button onClick={() => by(-1)} aria-label="Previous"><ChevronLeft size={20} /></button><button onClick={() => by(1)} aria-label="Next"><ChevronRight size={20} /></button></div>
    </section>
  );
}

/* ============================================================
   Numbers
   ============================================================ */
function Stat({ value, suffix, label }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const n = useCountUp(value, inView);
  return <div className="ap-stat" ref={ref}><b>{n.toLocaleString('en-IN')}{suffix}</b><span>{label}</span></div>;
}
function Stats() {
  return (
    <section className="ap-stats">
      <Reveal className="ap-stats-grid">
        <Stat value={2400} suffix="+" label="Artists and crew" />
        <Stat value={120} suffix="+" label="Venues and spaces" />
        <Stat value={8} suffix="" label="Launch cities" />
        <Stat value={10} suffix="k+" label="Gigs matched" />
      </Reveal>
      <p className="ap-fine">Illustrative early-traction targets. Demo figures, not verified metrics.</p>
    </section>
  );
}

/* ============================================================
   Match demo (interactive)
   ============================================================ */
const ROLE_OPTIONS = ['Performer', 'Venue', 'Crew', 'Buyer', 'Institution'];
const ROLE_COPY = { Performer: 'artists and instrumentalists', Venue: 'venues and spaces', Crew: 'sound, light and stage crew', Buyer: 'organisers, festivals and brands', Institution: 'schools, labels and agencies' };
function MatchWidget() {
  const [role, setRole] = useState('Performer');
  const [city, setCity] = useState('Mumbai');
  const [result, setResult] = useState(null);
  const calculate = () => {
    const seed = `${role}|${city}`;
    setResult({
      score: Math.min(98, 72 + (hashStr(seed) % 27)), role, city, key: Date.now(),
      factors: [
        { label: 'Role fit', value: Math.min(99, 70 + (hashStr(`role${role}`) % 30)) },
        { label: 'City demand', value: Math.min(99, 65 + (hashStr(`city${city}`) % 35)) },
        { label: 'Network momentum', value: Math.min(99, 58 + (hashStr(`net${seed}`) % 42)) },
      ],
    });
  };
  const shown = useCountUp(result ? result.score : 0, !!result, 1200);
  return (
    <section className="ap-match" id="match">
      <Reveal className="ap-head"><span className="ap-kicker">Try it</span><h2>See your match score.</h2><p>Tell us who you are and where you work. We show how the industry would find you.</p></Reveal>
      <Reveal className="ap-match-card" delay={0.1}>
        <div className="ap-seg" role="radiogroup" aria-label="I am a">
          {ROLE_OPTIONS.map((r) => <button key={r} role="radio" aria-checked={role === r} className={role === r ? 'on' : ''} onClick={() => { setRole(r); setResult(null); }}>{r}</button>)}
        </div>
        <label className="ap-sel"><MapPin size={16} />
          <select value={city} onChange={(e) => { setCity(e.target.value); setResult(null); }} aria-label="City">{CITIES.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <button className="ap-btn" onClick={calculate}><Sparkles size={16} /> Calculate</button>
        <AnimatePresence mode="wait">
          {result && (
            <motion.div key={result.key} className="ap-result" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease }}>
              <div className="ap-score"><b>{shown}<small>%</small></b><span>match for {ROLE_COPY[result.role]} in {result.city}</span></div>
              <div className="ap-factors">
                {result.factors.map((f, i) => (
                  <div key={f.label}><div className="fl"><span>{f.label}</span><b>{f.value}%</b></div><div className="bar"><motion.i initial={{ width: 0 }} animate={{ width: `${f.value}%` }} transition={{ duration: 0.9, delay: 0.1 + i * 0.12, ease }} /></div></div>
                ))}
              </div>
              <p className="ap-fine">Illustrative scores. The live engine learns from real gigs and ratings.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </Reveal>
    </section>
  );
}

/* ============================================================
   Stories
   ============================================================ */
const QUOTES = [
  {
    quote: 'I stopped losing gig leads to WhatsApp chaos. On Strings every enquiry lands on my profile with a budget and a date attached — I booked three sessions in my first week.',
    name: 'Meera Iyer', meta: 'Vocalist · Mumbai',
  },
  {
    quote: 'We filled a full December crew roster in four days. The match scores pointed us at engineers we would never have found through our usual networks.',
    name: 'Depot 48', meta: 'Venue · Delhi-NCR',
  },
  {
    quote: 'The AI match scores are scary accurate. I get session briefs that actually fit my style instead of wading through group-chat noise.',
    name: 'Anjali Kulkarni', meta: 'Session guitarist · Pune',
  },
];
function Testimonials() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % QUOTES.length), 6500);
    return () => clearInterval(t);
  }, []);
  const q = QUOTES[idx];
  const person = PEOPLE.find((p) => p.name === q.name);
  return (
    <section className="ap-quotes">
      <AnimatePresence mode="wait">
        <motion.figure key={idx} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.55, ease }}>
          <blockquote>&ldquo;{q.quote}&rdquo;</blockquote>
          <figcaption><i style={{ background: person?.heroGradient || avatarColor(q.name) }}>{initials(q.name)}</i><b>{q.name}</b><span>{q.meta}</span></figcaption>
        </motion.figure>
      </AnimatePresence>
      <div className="ap-dots">{QUOTES.map((_, i) => <button key={i} className={i === idx ? 'on' : ''} onClick={() => setIdx(i)} aria-label={`Story ${i + 1}`} />)}</div>
    </section>
  );
}

const FAQS = [
  {
    q: 'Is Strings free?',
    a: 'Yes — creating a profile, discovering people and getting match scores is free throughout Phase 1. Down the line we\'ll introduce optional paid tiers for promoters running high-volume hiring and for advanced analytics, but the core network will always be free for working artists and crew.',
  },
  {
    q: 'Who is Strings for?',
    a: 'Everyone who makes live music happen in India: performers and bands, venues and studios, talent buyers (festivals, organisers, brands), crew and technical professionals, plus institutions and agencies like schools, societies and management firms.',
  },
  {
    q: 'How is this different from Instagram or WhatsApp?',
    a: 'Instagram is for audiences; WhatsApp is for chaos. Strings is for work: verified profiles with real skills and gig history, structured briefs with budgets and dates, AI match scores so the right people see the right opportunities, and outreach that arrives spam-free — no broadcast groups, no buried leads.',
  },
  {
    q: 'What does Phase 1 include?',
    a: 'Three things: the Network (verified profiles and connections), Discovery & collab (the gig board with AI match scores), and the Newsroom (a daily briefing on the Indian music industry). That\'s the foundation everything else — bookings, payments, ticketing — will be built on.',
  },
  {
    q: 'When do bookings go live?',
    a: 'Bookings and payments roll out in phases after the Phase 1 launch, city by city. Early members get priority access when their city opens up — which is why building your profile now matters: the match engine is already learning who you are.',
  },
];
function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="ap-faq" id="faq">
      <Reveal className="ap-head"><h2>Questions, answered.</h2></Reveal>
      <div className="ap-faq-list">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div className={`ap-q${isOpen ? ' open' : ''}`} key={f.q}>
              <button onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen}>{f.q}<span><Plus size={20} /></span></button>
              <AnimatePresence initial={false}>
                {isOpen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease }}><p>{f.a}</p></motion.div>}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BigCta({ onJoin }) {
  return (
    <section className="ap-cta">
      <Reveal className="ap-cta-card">
        <h2>Your next gig is already looking for you.</h2>
        <p>Join the network that is tying India&rsquo;s music industry together.</p>
        <button className="ap-btn light" onClick={onJoin}>Create your profile <ArrowRight size={18} /></button>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="ap-foot">
      <div><Logo /><small>&copy; 2026 Strings. Free during Phase 1.</small></div>
      <div className="ap-foot-links"><Link to="/about">About</Link><Link to="/support">Support</Link></div>
    </footer>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState('signin');
  const onJoin = () => { setAuthTab('signup'); setAuthOpen(true); };
  const onLogin = () => { setAuthTab('signin'); setAuthOpen(true); };
  const onDemo = () => { if (user) navigate('/home'); else onLogin(); };
  return (
    <div className="ap">
      <Nav onJoin={onJoin} onLogin={onLogin} onDemo={onDemo} />
      <Hero onJoin={onJoin} onDemo={onDemo} />
      <StoryScroll />
      <Roles onJoin={onJoin} />
      <Stats />
      <MatchWidget />
      <Testimonials />
      <Faq />
      <BigCta onJoin={onJoin} />
      <Footer />
      <AuthModal open={authOpen} initialTab={authTab} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
