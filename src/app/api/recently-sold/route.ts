import { NextResponse } from "next/server";
import { getRecentSales } from "@/lib/data";

export async function GET() {
  try {
    const sales = await getRecentSales(10);
    return NextResponse.json({ sales });
  } catch {
    return NextResponse.json({ error: "Failed to load recent sales" }, { status: 500 });
  }
}
