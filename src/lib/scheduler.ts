// In-process weekly scheduler for the database refresh.
//
// Started from src/instrumentation.ts when REFRESH_SCHEDULE_ENABLED=true, so
// a long-running `next start` refreshes itself. Times are in the server's
// local timezone (set TZ if the host isn't in the right one). For a machine
// that isn't always awake, use the launchd agent in scripts/schedule instead.

export interface ScheduleEntry {
  weekday: number; // 0 = Sunday … 6 = Saturday
  hour: number;
  minute: number;
}

export const DEFAULT_SCHEDULE = "mon 00:01, thu 00:01";

const WEEKDAYS: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

/** Parse "mon 00:01, thu 00:01" into schedule entries. Throws on bad input. */
export function parseSchedule(spec: string): ScheduleEntry[] {
  const entries = spec
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^([a-z]+)\s+(\d{1,2}):(\d{2})$/i);
      if (!m) throw new Error(`Bad schedule entry "${part}" — expected e.g. "mon 00:01"`);
      const weekday = WEEKDAYS[m[1].toLowerCase()];
      const hour = Number(m[2]);
      const minute = Number(m[3]);
      if (weekday === undefined) throw new Error(`Unknown weekday in "${part}"`);
      if (hour > 23 || minute > 59) throw new Error(`Bad time in "${part}"`);
      return { weekday, hour, minute };
    });
  if (entries.length === 0) throw new Error("Schedule is empty");
  return entries;
}

function nextForEntry(entry: ScheduleEntry, from: Date): Date {
  const d = new Date(from);
  d.setHours(entry.hour, entry.minute, 0, 0);
  // Walk forward a day at a time until the weekday matches and it's in the
  // future; re-setting the time each step keeps DST changes from shifting it.
  for (let i = 0; i < 8 && (d.getDay() !== entry.weekday || d <= from); i++) {
    d.setDate(d.getDate() + 1);
    d.setHours(entry.hour, entry.minute, 0, 0);
  }
  return d;
}

/** The earliest upcoming run strictly after `from`, in local time. */
export function nextRunAt(entries: ScheduleEntry[], from: Date = new Date()): Date {
  return entries
    .map((e) => nextForEntry(e, from))
    .reduce((a, b) => (a < b ? a : b));
}

export function describeSchedule(entries: ScheduleEntry[]): string {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return entries
    .map((e) => `${names[e.weekday]} ${String(e.hour).padStart(2, "0")}:${String(e.minute).padStart(2, "0")}`)
    .join(", ");
}

interface SchedulerOptions {
  schedule?: string;
  run: () => Promise<unknown>;
  log?: (message: string) => void;
}

// Timers can't exceed ~24.8 days; more importantly, re-checking the clock
// every few hours keeps the schedule honest across sleep/wake and DST.
const MAX_WAIT_MS = 6 * 60 * 60 * 1000;

/** Start the scheduler. Returns a stop function. */
export function startScheduler({ schedule = DEFAULT_SCHEDULE, run, log = () => {} }: SchedulerOptions): () => void {
  const entries = parseSchedule(schedule);
  let timer: NodeJS.Timeout | null = null;
  let stopped = false;
  let next = nextRunAt(entries);

  log(`refresh scheduler armed: ${describeSchedule(entries)} (next ${next.toLocaleString()})`);

  const tick = async () => {
    if (stopped) return;
    const now = new Date();
    if (now >= next) {
      try {
        await run();
      } catch (err) {
        log(`scheduled refresh threw: ${err instanceof Error ? err.message : String(err)}`);
      }
      next = nextRunAt(entries, new Date());
      log(`next scheduled refresh: ${next.toLocaleString()}`);
    }
    if (!stopped) {
      const wait = Math.max(1000, Math.min(next.getTime() - Date.now(), MAX_WAIT_MS));
      timer = setTimeout(tick, wait);
      timer.unref?.();
    }
  };

  const wait = Math.max(1000, Math.min(next.getTime() - Date.now(), MAX_WAIT_MS));
  timer = setTimeout(tick, wait);
  timer.unref?.();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
