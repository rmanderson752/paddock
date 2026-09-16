import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { fetchMissingListings } from "@/lib/listings";
import { extractPendingSales, isConfigured } from "@/lib/extraction";

// A bounded pass: up to 25 listing pages (rate limited) and 50 extractions
export const maxDuration = 300;

export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (!(await isAdmin(session))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const listings = await fetchMissingListings({ limit: 25, timeBudgetMs: 70_000 });
    if (!isConfigured()) {
      return NextResponse.json({
        message: `${listings.fetched} listing page${listings.fetched === 1 ? "" : "s"} fetched (${listings.remaining} pending). Extraction skipped — ANTHROPIC_API_KEY is not set.`,
      });
    }
    const extraction = await extractPendingSales({ limit: 50, timeBudgetMs: 200_000 });
    revalidatePath("/", "layout");
    return NextResponse.json({
      message: `${listings.fetched} listing page${listings.fetched === 1 ? "" : "s"} fetched (${listings.remaining} pending) · ${extraction.extracted} extracted, ${extraction.failed} failed, $${extraction.costUsd.toFixed(3)} (${Math.max(0, extraction.pending - extraction.extracted)} still pending)`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
