// Text safety for anything people publish: profanity, sexual/adult content and hate slurs.
// Pure and dependency-free so the exact same file also runs in the browser (src/lib/moderation.js)
// for instant feedback; the server check is the one that counts.

// Terms are stored in "collapsed" form (lowercase, repeated letters squeezed to one).
// Short terms only match as whole words (so "class" or "cocktail" are fine);
// long terms (6+ letters) also match inside run-together text ("fuckyou").
const LISTS = {
  profanity: [
    'fuck', 'fucker', 'motherfucker', 'shit', 'bullshit', 'bitch', 'bastard', 'asshole', 'arsehole', 'dick', 'dickhead',
    'pussy', 'cunt', 'whore', 'slut', 'wanker', 'twat', 'bollocks', 'douchebag', 'jackass', 'dumbass', 'prick',
    // common romanised Hindi / Hinglish abuse
    'madarchod', 'maderchod', 'behenchod', 'bhenchod', 'benchod', 'betichod', 'chutiya', 'chutiye', 'chutiyapa', 'gandu',
    'gaandu', 'bhosdike', 'bhosdi', 'bhosda', 'bhosadike', 'lauda', 'loda', 'randi', 'raand', 'harami', 'haramkhor',
    'haramzada', 'kamina', 'kameena', 'lund', 'gaand', 'chut', 'bsdk', 'mkc', 'bkl',
  ],
  adult: [
    'porn', 'porno', 'pornhub', 'xxx', 'nude', 'nudes', 'nsfw', 'onlyfans', 'blowjob', 'handjob', 'cumshot', 'hentai', 'milf',
    'boobs', 'tits', 'titties', 'erotic', 'camgirl', 'sexting', 'orgy', 'sexchat', 'escortservice', 'callgirl', 'hookup',
    'nakedpics', 'sendnudes', 'deepthroat', 'creampie', 'dildo', 'masturbate', 'masturbation',
  ],
  hate: [
    'nigger', 'nigga', 'faggot', 'fag', 'kike', 'chink', 'paki', 'tranny', 'hijra', 'chakka', 'retard', 'retarded',
  ],
};

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '+': 't' };
// Words that contain a listed term but are perfectly fine.
const SAFE = new Set(['dickens', 'dickson', 'cockburn', 'scunthorpe', 'analysis', 'analyst', 'bassist', 'assistant', 'passion', 'classic', 'class', 'grass', 'glass', 'mass', 'pass', 'ass', 'shiitake', 'shitake']);

const SUFFIX = /^(s|es|ed|er|ers|ing|in|y|ies|head|face)?$/;

const squeeze = (s) => s.replace(/(.)\1+/g, '$1');

function normalize(text) {
  let t = String(text ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  t = t.replace(/[0134578@$!+]/g, (c) => LEET[c]);
  return t;
}

const TERMS = Object.entries(LISTS).flatMap(([category, words]) => words.map((w) => ({ category, term: w, c: squeeze(w) })));

/**
 * checkText("some text") -> { ok: true } or { ok: false, category, term }
 */
export function checkText(text) {
  if (typeof text !== 'string' || !text.trim()) return { ok: true };
  const norm = normalize(text);

  // 1. Whole-word pass, with common endings (fucking, shits, bitchy…).
  const words = norm.split(/[^a-z]+/).filter(Boolean);
  for (const w of words) {
    if (SAFE.has(w)) continue;
    const cw = squeeze(w);
    for (const t of TERMS) {
      if (cw === t.c) return { ok: false, category: t.category, term: t.term };
      if (cw.startsWith(t.c) && t.c.length >= 4 && SUFFIX.test(cw.slice(t.c.length))) return { ok: false, category: t.category, term: t.term };
    }
  }

  // 2. Spaced-out letters: "f u c k", "f.u.c.k", "s-h-i-t".
  const spaced = norm.replace(/\b([a-z])(?:[\s.\-_*]+([a-z]))+\b/g, (m) => m.replace(/[\s.\-_*]+/g, ''));
  if (spaced !== norm) {
    for (const w of spaced.split(/[^a-z]+/).filter(Boolean)) {
      const cw = squeeze(w);
      for (const t of TERMS) if (cw === t.c) return { ok: false, category: t.category, term: t.term };
    }
  }

  // 3. Run-together text for the longer terms ("fuckyou", "sendnudes").
  let squashed = squeeze(norm.replace(/[^a-z]+/g, ''));
  for (const sw of SAFE) if (sw.length >= 6) squashed = squashed.split(squeeze(sw)).join('|');
  for (const t of TERMS) {
    if (t.c.length >= 6 && squashed.includes(t.c)) {
      return { ok: false, category: t.category, term: t.term };
    }
  }
  // Short but unambiguous terms are also caught when glued to other words ("fuckyou").
  for (const t of ['fuck', 'cunt', 'nigger', 'faggot', 'madarchod', 'behenchod']) {
    if (squashed.includes(squeeze(t))) return { ok: false, category: t === 'nigger' || t === 'faggot' ? 'hate' : 'profanity', term: t };
  }
  return { ok: true };
}

export const CLEAN_MESSAGE = 'Please keep it clean — abusive, hateful or adult language isn’t allowed on Gigset.';

/** Check several fields at once; returns the first failure or { ok: true }. */
export function checkAll(...texts) {
  for (const t of texts) {
    const r = checkText(t);
    if (!r.ok) return r;
  }
  return { ok: true };
}
