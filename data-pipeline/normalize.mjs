// Shared helpers for the Gigset data pipeline.
// Plain Node 22, zero dependencies.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)));
export const CACHE_DIR = join(ROOT, ".cache");
export const OUT_DIR = join(ROOT, "..", "src", "data", "live");

export async function ensureDirs() {
  await mkdir(CACHE_DIR, { recursive: true });
  await mkdir(OUT_DIR, { recursive: true });
}

/** Strip HTML tags + decode common entities, collapse whitespace. */
export function stripHtml(html = "") {
  let s = String(html);
  s = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<[^>]+>/g, " ");
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
  return s.replace(/\s+/g, " ").trim();
}

/** Parse any date-ish string to ISO 8601, or "" if unparseable. */
export function toISODate(d) {
  if (!d) return "";
  let s = String(d).trim();
  // V8 rejects numeric TZ offsets without a colon: +0530 -> +05:30
  s = s.replace(/([+-])(\d{2})(\d{2})$/, "$1$2:$3");
  const t = new Date(s);
  return Number.isNaN(t.getTime()) ? "" : t.toISOString();
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * fetch with timeout, retries and exponential backoff.
 * opts: { timeoutMs=30000, retries=3, backoffMs=1500 }
 * Retries on network errors, timeouts, 429 and 5xx.
 */
export async function fetchWithRetry(url, opts = {}) {
  const { timeoutMs = 30000, retries = 3, backoffMs = 1500, headers = {} } = opts;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new Error("timeout")), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status}`);
        if (attempt < retries) await sleep(backoffMs * 2 ** attempt);
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < retries) await sleep(backoffMs * 2 ** attempt);
    }
  }
  throw lastErr;
}

// ---------- disk cache ----------

const cachePath = (key) => join(CACHE_DIR, `${key}.json`);

/** Read cache entry; returns null when missing or expired (ttlMs). */
export async function cacheGet(key, ttlMs) {
  try {
    const raw = await readFile(cachePath(key), "utf8");
    const entry = JSON.parse(raw);
    if (Date.now() - entry.at > ttlMs) return null;
    return entry.data;
  } catch {
    return null;
  }
}

/** Write data to cache with a timestamp. */
export async function cacheSet(key, data) {
  try {
    await writeFile(cachePath(key), JSON.stringify({ at: Date.now(), data }));
  } catch (err) {
    console.warn(`[cache] write failed for ${key}: ${err.message}`);
  }
}

/** Write final JSON output file. Returns the file path. */
export async function writeOutput(name, data) {
  const p = join(OUT_DIR, name);
  await writeFile(p, JSON.stringify(data, null, 2) + "\n");
  return p;
}

/** Dedupe array by key function, keeping first occurrence. */
export function dedupe(arr, keyFn) {
  const seen = new Set();
  return arr.filter((item) => {
    const k = keyFn(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
