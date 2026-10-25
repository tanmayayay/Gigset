# Gigset — Tying the music industry together

A **Phase 1 prototype** of Gigset: a professional networking + discovery + marketplace platform for the **Indian music & live-event industry**. Built as a polished, client-only React (Vite) web app for the partner demo on **Saturday, 26 Sept 2026**.

> One verified profile, one feed of the opportunities that matter, and the daily news that keeps the industry moving — for performers, venues, buyers of talent, crew, and institutions.

---

## Run it

**Prerequisites:** Node 18+ and npm.

```bash
cd gigset-web
npm install     # install dependencies
npm run dev     # local dev server (hot reload)
npm run build   # production build → dist/  (must pass cleanly)
npm run preview # preview the production build locally
```

The build is **fully static** — no server or backend required. Routing uses `HashRouter`, so the `dist/` output works on GitHub Pages (or any static host) with zero config. Serve the `dist/` folder as-is.

**Demo login:** click **“See it in action”** (or **Log in**) on the landing page for instant demo access as *Meera Iyer, Vocalist · Mumbai*. “Create your profile” walks a 3-step onboarding stepper, then also enters demo mode.

---

## Routes

| Route | Page |
|---|---|
| `/` | Landing (logged-out: hero, layers, stakeholders, testimonials, CTA) |
| `/onboarding` | 3-step demo stepper (stakeholder type → profile → interests) |
| `/home` | For You feed + star-story hero + “Rising this week” carousel |
| `/gighub` | Discovery feed — pure photo/video grid with filters |
| `/collab` | Opportunities marketplace (post / filter / apply, AI match scores) |
| `/community` | Circles by instrument/role, each with a discussion wall |
| `/news` | Daily industry headlines (10 articles, category filters) |
| `/news/:id` | Full article view with related stories |
| `/messages` | Two-pane messaging (persists locally) |
| `/live` | “Coming soon” placeholder + upcoming-gig countdowns |
| `/saved` | Bookmarks collection (opportunities, articles, clips, posts) |
| `/profile/:id` | EPK press-kit hero + full profile (tabs, availability, analytics) |
| `/search` | Unified search across people, venues, opportunities |
| `/notifications` | Filterable notification centre |
| `/settings` | Visibility, appearance (dark mode), notification prefs |
| `/about` | Mission, phase plan, stakeholder map |
| `/support` | Help centre, report flow, Terms & Privacy summaries |

## Feature list

**Core (ported & elevated from the HTML prototype)**
- Landing page with live feed preview, four product layers, stakeholder chips, testimonials
- Dark sidebar navigation with active states, topbar with notifications dropdown, mobile bottom nav + drawer
- Home feed with like persistence, post composer modal, star-story hero
- Gighub media grid (Performance / Service showcase filters)
- Collab marketplace with type/city filters, applications tracker, recommended connections
- Community circles with joinable walls and posting
- Newsroom: 10 full-length Indian music-industry articles with category filters + article pages
- Messages, unified search, notifications, settings (visibility controls), about, support

**New “wow” features for the partner demo**
1. **AI Match Score** — every opportunity card shows a mock match % tuned to your type/city/skills, with a “Why this matches” tooltip
2. **Availability calendar strip** — 14-day bookable-looking slots on every profile
3. **Verification & trust indicators** — verified/ID-verified badges, gig counts, response rates, ratings
4. **“Rising this week”** trending-artists carousel on Home
5. **Trending topics / hashtags** sidebar
6. **⌘K command palette** — global fuzzy search across people, opportunities, news, communities, pages
7. **Profile analytics preview** — views, followers, search appearances + pure-SVG sparkline (no chart lib)
8. **Event countdown cards** — live ticking countdowns to October gigs
9. **Toast notification system** — feedback for applies, connects, saves, invites
10. **Saved / Bookmarks collection** — dedicated page grouping saved opps, articles, clips, posts
11. **“Gig-ready” profile completeness meter** on your own profile
12. **Referral widget** — “Invite your crew” with copyable invite code
- **Dark-mode toggle** (topbar + settings, persisted)

**Data & persistence:** all demo content is realistic Indian-industry data (artists, venues like Piano Man & Depot 48, schools, brands, 8 cities, Bollywood/indie/EDM/classical-fusion/hip-hop). Likes, posts, applications, bookmarks, messages, wall posts, theme and settings persist in `localStorage` — “Reset demo data” lives in Settings.

---

## 5-minute demo script (partner pitch)

> Goal: show the network → the marketplace intelligence → the trust layer → the roadmap.

**0:00 — The promise (Landing, `/`)**
Scroll the hero: live Gighub preview, stats, four layers, stakeholder chips, testimonials. Click **“See it in action.”**

**0:45 — Home (`/home`)**
Point out the star-story hero, then the **“Rising this week”** carousel (hover a card). Scroll the feed — like a post (persists), save one (toast fires).

**1:45 — Collab (`/collab`) — the money slide**
Hover an **AI Match Score** badge → “Why this matches” tooltip. Apply to an opportunity → toast + it appears under *Your applications*. Click **Post an opportunity** to show the composer.

**2:45 — Profile (`/profile/zoya`) — the trust slide**
Scroll the EPK hero (play the featured-clip waveform), trust badges, then the **availability calendar** — tap a free day. Switch to your own profile (`/profile/meera`) for the **gig-ready meter** and **analytics sparkline**.

**3:45 — Discovery (`⌘K`, `/news`, `/gighub`)**
Hit **⌘K** and type “guitar” — jump anywhere. Open **News**, open the star story, save it. Skim **Gighub**.

**4:30 — Close (`/live`, `/about`)**
`/live` shows the Phase 2 teaser + gig countdowns; `/about` shows the Phase 1→3 plan. End on: *“Network first, marketplace depth next, booking & live after — that’s the sequencing that beats the agency incumbents.”*

---

## Roadmap

- **Phase 2 — Marketplace & growth:** applicant review dashboard, subscriptions/billing, full profile analytics, dedicated search index, external social linking, advertising placements
- **Phase 3 — Services & monetisation depth:** structured booking workflow (budget → browse → availability → book), live streaming (the `/live` placeholder is the stub), artist management & broker services
- **Beyond:** the wider NAAD Infinity 360° ecosystem — OTT platform, ticketing e-commerce, production facilities, equipment rental, exhibitions, conferences, education academy

## Tech notes

- React 19 + Vite 8, `react-router-dom` (HashRouter), `lucide-react` icons only — no UI kit, no chart lib
- Single hand-rolled design system in `src/theme.css` (white & blue brand, Space Grotesk + Inter, light/dark tokens)
- `src/data/demo.js` — all content & the mock match/availability/analytics algorithms (deterministic, seeded)
- `src/store/store.jsx` — React context + `localStorage` persistence
- No backend, no git init, no deploy scripts — publishing is handled separately
