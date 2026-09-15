import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getGenerationsWithDetailsByIds } from "@/lib/data";
import { db } from "@/lib/db";
import { portfolioItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const dbItems = await db
      .select()
      .from(portfolioItems)
      .where(eq(portfolioItems.userId, session.userId))
      .all();
    const cars = new Map(
      (await getGenerationsWithDetailsByIds([...new Set(dbItems.map((r) => r.generationId))])).map((c) => [c.id, c])
    );

    const rows = dbItems
      .map((row) => {
        const car = cars.get(row.generationId);
        if (!car) return null;
        const currentValue = car.stats.avgPrice12mo / 100;
        const purchasePrice = row.purchasePrice / 100;
        const gain = currentValue - purchasePrice;
        const gainPct = purchasePrice > 0 ? ((gain / purchasePrice) * 100).toFixed(1) : "0";
        return {
          make: car.make.name,
          model: car.model.name,
          generation: car.name,
          year: row.year ?? "",
          purchasePrice: purchasePrice.toFixed(0),
          currentValue: currentValue.toFixed(0),
          gain: gain.toFixed(0),
          gainPercent: `${gainPct}%`,
          trend: car.stats.trendDirection,
          trendPercent: `${car.stats.trendPercentage}%`,
          notes: row.notes ?? "",
          purchaseDate: row.purchaseDate ?? "",
        };
      })
      .filter(Boolean);

    const headers = [
      "Make", "Model", "Generation", "Year", "Purchase Price (USD)",
      "Current Value (USD)", "Gain/Loss (USD)", "Gain/Loss %",
      "Trend", "Trend %", "Notes", "Purchase Date",
    ];

    const csvLines = [
      headers.join(","),
      ...rows.map((r) => {
        if (!r) return "";
        return [
          r.make, r.model, r.generation, r.year, r.purchasePrice,
          r.currentValue, r.gain, r.gainPercent,
          r.trend, r.trendPercent,
          `"${(r.notes).replace(/"/g, '""')}"`,
          r.purchaseDate,
        ].join(",");
      }),
    ];

    const csv = csvLines.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="paddock-portfolio-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
