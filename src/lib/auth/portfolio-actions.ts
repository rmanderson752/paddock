"use server";

import { z } from "zod/v4";
import { db } from "@/lib/db";
import { portfolioItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "./session";
import { revalidatePath } from "next/cache";

const addCarSchema = z.object({
  generationId: z.string().min(1),
  purchasePrice: z.coerce.number().min(0, "Purchase price must be positive"),
  purchaseDate: z.string().optional(),
  year: z.coerce.number().int().min(1900).max(2030).optional(),
  notes: z.string().max(500).optional(),
});

export type PortfolioActionResult = {
  success: boolean;
  error?: string;
};

export async function addPortfolioCar(
  _prevState: PortfolioActionResult | null,
  formData: FormData
): Promise<PortfolioActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const raw = {
    generationId: formData.get("generationId") as string,
    purchasePrice: formData.get("purchasePrice") as string,
    purchaseDate: formData.get("purchaseDate") as string || undefined,
    year: formData.get("year") as string || undefined,
    notes: formData.get("notes") as string || undefined,
  };

  const parsed = addCarSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { generationId, purchasePrice, purchaseDate, year, notes } = parsed.data;

  try {
    const id = crypto.randomUUID();
    db.insert(portfolioItems)
      .values({
        id,
        userId: session.userId,
        generationId,
        purchasePrice: Math.round(purchasePrice * 100), // Convert dollars to cents
        purchaseDate: purchaseDate || null,
        year: year || null,
        notes: notes || null,
      })
      .run();

    revalidatePath("/portfolio");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to add car to portfolio" };
  }
}

export async function removePortfolioCar(
  portfolioItemId: string
): Promise<PortfolioActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  try {
    db.delete(portfolioItems)
      .where(
        and(
          eq(portfolioItems.id, portfolioItemId),
          eq(portfolioItems.userId, session.userId)
        )
      )
      .run();

    revalidatePath("/portfolio");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to remove car from portfolio" };
  }
}
