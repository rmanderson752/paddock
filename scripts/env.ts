// Load .env and .env.local for CLI scripts, the way Next.js does for the app,
// so `npm run db:*` talks to the same database as `npm run dev`. Variables
// already present in the environment win; missing files are fine.

import * as fs from "fs";
import * as path from "path";

for (const file of [".env", ".env.local"]) {
  const full = path.resolve(file);
  if (!fs.existsSync(full)) continue;
  try {
    process.loadEnvFile(full);
  } catch {
    // ignore unreadable env files
  }
}
