import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createSession } from "@/lib/auth/session";
import { exchangeCodeForProfile, getRedirectUri, OAUTH_STATE_COOKIE } from "@/lib/auth/google";
import { safeRedirectPath } from "@/lib/auth/redirect";

export const dynamic = "force-dynamic";

function fail(request: NextRequest, reason: string) {
  return NextResponse.redirect(new URL(`/login?error=${reason}`, request.url));
}

// Step 2: Google sends the user back with a code — verify, find or create the
// account, start a session.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const cookieStore = await cookies();
  const raw = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE);

  if (params.get("error")) return fail(request, "google_denied");

  let expected: { state: string; redirectTo: string } | null = null;
  try {
    expected = raw ? JSON.parse(raw) : null;
  } catch {
    expected = null;
  }
  const code = params.get("code");
  const state = params.get("state");
  if (!expected || !code || !state || state !== expected.state) {
    return fail(request, "google_state");
  }

  try {
    const profile = await exchangeCodeForProfile({
      code,
      redirectUri: getRedirectUri(request.nextUrl.origin),
    });

    // Match on the Google id first; otherwise link an existing password
    // account with the same verified email so people don't end up with two.
    const existing = await db
      .select()
      .from(users)
      .where(
        profile.emailVerified
          ? or(eq(users.googleId, profile.sub), eq(users.email, profile.email))
          : eq(users.googleId, profile.sub)
      )
      .get();

    let userId: string;
    let name: string | null;
    let avatarUrl: string | null;

    if (existing) {
      userId = existing.id;
      name = existing.name ?? profile.name;
      avatarUrl = profile.picture ?? existing.avatarUrl ?? null;
      await db
        .update(users)
        .set({
          googleId: profile.sub,
          name,
          avatarUrl,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, existing.id))
        .run();
    } else {
      if (!profile.emailVerified) return fail(request, "google_unverified");
      userId = crypto.randomUUID();
      name = profile.name;
      avatarUrl = profile.picture;
      await db
        .insert(users)
        .values({
          id: userId,
          email: profile.email,
          name,
          passwordHash: null,
          googleId: profile.sub,
          avatarUrl,
        })
        .run();
    }

    await createSession({ userId, email: existing?.email ?? profile.email, name, avatarUrl });
    return NextResponse.redirect(new URL(safeRedirectPath(expected.redirectTo), request.url));
  } catch (err) {
    console.error("[google-auth]", err instanceof Error ? err.message : err);
    return fail(request, "google_failed");
  }
}
