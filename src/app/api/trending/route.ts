import { NextResponse } from "next/server";
import { getTopMovers } from "@/lib/data";

export async function GET() {
  try {
    const gainers = getTopMovers("gainers", 8);
    const losers = getTopMovers("losers", 8);
    return NextResponse.json({ gainers, losers });
  } catch {
    return NextResponse.json({ error: "Failed to load trending data" }, { status: 500 });
  }
}
