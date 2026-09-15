# Paddock

Collector car value tracking — a stock-ticker for the enthusiast market. Paddock
tracks real auction results for a curated set of collector cars (JDM icons,
air-cooled Porsches, supercars, trucks & SUVs, modern collectibles) and turns
them into prices, trends, watchlists, portfolios and price alerts.

## Stack

- **Next.js 16** (App Router, React 19, server actions, `proxy.ts` route guard)
- **TypeScript** (strict), **Tailwind CSS v4**
- **SQLite** via `better-sqlite3` + **Drizzle ORM**, with an FTS5 search index
- **Recharts** for price history, **Zod** for validation, **jose** for JWT sessions
- **Vitest** for unit tests

## Getting started

```bash
npm install
cp .env.example .env        # set JWT_SECRET (required in production)
npm run db:seed             # creates data/paddock.db with makes/models/generations
npm run db:scrape           # pulls completed auctions from Bring a Trailer (~2 min)
npm run dev                 # http://localhost:3000
```

`db:scrape` finishes by recomputing all stats. If you change sales data by
hand, run `npm run db:stats` to rebuild the derived tables.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev server / production build / serve |
| `npm run lint` / `typecheck` / `test` | ESLint, `tsc --noEmit`, Vitest |
| `npm run db:seed` | **Recreates** `data/paddock.db` with the reference data in `scripts/seed.ts` (no sales) |
| `npm run db:scrape` | Scrapes completed BaT auctions for every configured generation, then refreshes stats. Supports `--dry-run` and `--car "e30 m3"` |
| `npm run db:stats` | Recomputes `generation_stats` and `category_indices` from the `sales` table |
| `npm run db:refresh` | The full refresh the schedule runs: scrape → stats → search index, recorded in `refresh_runs` and `data/logs/refresh.log` |
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

Two ways to run the schedule:

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
| `NEXT_PUBLIC_APP_URL` | Used for the sitemap and robots.txt |
| `DATABASE_PATH` | Defaults to `./data/paddock.db` |
| `REFRESH_SCHEDULE_ENABLED` | `true` to run the refresh schedule inside the Next.js server |
| `REFRESH_SCHEDULE` | Defaults to `mon 00:01, thu 00:01` (server local time) |

## Deployment note

Paddock uses an embedded SQLite file, so it needs a host with a persistent
filesystem and a Node runtime (a VPS, Fly.io, Railway, Render, a container).
Serverless platforms without persistent disks will need the data layer moved
to a hosted database first.
