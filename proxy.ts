import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET });
  const isAuthenticated = Boolean(token);
  const hasAdminRole = Boolean(token?.role);

  // Client handles registration auth modal; avoid middleware redirect here to prevent
  // navigation interception when token/cookies are not accessible in the middleware.
  // Keep dashboard protection server-side.

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