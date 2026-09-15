import { defineConfig } from "drizzle-kit";

// Local file by default; Turso when TURSO_DATABASE_URL is set (see .env.example)
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? `file:${process.env.DATABASE_PATH ?? "./data/paddock.db"}`,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
