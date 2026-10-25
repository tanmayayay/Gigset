# Gigset — Real Data Sources (researched 2026-09-25)

Ranked by: free access, India coverage, reliability, effort to enable.
Verified items were tested live from this machine; unverified items are marked as such.

## Tier 1 — Verified working, no key needed (use now)

### 1. OpenStreetMap Overpass API — VENUES ⭐
- **What:** Real music venues, auditoriums, clubs across Indian cities.
- **Verified:** Live query returned 33 venues in Mumbai, including **Blue Frog** (the well-known Mumbai venue).
- **Access:** No key. `GET https://overpass-api.de/api/interpreter?data=<url-encoded-query>`
- **Query pattern (verified):**
  ```
  [out:json][timeout:30];
  (
    node["leisure"="music_venue"](18.85,72.75,19.30,73.05);
    node["amenity"="theatre"](18.85,72.75,19.30,73.05);
    node["amenity"="arts_centre"](18.85,72.75,19.30,73.05);
    node["amenity"="nightclub"](18.85,72.75,19.30,73.05);
  );
  out 60;
  ```
  (bbox = Mumbai; repeat per city with small bboxes)
- **Caveats:**
  - Main instance is flaky under load (504s seen) — use small bboxes, `[timeout:30]`, retries with backoff, and mirrors (`overpass.kumi.systems`, `overpass.private.coffee`) on failure. POST with `--data-urlencode` returned 406 in our tests; **GET works**.
  - Noise: cinema multiplexes (PVR, INOX, Cinepolis) are tagged `amenity=theatre` — filter by name.
  - Coverage varies by city (Mumbai/Delhi good; smaller cities sparse) — honest fallback to demo data where thin.
- **License:** ODbL — must attribute "© OpenStreetMap contributors". Data is from 2026-09-25.
- **Cost:** Free. Polite usage: ≤1 req/sec, cache results.

### 2. Rolling Stone India RSS — NEWS ⭐
- **What:** Real Indian music-industry articles.
- **Verified:** `https://rollingstoneindia.com/feed/` returns HTTP 200 with full RSS 2.0 (~114KB, multiple articles).
- **Access:** No key. Poll at most every few hours; cache.
- **Cost:** Free.

## Tier 2 — Needs a free key / approval (Kuro action items)

### 3. Ticketmaster Discovery API — EVENTS
- **What:** Concert/event listings with venue, date, genre, ticket URL, images.
- **Access:** Free key at https://developer.ticketmaster.com/ → 5,000 calls/day, 5 req/sec.
- **⚠️ India coverage UNVERIFIED.** Official docs list US, Canada, Mexico, Australia, NZ, UK, Ireland, other European countries "and more" — India is **not** explicitly listed. Ticketmaster does operate ticketmaster.in, so it may work.
- **Next step (Kuro):** sign up for a free key, then test:
  `https://app.ticketmaster.com/discovery/v2/events.json?apikey=KEY&countryCode=IN&classificationName=music&size=20`
  If `page.totalElements` is healthy for IN, enable it in `fetch-events.mjs` via `TM_API_KEY`. If thin, deprioritize.
- **Cost:** Free tier is enough for a daily refresh.

### 4. Bandsintown API v3 — EVENTS (artist-centric)
- **What:** Artist tour dates with venue/city/ticket links. Base: `https://rest.bandsintown.com`.
- **Access:** Requires accepting terms + **written approval** and an `app_id` (request via https://help.bandsintown.com). Not self-serve.
- **Limitation:** Endpoints are per-artist (`/artists/{name}/events`), not geo-browse — we'd seed queries with popular Indian/international artists.
- **Next step (Kuro):** apply for an `app_id`; if approved, set `BANDSINTOWN_APP_ID` and enable in `fetch-events.mjs`.
- **Cost:** Free (with approval).

### 5. Eventbrite API — EVENTS (worth testing, not yet scoped)
- Some India events exist on Eventbrite; API needs a free OAuth token (developer.eventbrite.com). Candidate for a later pipeline iteration.

## Tier 3 — Not viable (do not pursue)

### 6. Songkick API — DEAD for new developers
- No longer approving API requests for educational/hobbyist use; commercial license starts at **$500/month**. Skip.

### 7. Paytm Insider / Skillbox / Townscript / Allevents.in — NO public API
- Searched 2026-09-25: none publish a developer API. Closed platforms; do not scrape (ToS + bot protection).

### 8. NH7 / Wild City — no usable feeds
- `nh7.in` is a JS SPA behind bot protection (406 to scripts); no RSS found.
- `thewildcity.com/feed/` redirects to the homepage; no RSS at `/rss`, `/rss.xml`, `/feed.xml`. Skip.

## Vendors (sound/light engineers, staging crew) — honest assessment
- **No public API or open directory exists** for Indian AV crew/vendors. This is genuinely a gap — which is exactly why Gigset' user-generated profiles ARE the directory (the product thesis).
- **Recommendation:** seed data + user-generated supply. Do NOT scrape Justdial/IndiaMART (closed, bot-protected, ToS risk).

## Recommended pipeline (implemented in `data-pipeline/`)
1. **Now:** Overpass venues (8 cities) + Rolling Stone India news → committed JSON in `src/data/live/`.
2. **When Kuro gets keys:** Ticketmaster (`TM_API_KEY`) → real events; Bandsintown (`BANDSINTOWN_APP_ID`) → artist tour dates.
3. **Refresh cadence:** venues weekly, news every 6h, events daily. All polite (timeouts, retries, disk cache).
