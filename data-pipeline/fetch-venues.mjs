// Venues from OpenStreetMap (Overpass API).
// Usage: node fetch-venues.mjs   -> returns venues array (also writes src/data/live/venues.json)
import { fetchWithRetry, sleep, cacheGet, cacheSet, dedupe, writeOutput } from "./normalize.mjs";

const CACHE_KEY = "venues";
const CACHE_TTL_MS = 7 * 24 * 3600 * 1000; // 7 days

const CITIES = [
  { name: "Mumbai", bbox: [18.85, 72.75, 19.30, 73.05] },
  { name: "Delhi-NCR", bbox: [28.40, 76.85, 28.90, 77.35] },
  { name: "Bengaluru", bbox: [12.85, 77.45, 13.10, 77.75] },
  { name: "Pune", bbox: [18.40, 73.70, 18.65, 73.95] },
  { name: "Hyderabad", bbox: [17.25, 78.30, 17.55, 78.60] },
  { name: "Chennai", bbox: [12.90, 80.15, 13.15, 80.30] },
  { name: "Kolkata", bbox: [22.45, 88.25, 22.65, 88.45] },
  { name: "Chandigarh", bbox: [30.65, 76.70, 30.80, 76.85] },
];

// Per-endpoint config. de is the workhorse; its frontend RST/504s clients
// that burst, so it gets exactly ONE attempt per tile — no rapid double-tap.
// The mirrors often hang, so fail fast on them.
const ENDPOINTS = [
  { base: "https://overpass-api.de/api/interpreter", timeoutMs: 60000, tries: 1 },
  { base: "https://overpass.private.coffee/api/interpreter", timeoutMs: 25000, tries: 1 },
  { base: "https://overpass.kumi.systems/api/interpreter", timeoutMs: 25000, tries: 1 },
];

const CINEMA_RE = /pvr|inox|cinepolis|cinemax|carnival|cinema/i;

// tag preference order when several match
const TAG_ORDER = [
  ["leisure", "music_venue"],
  ["amenity", "nightclub"],
  ["amenity", "theatre"],
  ["amenity", "arts_centre"],
];

// One query per (city, tag type): overpass-api.de 504s the full 8-branch
// union for big cities, so we run 4 lighter queries per city instead.
const TAG_TYPES = [
  ["leisure", "music_venue"],
  ["amenity", "nightclub"],
  ["amenity", "theatre"],
  ["amenity", "arts_centre"],
];

function buildQuery(bbox, [key, value]) {
  const [s, w, n, e] = bbox;
  return (
    `[out:json][timeout:30];` +
    `(node["${key}"="${value}"](${s},${w},${n},${e});` +
    `way["${key}"="${value}"](${s},${w},${n},${e}););` +
    `out center 80;`
  );
}

/** Split a [s,w,n,e] bbox into 4 quadrants. */
function quadrants([s, w, n, e]) {
  const ms = +((s + n) / 2).toFixed(4), mw = +((w + e) / 2).toFixed(4);
  return [
    [s, w, ms, mw],
    [s, mw, ms, e],
    [ms, w, n, mw],
    [ms, mw, n, e],
  ];
}

const MAX_TILE_DEPTH = 2; // 1 -> 4 -> 16 tiles for dense bboxes that 504

async function queryTile(bbox, city, tag, depth) {
  const els = [];
  try {
    const data = await queryOverpass(buildQuery(bbox, tag));
    els.push(...(data.elements || []));
    return { els, failed: false };
  } catch (err) {
    if (depth >= MAX_TILE_DEPTH) {
      console.warn(`[venues] ${city.name} ${tag[1]} tile d${depth}: FAILED (${err.message})`);
      return { els, failed: true };
    }
    console.warn(`[venues] ${city.name} ${tag[1]} tile d${depth} failed, splitting…`);
    let failed = false;
    for (const q of quadrants(bbox)) {
      const r = await queryTile(q, city, tag, depth + 1);
      els.push(...r.els);
      if (r.failed) failed = true;
      await sleep(8000);
    }
    return { els, failed };
  }
}

async function queryTag(city, tag) {
  const { els, failed } = await queryTile(city.bbox, city, tag, 0);
  // Throw only if every attempt failed; empty-but-successful means no venues.
  if (failed && !els.length) throw new Error("all queries failed");
  return els
    .map((el) => normalizeElement(el, city.name))
    .filter(Boolean);
}

