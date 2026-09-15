import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildGoogleAuthUrl, getRedirectUri, isGoogleConfigured, CALLBACK_PATH } from "./google";

const saved = { ...process.env };
beforeEach(() => {
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.NEXT_PUBLIC_APP_URL;
});
afterEach(() => {
  process.env = { ...saved };
});

describe("isGoogleConfigured", () => {
  it("needs both the client id and secret", () => {
    expect(isGoogleConfigured()).toBe(false);
    process.env.GOOGLE_CLIENT_ID = "id";
    expect(isGoogleConfigured()).toBe(false);
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    expect(isGoogleConfigured()).toBe(true);
  });
});

describe("getRedirectUri", () => {
  it("prefers the configured public URL over the request origin", () => {
    expect(getRedirectUri("http://localhost:3000")).toBe(`http://localhost:3000${CALLBACK_PATH}`);
    process.env.NEXT_PUBLIC_APP_URL = "https://insidethepaddock.vercel.app/";
    expect(getRedirectUri("https://paddock-abc.vercel.app")).toBe(
      `https://insidethepaddock.vercel.app${CALLBACK_PATH}`
    );
  });
});

describe("buildGoogleAuthUrl", () => {
  it("builds an OpenID Connect authorization request", () => {
    const url = new URL(
      buildGoogleAuthUrl({ state: "abc123", redirectUri: "https://x.test/cb", clientId: "client-1" })
    );
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("client-1");
    expect(url.searchParams.get("redirect_uri")).toBe("https://x.test/cb");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("state")).toBe("abc123");
  });
});
