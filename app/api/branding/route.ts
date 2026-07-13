import { NextRequest, NextResponse } from "next/server";
import { getRequestShop } from "@/lib/request-shop";
import { getTenant, DEFAULT_TENANT_FIELDS } from "@/lib/tenant";
import { withCors, corsPreflight } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: NextRequest) {
  const ctx = await getRequestShop(request);
  if (!ctx) {
    return withCors(
      NextResponse.json({
        branding: DEFAULT_TENANT_FIELDS.branding,
        returnWindowDays: DEFAULT_TENANT_FIELDS.returnWindowDays,
      })
    );
  }

  const tenant = await getTenant(ctx.shop);
  return withCors(
    NextResponse.json({
      branding: tenant?.branding ?? DEFAULT_TENANT_FIELDS.branding,
      returnWindowDays: tenant?.returnWindowDays ?? DEFAULT_TENANT_FIELDS.returnWindowDays,
    })
  );
}
