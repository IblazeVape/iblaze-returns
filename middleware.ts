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

function isValidAdminSession(cookieHeader: string | null): boolean {
  const cookies = parseCookies(cookieHeader);
  const token = cookies["admin_session"];
  if (!token) return false;
  try {
    const secret = process.env.ADMIN_SECRET!;
    const [payload64, sig] = token.split(".");
    const expectedSig = crypto.createHmac("sha256", secret).update(payload64).digest("hex");
    if (sig !== expectedSig) return false;
    const payload = JSON.parse(Buffer.from(payload64, "base64").toString());
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieHeader = request.headers.get("cookie");

  // Protect customer dashboard
  if (pathname.startsWith("/dashboard")) {
    if (!isValidPortalSession(cookieHeader)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Protect admin routes (but not /admin/login itself)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!isValidAdminSession(cookieHeader)) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
