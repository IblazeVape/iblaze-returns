import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DocsPagerItem {
  title: string
  url: string
}

// Self-contained prev/next page navigation — derived entirely from our own
// nav item order, no external data source required.
export function DocsPager({ prev, next }: { prev: DocsPagerItem | null; next: DocsPagerItem | null }) {
  if (!prev && !next) return null

  return (
    <div className="mt-10 flex items-center justify-between border-t pt-6">
      {prev
        ? (
            <Link
              href={prev.url}
              className="flex items-center gap-1.5 rounded-md bg-muted/60 px-3 py-1.5 text-sm transition-colors hover:bg-muted"
            >
              <ArrowLeft className="size-3.5" />
              {prev.title}
            </Link>
          )
        : <span />}
      {next && (
        <Link
          href={next.url}
          className={cn(
            "flex items-center gap-1.5 rounded-md bg-muted/60 px-3 py-1.5 text-sm transition-colors hover:bg-muted",
          )}
        >
          {next.title}
          <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  )
}
