import { NextResponse } from "next/server";
import { getCategoryIndices } from "@/lib/data";

export async function GET() {
  try {
    const indices = await getCategoryIndices();
    return NextResponse.json({ indices });
  } catch {
    return NextResponse.json({ error: "Failed to load indices" }, { status: 500 });
  }
}
