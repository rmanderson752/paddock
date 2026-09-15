/**
 * Full database refresh — scrape new Bring a Trailer results, recompute
 * stats and indices, rebuild the search index. This is what the scheduled
 * job runs (Monday and Thursday at 00:01 by default).
 *
 * Usage:
 *   npm run db:refresh
 */

import { refreshDatabase } from "../src/lib/refresh";

// The launchd agent sets PADDOCK_REFRESH_TRIGGER=scheduler so automated runs
// are distinguishable from someone running this by hand.
const trigger = process.env.PADDOCK_REFRESH_TRIGGER === "scheduler" ? "scheduler" : "cli";

const started = Date.now();
refreshDatabase({ trigger, log: (m) => console.log(m) })
  .then((run) => {
    const secs = Math.round((Date.now() - started) / 1000);
    if (run.status === "ok") {
      console.log(`\nRefresh OK in ${secs}s — ${run.message}`);
      process.exit(0);
    }
    console.error(`\nRefresh FAILED after ${secs}s — ${run.message}`);
    process.exit(1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
