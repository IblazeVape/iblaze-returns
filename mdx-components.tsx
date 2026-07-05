import Link from "next/link"

// MDX renderer for our docs — plain Tailwind v3 styling matching the rest of
// the app's design system, rather than pulling in a separate docs UI theme.
// Typed as a plain component-override map instead of importing MDXComponents
// from "mdx/types" — that import resolves a stray global @types/react on
// this machine (~/node_modules/@types/react) alongside the project's own,
// producing duplicate/incompatible React.ReactNode identities.
type MDXOverrides = Record<string, React.ComponentType<any>>

export function useMDXComponents(components: MDXOverrides = {}): MDXOverrides {
  return {
    h2: (props) => <h2 className="mt-10 scroll-mt-24 text-xl font-semibold tracking-tight first:mt-0" {...props} />,
    h3: (props) => <h3 className="mt-8 scroll-mt-24 text-lg font-semibold tracking-tight" {...props} />,
    p: (props) => <p className="mt-4 leading-7 text-muted-foreground first:mt-0" {...props} />,
    ul: (props) => <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground" {...props} />,
    ol: (props) => <ol className="mt-4 list-decimal space-y-2 pl-6 text-muted-foreground" {...props} />,
    li: (props) => <li className="leading-7" {...props} />,
    a: ({ href, ...props }) => (
      <Link href={href ?? "#"} className="font-medium text-foreground underline underline-offset-4" {...props} />
    ),
    code: (props) => <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm" {...props} />,
    strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
    ...components,
  }
}
