"use client";

import { cn } from "@/lib/utils";
import type { DocPageContent, DocPageMeta, DocsSection } from "@/lib/docs";
import { ArrowLeftIcon, ArrowRightIcon, BookOpenIcon, MenuIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DocsMarkdown, extractHeadings } from "@/components/docs/markdown";

interface DocsShellProps {
  sections: DocsSection[];
  slug: string;
  page: DocPageContent;
  prev: DocPageMeta | null;
  next: DocPageMeta | null;
}

// Nextra-style docs chrome: sticky top bar, left sidebar navigation, markdown
// content column, and an "On this page" outline on wide screens.
export default function DocsShell({ sections, slug, page, prev, next }: DocsShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close the mobile drawer whenever the page changes
  useEffect(() => setSidebarOpen(false), [slug]);

  const toc = useMemo(() => extractHeadings(page.content), [page.content]);

  const sidebar = (
    <nav className="flex flex-col gap-6">
      {sections.map((section) => (
        <div key={section.id}>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
            {section.title}
          </p>
          <ul className="flex flex-col gap-0.5 border-l border-border">
            {section.pages.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/docs/${p.slug}`}
                  className={cn(
                    "block -ml-px border-l pl-3 pr-2 py-1.5 text-sm transition-colors",
                    p.slug === slug
                      ? "border-foreground text-foreground font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40",
                  )}
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden -ml-1 p-1.5 rounded-md hover:bg-muted"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle docs navigation"
            >
              {sidebarOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
            <Link href="/docs" className="flex items-center gap-2 font-semibold">
              <BookOpenIcon className="h-5 w-5" />
              <span>Help Center</span>
            </Link>
          </div>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Returns portal →
          </Link>
        </div>
      </header>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="fixed inset-x-0 top-14 bottom-0 z-30 md:hidden overflow-y-auto border-b border-border bg-background p-4">
          {sidebar}
        </div>
      )}

      <div className="mx-auto flex max-w-7xl gap-8 px-4 md:px-6">
        {/* Sidebar */}
        <aside className="hidden md:block w-60 shrink-0">
          <div className="sticky top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto py-8 pr-2">
            {sidebar}
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 py-8 pb-16">
          <article>
            <DocsMarkdown content={page.content} />
          </article>

          {/* Prev / next */}
          {(prev || next) && (
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-8">
              <div>
                {prev && (
                  <Link
                    href={`/docs/${prev.slug}`}
                    className="group flex flex-col rounded-lg border border-border p-4 hover:border-muted-foreground/50 transition-colors"
                  >
                    <span className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <ArrowLeftIcon className="h-3 w-3" /> Previous
                    </span>
                    <span className="text-sm font-medium group-hover:underline">{prev.title}</span>
                  </Link>
                )}
              </div>
              <div>
                {next && (
                  <Link
                    href={`/docs/${next.slug}`}
                    className="group flex flex-col items-end text-right rounded-lg border border-border p-4 hover:border-muted-foreground/50 transition-colors"
                  >
                    <span className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      Next <ArrowRightIcon className="h-3 w-3" />
                    </span>
                    <span className="text-sm font-medium group-hover:underline">{next.title}</span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </main>

        {/* On this page */}
        <aside className="hidden xl:block w-56 shrink-0">
          {toc.length > 0 && (
            <div className="sticky top-14 py-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">
                On this page
              </p>
              <ul className="flex flex-col gap-1.5 text-sm">
                {toc.map((h) => (
                  <li key={h.id} className={h.depth === 3 ? "pl-3" : undefined}>
                    <a
                      href={`#${h.id}`}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
