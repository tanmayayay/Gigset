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

## 2b. Host the website on Render (clean URLs for search engines)

The site uses clean addresses (thegigset.com/epk/123, not /#/epk/123), so the host must send
every address to `index.html`. GitHub Pages can't; a Render Static Site can, for free.

1. Render dashboard → **New → Static Site** → connect the same GitHub repo.
   - Root directory: *(leave empty, the repo root)*
   - Build command: `npm ci && npm run build`
   - Publish directory: `dist`
2. **Environment**: add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (same values as `.env`).
3. **Redirects/Rewrites** → add one rule: Source `/*`, Destination `/index.html`, Action **Rewrite**.
   Real files (robots.txt, sw.js, assets) are still served as files.
4. Deploy, then open the `…onrender.com` address and check `/epk/<an id>` loads after a reload.
5. **Settings → Custom Domains** → add `thegigset.com` (Render adds `www` as a redirect).
6. At the domain registrar: A record `@` → `216.24.57.1`, CNAME `www` → `<site>.onrender.com`.
   Delete the old GitHub Pages A records (185.199.108–111.153) and any AAAA records.
   Render issues the HTTPS certificate once DNS checks out.
7. Backend env on Render: add `SITE_URL=https://thegigset.com`. Keep `FRONTEND_URL` including `https://thegigset.com`.
8. Supabase → Authentication → URL Configuration: Site URL `https://thegigset.com`, and add
   `https://thegigset.com/**` to Redirect URLs.
9. Google Search Console: add the domain, then submit `https://strings-web.onrender.com/sitemap.xml`.

From now on every `git push` to main redeploys the site. `npx gh-pages` is no longer needed.

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
