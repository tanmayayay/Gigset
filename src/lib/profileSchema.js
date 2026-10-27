import { Mic2, Building2, CalendarRange, Wrench, GraduationCap } from 'lucide-react';

/* ---------------------------------------------------------------------------
   Role-specific profile fields.

   Each role (stakeholder type) has its own sections and fields. Answers are
   saved in the profile's flat `detail` object, keyed by the field key. When a
   person switches role the form switches to that role's fields; answers for
   the other roles are kept in `detail`, so switching back restores them.

   Field types: text · longtext · select · tags · number · toggle · url
   `glance: true` surfaces the answer as a quick fact in the profile header.
--------------------------------------------------------------------------- */

export const ROLE_META = {
  PERFORMER: {
    label: 'Artist', icon: Mic2, bookable: true, tint: '#5B86F5',
    blurb: 'Singers, bands, DJs, instrumentalists and producers.',
    headlineHint: 'e.g. Indie-folk singer-songwriter · Mumbai',
    bioHint: 'Tell bookers who you are, your sound and the kind of shows you do.',
  },
  VENUE: {
    label: 'Venue', icon: Building2, bookable: true, tint: '#2DD4BF',
    blurb: 'Clubs, cafes, auditoriums, studios and open-air spaces.',
    headlineHint: 'e.g. 300-cap live music bar in Bandra',
    bioHint: 'Describe the space, the crowd and what makes a night here special.',
  },
  BUYER: {
    label: 'Event organiser', icon: CalendarRange, bookable: false, tint: '#F59E0B',
    blurb: 'Promoters, agencies, wedding and corporate planners, festivals.',
    headlineHint: 'e.g. Festival promoter · 12 events a year',
    bioHint: 'Say what you organise, who comes, and what you look for in talent.',
  },
  CREW: {
    label: 'Crew', icon: Wrench, bookable: true, tint: '#A78BFA',
    blurb: 'Sound, lights, stage, photo, video and production crew.',
    headlineHint: 'e.g. FOH sound engineer · festival ready',
    bioHint: 'Share the kind of shows you crew, your gear and how you work.',
  },
  INSTITUTION: {
    label: 'Institution', icon: GraduationCap, bookable: false, tint: '#F472B6',
    blurb: 'Schools, academies, labels, media houses and collectives.',
    headlineHint: 'e.g. Music academy & recording studio · Pune',
    bioHint: 'What does your institution do, and who is it for?',
  },
};
export const ROLE_ORDER = ['PERFORMER', 'VENUE', 'BUYER', 'CREW', 'INSTITUTION'];
export const roleLabel = (t) => ROLE_META[t]?.label || t || 'Member';
export const metaFor = (t) => ROLE_META[t] || ROLE_META.PERFORMER;

export const INSTRUMENTS = ['Vocals', 'Guitar', 'Keys', 'Tabla', 'Drums', 'Bass', 'Violin', 'Sitar', 'Flute', 'Saxophone', 'Decks'];
export const GENRES = ['Bollywood', 'Indie', 'Hip-hop', 'Rock', 'Electronic', 'Classical', 'Carnatic', 'Hindustani', 'Folk', 'Sufi', 'Jazz', 'Pop', 'Metal', 'Ghazal', 'Punjabi', 'Devotional'];
const LANGUAGES = ['Hindi', 'English', 'Punjabi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Malayalam', 'Kannada', 'Gujarati', 'Urdu'];
const CITIES_HINT = ['Mumbai', 'Delhi-NCR', 'Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Goa'];

const link = (key, label, placeholder) => ({ key, label, type: 'url', placeholder });

/* Sections shown (and edited) for every role. */
export const COMMON_SECTIONS = [
  {
    title: 'Languages & reach',
    fields: [{ key: 'languages', label: 'Languages', type: 'tags', suggestions: LANGUAGES }],
  },
];

