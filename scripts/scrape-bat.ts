/**
 * Bring a Trailer scraper — CLI.
 *
 * Usage:
 *   npm run db:scrape                      # scrape every configured car, then refresh stats
 *   npx tsx scripts/scrape-bat.ts --dry-run          # preview without saving
 *   npx tsx scripts/scrape-bat.ts --car "e30 m3"     # scrape a specific car
 *
 * The scraping logic lives in src/lib/scraper/bat.ts; for the full refresh
 * (scrape + stats + search index, recorded in refresh_runs) use `npm run db:refresh`.
 */

import "./env";
import { scrapeBaT } from "../src/lib/scraper/bat";
import { refreshAllStats } from "../src/lib/stats";
import { rebuildFtsIndex } from "../src/lib/db";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const carFilter = args.find((a, i) => args[i - 1] === "--car");

  console.log("Paddock — BaT Scraper");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE (writing to DB)"}\n`);

  const summary = await scrapeBaT({ dryRun, carFilter, log: (m) => console.log(m) });

  if (dryRun) {
    for (const car of summary.cars) {
      for (const sale of car.sales ?? []) {
        const priceStr = `$${(sale.salePrice / 100).toLocaleString()}`;
        const status = sale.sold ? "SOLD" : "BID";
        const miles = sale.mileage ? `${Math.round(sale.mileage / 1000)}k mi` : "? mi";
        console.log(`    ${sale.year || "?"} | ${priceStr.padEnd(12)} | ${sale.saleDate} | ${status} | ${miles} | ${sale.title.substring(0, 50)}`);
      }
    }
  }

  console.log("\n========================================");
  console.log(`Pages fetched: ${summary.pagesFetched}`);
  console.log(`Total matched: ${summary.totalMatched}`);
  if (!dryRun) {
    console.log(`Total inserted: ${summary.totalInserted}`);
    const stats = await refreshAllStats();
    await rebuildFtsIndex();
    console.log(`Stats refreshed as of ${stats.asOf}: ${stats.generationsUpdated} generations, ${stats.categories} categories`);
  }
  console.log("Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
