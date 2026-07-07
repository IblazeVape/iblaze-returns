"use client"

import type { Root as PageTreeRoot } from "fumadocs-core/page-tree"
import { ArrowRightIcon, CornerDownLeftIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/marketing-four/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/marketing-four/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/marketing-four/ui/dialog"
import { Kbd } from "@/components/marketing-four/ui/kbd"
import { useMarketingTwoTheme } from "@/components/marketing-two/theme-provider"
import { useFeedback } from "@/hooks/use-feedback"
import { useIsMac } from "@/hooks/use-is-mac"
import { getDocsNavItems } from "@/lib/marketing-four-docs"
import { cn } from "@/lib/utils"

// Ported from shadcn-labs/startercn's CommandMenu (MIT — see NOTICE.md).
// Their page-tree-driven component/block/theme groups and shadcn-registry
// "copy install command" feature (SITE.REGISTRY, usePackageManager,
// trackEvent) are not ported — no component registry in this product.
// The "Docs" group now reads the real docs tree via getDocsNavItems
// instead of a hardcoded list.
const GROUP_HEADING_CLS =
  "p-0! **:[[cmdk-group-heading]]:scroll-mt-16 **:[[cmdk-group-heading]]:p-3! **:[[cmdk-group-heading]]:pb-1!"

export function CommandMenu({
  navItems,
  tree,
}: {
  navItems: { href: string; label: string }[]
  tree: PageTreeRoot
}) {
  const router = useRouter()
  const isMac = useIsMac()
  const { dark } = useMarketingTwoTheme()
  const [open, setOpen] = useState(false)
  const playClick = useFeedback({ sound: "click" })

  const docsPages = useMemo(() => getDocsNavItems(tree), [tree])

  const runCommand = useCallback(
    (command: () => unknown) => {
      setOpen(false)
      playClick()
      command()
    },
    [playClick]
  )

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) {
          return
        }
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen} sounds>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          onClick={() => setOpen(true)}
          className={cn(
            "bg-surface text-surface-foreground/60 dark:bg-card relative h-8 w-full justify-start pl-2.5 font-normal shadow-none sm:pr-12 md:w-40 lg:w-56 xl:w-64"
          )}
        >
          <span className="hidden lg:inline-flex">Search documentation...</span>
          <span className="inline-flex lg:hidden">Search...</span>
          <div className="absolute right-1.5 top-1.5 hidden gap-1 sm:flex">
            <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
            <Kbd className="aspect-square">K</Kbd>
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "marketing-four-root rounded-xl border-none bg-clip-padding p-2 pb-11 shadow-2xl ring-4 ring-neutral-200/80 dark:bg-neutral-900 dark:ring-neutral-800 sm:max-w-lg",
          dark && "dark"
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search documentation...</DialogTitle>
          <DialogDescription>Search for a page to go to...</DialogDescription>
        </DialogHeader>
        <Command className="rounded-none bg-transparent">
          <CommandInput placeholder="Search documentation..." />
          <CommandList className="min-h-80 scroll-pb-1.5 scroll-pt-2">
            <CommandEmpty className="py-12 text-center text-sm text-muted-foreground">
              No results found.
            </CommandEmpty>
            <CommandGroup heading="Pages" className={GROUP_HEADING_CLS}>
              {navItems.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`Navigation ${item.label}`}
                  className="data-[selected=true]:border-input data-[selected=true]:bg-input/50 h-9 rounded-md border border-transparent px-3! font-medium"
                  onSelect={() => runCommand(() => router.push(item.href))}
                >
                  <ArrowRightIcon />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Docs" className={GROUP_HEADING_CLS}>
              {docsPages.map((page) => (
                <CommandItem
                  key={page.url}
                  value={`Docs ${page.name}`}
                  className="data-[selected=true]:border-input data-[selected=true]:bg-input/50 h-9 rounded-md border border-transparent px-3! font-medium"
                  onSelect={() => runCommand(() => router.push(page.url))}
                >
                  <ArrowRightIcon />
                  {page.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="absolute inset-x-0 bottom-0 z-20 flex h-10 items-center gap-2 overflow-hidden rounded-b-xl border-t border-t-neutral-100 bg-neutral-50 px-4 text-xs font-medium text-muted-foreground dark:border-t-neutral-700 dark:bg-neutral-800">
          <div className="flex shrink-0 items-center gap-2">
            <Kbd className="shrink-0">
              <CornerDownLeftIcon />
            </Kbd>{" "}
            <span className="min-w-0 truncate">Go to Page</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
