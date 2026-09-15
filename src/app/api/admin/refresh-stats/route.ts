import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { refreshAllStats } from "@/lib/stats";
import { revalidatePath } from "next/cache";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!(await isAdmin(session))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const summary = await refreshAllStats();
    revalidatePath("/", "layout");

    return NextResponse.json({
      message: `Recomputed ${summary.generationsUpdated} generations and ${summary.categories} indices (data through ${summary.asOf})`,
      ...summary,
    });
  } catch {
    return NextResponse.json({ error: "Failed to refresh stats" }, { status: 500 });
  }
}
