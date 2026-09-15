import { NextRequest, NextResponse } from "next/server";
import { getSalesForGeneration } from "@/lib/data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const timeframe = request.nextUrl.searchParams.get("timeframe") ?? "all";
    const sales = getSalesForGeneration(id, timeframe);

    return NextResponse.json({ id, timeframe, sales });
  } catch {
    return NextResponse.json({ error: "Failed to load sales data" }, { status: 500 });
  }
}
