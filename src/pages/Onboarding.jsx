import '../auth.css';
import { useEffect, useState } from 'react';
import { birthError } from '../lib/age';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Quote,
  Mic, Landmark, Briefcase, SlidersHorizontal, GraduationCap,
} from 'lucide-react';
import { Logo } from '../components/ui';
import { ONBOARD_TYPES, INTEREST_TAGS, CITIES } from '../data/demo';
import { useStore } from '../store/store';
import { Profiles } from '../lib/api';

/* Onboarding display name -> backend StakeholderType enum */
const TYPE_MAP = {
  Performer: 'PERFORMER',
  Venue: 'VENUE',
  Buyer: 'BUYER',
  Crew: 'CREW',
  Institution: 'INSTITUTION',
};

/* Stakeholder type → lucide icon (never the data-file emoji) */
const TYPE_ICONS = {
  Performer: Mic,
  Venue: Landmark,
  Buyer: Briefcase,
  Crew: SlidersHorizontal,
  Institution: GraduationCap,
};

const TITLES = ['Choose your stakeholder type', 'Build your profile', 'What are you here for?'];

const SUBS = [
  'Every Strings profile starts here — this decides which fields and filters apply to you.',
  'Tell us who you are — this is how bookers and collaborators will see you.',
  'Pick a few interest tags — these shape your Home and Gighub feeds.',
];

const TESTIMONIALS = [
  {
    quote: 'Strings got us our first paying gig within a week of signing up — the match was exactly our sound.',
    name: 'Priya Sharma', role: 'Vocalist · Mumbai',
  },
  {
    quote: 'Booking talent used to take weeks of phone calls. Now we post a gig and get verified profiles in hours.',
    name: 'Arjun Mehta', role: 'Festival organiser · Delhi-NCR',
  },
  {
    quote: 'The crew network alone is worth it — I found a lighting team for a 2,000-person show in a single day.',
    name: 'Devansh Rao', role: 'Venue manager · Bengaluru',
  },
];

const STATS = [
  { value: '2,400+', label: 'artists onboard' },
  { value: '120+', label: 'venues' },
  { value: '8', label: 'launch cities' },
];

const NEXT_STEPS = [
  { title: 'Verify your profile', desc: 'A quick check that builds trust with bookers and collaborators.' },
  { title: 'Get AI-matched gigs', desc: 'Your type and interest tags are matched to the right opportunities automatically.' },
  { title: 'Get booked & paid', desc: 'Accept gigs, do great work, and get paid through Strings.' },
];

/* Deterministic equalizer bars for the brand panel */
function EqBars() {
  const bars = Array.from({ length: 42 }, (_, i) => {
    const h = 24 + Math.round(40 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.55)));
    return { h, d: (i % 7) * 0.22 };
  });
  return (
    <div className="onb-eq" aria-hidden="true">
      {bars.map((b, i) => (
        <i key={i} style={{ height: b.h, animationDelay: `${b.d}s` }} />
      ))}
    </div>
  );
}

