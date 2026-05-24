import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function parseCookies(cookieHeader: string | null) {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookie) => {
    let [name, ...rest] = cookie.split("=");
    name = name?.trim();
    if (!name) return;
    const value = rest.join("=").trim();
    if (!value) return;
    list[name] = decodeURIComponent(value);
  });
  return list;
}

function isValidPortalSession(cookieHeader: string | null): boolean {
  const cookies = parseCookies(cookieHeader);
  const sessionCookie = cookies["portal_session"];
  if (!sessionCookie) return false;
  try {
    const [sessionEmail, accessToken, expiryTime, sessionSig] = sessionCookie.split("|");
    const portalSecret = process.env.PORTAL_SECRET!;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (currentTimestamp > parseInt(expiryTime)) return false;
    const expectedSig = crypto
      .createHmac("sha256", portalSecret)
      .update(`${sessionEmail}|${accessToken}|${expiryTime}`)
      .digest("hex");
    return sessionSig === expectedSig;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieHeader = request.headers.get("cookie");

  // Root path: if no valid session, redirect to login
  if (pathname === "/") {
    if (!isValidPortalSession(cookieHeader)) {
      return NextResponse.redirect(new URL("/api/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