export const ROLE_SECTIONS = {
  PERFORMER: [
    {
      title: 'Your craft',
      fields: [
        { key: 'artistType', label: 'I perform as', type: 'select', glance: true, options: ['Solo artist', 'Band', 'DJ', 'Singer-songwriter', 'Instrumentalist', 'Producer', 'Classical / folk ensemble', 'Rapper / MC'] },
        { key: 'genres', label: 'Genres', type: 'tags', suggestions: GENRES, glance: true },
        { key: 'instruments', label: 'Instruments', type: 'tags', suggestions: INSTRUMENTS },
        { key: 'experienceYears', label: 'Years performing', type: 'number', glance: true, suffix: 'yrs' },
        { key: 'bandSize', label: 'Group size', type: 'number', placeholder: 'e.g. 4' },
      ],
    },
    {
      title: 'Booking details',
      fields: [
        { key: 'ratePerShow', label: 'Typical fee per show', type: 'text', glance: true, placeholder: 'e.g. ₹25k–60k' },
        { key: 'setLength', label: 'Set length', type: 'text', placeholder: 'e.g. 60–90 min' },
        { key: 'travelCities', label: 'Willing to travel to', type: 'tags', suggestions: CITIES_HINT },
        { key: 'ownEquipment', label: 'Brings own sound / backline', type: 'toggle' },
        { key: 'rider', label: 'Technical rider / requirements', type: 'longtext', placeholder: 'Stage size, monitors, green room, hospitality…' },
      ],
    },
    {
      title: 'Track record',
      fields: [
        { key: 'highlights', label: 'Notable shows & collaborations', type: 'longtext', placeholder: 'Festivals, venues, labels, press…' },
        { key: 'availableFor', label: 'Open to', type: 'tags', suggestions: ['Club nights', 'Weddings', 'Corporate events', 'Festivals', 'Studio sessions', 'Collaborations', 'Teaching'] },
      ],
    },
    {
      title: 'Links',
      links: true,
      fields: [
        link('featuredUrl', 'Featured track or video', 'https://youtube.com/… or Spotify / SoundCloud'),
        link('sample1Url', 'Sample 2 (plays on your profile)', 'YouTube, Spotify or SoundCloud link'),
        link('sample2Url', 'Sample 3', 'YouTube, Spotify or SoundCloud link'),
        link('sample3Url', 'Sample 4', 'YouTube, Spotify or SoundCloud link'),
        link('spotifyUrl', 'Spotify', 'https://open.spotify.com/artist/…'),
        link('youtubeUrl', 'YouTube', 'https://youtube.com/@…'),
        link('instagramUrl', 'Instagram', 'https://instagram.com/…'),
        link('websiteUrl', 'Website / press kit', 'https://…'),
      ],
    },
  ],

  VENUE: [
    {
      title: 'The space',
      fields: [
        { key: 'venueType', label: 'Venue type', type: 'select', glance: true, options: ['Bar / pub', 'Club', 'Cafe', 'Auditorium', 'Open-air / lawn', 'Restaurant', 'Studio', 'Banquet / hotel', 'Arts centre'] },
        { key: 'capacity', label: 'Capacity', type: 'number', glance: true, suffix: 'people' },
        { key: 'address', label: 'Address', type: 'text', placeholder: 'Street, area' },
        { key: 'area', label: 'Neighbourhood', type: 'text', placeholder: 'e.g. Bandra West' },
        { key: 'genresHosted', label: 'Music we host', type: 'tags', suggestions: GENRES, glance: true },
      ],
    },
    {
      title: 'Stage & sound',
      fields: [
        { key: 'stageSize', label: 'Stage size', type: 'text', placeholder: 'e.g. 20 × 12 ft' },
        { key: 'soundSystem', label: 'Sound system', type: 'text', placeholder: 'e.g. L-Acoustics, 24-ch mixer' },
        { key: 'backline', label: 'Backline provided', type: 'tags', suggestions: ['Drums', 'Guitar amp', 'Bass amp', 'Keyboard', 'DJ decks', 'Monitors'] },
        { key: 'inHouseCrew', label: 'In-house sound / light crew', type: 'toggle' },
        { key: 'amenities', label: 'Amenities', type: 'tags', suggestions: ['Green room', 'Parking', 'Air-conditioned', 'Food & drinks', 'Accessible', 'Outdoor area'] },
      ],
    },
    {
      title: 'Booking details',
      fields: [
        { key: 'openDays', label: 'Live music days', type: 'tags', suggestions: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
        { key: 'dealType', label: 'Typical deal', type: 'text', glance: true, placeholder: 'e.g. Fixed fee ₹15k–40k / door split' },
        { key: 'bookingNotes', label: 'What we look for', type: 'longtext', placeholder: 'Kind of acts, how to pitch, lead time…' },
      ],
    },
    {
      title: 'Links',
      links: true,
      fields: [
        link('websiteUrl', 'Website', 'https://…'),
        link('instagramUrl', 'Instagram', 'https://instagram.com/…'),
        link('mapsUrl', 'Google Maps', 'https://maps.google.com/…'),
      ],
    },
  ],

  BUYER: [
    {
      title: 'Your events',
      fields: [
        { key: 'organiserType', label: 'I am a', type: 'select', glance: true, options: ['Event promoter', 'Booking agency', 'Wedding planner', 'Corporate events', 'Festival organiser', 'Club / venue programmer', 'Brand / marketing team', 'College fest committee'] },
        { key: 'organisation', label: 'Company / brand', type: 'text', glance: true },
        { key: 'eventTypes', label: 'Events I organise', type: 'tags', suggestions: ['Concerts', 'Club nights', 'Weddings', 'Corporate shows', 'Festivals', 'College fests', 'Private parties', 'Brand activations'] },
        { key: 'eventsPerYear', label: 'Events per year', type: 'number', suffix: 'a year' },
        { key: 'typicalAudience', label: 'Typical audience size', type: 'text', placeholder: 'e.g. 200–2,000' },
      ],
    },
    {
      title: 'What you book',
      fields: [
        { key: 'lookingFor', label: 'Looking for', type: 'tags', suggestions: ['Singers', 'Bands', 'DJs', 'Classical artists', 'Sound crew', 'Light crew', 'Photographers', 'Stage managers'] },
        { key: 'genres', label: 'Genres I book', type: 'tags', suggestions: GENRES },
        { key: 'citiesServed', label: 'Cities I work in', type: 'tags', suggestions: CITIES_HINT, glance: true },
        { key: 'typicalBudget', label: 'Typical budget per act', type: 'text', glance: true, placeholder: 'e.g. ₹30k–1.5L' },
        { key: 'bookingProcess', label: 'How I work with artists', type: 'longtext', placeholder: 'Lead time, how you pay, what you need from an artist…' },
      ],
    },
    {
      title: 'Links',
      links: true,
      fields: [
        link('websiteUrl', 'Website', 'https://…'),
        link('instagramUrl', 'Instagram', 'https://instagram.com/…'),
        link('portfolioUrl', 'Past events / portfolio', 'https://…'),
      ],
    },
  ],

  CREW: [
    {
      title: 'Your craft',
      fields: [
        { key: 'crewRole', label: 'What I do', type: 'select', glance: true, options: ['Sound engineer', 'Lighting designer', 'Stage manager', 'Backline tech', 'Photographer', 'Videographer', 'Production manager', 'Sound designer / studio engineer', 'Roadie / loader'] },
        { key: 'skills', label: 'Skills', type: 'tags', suggestions: ['FOH', 'Monitors', 'Live mixing', 'Mixing & mastering', 'DMX / lighting control', 'Rigging', 'Stage plotting', 'Livestream', 'Editing'] },
        { key: 'experienceYears', label: 'Years of experience', type: 'number', glance: true, suffix: 'yrs' },
        { key: 'equipmentOwned', label: 'Gear I own', type: 'tags', suggestions: ['Mixing console', 'Speakers', 'Mics', 'Moving heads', 'Cameras', 'Drones'] },
      ],
    },
    {
      title: 'Booking details',
      fields: [
        { key: 'dayRate', label: 'Day rate', type: 'text', glance: true, placeholder: 'e.g. ₹6k–12k' },
        { key: 'travelCities', label: 'Willing to travel to', type: 'tags', suggestions: CITIES_HINT },
        { key: 'certifications', label: 'Certifications & training', type: 'longtext' },
        { key: 'highlights', label: 'Shows & festivals worked', type: 'longtext', placeholder: 'Festivals, tours, venues…' },
      ],
    },
    {
      title: 'Links',
      links: true,
      fields: [
        link('portfolioUrl', 'Portfolio / reel', 'https://…'),
        link('instagramUrl', 'Instagram', 'https://instagram.com/…'),
        link('websiteUrl', 'Website', 'https://…'),
      ],
    },
  ],

  INSTITUTION: [
    {
      title: 'About the institution',
      fields: [
        { key: 'institutionType', label: 'Type', type: 'select', glance: true, options: ['Music school / academy', 'Record label', 'Recording studio', 'Media house / publication', 'Artist collective', 'Rights society', 'College department', 'Non-profit'] },
        { key: 'founded', label: 'Founded', type: 'number', glance: true, placeholder: 'e.g. 2012' },
        { key: 'address', label: 'Address', type: 'text' },
        { key: 'teamSize', label: 'Team size', type: 'number', suffix: 'people' },
      ],
    },
    {
      title: 'What you offer',
      fields: [
        { key: 'offerings', label: 'Programmes & services', type: 'tags', suggestions: ['Courses', 'Workshops', 'Recording', 'Distribution', 'Artist development', 'Publishing', 'Events', 'Press & media'] },
        { key: 'genres', label: 'Focus genres', type: 'tags', suggestions: GENRES },
        { key: 'audience', label: 'Who it is for', type: 'text', placeholder: 'e.g. Beginners to professionals, ages 8+' },
        { key: 'opportunities', label: 'Opportunities & partnerships', type: 'longtext', placeholder: 'Scholarships, residencies, signing, collabs…' },
      ],
    },
    {
      title: 'Links',
      links: true,
      fields: [
        link('websiteUrl', 'Website', 'https://…'),
        link('instagramUrl', 'Instagram', 'https://instagram.com/…'),
        link('youtubeUrl', 'YouTube', 'https://youtube.com/@…'),
      ],
    },
  ],
};

export const sectionsFor = (role) => [...(ROLE_SECTIONS[role] || ROLE_SECTIONS.PERFORMER), ...COMMON_SECTIONS];
const allFields = (role) => sectionsFor(role).flatMap((s) => s.fields);

export const isFilled = (v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== '' && v !== false);

/** Human text for a stored answer. */
export function fmtValue(field, v) {
  if (Array.isArray(v)) return v.join(' · ');
  if (field.type === 'toggle') return v ? 'Yes' : 'No';
  if (field.type === 'number') return field.suffix ? `${v} ${field.suffix}` : String(v);
  return String(v);
}

/** Quick facts shown in the profile header (max 4, in schema order). */
export function glanceFacts(role, data = {}) {
  const out = [];
  for (const f of allFields(role)) {
    if (!f.glance || !isFilled(data[f.key])) continue;
    const v = data[f.key];
    out.push({ key: f.key, label: f.label, value: Array.isArray(v) ? v.slice(0, 3).join(' · ') : fmtValue(f, v) });
    if (out.length === 4) break;
  }
  return out;
}

/** One-line headline: the saved headline, or the older onboarding "role" answer. */
export function headlineOf(person) {
  const d = person?.detail?.data || {};
  return d.headline || d.role || '';
}

/** Profile-completeness checklist for the owner (all real checks). */
export function completeness(person, { postsCount = 0 } = {}) {
  const role = person.stakeholderType;
  const d = person.detail?.data || {};
  const roleKeys = allFields(role).filter((f) => f.type !== 'url').map((f) => f.key);
  const filled = roleKeys.filter((k) => isFilled(d[k])).length;
  const links = allFields(role).filter((f) => f.type === 'url' && isFilled(d[f.key])).length;
  const checks = [
    { label: 'Add a profile photo', done: !!person.avatarUrl },
    { label: 'Write a headline', done: !!headlineOf(person) },
    { label: 'Write your bio', done: (person.bio || '').trim().length >= 40 },
    { label: 'Set your city', done: !!person.city },
    { label: `Fill in your ${roleLabel(role).toLowerCase()} details`, done: filled >= 4 },
    { label: 'Add a link (Instagram, Spotify, website)', done: links >= 1 },
    { label: 'Publish your first post', done: postsCount > 0 },
    { label: 'Get verified', done: person.verificationStatus === 'VERIFIED' },
  ];
  const pct = Math.round((checks.filter((c) => c.done).length / checks.length) * 100);
  return { checks, pct };
}