async function queryOverpass(query) {
  // HTTP GET, `data` param with raw brackets/quotes; only whitespace is
  // encoded (%20). Fully percent-encoded queries get HTTP 406 from
  // overpass-api.de, and stripping whitespace breaks `out center 80`.
  const param = query.replace(/\s+/g, "%20");
  let lastErr;
  for (const { base, timeoutMs, tries } of ENDPOINTS) {
    for (let attempt = 0; attempt < tries; attempt++) {
      try {
        const res = await fetchWithRetry(`${base}?data=${param}`, {
          timeoutMs,
          retries: 0,
          backoffMs: 1000,
          headers: {
            // A real UA is required (mirrors 429 UA-less clients).
            "User-Agent": "GigsetDataPipeline/1.0 (music-industry research; contact via repo)",
          },
        });
        if (res.status === 429) {
          console.warn(`[venues] 429 from ${base}, backing off…`);
          await sleep(10000);
          continue;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (!text.trimStart().startsWith("{")) throw new Error("non-JSON response (server busy?)");
        const data = JSON.parse(text);
        if (data.elements) return data;
        throw new Error("unexpected response shape");
      } catch (err) {
        console.warn(`[venues] endpoint failed (${base}): ${err.message}`);
        lastErr = err;
        await sleep(2000);
      }
    }
  }
  throw lastErr;
}

function matchedType(tags = {}) {
  for (const [k, v] of TAG_ORDER) if (tags[k] === v) return v;
  return "";
}

function addressFrom(tags = {}) {
  const parts = [];
  if (tags["addr:housenumber"] || tags["addr:street"]) {
    parts.push([tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" "));
  }
  for (const k of ["addr:suburb", "addr:city", "addr:postcode"]) {
    if (tags[k]) parts.push(tags[k]);
  }
  return parts.join(", ");
}

function normalizeElement(el, city) {
  const tags = el.tags || {};
  const name = (tags.name || "").trim();
  const hasUsefulTags =
    tags.website || tags.phone || tags["contact:phone"] || tags["addr:street"] || tags.opening_hours;
  if (!name && !hasUsefulTags) return null;
  if (name && CINEMA_RE.test(name)) return null;
  const type = matchedType(tags);
  if (!type) return null;

  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (typeof lat !== "number" || typeof lon !== "number") return null;

  const label = name || `${type.replace(/_/g, " ")} (${city})`;
  return {
    id: `osm-${el.type}-${el.id}`,
    name: label,
    city,
    lat: Number(lat.toFixed(6)),
    lng: Number(lon.toFixed(6)),
    type,
    address: addressFrom(tags),
    source: "OpenStreetMap",
    source_url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
  };
}

export async function fetchVenues() {
  const cached = await cacheGet(CACHE_KEY, CACHE_TTL_MS);
  if (cached) {
    console.log(`[venues] using cache (${cached.length} venues)`);
    return cached;
  }
  const all = [];
  for (const city of CITIES) {
    let cityCount = 0;
    for (const tag of TAG_TYPES) {
      let els = null;
      for (let pass = 0; pass < 2 && els === null; pass++) {
        if (pass > 0) {
          console.warn(`[venues] ${city.name} ${tag[1]}: retrying after cooldown…`);
          await sleep(20000);
        }
        try {
          els = await queryTag(city, tag);
        } catch (err) {
          console.warn(`[venues] ${city.name} ${tag[1]}: FAILED (${err.message})`);
        }
      }
      els = els || [];
      if (!els.length) console.warn(`[venues] ${city.name} ${tag[1]}: no results`);
      cityCount += els.length;
      all.push(...els);
      await sleep(15000); // be kind to Overpass: de asks for ≤2 parallel reqs; mirrors 429 on bursts
    }
    console.log(`[venues] ${city.name}: ${cityCount} raw results`);
  }
  const venues = dedupe(all, (v) => `${v.name.toLowerCase()}|${v.city.toLowerCase()}`);
  await cacheSet(CACHE_KEY, venues);
  return venues;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { ensureDirs } = await import("./normalize.mjs");
  await ensureDirs();
  const venues = await fetchVenues();
  await writeOutput("venues.json", venues);
  console.log(`[venues] wrote ${venues.length} venues`);
}
