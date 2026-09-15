/**
 * Recompute generation stats and category indices from the sales table.
 *
 * Usage:
 *   npm run db:stats
 */

import { refreshAllStats } from "../src/lib/stats";

const summary = refreshAllStats();
console.log(`Data as of ${summary.asOf}`);
console.log(`Generations updated: ${summary.generationsUpdated} (${summary.generationsCleared} without completed sales)`);
console.log(`Category indices: ${summary.categories}`);
