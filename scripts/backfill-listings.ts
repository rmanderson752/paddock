/**
 * One-time backfill: fetch the Bring a Trailer listing page for every stored
 * sale that only has a one-line excerpt (or nothing), and store the full
 * write-up plus the "BaT Essentials" bullets in `sale_listings`.
 *
 * Rate limited to one page every 2.5 s, so ~800 sales take about 35 minutes.
 * Safe to interrupt and re-run — it only fetches what is still missing.
 *
 * Usage:
 *   npx tsx scripts/backfill-listings.ts              # everything pending
 *   npx tsx scripts/backfill-listings.ts --limit 50   # a slice
 *   npx tsx scripts/backfill-listings.ts --filter porsche-993
 *   npx tsx scripts/backfill-listings.ts --include-unsold   # bid-not-met listings too
 */

import "./env";
import { fetchMissingListings } from "../src/lib/listings";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const limit = Number(arg("limit") ?? 10_000);
const urlFilter = arg("filter");
const started = Date.now();

fetchMissingListings({ limit, urlFilter, soldOnly: !process.argv.includes("--include-unsold"), log: (m) => console.log(m) })
  .then((s) => {
    const secs = Math.round((Date.now() - started) / 1000);
    console.log(`\nDone in ${secs}s — fetched ${s.fetched}, failed ${s.failed}, ${s.remaining} still pending`);
    process.exit(s.failed > 0 && s.fetched === 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
