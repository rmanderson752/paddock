// Route protection — Next.js 16 "proxy" (formerly middleware). Verifies the
// session cookie before protected pages render and bounces to /login,
// remembering where the user was headed.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/session";

const protectedRoutes = ["/portfolio", "/watchlist", "/alerts", "/profile", "/admin"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get("paddock_session")?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const session = await verifyToken(token);
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portfolio/:path*", "/watchlist/:path*", "/alerts/:path*", "/profile/:path*", "/admin/:path*"],
};
