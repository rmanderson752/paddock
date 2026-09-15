import { NextResponse, type NextRequest } from "next/server";
import { refreshDatabase } from "@/lib/refresh";

// Vercel Cron target (see vercel.json). Vercel calls it with
// `Authorization: Bearer <CRON_SECRET>`; the same header lets you trigger it
// by hand with curl. Scraping ~30 BaT pages takes about 90 seconds.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await refreshDatabase({ trigger: "scheduler" });
  const status = run.status === "ok" ? 200 : 500;
  return NextResponse.json({ ok: run.status === "ok", run }, { status });
}
