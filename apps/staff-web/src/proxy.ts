import { type NextRequest, NextResponse } from "next/server";

import { readSessionValue, SESSION_COOKIE } from "@ephemeris/auth/session";

const STAFF_ROLES = new Set(["internal", "external"]);

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const session = readSessionValue(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!STAFF_ROLES.has(session.role)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const routeRole = pathname.split("/")[2];
  // The signed cookie is intentionally lightweight and may hold the previous
  // role after an administrator changes a user. Let either staff route reach
  // the server layout, which validates the user's current database role and
  // redirects once without creating a stale-cookie redirect loop.
  if (!STAFF_ROLES.has(routeRole)) {
    return NextResponse.redirect(new URL(`/dashboard/${session.role}`, request.url));
  }

  if (session.role === "external" && pathname.startsWith("/dashboard/external/sky-events")) {
    return NextResponse.redirect(new URL("/dashboard/external", request.url));
  }

  if (session.role === "external" && pathname.startsWith("/dashboard/external/invoices")) {
    return NextResponse.redirect(new URL("/dashboard/external", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/chat/:path*", "/mail/:path*", "/api/((?!auth/).+)"],
};
