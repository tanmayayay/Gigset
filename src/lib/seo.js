import { useEffect } from 'react';

/* Search-engine and link-preview tags for public pages.
   Google runs the app's JavaScript, so tags set here are what it indexes.
   Each page that should be found calls useSeo(); leaving the page puts the defaults back. */

export const SITE_URL = 'https://thegigset.com';
const DEFAULT_TITLE = 'TheGigSet — Tying the music industry together';
const DEFAULT_DESC = "The professional network, discovery marketplace and newsroom for India's music & live-event industry.";
const DEFAULT_IMAGE = `${SITE_URL}/brand/share.png`;

function setMeta(attr, key, value) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (value == null) { el?.remove(); return; }
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', value);
}

function setLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!href) { el?.remove(); return; }
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); document.head.appendChild(el); }
  el.setAttribute('href', href);
}

function setJsonLd(data) {
  let el = document.getElementById('seo-jsonld');
  if (!data) { el?.remove(); return; }
  if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = 'seo-jsonld'; document.head.appendChild(el); }
  el.textContent = JSON.stringify(data);
}

/** Trim text to a search-result-sized description. */
export function clip(text, max = 158) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

function apply({ title, description, path, image, noindex, jsonLd }) {
  const fullTitle = title ? `${title} | TheGigSet` : DEFAULT_TITLE;
  const desc = description || DEFAULT_DESC;
  const url = path ? `${SITE_URL}${path}` : null;
  document.title = fullTitle;
  setMeta('name', 'description', desc);
  setMeta('name', 'robots', noindex ? 'noindex, nofollow' : null);
  setMeta('property', 'og:title', fullTitle);
  setMeta('property', 'og:description', desc);
  setMeta('property', 'og:url', url || `${SITE_URL}/`);
  setMeta('property', 'og:image', image || DEFAULT_IMAGE);
  setLink('canonical', url);
  setJsonLd(jsonLd || null);
}

export function useSeo(opts = {}) {
  const key = JSON.stringify(opts);
  useEffect(() => {
    apply(opts);
    return () => apply({});
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}
