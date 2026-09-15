// Runs once when the Next.js server starts. With REFRESH_SCHEDULE_ENABLED=true
// the server refreshes its own database on the weekly schedule (default:
// Monday and Thursday at 00:01 local time, override with REFRESH_SCHEDULE).

declare global {
  var __paddockSchedulerStop: (() => void) | undefined;
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.REFRESH_SCHEDULE_ENABLED !== "true") return;

  // Dev servers can call register() more than once — keep a single scheduler
  globalThis.__paddockSchedulerStop?.();

  const { startScheduler, DEFAULT_SCHEDULE } = await import("./lib/scheduler");
  const { refreshDatabase } = await import("./lib/refresh");

  globalThis.__paddockSchedulerStop = startScheduler({
    schedule: process.env.REFRESH_SCHEDULE || DEFAULT_SCHEDULE,
    run: () => refreshDatabase({ trigger: "scheduler" }),
    log: (message) => console.log(`[paddock] ${message}`),
  });
}
