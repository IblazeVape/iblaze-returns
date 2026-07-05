import { Render } from "@measured/puck/rsc"
import { notFound } from "next/navigation"
import { puckConfig, type PuckPageDoc } from "@/components/puck/config"
import { getPage, isValidPagePath } from "@/lib/pages"

// Public pages built with the /admin/pages editor, served at clean root
// URLs (e.g. /homepage, /black-friday). Defined routes (/dashboard, /docs,
// /marketing…) always win over this catch-all; reserved names are also
// blocked at save time in lib/pages. The page layout is a JSON document in
// Redis; visitors get a normal server-rendered page — the editor itself is
// never shipped here.
export const dynamic = "force-dynamic"

export default async function BuiltPage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params
  const path = (slug || []).join("/")
  if (!isValidPagePath(path)) notFound()

  const data = await getPage(path)
  if (!data || !Array.isArray(data.content) || data.content.length === 0) notFound()

  return (
    <div id="puck-lp-root" className="min-h-[100dvh] bg-white antialiased">
      <Render config={puckConfig} data={data as unknown as PuckPageDoc} />
    </div>
  )
}
