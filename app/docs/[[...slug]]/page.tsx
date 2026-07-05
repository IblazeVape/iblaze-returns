import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { source } from "@/lib/source"
import { DocsSidebar, type DocsNavItem } from "@/components/docs-sidebar"
import { useMDXComponents } from "@/mdx-components"

interface DocsPageProps {
  params: Promise<{ slug?: string[] }>
}

function getNavItems(): DocsNavItem[] {
  return source.getPages()
    .sort((a, b) => a.url.localeCompare(b.url))
    .map((page) => ({ title: page.data.title, url: page.url }))
}

export async function generateStaticParams() {
  return source.getPages().map((page) => ({ slug: page.slugs }))
}

export async function generateMetadata({ params }: DocsPageProps): Promise<Metadata> {
  const { slug } = await params
  const page = source.getPage(slug)
  if (!page) return {}
  return { title: `${page.data.title} — Reflow Docs`, description: page.data.description }
}

export default async function DocsPage({ params }: DocsPageProps) {
  const { slug } = await params
  const page = source.getPage(slug)
  if (!page) notFound()

  // Cast away fumadocs-mdx's generated MDXContent type here — its declared
  // props type resolves against a duplicate/conflicting global @types/react
  // installed outside this project (~/node_modules/@types/react), which
  // otherwise makes any MDX component map "incompatible" at the type level
  // even though it's fine at runtime.
  const MDX = page.data.body as unknown as (props: { components: Record<string, React.ComponentType<any>> }) => React.ReactElement
  const navItems = getNavItems()

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-10 px-4 py-10 sm:px-6">
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-24">
          <DocsSidebar items={navItems} />
        </div>
      </aside>
      <main className="min-w-0 flex-1 pb-20">
        <h1 className="text-3xl font-bold tracking-tight">{page.data.title}</h1>
        {page.data.description && (
          <p className="mt-2 text-muted-foreground">{page.data.description}</p>
        )}
        <div className="mt-8">
          <MDX components={useMDXComponents({})} />
        </div>
      </main>
    </div>
  )
}
