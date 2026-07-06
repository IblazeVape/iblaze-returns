"use client"

import type { Root as PageTreeRoot } from "fumadocs-core/page-tree"
import type { LinkProps } from "next/link"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ROUTES } from "@/constants/routes"
import { useFeedback } from "@/hooks/use-feedback"
import { getDocsNavItems } from "@/lib/marketing-four-docs"
import { cn } from "@/lib/utils"

const MobileLink = ({
  href,
  onOpenChange,
  className,
  children,
  ...props
}: LinkProps & {
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
}) => {
  const router = useRouter()
  const playClick = useFeedback({ sound: "click" })

  const handleClick = useCallback(() => {
    playClick()
    router.push(href.toString())
    onOpenChange?.(false)
  }, [router, href, onOpenChange, playClick])

  return (
    <Link href={href} onClick={handleClick} className={cn("text-2xl font-medium", className)} {...props}>
      {children}
    </Link>
  )
}

const MobileNavGroup = ({
  label,
  pages,
  setOpen,
}: {
  label: React.ReactNode
  pages: { url: string; name: string }[]
  setOpen: (open: boolean) => void
}) => {
  if (pages.length === 0) {
    return null
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="flex flex-col gap-3">
        {pages.map((page) => (
          <MobileLink key={page.url} href={page.url} onOpenChange={setOpen}>
            {page.name}
          </MobileLink>
        ))}
      </div>
    </div>
  )
}

// Ported from shadcn-labs/startercn's MobileNav (MIT — see NOTICE.md), with
// their folder-walking logic (lib/docs.ts, lib/page-tree.ts) replaced by
// getDocsNavItems — this repo's docs tree is flat (4 pages, no
// subfolders), so there's nothing to group by folder.
export function MobileNav({
  items,
  tree,
  className,
}: {
  items: { href: string; label: string }[]
  tree: PageTreeRoot
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const docsPages = getDocsNavItems(tree)

  return (
    <Popover sounds open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-8 touch-manipulation items-center justify-start gap-2.5 !p-0 hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 active:bg-transparent dark:hover:bg-transparent",
            className
          )}
        >
          <div className="relative flex h-8 w-4 items-center justify-center">
            <div className="relative size-4">
              <span
                className={cn(
                  "absolute left-0 block h-0.5 w-4 bg-foreground transition-all duration-100",
                  open ? "top-[0.4rem] -rotate-45" : "top-1"
                )}
              />
              <span
                className={cn(
                  "absolute left-0 block h-0.5 w-4 bg-foreground transition-all duration-100",
                  open ? "top-[0.4rem] rotate-45" : "top-2.5"
                )}
              />
            </div>
            <span className="sr-only">Toggle Menu</span>
          </div>
          <span className="flex h-8 items-center text-lg font-medium leading-none">Menu</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="h-[var(--radix-popper-available-height)] w-[var(--radix-popper-available-width)] overflow-y-auto rounded-none border-none bg-background/90 p-0 shadow-none backdrop-blur duration-100"
        align="start"
        side="bottom"
        alignOffset={-16}
        sideOffset={14}
      >
        <div className="flex flex-col gap-12 overflow-auto px-6 py-6">
          <div className="flex flex-col gap-4">
            <div className="text-sm font-medium text-muted-foreground">Menu</div>
            <div className="flex flex-col gap-3">
              <MobileLink href={ROUTES.HOME} onOpenChange={setOpen}>
                Home
              </MobileLink>
              {items.map((item) => (
                <MobileLink key={item.href} href={item.href} onOpenChange={setOpen}>
                  {item.label}
                </MobileLink>
              ))}
            </div>
          </div>
          <MobileNavGroup label="Docs" pages={docsPages} setOpen={setOpen} />
        </div>
      </PopoverContent>
    </Popover>
  )
}
