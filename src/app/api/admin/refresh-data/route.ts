import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { refreshDatabase, isRefreshRunning } from "@/lib/refresh";
import { revalidatePath } from "next/cache";

// Scraping ~30 model pages at 2.5s each takes a couple of minutes
export const maxDuration = 300;

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!(await isAdmin(session))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const alreadyRunning = isRefreshRunning();
    const run = await refreshDatabase({ trigger: "manual" });
    revalidatePath("/", "layout");

    if (run.status !== "ok") {
      return NextResponse.json({ error: `Refresh failed: ${run.message}`, run }, { status: 500 });
    }
    return NextResponse.json({
      message: `${alreadyRunning ? "Joined the refresh already in progress — " : ""}${run.message}`,
      run,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refresh failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
