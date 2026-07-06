"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"

export interface TocItem {
  title: React.ReactNode
  url: string
  depth: number
}

function useActiveHeading(itemIds: string[]) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        }
      },
      { rootMargin: "0% 0% -80% 0%" },
    )
    for (const id of itemIds) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [itemIds])

  return activeId
}

// Self-contained scroll-spy table of contents for a single docs page — no
// external accounts/links required, unlike the rest of that rail on the
// reference site (Edit this page / Follow / Join community), which we
// deliberately left out since we have no repo/social/community to point at.
export function DocsToc({ toc, className }: { toc: TocItem[]; className?: string }) {
  const itemIds = useMemo(() => toc.map((item) => item.url.replace("#", "")), [toc])
  const activeId = useActiveHeading(itemIds)

  if (toc.length === 0) return null

  return (
    <div className={cn("flex flex-col gap-2 text-sm", className)}>
      <p className="sticky top-0 text-xs font-medium text-muted-foreground">On This Page</p>
      {toc.map((item) => (
        <a
          key={item.url}
          href={item.url}
          data-active={item.url === `#${activeId}`}
          className={cn(
            "text-[0.8rem] text-muted-foreground no-underline transition-colors hover:text-foreground data-[active=true]:font-medium data-[active=true]:text-foreground",
            item.depth >= 3 && "pl-4",
          )}
        >
          {item.title}
        </a>
      ))}
    </div>
  )
}
