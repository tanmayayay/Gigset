# Gigset data pipeline

Fetches real (non-scraped) data for the Gigset app and writes it as static
JSON that the frontend reads at build time:

```
src/data/live/venues.json   — music venues from OpenStreetMap
src/data/live/events.json   — concerts from Ticketmaster / Bandsintown
src/data/live/news.json     — articles from Rolling Stone India RSS (+ fallbacks)
src/data/live/meta.json     — run metadata: fetched_at, counts, sources, notes
```

## Run

```bash
cd data-pipeline
node run.mjs
```

Run per-script when iterating:

```bash
node fetch-venues.mjs
node fetch-events.mjs
node fetch-news.mjs
```

Per-script runs also write their own `src/data/live/*.json` file. Exit code is
0 even when sources are skipped — failures are recorded in `meta.json` notes.

## API keys

- `TM_API_KEY` — Ticketmaster Discovery API (free key at developer.ticketmaster.com).
- `BANDSINTOWN_APP_ID` — Bandsintown (needs manual approval; use your app id).

Set them before running to enable those fetchers:

```bash
TM_API_KEY=... node run.mjs
```

If a key is missing (or invalid), the fetcher writes `[]` and records a note in
`meta.json` instead of failing.

## Rate limits & politeness

- **Overpass (OSM):** 8 cities × 4 tag queries (one per tag type:
  `leisure=music_venue`, `amenity=nightclub/theatre/arts_centre`; node+way
  combined), `out center 80` so ways get coordinates. ~15s delay between
  requests, `[timeout:30]` server-side, 60s client timeout on the main
  instance (25s on mirrors). One attempt per endpoint per tile; a failed
  tile is retried once more after a 20s cooldown. Endpoint order:
  `overpass-api.de` → `overpass.private.coffee` → `overpass.kumi.systems`.
  If a full-city tile fails, it is recursively split into quadrants
  (depth ≤ 2, i.e. up to 16 tiles) since the main instance 504s dense
  bboxes. Note: `out center 80` also caps results at 80 elements per query.
  Quirks found 2026-09-25, documented here so nobody re-learns them:
  - Use **HTTP GET** with the `data` param where brackets/quotes stay raw
    and only whitespace is `%20`-encoded. Fully percent-encoded queries get
    **HTTP 406** from overpass-api.de; stripping whitespace breaks
    `out center 80` (→ HTTP 400). (POST with `--data-urlencode` also 406s.)
  - overpass-api.de is fast for small queries but **504s on big unions** —
    hence one query per tag type instead of one per city, plus the
    quadrant-splitting fallback.
  - Send a real **User-Agent**; the mirrors **429 UA-less clients**.
  - de's frontend **RST/504s clients that burst** — sustained runs need
    ~15s spacing and a single attempt per tile; rapid retries keep the IP
    flagged. When in doubt, stop all traffic for a few minutes and retry.
- **Ticketmaster:** one request, 50 events, `countryCode=IN`.
- **Bandsintown:** one request per seeded artist (Anuv Jain, Prateek Kuhad,
  DIVINE), ~1s delay between.
- **RSS feeds:** one request per feed, ~0.8s delay between.

## Refresh cadence

Responses are cached on disk in `data-pipeline/.cache/` (gitignored):

| data    | TTL    |
| ------- | ------ |
| venues  | 7 days |
| news    | 6 hours|
| events  | 24 hours|

Delete `.cache/<name>.json` to force a refresh of that source. A sensible
refresh is daily for events/news; venues rarely change.

## No scraping

Only official APIs and RSS feeds are used. No HTML scraping of any site.
