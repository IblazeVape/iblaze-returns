import { redis } from "@/lib/redis"

// Storage for Puck page-builder pages. Each page is one JSON document under
// puck:page:<path>, with a set index at puck:pages so the admin can list them.
// Pages render publicly at /lp/<path>.

export interface PuckPageData {
  content: unknown[]
  root: Record<string, unknown>
  zones?: Record<string, unknown[]>
}

const PAGE_PREFIX = "puck:page:"
const INDEX_KEY = "puck:pages"

export const MAX_PAGE_BYTES = 256 * 1024
export const MAX_PAGES = 100

// Path segments: lowercase letters, digits, hyphens; up to 3 segments deep.
// Strict on purpose — the path becomes both a Redis key suffix and a URL.
const PATH_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*){0,2}$/

// First segments that belong to the app itself — built pages serve from the
// root catch-all, so these can never be page names.
const RESERVED = new Set([
  "admin",
  "api",
  "assets",
  "dashboard",
  "demo",
  "docs",
  "fonts",
  "lp",
  "marketing",
  "marketing-two",
  "marketing-three",
])

export function isValidPagePath(path: unknown): path is string {
  if (typeof path !== "string" || path.length > 80 || !PATH_RE.test(path)) return false
  return !RESERVED.has(path.split("/")[0])
}

export async function listPagePaths(): Promise<string[]> {
  const paths = await redis.smembers<string[]>(INDEX_KEY)
  return (paths || []).filter(isValidPagePath).sort()
}

export async function getPage(path: string): Promise<PuckPageData | null> {
  if (!isValidPagePath(path)) return null
  return await redis.get<PuckPageData>(PAGE_PREFIX + path)
}

export async function savePage(path: string, data: PuckPageData): Promise<void> {
  if (!isValidPagePath(path)) throw new Error("Invalid page path")
  await redis.set(PAGE_PREFIX + path, data)
  await redis.sadd(INDEX_KEY, path)
}

export async function deletePage(path: string): Promise<void> {
  if (!isValidPagePath(path)) return
  await redis.del(PAGE_PREFIX + path)
  await redis.srem(INDEX_KEY, path)
}
