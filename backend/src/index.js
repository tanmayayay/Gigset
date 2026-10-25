import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRouter from './routes/auth.js';
import profilesRouter from './routes/profiles.js';
import postsRouter from './routes/posts.js';
import opportunitiesRouter from './routes/opportunities.js';
import bookingsRouter from './routes/bookings.js';
import directoryRouter from './routes/directory.js';
import messagesRouter from './routes/messages.js';
import notificationsRouter from './routes/notifications.js';
import tracksRouter from './routes/tracks.js';
import groupsRouter from './routes/groups.js';
import newsRouter from './routes/news.js';
import storiesRouter from './routes/stories.js';
import accountRouter from './routes/account.js';
import safetyRouter from './routes/safety.js';
import reviewsRouter from './routes/reviews.js';
import pushRouter from './routes/push.js';
import mailRouter from './routes/mail.js';
import { isSupabaseMode, isSet } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Warn loudly on half-configured Supabase: exactly one of the two set means
// the founder probably forgot the other (see backend/SUPABASE_SETUP.md).
// (Placeholder values like "<ref>" from .env.example count as unset.)
const hasUrl = isSet(process.env.SUPABASE_URL);
const hasSecret = isSet(process.env.SUPABASE_JWT_SECRET);
if (hasUrl !== hasSecret) {
  console.warn(
    '[gigset-backend] WARNING: only one of SUPABASE_URL / SUPABASE_JWT_SECRET is set — ' +
    'running in DEV mock-auth mode. Set both to require real Supabase JWTs.'
  );
}
console.log(
  `[gigset-backend] auth mode: ${isSupabaseMode ? 'SUPABASE (real JWTs required)' : 'DEV-ONLY mock (set SUPABASE_URL + SUPABASE_JWT_SECRET to switch)'}`
);

// Fail closed: without real Supabase config the API would fall back to the
// dev-only mock login, where anyone could sign in as anyone. Never allow that live.
if (process.env.NODE_ENV === 'production' && !isSupabaseMode) {
  console.error('[gigset-backend] FATAL: NODE_ENV=production but SUPABASE_URL / SUPABASE_JWT_SECRET are not set. Refusing to start.');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  console.warn('[gigset-backend] WARNING: FRONTEND_URL is not set, so CORS allows every origin.');
}

// Behind Render's proxy: trust one hop so rate limits see the real client IP.
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// In production set FRONTEND_URL to the deployed web origin(s),
// comma-separated — e.g. FRONTEND_URL=https://tanmayayay.github.io
// When unset (local dev), all origins are allowed as before.
if (process.env.FRONTEND_URL) {
  const origins = process.env.FRONTEND_URL.split(',').map((s) => s.trim()).filter(Boolean);
  app.use(cors({ origin: origins }));
} else {
  app.use(cors());
}
// Abuse protection. Generous for people, tight for scripts.
const json429 = (message) => ({ error: message });
const apiLimiter = rateLimit({
  windowMs: 60_000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false,
  skip: (req) => req.path === '/health',
  message: json429('Too many requests. Please slow down and try again in a minute.'),
});
const writeLimiter = rateLimit({
  windowMs: 60_000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false,
  skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS',
  message: json429('You are doing that too quickly. Please wait a moment.'),
});
app.use('/api', apiLimiter, writeLimiter);

// Smaller responses over the wire (JSON typically shrinks 70-85%).
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// Per-request timing: exposed as a Server-Timing header (visible in the
// browser's Network tab) and logged when slow, so slow endpoints show up in
// the Render logs by name.
const SLOW_MS = Number(process.env.SLOW_REQUEST_MS || 600);
app.use((req, res, next) => {
  const t0 = process.hrtime.bigint();
  const origWriteHead = res.writeHead;
  res.writeHead = function patched(...args) {
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (!res.headersSent) res.setHeader('Server-Timing', `app;dur=${ms.toFixed(1)}`);
    return origWriteHead.apply(this, args);
  };
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (ms > SLOW_MS) console.warn(`[slow-request] ${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${ms.toFixed(0)}ms`);
  });
  next();
});

// Public, rarely-changing reads can be cached briefly by the browser/CDN.
app.use('/api/news/live', (req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
  next();
});
app.use(['/api/profiles', '/api/opportunities', '/api/venues', '/api/events', '/api/articles'], (req, res, next) => {
  if (req.method === 'GET' && !req.headers.authorization) {
    res.setHeader('Cache-Control', 'public, max-age=10, stale-while-revalidate=60');
  }
  next();
});

// Health — no auth, used by uptime checks and the smoke test.
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'gigset-backend',
    version: '0.1.0',
    time: new Date().toISOString(),
  });
});

app.use('/api/auth', authRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/posts', postsRouter);
app.use('/api/opportunities', opportunitiesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api', directoryRouter); // /api/venues, /api/events, /api/articles
app.use('/api/conversations', messagesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/tracks', tracksRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/news', newsRouter);
app.use('/api/stories', storiesRouter);
app.use('/api/account', accountRouter);
app.use('/api', safetyRouter); // /api/reports, /api/blocks
app.use('/api/reviews', reviewsRouter);
app.use('/api/push', pushRouter);
app.use('/api/email', mailRouter);

// 404 for unknown /api routes.
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
});

// Central error handler — never leaks stack traces to clients.
app.use((err, req, res, _next) => {
  console.error('[api-error]', err);
  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
});

app.listen(PORT, () => {
  console.log(`[gigset-backend] listening on http://localhost:${PORT}`);
});
