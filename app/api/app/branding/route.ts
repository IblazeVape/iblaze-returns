import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateMerchantSession, MERCHANT_COOKIE_NAME } from "@/lib/merchant-session";
import { validateBrandingInput, type BrandingInput } from "@/lib/branding-validation";
import { getTenant, setTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  const cookieStore = await cookies();
  const session = validateMerchantSession(cookieStore.get(MERCHANT_COOKIE_NAME)?.value);
  if (!session.valid || !session.shop) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Partial<BrandingInput> | null;
  if (!body) {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  const input: BrandingInput = {
    name: typeof body.name === "string" ? body.name : "",
    logoUrl: typeof body.logoUrl === "string" ? body.logoUrl : "",
    accentColor: typeof body.accentColor === "string" ? body.accentColor : "#000000",
    storefrontUrl: typeof body.storefrontUrl === "string" ? body.storefrontUrl : "",
    supportEmail: typeof body.supportEmail === "string" ? body.supportEmail : "",
    policyUrl: typeof body.policyUrl === "string" ? body.policyUrl : "",
    policyText: typeof body.policyText === "string" ? body.policyText : "",
    returnWindowDays: typeof body.returnWindowDays === "number" ? body.returnWindowDays : 30,
  };

  const { valid, errors } = validateBrandingInput(input);
  if (!valid) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const existing = await getTenant(session.shop);
  if (!existing) {
    return NextResponse.json({ error: "tenant not found" }, { status: 404 });
  }

  await setTenant(session.shop, {
    returnWindowDays: input.returnWindowDays,
    branding: {
      name: input.name,
      logoUrl: input.logoUrl,
      accentColor: input.accentColor,
      storefrontUrl: input.storefrontUrl,
      supportEmail: input.supportEmail,
      policyUrl: input.policyUrl,
      policyText: input.policyText,
    },
  });

  const saved = await getTenant(session.shop);
  return NextResponse.json({
    branding: saved!.branding,
    returnWindowDays: saved!.returnWindowDays,
  });
}
