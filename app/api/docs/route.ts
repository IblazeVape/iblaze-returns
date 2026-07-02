import { getDocsConfig } from "@/lib/docs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Public: the docs config (sidebar + page content) shown at /docs.
export async function GET() {
  const config = await getDocsConfig();
  return NextResponse.json(config);
}
