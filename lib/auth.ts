import crypto from "crypto";
import { getCustomerAccountEndpoint } from "@/lib/customerAccount";

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

function encodeSessionToken(token: string): string {
  return Buffer.from(token, "utf8").toString("base64url");
}

function decodeSessionToken(encoded: string): string {
  // Legacy cookies stored the raw OAuth token (often a JWT starting with eyJ)
  if (encoded.startsWith("eyJ") || encoded.includes(".")) return encoded;
  return Buffer.from(encoded, "base64url").toString("utf8");
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

  const parts = sessionCookie.split("|");
  if (parts.length !== 4) {
    return { valid: false, error: "Session malformed. Please log in again." };
  }

  const [sessionEmail, encodedToken, expiryTime, sessionSig] = parts;
  const accessToken = decodeSessionToken(encodedToken);
  const portalSecret = process.env.PORTAL_SECRET!;
  const currentTimestamp = Math.floor(Date.now() / 1000);

  if (currentTimestamp > parseInt(expiryTime, 10)) {
    return { valid: false, error: "Session expired. Please log in again." };
  }

  const expectedSig = crypto
    .createHmac("sha256", portalSecret)
    .update(`${sessionEmail}|${encodedToken}|${expiryTime}`)
    .digest("hex");

  if (sessionSig !== expectedSig) return { valid: false, error: "Unauthorized session." };

  return { valid: true, email: sessionEmail, accessToken };
}

export function buildSessionCookie(email: string, accessToken: string): string {
  const portalSecret = process.env.PORTAL_SECRET!;
  const expiryTime = Math.floor(Date.now() / 1000) + 7200;
  const encodedToken = encodeSessionToken(accessToken);
  const sessionData = `${email}|${encodedToken}|${expiryTime}`;
  const sig = crypto.createHmac("sha256", portalSecret).update(sessionData).digest("hex");
  return `${sessionData}|${sig}`;
}

export async function verifyShopifyToken(shop: string, accessToken: string): Promise<boolean> {
  try {
    const endpoint = await getCustomerAccountEndpoint(shop);
    const authHeaders = [accessToken, `Bearer ${accessToken}`];

    for (const authorization of authHeaders) {
      const verifyRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
        },
        body: JSON.stringify({ query: `query { customer { id } }` }),
      });
      if (!verifyRes.ok) continue;
      const verifyData = await verifyRes.json();
      if (!verifyData.errors && verifyData.data?.customer?.id) return true;
    }

    return false;
  } catch (err) {
    console.error("verifyShopifyToken error:", (err as Error).message);
    return false;
  }
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

export function clearSessionCookie() {
  return {
    name: "portal_session",
    value: "",
    httpOnly: true,
    secure: true,
    path: "/",
    maxAge: 0,
    sameSite: "lax" as const,
  };
}