export default function Onboarding() {
  const { userId, refreshProfile, pushToast, authLoading, session } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [type, setType] = useState('Performer');
  const [name, setName] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [role, setRole] = useState('');
  const [birth, setBirth] = useState('');
  const [tags, setTags] = useState([]);
  const [busy, setBusy] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);

  /* Rotating testimonials on the brand panel */
  useEffect(() => {
    const id = setInterval(() => setQuoteIdx((q) => (q + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(id);
  }, []);

  const go = (n) => {
    if (n === step) return;
    setDir(n > step ? 1 : -1);
    setStep(n);
  };

  const toggleTag = (t) =>
    setTags((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  const finish = async () => {
    if (!userId || busy) return;
    if (!birth || birthError(birth)) { setStep(2); pushToast(birthError(birth) || 'Please add your birth date to continue.', 'error'); return; }
    setBusy(true);
    try {
      await Profiles.update(userId, {
        name: name.trim() || 'Strings user',
        stakeholderType: TYPE_MAP[type] ?? 'PERFORMER',
        city,
        bio: role.trim() ? `${role.trim()} · ${city}` : null,
        detail: { role: role.trim() || type, interests: tags },
        birthDate: birth,
      });
      await refreshProfile();
      pushToast('Welcome to Strings — your profile is live.');
      navigate('/home');
    } catch (e) {
      pushToast(e.message || 'Could not save your profile.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const q = TESTIMONIALS[quoteIdx];

  // Onboarding requires a signed-in user — the AuthModal sends new signups here.
  if (!authLoading && !session) return <Navigate to="/" replace />;

  return (
    <div className="onb-root">
      {/* ===== Brand panel (desktop) ===== */}
      <aside className="onb-brand">
        <div className="onb-orb onb-orb-1" aria-hidden="true" />
        <div className="onb-orb onb-orb-2" aria-hidden="true" />
        <div className="onb-orb onb-orb-3" aria-hidden="true" />
        <div className="onb-brand-inner">
          <div className="onb-brand-top">
            <Logo light size={28} />
          </div>
          <div>
            <h1>Tying the music industry together.</h1>
            <p className="onb-brand-pitch">
              One network for performers, venues, buyers, crew and institutions —
              gigs, discovery and payments in one place.
            </p>
            <div className="onb-quote">
              <AnimatePresence mode="wait">
                <motion.blockquote
                  key={quoteIdx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  <p><Quote size={14} style={{ marginRight: 6, verticalAlign: -1, opacity: .7 }} />{q.quote}</p>
                  <footer>{q.name} — {q.role}</footer>
                </motion.blockquote>
              </AnimatePresence>
              <div className="onb-quote-dots">
                {TESTIMONIALS.map((_, i) => (
                  <button
                    key={i}
                    tabIndex={-1}
                    className={i === quoteIdx ? 'on' : ''}
                    onClick={() => setQuoteIdx(i)}
                    aria-label={`Show testimonial ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="onb-stats">
              {STATS.map((s) => (
                <div className="onb-stat" key={s.label}>
                  <b>{s.value}</b>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
            <EqBars />
          </div>
        </div>
      </aside>

      {/* ===== Slim gradient header (mobile) ===== */}
      <header className="onb-mobile-head">
        <Logo light size={24} />
        <p>Tying the music industry together.</p>
      </header>

      {/* ===== Form pane ===== */}
      <main className="onb-form">
        <div className="onb-form-inner">
          <div className="onb-form-top">
            <Link to="/" className="onb-logo-link" style={{ display: 'inline-flex' }} aria-label="Back to landing">
              <Logo size={26} />
            </Link>
            <span className="onb-step-label">Step {step} of 3</span>
          </div>

          <div className="onb-progress" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div className="onb-seg" key={i}>
                <motion.div
                  className="onb-seg-fill"
                  initial={false}
                  animate={{ width: step > i ? '100%' : '0%' }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            ))}
          </div>

          <h2 className="onb-title">{TITLES[step - 1]}</h2>
          <p className="onb-sub">{SUBS[step - 1]}</p>

          <div className="onb-step-body">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ x: 40 * dir, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -40 * dir, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {step === 1 && (
                  <div className="onb-type-grid" role="radiogroup" aria-label="Stakeholder type">
                    {ONBOARD_TYPES.map((t) => {
                      const Icon = TYPE_ICONS[t.name] || Mic;
                      const selected = type === t.name;
                      return (
                        <motion.button
                          key={t.name}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          whileTap={{ scale: 0.97 }}
                          className={`onb-type-card${selected ? ' selected' : ''}`}
                          onClick={() => setType(t.name)}
                        >
                          {selected && (
                            <motion.span
                              layoutId="onb-type-ring"
                              className="onb-type-ring"
                              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                            />
                          )}
                          <span className="onb-type-ico"><Icon size={20} strokeWidth={2.1} /></span>
                          <b>{t.name}</b>
                          <span>{t.desc}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {step === 2 && (
                  <div className="onb-fields">
                    <div className="field">
                      <label htmlFor="onb-name">Your name</label>
                      <input
                        id="onb-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Meera Iyer"
                        autoComplete="name"
                      />
                    </div>
                    <div className="onb-field-row">
                      <div className="field">
                        <label htmlFor="onb-city">City</label>
                        <div className="select-wrap">
                          <select
                            id="onb-city"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                          >
                            {CITIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="field">
                        <label htmlFor="onb-role">What do you do?</label>
                        <input
                          id="onb-role"
                          type="text"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          placeholder="e.g. Vocalist"
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="onb-birth">Date of birth</label>
                      <input
                        id="onb-birth"
                        type="date"
                        value={birth}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setBirth(e.target.value)}
                        autoComplete="bday"
                      />
                      <small style={{ color: birthError(birth) ? 'var(--danger, #ff6b6b)' : 'var(--text-faint)' }}>
                        {birthError(birth) || 'Never shown on your profile. We use it to keep what you see suited to your age.'}
                      </small>
                    </div>
                    <p className="field-hint">
                      This is how bookers and collaborators will see you. You can edit it anytime from your profile.
                    </p>
                  </div>
                )}

                {step === 3 && (
                  <>
                    <div className="onb-chips" role="group" aria-label="Interest tags">
                      {INTEREST_TAGS.map((t) => {
                        const active = tags.includes(t);
                        return (
                          <motion.button
                            key={t}
                            type="button"
                            layout
                            whileTap={{ scale: 0.93 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className={`onb-chip${active ? ' on' : ''}`}
                            aria-pressed={active}
                            onClick={() => toggleTag(t)}
                          >
                            {active && <Check size={14} strokeWidth={3} />}
                            {t}
                          </motion.button>
                        );
                      })}
                    </div>
                    <div className="onb-next">
                      <h3>What happens next</h3>
                      {NEXT_STEPS.map((s, i) => (
                        <div className="onb-next-step" key={s.title}>
                          <span className="onb-next-num">{i + 1}</span>
                          <div>
                            <b>{s.title}</b>
                            <p>{s.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="onb-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => go(step - 1)}
              style={{ visibility: step === 1 ? 'hidden' : 'visible' }}
            >
              <ArrowLeft size={14} /> Back
            </button>
            {step < 3 ? (
              <button type="button" className="btn btn-blue btn-sm" onClick={() => go(step + 1)}>
                Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button type="button" className="btn btn-blue btn-sm" onClick={finish} disabled={busy}>
                {busy ? 'Saving…' : 'Enter Strings'} <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
