# Gigset — Deploy guide (launch)

## 1. Deploy the backend (Render)

1. Push the latest `backend/` to GitHub (includes `Dockerfile` + `render.yaml`).
2. Render dashboard → **New → Blueprint** → connect the `gigset-web` repo, root directory `backend/`.
3. When it asks for env vars, copy them from your local `backend/.env`:
   - `DATABASE_URL` — transaction pooler URI (port **6543**)
   - `DIRECT_URL` — session pooler URI (port **5432**)
   - `SUPABASE_URL` — `https://<ref>.supabase.co` (no `/rest/v1`)
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_JWT_SECRET`
   - `FRONTEND_URL` — `https://tanmayayay.github.io` (the site origin only, no path)
4. Deploy. Note the public URL, e.g. `https://strings-api.onrender.com`.
5. Smoke test: `curl https://strings-api.onrender.com/api/health` → `{"ok":true}`.

> Render's starter plan keeps the service awake. The free tier sleeps after
> inactivity (first request after sleep takes ~30s) — fine for testing, not
> for launch day.

## 2. Point the frontend at production

In `gigset-web/.env` (frontend root):

```bash
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>   # public — safe in the bundle
VITE_API_URL=https://strings-api.onrender.com
```

Then build + deploy to GitHub Pages:

```bash
cd /Users/tanmayayay/Downloads/Gigset/gigset-web
nvm use 22
npm run build
npx gh-pages -d dist
```

## 3. Post-deploy checks (two accounts)

1. Create account A, complete onboarding → profile visible at `/profile/<id>`.
2. Create account B (different browser / incognito), complete onboarding.
3. A posts → B sees it on Home.
4. B applies to A's gig → A sees the application, shortlists → B gets a notification.
5. A messages B → B sees it under Messages (polls every 5s).
6. B books A → A confirms → both see it under their bookings.

## 4. If something breaks

- `Cannot reach the Gigset API` in the browser → `VITE_API_URL` wrong, or the backend is asleep/crashed. Check Render logs.
- `401 Invalid or expired token` → Supabase Auth issue; sign out and back in.
- CORS errors in the browser console → `FRONTEND_URL` on Render must exactly match the Pages origin.
