// Orchestrator: runs the three fetchers, writes output files, prints a summary.
// Usage: cd data-pipeline && node run.mjs
import { ensureDirs, writeOutput } from "./normalize.mjs";
import { fetchVenues } from "./fetch-venues.mjs";
import { fetchEvents } from "./fetch-events.mjs";
import { fetchNews } from "./fetch-news.mjs";

const notes = [];
const sources = new Set();

async function main() {
  await ensureDirs();

  let venues = [];
  try {
    venues = await fetchVenues();
    if (venues.length) sources.add("OpenStreetMap");
    else notes.push("OpenStreetMap: no venues returned");
  } catch (err) {
    notes.push(`OpenStreetMap failed: ${err.message}`);
  }

  let events = [];
  try {
    const r = await fetchEvents(notes);
    events = r.events;
    if (events.length) {
      if (events.some((e) => e.source === "Ticketmaster")) sources.add("Ticketmaster");
      if (events.some((e) => e.source === "Bandsintown")) sources.add("Bandsintown");
    }
  } catch (err) {
    notes.push(`events failed: ${err.message}`);
  }

  let news = [];
  try {
    const r = await fetchNews(notes);
    news = r.articles;
    for (const a of news) sources.add(a.source);
  } catch (err) {
    notes.push(`news failed: ${err.message}`);
  }

  await writeOutput("venues.json", venues);
  await writeOutput("events.json", events);
  await writeOutput("news.json", news);
  await writeOutput("meta.json", {
    fetched_at: new Date().toISOString(),
    counts: { venues: venues.length, events: events.length, news: news.length },
    sources: [...sources],
    notes,
  });

  const row = (label, n) => console.log(label.padEnd(10) + String(n).padStart(6));
  console.log("\n===== Gigset data pipeline =====");
  row("venues", venues.length);
  row("events", events.length);
  row("news", news.length);
  console.log("sources:", [...sources].join(", ") || "(none)");
  if (notes.length) {
    console.log("notes:");
    for (const n of notes) console.log("  - " + n);
  }
  console.log("output: src/data/live/{venues,events,news,meta}.json");
}

main().catch((err) => {
  console.error("[run] fatal:", err.message);
  process.exit(1);
});
