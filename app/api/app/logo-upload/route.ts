import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { put } from "@vercel/blob";
import { validateMerchantSession, MERCHANT_COOKIE_NAME } from "@/lib/merchant-session";

export const dynamic = "force-dynamic";

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = validateMerchantSession(cookieStore.get(MERCHANT_COOKIE_NAME)?.value);
  if (!session.valid || !session.shop) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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
  const pathname = `tenant-logos/${session.shop}-${Date.now()}.${extension}`;

  const blob = await put(pathname, file, { access: "public" });
  return NextResponse.json({ url: blob.url });
}
