# Paddock

Collector car value tracking — a stock-ticker for the enthusiast market. Paddock
tracks real auction results for a curated set of collector cars (JDM icons,
air-cooled Porsches, supercars, trucks & SUVs, modern collectibles) and turns
them into prices, trends, watchlists, portfolios and price alerts.

## Stack

- **Next.js 16** (App Router, React 19, server actions, `proxy.ts` route guard)
- **TypeScript** (strict), **Tailwind CSS v4**
- **SQLite / Turso** via `@libsql/client` + **Drizzle ORM**, with an FTS5 search index — a local file in development, [Turso](https://turso.tech) in production
- **Recharts** for price history, **Zod** for validation, **jose** for JWT sessions
- **Vitest** for unit tests

## Getting started

```bash
npm install
cp .env.example .env        # set JWT_SECRET (required in production)
npm run db:seed             # creates data/paddock.db with makes/models/generations
npm run db:refresh          # pulls completed auctions from Bring a Trailer (~90 s) + computes stats
npm run dev                 # http://localhost:3000
```

If you change sales data by hand, run `npm run db:stats` to rebuild the
derived tables.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev server / production build / serve |
| `npm run lint` / `typecheck` / `test` | ESLint, `tsc --noEmit`, Vitest |
| `npm run db:seed` | **Recreates** `data/paddock.db` with the reference data in `scripts/seed.ts` (no sales) |
| `npm run db:scrape` | Scrapes completed BaT auctions for every configured generation, then refreshes stats. Supports `--dry-run` and `--car "e30 m3"` |
| `npm run db:stats` | Recomputes `generation_stats` and `category_indices` from the `sales` table |
| `npm run db:refresh` | The full refresh the schedule runs: scrape → stats → search index, recorded in `refresh_runs` and `data/logs/refresh.log` |
| `npm run db:export` | Writes `data/paddock-export.db`, a clean copy for `turso db create --from-file` |
| `npm run schedule:install` / `status` / `uninstall` | macOS launchd agent that runs `db:refresh` every Monday and Thursday at 00:01 |
| `npm run db:clean` | One-off cleanup of early scraper data (parts listings, mis-filed variants). Idempotent |
| `npm run db:studio` | Drizzle Studio for browsing the database |

`scripts/insert-researched-sales.ts` adds hand-researched results for cars that
have no BaT model page (F40, McLaren F1, 22B STI).

## How the numbers work

Everything derives from the `sales` table (one row per completed or
bid-not-met auction, prices in USD cents). `src/lib/stats-core.ts` holds the
pure math; `src/lib/stats.ts` writes it back to the database.

- **As-of date** — the most recent completed sale. Every "12-month" window is
  measured back from this date, so a snapshot that is a few months old still
  reports sensible figures. The date is shown in the footer and on charts.
- **Avg (12mo), 52-wk high/low, sales count** — over completed sales in the
  12 months before the as-of date. Bid-not-met listings are kept for the
  record but never shown as sales.
- **12-mo trend** — median price of the newer half of the window's sales vs.
  the older half. Needs at least 4 sales; medians keep one concours example
  from swinging the number. ±3% counts as "stable".
- **Category index** — the median of the category's per-model 12-month
  averages, in hundreds of dollars (an index of 2,847 ≈ a typical model at
  $284,700). Quarterly change is the equal-weighted change in each model's
  median sale price across the two most recent 90-day windows.

## Scheduled refresh

The database refreshes itself **every Monday and Thursday at 00:01** (local
time). Each run scrapes every configured BaT model page, inserts sales it
hasn't seen, recomputes stats and indices, and rebuilds the search index. Runs
are recorded in `refresh_runs` (shown on the admin dashboard, which also has a
"Refresh now" button) and appended to `data/logs/refresh.log`.

Three ways to run the schedule:

- **On Vercel** — `vercel.json` registers a cron that calls
  `GET /api/cron/refresh` at `1 5 * * 1,4` UTC (00:01 EST / 01:01 EDT on
  Monday and Thursday). Set `CRON_SECRET`; Vercel sends it as a Bearer token,
  and you can trigger a run by hand with
  `curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/refresh`.
  Hobby-plan crons fire within an hour of the schedule.
- **On a Mac** — `npm run schedule:install` installs a launchd agent
  (`~/Library/LaunchAgents/com.paddock.refresh.plist`) that runs
  `npm run db:refresh` in this directory. launchd runs a missed 00:01 slot when
  the machine wakes, so a sleeping laptop still catches up. `npm run
  schedule:status` shows whether it's loaded and the last log lines;
  `npm run schedule:uninstall` removes it.
- **On a server** — set `REFRESH_SCHEDULE_ENABLED=true` and the Next.js server
  process (`next start`) schedules itself via `src/instrumentation.ts`.
  Override the times with `REFRESH_SCHEDULE="mon 00:01, thu 00:01"`; times are
  in the process's local timezone (`TZ`).

## Project layout

```
src/
  app/                 routes (App Router)
    (auth)/            login, signup
    (protected)/       portfolio, watchlist, alerts, profile
    admin/             admin dashboard (first user, or ADMIN_EMAILS)
    api/               JSON endpoints (search, car, trending, indices, admin)
    browse/, car/, compare/, search/
  components/
    features/          alerts, auth, browse, car-detail, compare, dashboard,
                       portfolio, search, watchlist
    layout/            Header, MobileNav, Footer
    ui/                Button, Card, Input, Sparkline, ...
  lib/
    data.ts            read queries (server only)
    stats-core.ts      pure statistics (shared with client + scripts)
    stats.ts           recompute derived tables (server only)
    refresh.ts         full refresh job (scrape → stats → search index) + run history
    scheduler.ts       weekly in-process scheduler (started by instrumentation.ts)
    scraper/bat.ts     Bring a Trailer scraper
    alerts.ts          evaluate price alerts against current data
    auth/              sessions (JWT cookie), server actions, admin check
    db/                Drizzle schema + SQLite connection + FTS5 helpers
  proxy.ts             protects /portfolio, /watchlist, /alerts, /profile, /admin
  instrumentation.ts   starts the in-app refresh scheduler when enabled
scripts/               seed, scrape, clean, refresh-stats, refresh-db, schedule/ (launchd)
data/                  paddock.db (git-ignored)
```

## Theme

Sand paper, darker-sand panels, wealthy green accents. Colors are defined once
in `src/app/globals.css` as context-aware CSS variables: anything painted with
`bg-surface` is a panel, anything painted solid green flips its text to cream.
Chart colors live in `src/lib/theme.ts`.

## Environment

| Variable | Notes |
| --- | --- |
| `JWT_SECRET` | Required in production. `openssl rand -base64 32` |
| `ADMIN_EMAILS` | Comma-separated. Without it the first account created is the admin |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Enables "Continue with Google" (see below) |
| `NEXT_PUBLIC_APP_URL` | Used for the sitemap and robots.txt |
| `DATABASE_PATH` | Local SQLite file, defaults to `./data/paddock.db` |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Production database on Turso; the URL overrides `DATABASE_PATH` |
| `CRON_SECRET` | Protects `/api/cron/refresh` (required on Vercel) |
| `REFRESH_SCHEDULE_ENABLED` | `true` to run the refresh schedule inside a long-running Next.js server |
| `REFRESH_SCHEDULE` | Defaults to `mon 00:01, thu 00:01` (server local time) |

## Sign in with Google

Optional. Create an OAuth client in the
[Google Cloud Console](https://console.cloud.google.com/apis/credentials)
(APIs & Services → Credentials → Create credentials → OAuth client ID → Web
application) with these **Authorized redirect URIs**:

```
https://<your-domain>/api/auth/google/callback
http://localhost:3000/api/auth/google/callback
```

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` and the button appears on
the login and signup pages. The flow is plain OpenID Connect
(`src/lib/auth/google.ts`): the ID token is verified against Google's keys,
an existing password account with the same verified email is linked rather
than duplicated, and Google-only accounts simply have no password.

## Deploying to Vercel + Turso

1. **Create the Turso database from the local file** (one time):
   ```bash
   brew install tursodatabase/tap/turso && turso auth login
   npm run db:export
   turso db create paddock --from-file data/paddock-export.db
   turso db show paddock --url        # → TURSO_DATABASE_URL
   turso db tokens create paddock     # → TURSO_AUTH_TOKEN
   ```
2. **Import the GitHub repo** in Vercel (Add New → Project) and set the
   Production environment variables: `JWT_SECRET`, `ADMIN_EMAILS`,
   `NEXT_PUBLIC_APP_URL`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `CRON_SECRET`
   (plus `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` for Google sign-in).
3. **Deploy.** The cron in `vercel.json` registers automatically. Sign up on
   the live site with an `ADMIN_EMAILS` address to get the admin dashboard,
   where refresh runs are listed and can be triggered by hand.

The same code runs against the local file when `TURSO_DATABASE_URL` is unset,
so development, tests and scripts need no Turso account. Scripts run against
Turso when the variables are in `.env` (`db:seed` then needs `--force`).
