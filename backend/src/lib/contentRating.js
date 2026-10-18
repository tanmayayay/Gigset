// Age-aware content rating for news (and anything else we may filter later).
//
// Every story gets one of three ratings when it is collected:
//   family     suitable for everyone
//   sensitive  strong themes in a news context (abuse, violence, overdoses, strong language)
//   mature     sexual, nude or suggestive material
// Each person gets a "level" from their birth date (and, for adults, an opt-in preference):
//   gentle    13-15   family only
//   teen      16-17   family + sensitive
//   standard  18+ (default, and anyone who has not said their age)   family + sensitive
//   open      18+ who chose "show everything"                         all three
// Keyword rules are a first line of defence, not a guarantee: they will miss some stories and
// over-block a few. `node scripts/audit-news.mjs` lists what each rating catches so the lists can be tuned.

export const MIN_AGE = 13;

const MATURE = new RegExp(
  '\\b(' + [
    'porn\\w*', 'nsfw', 'xxx', 'nude', 'nudes', 'naked', 'topless', 'nip slip', 'sex tape', 'sextape',
    'onlyfans', 'erotic\\w*', 'fetish\\w*', 'orgy', 'striptease', 'strip club', 'stripper', 'lingerie',
    'bikini', 'cleavage', 'braless', 'see-?through', 'wardrobe malfunction', 'sizzl\\w+', 'steamy',
    'sensual\\w*', 'seduc\\w+', 'sex scene', 'intimate scene', 'bold (photoshoot|avatar|look|pics?)',
    'oops moment', 'hot (photoshoot|pics?|photos?|look|avatar)', 'adult (film|content|star|entertainment)',
    'explicit (video|photos?|images?|content|lyrics?)', 'leaked (nudes?|photos?|video|mms)', 'mms (leak|scandal|video)',
  ].join('|') + ')\\b',
  'i',
);

const SENSITIVE = new RegExp(
  '\\b(' + [
    'rape\\w*', 'raped', 'sexual(ly)? (assault\\w*|abuse\\w*|harass\\w*|misconduct|violence)', 'molest\\w*', 'predator',
    'suicid\\w*', 'self-?harm', 'overdos\\w*', 'found dead', 'murder\\w*', 'killed', 'shot dead', 'stabb\\w*',
    'mass shooting', 'shooting (incident|spree|victims?)', 'massacre', 'terror(ism|ist|ists|ist attacks?|ised)\\b|terror attacks?', 'domestic (violence|abuse)', 'abus\\w+', 'gore', 'graphic (violence|content)',
    'drugs?', 'cocaine', 'heroin', 'narcotic\\w*', 'rehab', 'addict\\w*', 'alcoholi\\w+', 'arrested',
    'fuck\\w*', 'shit\\w*', 'bitch\\w*', 'bastard', 'asshole', 'motherfuck\\w*',
  ].join('|') + ')\\b',
  'i',
);

/** The word that triggered a non-family rating (for tuning with scripts/audit-news.mjs). */
export function matchedTerm(text) {
  const t = String(text || '');
  return (t.match(MATURE) || t.match(SENSITIVE) || [])[0] || '';
}

export function rateText(text) {
  const t = String(text || '');
  if (MATURE.test(t)) return 'mature';
  if (SENSITIVE.test(t)) return 'sensitive';
  return 'family';
}

/** Whole years between a birth date and now; null when the date is missing or impossible. */
export function ageFrom(birthDate, now = new Date()) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime()) || b > now) return null;
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age -= 1;
  return age;
}

export function levelFor({ birthDate, contentOpen } = {}) {
  const age = ageFrom(birthDate);
  if (age == null) return 'standard';
  if (age < 16) return 'gentle';
  if (age < 18) return 'teen';
  return contentOpen ? 'open' : 'standard';
}

const ALLOWED = {
  gentle: ['family'],
  teen: ['family', 'sensitive'],
  standard: ['family', 'sensitive'],
  open: ['family', 'sensitive', 'mature'],
};
export const allowedRatings = (level) => ALLOWED[level] || ALLOWED.standard;

/** What the app needs to know about a person's content settings (never their birth date). */
export function contentInfo(user) {
  const age = ageFrom(user?.birthDate);
  return {
    level: levelFor(user || {}),
    hasBirthDate: age != null,
    adult: age != null && age >= 18,
    open: age != null && age >= 18 && !!user?.contentOpen,
  };
}

/** Accepts "YYYY-MM-DD" and returns { value: Date } or { error }. */
export function parseBirthDate(input) {
  if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return { error: 'Please enter your birth date.' };
  const d = new Date(`${input}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== input) return { error: 'That birth date does not look right.' };
  const age = ageFrom(d);
  if (age == null || age > 110) return { error: 'That birth date does not look right.' };
  if (age < MIN_AGE) return { error: `Strings is for people ${MIN_AGE} and over.`, underAge: true };
  return { value: d };
}
