# Gigset Backend

Express v5 + Prisma (v6) REST API for **Gigset** — the professional networking + discovery + marketplace platform for the Indian music industry. Postgres (via Supabase) is the production database.

> **Setting up Supabase?** Follow **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** —
> the exact click-steps to create a free project (Mumbai region), wire up
> `.env`, migrate, seed, and verify.

## Prerequisites

- **Node 22+** (`node --version`)
- A free **Supabase** project (see SUPABASE_SETUP.md) — the API needs its
  Postgres + Auth. Without Supabase env vars the API still boots, but only
  `/api/health` and the dev-only mock auth work (no database).

## Setup

```bash
cd ~/workspace/gigset-web/backend
npm install
cp .env.example .env          # then fill it in per SUPABASE_SETUP.md
npx prisma migrate dev --name supabase-init   # creates tables in Supabase Postgres
npm run seed                                   # loads demo data (idempotent)
npm run dev                                    # starts API on http://localhost:4000 (watch mode)
```

`npm run migrate` is a shortcut for `npx prisma migrate dev`.

## Environment (.env)

See `.env.example` for the full annotated template. In short:

```
DATABASE_URL=...              # Supabase transaction pooler (port 6543) — runtime
DIRECT_URL=...                # Supabase direct connection (port 5432) — migrations only
SUPABASE_URL=...              # project URL
SUPABASE_ANON_KEY=...         # public anon key
SUPABASE_JWT_SECRET=...       # 🔒 server-only: verifies login tokens
SUPABASE_SERVICE_ROLE_KEY=... # 🔒 server-only: admin scripts only, never in frontend
PORT=4000
```

Mock dev auth (`dev-<userId>` tokens) is active **only** while `SUPABASE_URL`
/ `SUPABASE_JWT_SECRET` are unset. Set both and the API requires real Supabase
JWTs (dev-login returns 403).

## Auth

Real auth is **Supabase Auth**. The frontend signs in via the Supabase JS
client and sends the access token as `Authorization: Bearer <token>`; the
middleware (`src/middleware/auth.js`) verifies it locally with
`SUPABASE_JWT_SECRET` and maps the JWT `sub` to the Prisma `User`
(auto-provisioned on first sight). Routes keep the same contract:
`req.user.id` is the Prisma User id; failures return 401 JSON.

Then send it as `Authorization: Bearer dev-<userId>` on protected routes. Anything else → `401`.
Phase 2 replaces this with real JWT/OAuth — the contract (`req.user = { id }`, 401 JSON) stays the same, so routes won't change.

## Endpoints

Auth: `🔒` = needs `Authorization: Bearer <token>`. List responses are `{ items, total, take, skip }` and accept `?take=` (default 20, max 100) and `?skip=`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | – | Liveness check `{ ok, service, version, time }` |
| POST | `/api/auth/dev-login` | – | `{ name, stakeholderType? }` → `{ token, user }` (dev placeholder) |
| GET | `/api/profiles?type=&city=&search=&take=&skip=` | – | List profiles |
| POST | `/api/profiles` | 🔒 | Create profile `{ name, stakeholderType, bio?, city?, visibility?, detail? }` |
| GET | `/api/profiles/:id` | – | Profile + detail + recent posts + counts |
| PATCH | `/api/profiles/:id` | 🔒 | Edit own profile (owner only, else 403) |
| GET | `/api/posts?authorId=&take=&skip=` | – | Feed, newest first, with like/comment counts |
| POST | `/api/posts` | 🔒 | `{ body, mediaUrl?, visibility? }` |
| GET | `/api/posts/:id` | – | Single post |
| POST | `/api/posts/:id/like` | 🔒 | Like (409 if already liked) |
| DELETE | `/api/posts/:id/like` | 🔒 | Unlike |
| GET | `/api/posts/:id/comments?take=&skip=` | – | Comments, oldest first |
| POST | `/api/posts/:id/comments` | 🔒 | `{ body }` |
| GET | `/api/opportunities?status=&city=&genre=&take=&skip=` | – | List gigs/opportunities |
| POST | `/api/opportunities` | 🔒 | `{ title, description, requirements?, city?, genre?, budgetMin?, budgetMax? }` |
| GET | `/api/opportunities/:id` | – | Single opportunity |
| POST | `/api/opportunities/:id/apply` | 🔒 | `{ message? }` — 400 if closed/own, 409 if already applied |
| GET | `/api/opportunities/:id/applications` | 🔒 | Poster only (else 403) |
| GET | `/api/bookings?role=requester\|host&status=&take=&skip=` | 🔒 | My bookings (mirrors frontend BookingModal flow) |
| POST | `/api/bookings` | 🔒 | `{ hostId, date, timeSlot?, budget?, message? }` → status PENDING |
| PATCH | `/api/bookings/:id` | 🔒 | `{ status }` — host confirms, either party cancels |
| GET | `/api/venues?city=&search=&type=&take=&skip=` | – | Venue directory (OSM-shaped) |
| GET | `/api/events?city=&genre=&take=&skip=` | – | Events, upcoming first |
| GET | `/api/articles?category=&take=&skip=` | – | Articles, newest first |

