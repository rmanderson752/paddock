import { NextResponse } from "next/server";
import { getTopMovers } from "@/lib/data";

export async function GET() {
  try {
    const [gainers, losers] = await Promise.all([getTopMovers("gainers", 8), getTopMovers("losers", 8)]);
    return NextResponse.json({ gainers, losers });
  } catch {
    return NextResponse.json({ error: "Failed to load trending data" }, { status: 500 });
  }
}
