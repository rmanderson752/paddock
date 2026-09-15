"use server";

import { z } from "zod/v4";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession, createSession } from "./session";
import { revalidatePath } from "next/cache";

export type ProfileActionResult = {
  success: boolean;
  error?: string;
  message?: string;
};

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "New passwords don't match",
    path: ["confirmPassword"],
  });

export async function updateProfile(
  _prevState: ProfileActionResult | null,
  formData: FormData
): Promise<ProfileActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const parsed = profileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  try {
    await db.update(users)
      .set({ name: parsed.data.name, updatedAt: new Date().toISOString() })
      .where(eq(users.id, session.userId))
      .run();

    // The session token carries the display name — reissue it
    await createSession({ userId: session.userId, email: session.email, name: parsed.data.name, avatarUrl: session.avatarUrl ?? null });
    revalidatePath("/profile");
    return { success: true, message: "Profile updated" };
  } catch {
    return { success: false, error: "Failed to update profile" };
  }
}

export async function changePassword(
  _prevState: ProfileActionResult | null,
  formData: FormData
): Promise<ProfileActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  try {
    const user = await db.select().from(users).where(eq(users.id, session.userId)).get();
    if (!user) return { success: false, error: "Account not found" };
    if (!user.passwordHash) {
      return { success: false, error: "This account signs in with Google and has no password." };
    }

    const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!valid) return { success: false, error: "Current password is incorrect" };

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await db.update(users)
      .set({ passwordHash, updatedAt: new Date().toISOString() })
      .where(eq(users.id, session.userId))
      .run();

    return { success: true, message: "Password changed" };
  } catch {
    return { success: false, error: "Failed to change password" };
  }
}