Errors are always JSON `{ error: "..." }` with proper status codes (400 validation, 401 auth, 403 forbidden, 404 missing, 409 conflict).

All responses are plain JSON (no Date objects, no BigInt) so they serialize cleanly for the frontend.

## Data model

`prisma/schema.prisma` — User/Profile (stakeholderType: PERFORMER|VENUE|BUYER|CREW|INSTITUTION), StakeholderDetail (type-specific JSON), Connection (CONNECT|FOLLOW, PENDING|ACCEPTED), Post, Comment, Like (unique post+user), Opportunity (+ requirements JSON), Application, Article, Conversation/ConversationMember/Message, Notification, Booking (PENDING|CONFIRMED|CANCELLED — mirrors the frontend booking modal fields: date, timeSlot, budget, message), Venue (lat/lng, OSM `source`), Event.

Switching to Postgres later: change `provider` to `"postgresql"` in `schema.prisma`, set `DATABASE_URL`, run `npx prisma migrate dev --name switch-to-postgres`.

## Troubleshooting: Prisma engine download fails

`npm install` runs a postinstall script that downloads Prisma's engine binaries
from `binaries.prisma.sh`. If that download fails in your network (we saw
`ECONNRESET` behind an egress proxy), do this instead:

```bash
npm install --ignore-scripts
SHA=$(node -e "console.log(require('@prisma/engines-version').enginesVersion)")
P=$(node -e "require('@prisma/get-platform').getBinaryTargetForCurrentPlatform().then(console.log)")
# query-engine library (used by @prisma/client at runtime)
curl -sL -o /tmp/lib.gz "https://binaries.prisma.sh/all_commits/$SHA/$P/libquery_engine.so.node.gz"
gunzip -c /tmp/lib.gz > node_modules/prisma/libquery_engine-$P.so.node
# schema-engine (used by `prisma migrate`)
curl -sL -o /tmp/se.gz "https://binaries.prisma.sh/all_commits/$SHA/$P/schema-engine.gz"
gunzip -c /tmp/se.gz > node_modules/prisma/schema-engine-$P
chmod +x node_modules/prisma/*engine*
npx prisma generate && npx prisma migrate dev --name init
```

Prisma skips downloading binaries that already exist with a matching version,
so this only needs doing once per fresh `node_modules`.

## Phase 2 frontend swap plan (localStorage → this API)

The React app currently keeps everything in `localStorage` via `src/store/store.jsx`. The swap is mechanical because the API was designed to match:

1. **Base URL** — add `const API = 'http://localhost:4000/api'` (later an env var) in one place, e.g. `src/lib/api.js`.
2. **Auth** — after `POST /api/auth/dev-login` (Phase 2: real login), store the token in memory/localStorage and attach `Authorization: Bearer <token>` to every fetch. Replace the `useLocal('gigset.…')` hooks with `useState` + `useEffect` fetches.
3. **Shape mapping** (frontend → API):
   - `profiles` → `GET /api/profiles` (fields: `id, name, stakeholderType, bio, city, verificationStatus` — same names as the demo data).
   - feed posts → `GET /api/posts` (newest first; `author` embedded; `_count.likes/_count.comments`). Likes: `POST /api/posts/:id/like`; comments: `GET|POST /api/posts/:id/comments`.
   - opportunities → `GET /api/opportunities`; applying → `POST /api/opportunities/:id/apply { message }`.
   - bookings → `GET /api/bookings` (replaces `gigset.bookings`), `POST /api/bookings { hostId, date, timeSlot, budget, message }` maps 1:1 from `BookingModal` (`personId→hostId`, `dateISO→date`, `slot→timeSlot`). Cancel → `PATCH /api/bookings/:id { status: 'CANCELLED' }`.
   - venues/events/articles → `GET /api/venues|events|articles` (replace the static `src/data/demo.js` lists).
4. **Keep it JSON** — every response is JSON-serializable with documented shapes in the endpoint table above; no response-shape guessing needed.
5. **Demo parity** — `npm run seed` loads the same kind of sample data the frontend demo uses, so the app looks identical on first load against the API.
