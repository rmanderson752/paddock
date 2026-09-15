import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { rebuildFtsIndex } from "@/lib/db";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!(await isAdmin(session))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await rebuildFtsIndex();

    return NextResponse.json({ message: "Search index rebuilt successfully" });
  } catch {
    return NextResponse.json({ error: "Failed to rebuild index" }, { status: 500 });
  }
}
