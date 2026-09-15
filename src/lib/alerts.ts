// Server-only — evaluates a user's price alerts against the latest data and
// builds the activity feed for their watchlist.

import { db } from "./db";
import * as schema from "./db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { getGenerationWithDetails } from "./data";
import type { GenerationWithDetails } from "./types";
import type { AlertType } from "./auth/alert-actions";

export interface AlertWithStatus {
  id: string;
  alertType: AlertType;
  thresholdPrice: number | null; // cents
  isActive: boolean;
  createdAt: string;             // ISO date
  car: GenerationWithDetails;
  /** Condition currently met by the latest data */
  triggered: boolean;
  /** Human-readable reason, e.g. "Last sale $280,000 on Mar 14, 2026" */
  detail: string;
}

export interface WatchlistActivityItem {
  id: string;
  saleDate: string;
  salePrice: number;
  source: string;
  car: GenerationWithDetails;
}

function isoDate(value: string): string {
  // created_at is "YYYY-MM-DD HH:MM:SS" (SQLite datetime) or an ISO string
  return value.slice(0, 10);
}

export function getUserAlerts(userId: string): AlertWithStatus[] {
  const rows = db
    .select()
    .from(schema.priceAlerts)
    .where(eq(schema.priceAlerts.userId, userId))
    .orderBy(desc(schema.priceAlerts.createdAt))
    .all();

  const result: AlertWithStatus[] = [];
  for (const row of rows) {
    const car = getGenerationWithDetails(row.generationId);
    if (!car) continue;

    const alertType = row.alertType as AlertType;
    const createdAt = isoDate(row.createdAt);
    const last = car.stats.lastSalePrice;
    const lastDate = car.stats.lastSaleDate;
    let triggered = false;
    let detail = "";

    if (alertType === "sale") {
      triggered = !!lastDate && lastDate > createdAt;
      detail = lastDate ? `Last sale ${fmt(last)} on ${lastDate}` : "No completed sales yet";
    } else if (alertType === "threshold_below") {
      triggered = last > 0 && last <= (row.thresholdPrice ?? 0);
      detail = `Last sale ${fmt(last)} · target below ${fmt(row.thresholdPrice ?? 0)}`;
    } else {
      triggered = last > 0 && last >= (row.thresholdPrice ?? 0);
      detail = `Last sale ${fmt(last)} · target above ${fmt(row.thresholdPrice ?? 0)}`;
    }

    result.push({
      id: row.id,
      alertType,
      thresholdPrice: row.thresholdPrice ?? null,
      isActive: row.isActive ?? true,
      createdAt,
      car,
      triggered: triggered && (row.isActive ?? true),
      detail,
    });
  }
  return result;
}

/** Completed sales of the cars on a user's watchlist, newest first. */
export function getWatchlistActivity(userId: string, limit = 20): WatchlistActivityItem[] {
  const watched = db
    .select({ generationId: schema.watchlistItems.generationId })
    .from(schema.watchlistItems)
    .where(eq(schema.watchlistItems.userId, userId))
    .all()
    .map((w) => w.generationId);
  if (watched.length === 0) return [];

  const sales = db
    .select({
      id: schema.sales.id,
      generationId: schema.sales.generationId,
      salePrice: schema.sales.salePrice,
      saleDate: schema.sales.saleDate,
      source: schema.sales.source,
    })
    .from(schema.sales)
    .where(and(inArray(schema.sales.generationId, watched), eq(schema.sales.sold, true)))
    .orderBy(desc(schema.sales.saleDate))
    .limit(limit)
    .all();

  const cars = new Map<string, GenerationWithDetails>();
  const items: WatchlistActivityItem[] = [];
  for (const s of sales) {
    let car = cars.get(s.generationId);
    if (!car) {
      const found = getGenerationWithDetails(s.generationId);
      if (!found) continue;
      cars.set(s.generationId, found);
      car = found;
    }
    items.push({ id: s.id, saleDate: s.saleDate, salePrice: s.salePrice, source: s.source, car });
  }
  return items;
}

function fmt(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}
