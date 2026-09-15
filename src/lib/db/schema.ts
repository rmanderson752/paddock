import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Helper for timestamps
const timestamps = {
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
};

// Makes (Toyota, Porsche, Ferrari, etc.)
export const makes = sqliteTable("makes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  ...timestamps,
});

// Models (911, Supra, F40, etc.)
export const models = sqliteTable("models", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  makeId: text("make_id").notNull().references(() => makes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  ...timestamps,
}, (table) => ({
  makeSlugUnique: uniqueIndex("models_make_slug").on(table.makeId, table.slug),
}));

// Generations / Variants (964 Turbo 3.6, E30 M3 Evo II, etc.)
// This is the core entity users search for and track
export const generations = sqliteTable("generations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  modelId: text("model_id").notNull().references(() => models.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  yearStart: integer("year_start").notNull(),
  yearEnd: integer("year_end"),
  chassisCode: text("chassis_code"),
  category: text("category").notNull(), // 'supercar' | 'jdm' | 'retro' | 'modern_luxury' | 'modern_collectible' | 'truck_suv'
  description: text("description"),
  imageUrl: text("image_url"),
  ...timestamps,
}, (table) => ({
  modelSlugUnique: uniqueIndex("gen_model_slug").on(table.modelId, table.slug),
  categoryIdx: index("idx_gen_category").on(table.category),
  slugIdx: index("idx_gen_slug").on(table.slug),
}));

// Sales records (the core data — every auction result)
export const sales = sqliteTable("sales", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  generationId: text("generation_id").notNull().references(() => generations.id, { onDelete: "cascade" }),
  salePrice: integer("sale_price").notNull(), // USD cents
  saleDate: text("sale_date").notNull(),      // ISO date string YYYY-MM-DD
  source: text("source").notNull(),           // 'bat' | 'cars_and_bids' | 'barrett_jackson' | 'mecum' | 'rm_sothebys' | 'bonhams' | 'gooding' | 'sbx'
  sourceUrl: text("source_url"),
  year: integer("year"),
  mileage: integer("mileage"),
  color: text("color"),
  conditionNotes: text("condition_notes"),
  isNoReserve: integer("is_no_reserve", { mode: "boolean" }).default(false),
  sold: integer("sold", { mode: "boolean" }).default(true), // false if bid-not-met
  ...timestamps,
}, (table) => ({
  genDateIdx: index("idx_sales_gen_date").on(table.generationId, table.saleDate),
  dateIdx: index("idx_sales_date").on(table.saleDate),
}));

// Precomputed stats (refreshed by seed script or future cron)
export const generationStats = sqliteTable("generation_stats", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  generationId: text("generation_id").notNull().references(() => generations.id, { onDelete: "cascade" }).unique(),
  lastSalePrice: integer("last_sale_price"),
  lastSaleDate: text("last_sale_date"),
  lastSaleSource: text("last_sale_source"),
  avgPrice12mo: integer("avg_price_12mo"),
  high52wk: integer("high_52wk"),
  low52wk: integer("low_52wk"),
  salesCount12mo: integer("sales_count_12mo"),
  trendDirection: text("trend_direction"),     // 'appreciating' | 'stable' | 'depreciating'
  trendPercentage: real("trend_percentage"),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// Categories with index values
export const categoryIndices = sqliteTable("category_indices", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  category: text("category").notNull().unique(),
  displayName: text("display_name").notNull(),
  indexValue: real("index_value"),
  changeQuarterly: real("change_quarterly"),
  modelCount: integer("model_count"),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// Users
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  currency: text("currency").notNull().default("USD"), // preferred display currency
  ...timestamps,
});

// User watchlists
export const watchlistItems = sqliteTable("watchlist_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  generationId: text("generation_id").notNull().references(() => generations.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  userGenUnique: uniqueIndex("wl_user_gen").on(table.userId, table.generationId),
  userIdx: index("idx_wl_user").on(table.userId),
}));

// User portfolio
export const portfolioItems = sqliteTable("portfolio_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  generationId: text("generation_id").notNull().references(() => generations.id, { onDelete: "cascade" }),
  purchasePrice: integer("purchase_price").notNull(), // USD cents
  purchaseDate: text("purchase_date"),
  year: integer("year"),
  notes: text("notes"),
  ...timestamps,
}, (table) => ({
  userIdx: index("idx_port_user").on(table.userId),
}));

// Price alerts
export const priceAlerts = sqliteTable("price_alerts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  generationId: text("generation_id").notNull().references(() => generations.id, { onDelete: "cascade" }),
  alertType: text("alert_type").notNull(),    // 'sale' | 'threshold_above' | 'threshold_below'
  thresholdPrice: integer("threshold_price"), // USD cents
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  lastTriggeredAt: text("last_triggered_at"),
  ...timestamps,
}, (table) => ({
  userIdx: index("idx_alerts_user").on(table.userId, table.isActive),
}));

// Scheduled / manual database refresh history (see lib/refresh.ts)
export const refreshRuns = sqliteTable("refresh_runs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  trigger: text("trigger").notNull(),          // 'scheduler' | 'manual' | 'cli'
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  status: text("status").notNull(),            // 'running' | 'ok' | 'error'
  salesInserted: integer("sales_inserted"),
  pagesFetched: integer("pages_fetched"),
  message: text("message"),
}, (table) => ({
  startedIdx: index("idx_refresh_runs_started").on(table.startedAt),
}));
