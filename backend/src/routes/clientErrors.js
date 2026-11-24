import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';

/* Crash reports from the website. They go to the server log only, as one line each:
   search Render → Logs for "[client-error]". Nothing is stored in the database. */
const router = Router();
const clip = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');

router.post('/', optionalAuth, (req, res) => {
  const b = req.body || {};
  const message = clip(b.message, 300);
  if (message) {
    console.error('[client-error]', JSON.stringify({
      message,
      where: clip(b.where, 20),
      page: clip(b.page, 120),
      user: req.user?.id || null,
      ua: clip(b.ua, 200),
      stack: clip(b.stack, 2000),
    }));
  }
  res.status(204).end();
});

export default router;
