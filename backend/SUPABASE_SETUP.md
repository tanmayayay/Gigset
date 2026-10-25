# Supabase setup for the Gigset backend

This guide takes the backend from local SQLite + mock auth to **Supabase
Postgres + real Supabase Auth**. No Supabase experience assumed — follow the
clicks in order. (~15 minutes, all on the free tier.)

> ⚠️ **Secrets.** You will copy a database password, a JWT secret, and a
> service-role key below. Never commit them, never paste them into chat,
> screenshots, or tickets. They live in `backend/.env`, which is git-ignored.

---

## Step 1 — Create the Supabase project

1. Go to **https://supabase.com** and sign in (GitHub sign-in is fastest).
2. Click **New project**.
3. Settings:
   - **Name:** `gigset` (or `gigset-prod`)
   - **Database password:** click **Generate**, then **copy it somewhere safe**
     (a password manager). You cannot see it again.
   - **Region:** **Southeast Asia (Mumbai)** — labelled `ap-south-1`.
     Your users and data-pipeline are India-first; keep the data close.
   - Leave everything else default → **Create new project**.
4. Wait ~2 minutes while it provisions. You'll land on the project dashboard.

## Step 2 — Copy the database connection strings

1. In the left sidebar click **Database** (elephant icon), then the **Connect**
   button at the top.
2. You need **two** strings:
   - **Transaction pooler** (port `6543`) → this becomes `DATABASE_URL`
     (the app's runtime connection; the pooler handles many concurrent API
     requests without exhausting Postgres connections).
     - If it shows a "Connection pooling" dropdown, pick **Transaction**
       mode. It looks like:
       `postgresql://postgres.<ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`
     - Replace `<password>` with the database password from Step 1.
   - **Direct connection** (port `5432`) → this becomes `DIRECT_URL`
     (Prisma Migrate uses this; migrations can't reliably run through the
     pooler). It looks like:
       `postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres`
     - Same password substitution.
3. Keep this tab handy — you'll paste both into `.env` in Step 4.

## Step 3 — Copy the API keys

1. Click the **gear icon → Project Settings → API** (bottom-left).
2. Copy these four values:
   - **Project URL** → `SUPABASE_URL`
     (looks like `https://<ref>.supabase.co`)
   - **anon public** key → `SUPABASE_ANON_KEY`
     (safe to embed in the future frontend; it respects Row Level Security)
   - **JWT Secret** → click **Reveal** → `SUPABASE_JWT_SECRET`
     (🔒 server-only: the Express API uses it to verify login tokens.
     Never put it in frontend code.)
   - **service_role** key → click **Reveal** → `SUPABASE_SERVICE_ROLE_KEY`
     (🔒 server-only: bypasses all database security, full admin power.
     Reserved for future admin scripts. Never put it in frontend code.)

## Step 4 — Fill in `backend/.env`

```bash
cd ~/workspace/gigset-web/backend   # or wherever your gigset-web lives
cp .env.example .env
```

Open `.env` in an editor and replace every placeholder with the real values
from Steps 2–3. When you're done it should look like:

```bash
DATABASE_URL="postgresql://postgres.<ref>:<your-password>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres:<your-password>@db.<ref>.supabase.co:5432/postgres"
SUPABASE_URL="https://<ref>.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_JWT_SECRET="your-jwt-secret"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
PORT=4000
```

Double-check: no `<ref>`, `<password>`, or empty quotes left.

## Step 5 — Create the tables

```bash
npx prisma migrate dev --name supabase-init
```

This reads `prisma/schema.prisma` (16 models: users, profiles, posts,
comments, likes, connections, opportunities, applications, articles,
conversations, messages, notifications, bookings, venues, events) and creates
them in your Supabase Postgres. You can watch them appear live at
**Database → Tables** in the dashboard.

## Step 6 — Seed demo data

```bash
npm run seed
```

Idempotent (wipes then re-creates): 4 users, 3 posts, 2 opportunities,
2 venues, 1 event, 2 articles, 1 conversation, 1 booking. Browse them at
**Table Editor** in the dashboard.

## Step 7 — Start the API

```bash
npm run dev
```

You should see:

```
[gigset-backend] auth mode: SUPABASE (real JWTs required)
[gigset-backend] listening on http://localhost:4000
```

(The old `DEV-ONLY mock` line appears only when Supabase isn't configured —
if you see it now, one of the two values is missing or still a placeholder.)

## Step 8 — Verify

```bash
# 1. Health (no auth needed)
curl http://localhost:4000/api/health
# → {"ok":true,"service":"gigset-backend",...}

# 2. Protected route without a token → must be 401
curl -X POST http://localhost:4000/api/posts \
  -H "Content-Type: application/json" -d '{"body":"hello"}'
# → {"error":"Unauthorized: send `Authorization: Bearer <token>`."}

# 3. Authenticated request. First create a user in the dashboard:
#    Authentication → Users → "Add user" → "Create new user"
#    (enter an email + password, tick "Auto confirm user").
#    Then get its access token — quickest via the browser console on any page:
#      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
#      const sb = createClient('<SUPABASE_URL>', '<SUPABASE_ANON_KEY>');
#      const { data } = await sb.auth.signInWithPassword({ email: '<email>', password: '<password>' });
#      console.log(data.session.access_token);
#    Then:
curl http://localhost:4000/api/profiles/me \
  -H "Authorization: Bearer <access_token>"
# → your auto-provisioned profile JSON (first call creates the Prisma User row
#   linked to your Supabase identity; subsequent calls return it).
```

If step 3 returns your profile, the whole chain works: Supabase Auth →
JWT → Express verification → Postgres.

---

## How the frontend will use this later

No frontend changes are in this phase, but the contract is ready:

1. The web app adds `@supabase/supabase-js` and calls
   `supabase.auth.signInWithPassword({ email, password })` (or OAuth).
2. It reads `session.access_token` and sends it on every API call as
   `Authorization: Bearer <token>`.
3. Express verifies the token — ES256 tokens (the default on new Supabase
   projects) against the project's public JWKS, HS256 tokens against
   `SUPABASE_JWT_SECRET` — maps the JWT `sub` to the Prisma `User` (creating
   the row on first login), and the existing routes work unchanged —
   `req.user.id` is still the Prisma id.

When the user signs out or the token expires, Supabase's client refreshes it;
the backend never stores passwords or sessions.

## Troubleshooting

| Symptom | Likely cause → fix |
|---|---|
| `Can't reach database server` on migrate | `DIRECT_URL` wrong / password not substituted → re-copy from Database → Connect → Direct connection |
| `401 Invalid or expired token` with a fresh login | HS256 project: `SUPABASE_JWT_SECRET` doesn't match → re-copy from Project Settings → API → JWT Secret (Reveal). ES256 project: token `alg` must be ES256/HS256 and the backend must reach `<supabase-url>/auth/v1/.well-known/jwks.json` |
| Boot says `DEV-ONLY mock` even though you filled `.env` | A placeholder (`<ref>`/`<password>`) is still in the file, or the shell didn't pick up the edit → re-check `.env`, restart `npm run dev` |
| `dev-login` returns 403 | Correct — it's disabled once Supabase is configured. Use Supabase Auth. |
| `P1012: Environment variable not found: DIRECT_URL` | You're on an old `.env` — re-copy from `.env.example` and fill it in |
