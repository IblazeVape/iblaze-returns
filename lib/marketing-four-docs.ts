import type { Node as PageTreeNode, Root as PageTreeRoot } from "fumadocs-core/page-tree"

export type DocsNavItem = { url: string; name: string }

const isPageNode = (
  node: PageTreeNode
): node is Extract<PageTreeNode, { type: "page" }> => node.type === "page"

// content/docs/meta.json lists 4 pages with no subfolders, so
// source.pageTree.children is a flat list of "page" nodes here — unlike
// StarterCN's own docs tree, which nests pages under folders (Components,
// Getting Started, etc.) and needs lib/docs.ts + lib/page-tree.ts to walk
// them. Neither of those files is ported; this is the flat-tree
// equivalent.
//
// `tree` is required (no default reading `source.pageTree` here) because
// this module is imported from client components (mobile-nav.tsx,
// command-menu.tsx) — importing `@/lib/source` would pull fumadocs' Node-only
// MDX pipeline into the client bundle. Callers always pass `tree` explicitly,
// computed server-side (see components/marketing-four/nav.tsx).
export function getDocsNavItems(tree: PageTreeRoot): DocsNavItem[] {
  return tree.children.filter(isPageNode).map((node) => ({
    url: node.url,
    name: typeof node.name === "string" ? node.name : String(node.name),
  }))
}
