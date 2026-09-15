"use server";

import { z } from "zod/v4";
import { db } from "@/lib/db";
import { priceAlerts, generations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "./session";
import { revalidatePath } from "next/cache";

export type AlertType = "sale" | "threshold_above" | "threshold_below";

const createAlertSchema = z
  .object({
    generationId: z.string().min(1),
    alertType: z.enum(["sale", "threshold_above", "threshold_below"]),
    thresholdPrice: z.coerce.number().min(0).optional(),
  })
  .refine(
    (v) => v.alertType === "sale" || (v.thresholdPrice !== undefined && v.thresholdPrice > 0),
    { message: "Enter a target price", path: ["thresholdPrice"] }
  );

export type AlertActionResult = {
  success: boolean;
  error?: string;
};

const MAX_ALERTS_PER_USER = 50;

export async function createAlert(
  _prevState: AlertActionResult | null,
  formData: FormData
): Promise<AlertActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Sign in to set alerts" };

  const parsed = createAlertSchema.safeParse({
    generationId: formData.get("generationId"),
    alertType: formData.get("alertType"),
    thresholdPrice: (formData.get("thresholdPrice") as string) || undefined,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const { generationId, alertType, thresholdPrice } = parsed.data;

  try {
    const gen = db.select({ id: generations.id }).from(generations).where(eq(generations.id, generationId)).get();
    if (!gen) return { success: false, error: "Car not found" };

    const existing = db
      .select({ id: priceAlerts.id })
      .from(priceAlerts)
      .where(eq(priceAlerts.userId, session.userId))
      .all();
    if (existing.length >= MAX_ALERTS_PER_USER) {
      return { success: false, error: `You can have up to ${MAX_ALERTS_PER_USER} alerts` };
    }

    db.insert(priceAlerts)
      .values({
        id: crypto.randomUUID(),
        userId: session.userId,
        generationId,
        alertType,
        thresholdPrice: alertType === "sale" ? null : Math.round((thresholdPrice ?? 0) * 100),
        isActive: true,
      })
      .run();

    revalidatePath("/alerts");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to create alert" };
  }
}

export async function deleteAlert(alertId: string): Promise<AlertActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  try {
    db.delete(priceAlerts)
      .where(and(eq(priceAlerts.id, alertId), eq(priceAlerts.userId, session.userId)))
      .run();
    revalidatePath("/alerts");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete alert" };
  }
}

export async function setAlertActive(alertId: string, isActive: boolean): Promise<AlertActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  try {
    db.update(priceAlerts)
      .set({ isActive, updatedAt: new Date().toISOString() })
      .where(and(eq(priceAlerts.id, alertId), eq(priceAlerts.userId, session.userId)))
      .run();
    revalidatePath("/alerts");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update alert" };
  }
}
