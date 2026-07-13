import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { verifyMerchantSessionToken } from "@/lib/merchant-session-token";

export const dynamic = "force-dynamic";

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const sessionToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const claims = sessionToken ? verifyMerchantSessionToken(sessionToken) : null;
  if (!claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const shop = claims.shop;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "no file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "unsupported file type" }, { status: 400 });
  }
  if (file.size > MAX_LOGO_BYTES) {
    return NextResponse.json({ error: "file too large (2MB max)" }, { status: 400 });
  }

  const extension = file.type.split("/")[1]?.replace("svg+xml", "svg") ?? "png";
  const pathname = `tenant-logos/${shop}-${Date.now()}.${extension}`;

  const blob = await put(pathname, file, { access: "public" });
  return NextResponse.json({ url: blob.url });
}
