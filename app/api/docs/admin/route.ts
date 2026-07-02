import { DocsConfig, resetDocsConfig, saveDocsConfig } from "@/lib/docs";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_CONFIG_BYTES = 512 * 1024; // whole docs site as one JSON document

function authorized(req: NextRequest): boolean {
  const expected = process.env.DOCS_ADMIN_KEY || process.env.PORTAL_SECRET;
  if (!expected) return false;
  return req.headers.get("x-docs-admin-key") === expected;
}

function validate(body: unknown): body is DocsConfig {
  if (!body || typeof body !== "object") return false;
  const cfg = body as DocsConfig;
  if (!Array.isArray(cfg.sections) || !cfg.pages || typeof cfg.pages !== "object") return false;
  for (const section of cfg.sections) {
    if (typeof section.id !== "string" || typeof section.title !== "string" || !Array.isArray(section.pages)) return false;
    for (const page of section.pages) {
      if (typeof page.slug !== "string" || typeof page.title !== "string") return false;
      if (!cfg.pages[page.slug] || typeof cfg.pages[page.slug].content !== "string") return false;
    }
  }
  return true;
}

// Owner-only: replace the whole docs config (sidebar structure + content).
export async function PUT(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Invalid admin key." }, { status: 401 });
  }
  const raw = await req.text();
  if (raw.length > MAX_CONFIG_BYTES) {
    return NextResponse.json({ error: "Docs content too large." }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!validate(body)) {
    return NextResponse.json({ error: "Malformed docs config." }, { status: 400 });
  }
  await saveDocsConfig(body);
  return NextResponse.json({ ok: true });
}

// Owner-only: discard saved docs and return to the built-in defaults.
export async function DELETE(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Invalid admin key." }, { status: 401 });
  }
  await resetDocsConfig();
  return NextResponse.json({ ok: true });
}
