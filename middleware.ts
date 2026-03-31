// /middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // strategy: "database" uses a session token cookie, not a JWT
  // withAuth uses getToken() which only works with JWT strategy → causes redirect loop
  const sessionToken =
    request.cookies.get("next-auth.session-token") ??
    request.cookies.get("__Secure-next-auth.session-token");

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  const response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("x-nonce", nonce);

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/events/:path*", "/api/sheets/:path*"],
};
