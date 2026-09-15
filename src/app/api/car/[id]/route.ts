import { NextRequest, NextResponse } from "next/server";
import { getGenerationWithDetails } from "@/lib/data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = getGenerationWithDetails(id);

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ id, data });
  } catch {
    return NextResponse.json({ error: "Failed to load car data" }, { status: 500 });
  }
}
