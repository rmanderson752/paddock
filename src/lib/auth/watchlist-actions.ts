"use server";

import { db } from "@/lib/db";
import { watchlistItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "./session";
import { revalidatePath } from "next/cache";

export async function addToWatchlist(generationId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  try {
    const existing = await db
      .select()
      .from(watchlistItems)
      .where(
        and(
          eq(watchlistItems.userId, session.userId),
          eq(watchlistItems.generationId, generationId)
        )
      )
      .get();

    if (existing) return { success: true };

    const id = crypto.randomUUID();
    await db.insert(watchlistItems)
      .values({ id, userId: session.userId, generationId })
      .run();

    revalidatePath("/watchlist");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to add to watchlist" };
  }
}

export async function removeFromWatchlist(generationId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  try {
    await db.delete(watchlistItems)
      .where(
        and(
          eq(watchlistItems.userId, session.userId),
          eq(watchlistItems.generationId, generationId)
        )
      )
      .run();

    revalidatePath("/watchlist");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to remove from watchlist" };
  }
}

export async function toggleWatchlist(generationId: string) {
  const session = await getSession();
  if (!session) return { success: false, watched: false, error: "Not authenticated" };

  try {
    const existing = await db
      .select()
      .from(watchlistItems)
      .where(
        and(
          eq(watchlistItems.userId, session.userId),
          eq(watchlistItems.generationId, generationId)
        )
      )
      .get();

    if (existing) {
      await db.delete(watchlistItems)
        .where(eq(watchlistItems.id, existing.id))
        .run();
      revalidatePath("/watchlist");
      return { success: true, watched: false };
    } else {
      const id = crypto.randomUUID();
      await db.insert(watchlistItems)
        .values({ id, userId: session.userId, generationId })
        .run();
      revalidatePath("/watchlist");
      return { success: true, watched: true };
    }
  } catch {
    return { success: false, watched: false, error: "Failed to update watchlist" };
  }
}

export async function isWatching(generationId: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  const existing = await db
    .select()
    .from(watchlistItems)
    .where(
      and(
        eq(watchlistItems.userId, session.userId),
        eq(watchlistItems.generationId, generationId)
      )
    )
    .get();

  return !!existing;
}

export async function getUserWatchlistIds(): Promise<string[]> {
  const session = await getSession();
  if (!session) return [];

  const items = await db
    .select({ generationId: watchlistItems.generationId })
    .from(watchlistItems)
    .where(eq(watchlistItems.userId, session.userId))
    .all();

  return items.map((i) => i.generationId);
}
