// Server-only — the full database refresh: scrape new Bring a Trailer results,
// recompute stats and indices, rebuild the search index. Every run is recorded
// in `refresh_runs` (shown on the admin dashboard) and appended to
// data/logs/refresh.log. Runs from the scheduler, the CLI and the admin page.

import * as fs from "fs";
import * as path from "path";
import { client, dbReady, rebuildFtsIndex } from "./db";
import { scrapeBaT } from "./scraper/bat";
import { refreshAllStats } from "./stats";

export type RefreshTrigger = "scheduler" | "manual" | "cli";

export interface RefreshRun {
  id: string;
  trigger: RefreshTrigger;
  startedAt: string;
  finishedAt: string | null;
  status: "running" | "ok" | "error";
  salesInserted: number | null;
  pagesFetched: number | null;
  message: string | null;
}

export interface RefreshOptions {
  trigger: RefreshTrigger;
  /** Progress output (the file log is always written) */
  log?: (message: string) => void;
}

/** Created lazily so databases seeded before this table existed keep working. */
export async function ensureRefreshRunsTable(): Promise<void> {
  await dbReady();
  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS refresh_runs (
        id TEXT PRIMARY KEY,
        trigger TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        status TEXT NOT NULL,
        sales_inserted INTEGER,
        pages_fetched INTEGER,
        message TEXT
      )`,
      "CREATE INDEX IF NOT EXISTS idx_refresh_runs_started ON refresh_runs(started_at)",
    ],
    "write"
  );
}

// File log for local/self-hosted runs. On Vercel the filesystem is read-only,
// so this silently does nothing there and the refresh_runs table is the record.
const logDir = path.resolve(process.env.LOG_DIR ?? "data/logs");
const fileLogEnabled = !process.env.VERCEL;

function appendLog(line: string): void {
  if (!fileLogEnabled) return;
  try {
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(path.join(logDir, "refresh.log"), `${new Date().toISOString()} ${line}\n`);
  } catch {
    // Logging must never break the refresh itself
  }
}

let inFlight: Promise<RefreshRun> | null = null;

/** True while a refresh is running in this process. */
export function isRefreshRunning(): boolean {
  return inFlight !== null;
}

/**
 * Run a full refresh. Concurrent callers share the in-flight run rather than
 * scraping twice.
 */
export function refreshDatabase(options: RefreshOptions): Promise<RefreshRun> {
  if (inFlight) return inFlight;
  inFlight = runRefresh(options).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runRefresh({ trigger, log }: RefreshOptions): Promise<RefreshRun> {
  await ensureRefreshRunsTable();
  const emit = (message: string) => {
    appendLog(message);
    log?.(message);
  };

  const id = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  await client.execute({
    sql: "INSERT INTO refresh_runs (id, trigger, started_at, status) VALUES (?, ?, ?, 'running')",
    args: [id, trigger, startedAt],
  });
  emit(`[${trigger}] refresh started`);

  try {
    const scrape = await scrapeBaT({ log: emit });
    emit(`scrape complete: ${scrape.pagesFetched} pages, ${scrape.totalMatched} matched, ${scrape.totalInserted} new sales`);

    const stats = await refreshAllStats();
    emit(`stats refreshed as of ${stats.asOf}: ${stats.generationsUpdated} generations, ${stats.categories} categories`);

    await rebuildFtsIndex();
    emit("search index rebuilt");

    const message = `${scrape.totalInserted} new sale${scrape.totalInserted === 1 ? "" : "s"} · data through ${stats.asOf}`;
    const finishedAt = new Date().toISOString();
    await client.execute({
      sql: "UPDATE refresh_runs SET finished_at = ?, status = 'ok', sales_inserted = ?, pages_fetched = ?, message = ? WHERE id = ?",
      args: [finishedAt, scrape.totalInserted, scrape.pagesFetched, message, id],
    });
    emit(`[${trigger}] refresh finished: ${message}`);

    return {
      id, trigger, startedAt, finishedAt, status: "ok",
      salesInserted: scrape.totalInserted, pagesFetched: scrape.pagesFetched, message,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const finishedAt = new Date().toISOString();
    await client.execute({
      sql: "UPDATE refresh_runs SET finished_at = ?, status = 'error', message = ? WHERE id = ?",
      args: [finishedAt, message, id],
    }).catch(() => undefined);
    emit(`[${trigger}] refresh FAILED: ${message}`);
    return {
      id, trigger, startedAt, finishedAt, status: "error",
      salesInserted: null, pagesFetched: null, message,
    };
  }
}

/** Most recent runs, newest first. */
export async function getRecentRefreshRuns(limit = 10): Promise<RefreshRun[]> {
  await ensureRefreshRunsTable();
  const res = await client.execute({
    sql: `SELECT id, trigger, started_at, finished_at, status, sales_inserted, pages_fetched, message
          FROM refresh_runs ORDER BY started_at DESC LIMIT ?`,
    args: [limit],
  });
  return res.rows.map((r) => ({
    id: String(r.id),
    trigger: r.trigger as RefreshTrigger,
    startedAt: String(r.started_at),
    finishedAt: r.finished_at === null ? null : String(r.finished_at),
    status: r.status as RefreshRun["status"],
    salesInserted: r.sales_inserted === null ? null : Number(r.sales_inserted),
    pagesFetched: r.pages_fetched === null ? null : Number(r.pages_fetched),
    message: r.message === null ? null : String(r.message),
  }));
}
