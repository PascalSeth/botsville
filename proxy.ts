import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// In NextAuth v5 the cookie name changed from the v4 convention:
//   dev  → "authjs.session-token"
//   prod → "__Secure-authjs.session-token"  (HTTPS __Secure- prefix)
// getToken() still defaults to the v4 name, so we must pass the correct one.
function getSessionCookieName(req: NextRequest): string {
  const url = req.nextUrl.origin;
  const isHttps = url.startsWith("https://") ||
    process.env.NODE_ENV === "production";
  return isHttps ? "__Secure-authjs.session-token" : "authjs.session-token";
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    cookieName: getSessionCookieName(request),
  });

  const isAuthenticated = Boolean(token);
  const hasAdminRole = Boolean(token?.role);

  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", `${request.nextUrl.pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }

    if (!hasAdminRole) {
      const homeUrl = new URL("/", request.url);
      homeUrl.searchParams.set("error", "admin_required");
      return NextResponse.redirect(homeUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/register-team", "/dashboard/:path*"],
};