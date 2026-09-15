// Server-only — who may use the admin dashboard and its API routes.
//
// Set ADMIN_EMAILS (comma-separated) to grant access explicitly; without it,
// the first account ever created is the admin.

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { SessionPayload } from "./session";

export async function isAdmin(session: SessionPayload | null): Promise<boolean> {
  if (!session) return false;

  const configured = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (configured.length > 0) {
    return configured.includes(session.email.toLowerCase());
  }

  const firstUser = await db
    .select({ id: users.id })
    .from(users)
    .orderBy(users.createdAt)
    .limit(1)
    .get();
  return !!firstUser && firstUser.id === session.userId;
}
