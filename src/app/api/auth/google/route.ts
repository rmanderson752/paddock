import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  buildGoogleAuthUrl,
  getRedirectUri,
  isGoogleConfigured,
  OAUTH_STATE_COOKIE,
} from "@/lib/auth/google";
import { safeRedirectPath } from "@/lib/auth/redirect";

export const dynamic = "force-dynamic";

// Step 1: remember where the user was headed, mint a CSRF state, send them to Google
export async function GET(request: NextRequest) {
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_unavailable", request.url));
  }

  const state = crypto.randomUUID();
  const redirectTo = safeRedirectPath(request.nextUrl.searchParams.get("redirect"));

  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE, JSON.stringify({ state, redirectTo }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  const url = buildGoogleAuthUrl({ state, redirectUri: getRedirectUri(request.nextUrl.origin) });
  return NextResponse.redirect(url);
}
