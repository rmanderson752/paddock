"use server";

import { z } from "zod/v4";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createSession, deleteSession } from "./session";
import { redirect } from "next/navigation";
import { checkRateLimit } from "@/lib/rate-limit";
import { safeRedirectPath } from "./redirect";
import { headers } from "next/headers";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type AuthResult = {
  success: boolean;
  error?: string;
};


export async function signup(
  _prevState: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };
  const redirectTo = safeRedirectPath(formData.get("redirect"));

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { name, email, password } = parsed.data;

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const rl = checkRateLimit(`signup:${ip}`);
  if (!rl.allowed) {
    return { success: false, error: "Too many attempts. Please try again later." };
  }

  try {
    // Check if email already exists
    const existing = await db.select().from(users).where(eq(users.email, email)).get();
    if (existing) {
      return { success: false, error: "An account with this email already exists" };
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const id = crypto.randomUUID();
    await db.insert(users)
      .values({ id, email, name, passwordHash })
      .run();

    await createSession({ userId: id, email, name });
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return { success: false, error: "Something went wrong. Please try again." };
  }
  redirect(redirectTo);
}

export async function login(
  _prevState: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };
  const redirectTo = safeRedirectPath(formData.get("redirect"));

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { email, password } = parsed.data;

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const rl = checkRateLimit(`login:${ip}`);
  if (!rl.allowed) {
    return { success: false, error: "Too many attempts. Please try again later." };
  }

  try {
    const user = await db.select().from(users).where(eq(users.email, email)).get();
    if (!user) {
      return { success: false, error: "Invalid email or password" };
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return { success: false, error: "Invalid email or password" };
    }

    await createSession({ userId: user.id, email: user.email, name: user.name });
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return { success: false, error: "Something went wrong. Please try again." };
  }
  redirect(redirectTo);
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
