// Sign in with Google — OpenID Connect against Google's OAuth 2.0 endpoints,
// with no auth library: the authorization URL is built by hand and the ID
// token is verified with jose against Google's published keys.
//
// Setup (Google Cloud Console → APIs & Services → Credentials → OAuth client,
// type "Web application"):
//   Authorized redirect URIs: <NEXT_PUBLIC_APP_URL>/api/auth/google/callback
//                             http://localhost:3000/api/auth/google/callback
// then set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.

import { createRemoteJWKSet, jwtVerify } from "jose";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export const OAUTH_STATE_COOKIE = "paddock_oauth_state";
export const CALLBACK_PATH = "/api/auth/google/callback";

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * The redirect URI registered with Google. Prefer the configured public URL
 * so preview deployments and proxies don't produce an unregistered origin.
 */
export function getRedirectUri(requestOrigin: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || requestOrigin).replace(/\/$/, "");
  return `${base}${CALLBACK_PATH}`;
}

export function buildGoogleAuthUrl({
  state,
  redirectUri,
  clientId = process.env.GOOGLE_CLIENT_ID ?? "",
}: {
  state: string;
  redirectUri: string;
  clientId?: string;
}): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    access_type: "online",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function googleJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(JWKS_URL));
  return jwks;
}

/** Exchange the authorization code and return the verified identity. */
export async function exchangeCodeForProfile({
  code,
  redirectUri,
}: {
  code: string;
  redirectUri: string;
}): Promise<GoogleProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google sign-in is not configured");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed (${res.status})`);
  }
  const tokens = (await res.json()) as { id_token?: string };
  if (!tokens.id_token) throw new Error("Google did not return an ID token");

  // Verifies signature, expiry, issuer and that the token was minted for us
  const { payload } = await jwtVerify(tokens.id_token, googleJwks(), {
    issuer: ISSUERS,
    audience: clientId,
  });

  const sub = typeof payload.sub === "string" ? payload.sub : "";
  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
  if (!sub || !email) throw new Error("Google ID token is missing the account identity");

  return {
    sub,
    email,
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === "string" ? payload.name : null,
    picture: typeof payload.picture === "string" ? payload.picture : null,
  };
}
