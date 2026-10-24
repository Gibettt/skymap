import { type NextRequest, NextResponse } from "next/server";

import { readSessionValue, SESSION_COOKIE } from "@ephemeris/auth/session";

export function proxy(request: NextRequest) {
  const isApi = request.nextUrl.pathname.startsWith("/api/");
  const session = readSessionValue(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    return isApi
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));
  }

  // The cookie only carries a lightweight role; routes and layouts re-check the live database role.
  if (session.role !== "admin") {
    return isApi
      ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
      : NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/((?!auth/).+)"],
};
