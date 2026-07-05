import { timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import {
  MAX_PAGE_BYTES,
  MAX_PAGES,
  PuckPageData,
  deletePage,
  getPage,
  isValidPagePath,
  listPagePaths,
  savePage,
} from "@/lib/pages"
import { puckComponentTypes } from "@/components/puck/config"

export const dynamic = "force-dynamic"

// Owner-only API for the /admin/pages builder. Everything (including reads)
// requires the admin key; the public only ever sees published pages rendered
// server-side at /lp/<path>. Same key scheme as the docs admin.
function authorized(req: NextRequest): boolean {
  const expected =
    process.env.PAGES_ADMIN_KEY || process.env.DOCS_ADMIN_KEY || process.env.PORTAL_SECRET
  if (!expected) return false
  const provided = req.headers.get("x-pages-admin-key") || ""
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  // timingSafeEqual requires equal lengths; length inequality is not secret.
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

const unauthorized = () => NextResponse.json({ error: "Invalid admin key." }, { status: 401 })

const KNOWN_TYPES = new Set(puckComponentTypes)

// Only accept data shaped like a Puck document whose every block is one of
// our registered components. Anything else (unknown blocks, functions-as-
// strings, oversized payloads) is rejected before it ever reaches Redis.
function validatePageData(body: unknown): body is PuckPageData {
  if (!body || typeof body !== "object") return false
  const data = body as PuckPageData
  if (!Array.isArray(data.content)) return false
  if (!data.root || typeof data.root !== "object" || Array.isArray(data.root)) return false

  const validItems = (items: unknown[]): boolean =>
    items.every((item) => {
      if (!item || typeof item !== "object") return false
      const { type, props } = item as { type?: unknown; props?: unknown }
      if (typeof type !== "string" || !KNOWN_TYPES.has(type)) return false
      if (props !== undefined && (typeof props !== "object" || props === null)) return false
      return true
    })

  if (!validItems(data.content)) return false
  if (data.zones !== undefined) {
    if (typeof data.zones !== "object" || data.zones === null || Array.isArray(data.zones)) return false
    for (const zone of Object.values(data.zones)) {
      if (!Array.isArray(zone) || !validItems(zone)) return false
    }
  }
  return true
}

// GET /api/pages/admin            → { pages: string[] }
// GET /api/pages/admin?path=slug  → { path, data } (data null if not created yet)
export async function GET(req: NextRequest) {
  if (!authorized(req)) return unauthorized()
  const path = req.nextUrl.searchParams.get("path")
  if (path === null) {
    return NextResponse.json({ pages: await listPagePaths() })
  }
  if (!isValidPagePath(path)) {
    return NextResponse.json({ error: "Invalid page path." }, { status: 400 })
  }
  return NextResponse.json({ path, data: await getPage(path) })
}

// PUT /api/pages/admin  body: { path, data } → save a page
export async function PUT(req: NextRequest) {
  if (!authorized(req)) return unauthorized()

  const raw = await req.text()
  if (raw.length > MAX_PAGE_BYTES) {
    return NextResponse.json({ error: "Page too large." }, { status: 413 })
  }
  let body: { path?: unknown; data?: unknown }
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const { path, data } = body
  if (!isValidPagePath(path)) {
    return NextResponse.json(
      { error: "Invalid path. Use lowercase letters, numbers and hyphens (e.g. black-friday)." },
      { status: 400 },
    )
  }
  if (!validatePageData(data)) {
    return NextResponse.json({ error: "Malformed page data." }, { status: 400 })
  }

  const existing = await listPagePaths()
  if (!existing.includes(path) && existing.length >= MAX_PAGES) {
    return NextResponse.json({ error: `Page limit reached (${MAX_PAGES}).` }, { status: 409 })
  }

  await savePage(path, data)
  return NextResponse.json({ ok: true })
}

// DELETE /api/pages/admin?path=slug → remove a page
export async function DELETE(req: NextRequest) {
  if (!authorized(req)) return unauthorized()
  const path = req.nextUrl.searchParams.get("path")
  if (!isValidPagePath(path)) {
    return NextResponse.json({ error: "Invalid page path." }, { status: 400 })
  }
  await deletePage(path)
  return NextResponse.json({ ok: true })
}
