import crypto from "crypto";
import { cookies } from "next/headers";

export function parseCookies(cookieHeader: string | null) {
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

export function validateSession(cookieHeader: string | null): {
  valid: boolean;
  email?: string;
  accessToken?: string;
  error?: string;
} {
  const cookieList = parseCookies(cookieHeader);
  const sessionCookie = cookieList["portal_session"];
  if (!sessionCookie) return { valid: false, error: "Session missing. Please log in." };

  const [sessionEmail, accessToken, expiryTime, sessionSig] = sessionCookie.split("|");
  const portalSecret = process.env.PORTAL_SECRET!;
  const currentTimestamp = Math.floor(Date.now() / 1000);

  if (currentTimestamp > parseInt(expiryTime)) {
    return { valid: false, error: "Session expired. Please log in again." };
  }

  const expectedSig = crypto
    .createHmac("sha256", portalSecret)
    .update(`${sessionEmail}|${accessToken}|${expiryTime}`)
    .digest("hex");

  if (sessionSig !== expectedSig) return { valid: false, error: "Unauthorized session." };

  return { valid: true, email: sessionEmail, accessToken };
}

export function buildSessionCookie(email: string, accessToken: string): string {
  const portalSecret = process.env.PORTAL_SECRET!;
  const expiryTime = Math.floor(Date.now() / 1000) + 7200;
  const sessionData = `${email}|${accessToken}|${expiryTime}`;
  const sig = crypto.createHmac("sha256", portalSecret).update(sessionData).digest("hex");
  return `${sessionData}|${sig}`;
}

export async function verifyShopifyToken(shopId: string, accessToken: string) {
  const verifyRes = await fetch(
    `https://shopify.com/${shopId}/account/customer/api/2024-04/graphql`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: accessToken,
      },
      body: JSON.stringify({ query: `query { customer { id } }` }),
    }
  );
  if (!verifyRes.ok) return false;
  const verifyData = await verifyRes.json();
  if (verifyData.errors) return false;
  return true;
}

// Admin session (simple JWT-based)
export function validateAdminSession(cookieHeader: string | null): boolean {
  const list = parseCookies(cookieHeader);
  const token = list["admin_session"];
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

export function buildAdminSessionCookie(): string {
  const secret = process.env.ADMIN_SECRET!;
  const exp = Math.floor(Date.now() / 1000) + 28800; // 8 hours
  const payload64 = Buffer.from(JSON.stringify({ role: "admin", exp })).toString("base64");
  const sig = crypto.createHmac("sha256", secret).update(payload64).digest("hex");
  return `${payload64}.${sig}`;
}
