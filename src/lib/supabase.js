import { createClient } from '@supabase/supabase-js';

// Supabase project for auth (sessions + JWTs). These are public values —
// the anon key is designed to ship in frontend bundles.
//
// The URL is normalized: supabase-js wants the project base URL, so a
// pasted value with a `/rest/v1/` suffix (like the backend's) is stripped.
function normalizeUrl(u) {
  return (u || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

const rawUrl = normalizeUrl(import.meta.env.VITE_SUPABASE_URL);
// Fall back when unset AND when set-but-empty (normalizeUrl turns a
// missing var into ''), otherwise createClient('') throws at import time.
const url = rawUrl || 'https://placeholder.supabase.co';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  console.warn(
    '[gigset] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
      'Copy .env.example to .env and fill them in (Supabase dashboard → Project Settings → API).'
  );
}

export const supabase = createClient(url ?? 'https://placeholder.supabase.co', anonKey ?? 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
