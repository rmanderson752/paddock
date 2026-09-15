import { NextRequest, NextResponse } from "next/server";
import { searchGenerations } from "@/lib/data";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q");

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchGenerations(q);
    return NextResponse.json({ results, query: q });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
