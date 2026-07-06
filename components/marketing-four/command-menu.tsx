"use client"

import { ArrowRightIcon, CornerDownLeftIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Kbd } from "@/components/ui/kbd"
import { useIsMac } from "@/hooks/use-is-mac"
import { playClick } from "@/lib/sound"
import { triggerHaptic } from "@/lib/haptics"
import { cn } from "@/lib/utils"

// Ported from shadcn-labs/startercn components/command-menu.tsx (MIT — see
// NOTICE.md): same trigger button, Dialog/Command layout, Kbd positioning,
// and bottom hint bar. Their page-tree-driven component/block/theme groups
// are replaced with a flat "Pages" + "Docs" list, since we don't have a
// component registry to browse. bg-surface (their custom token) isn't in
// our design system, so it's substituted with bg-muted/40.
const GROUP_HEADING_CLS =
  "!p-0 [&_[cmdk-group-heading]]:scroll-mt-16 [&_[cmdk-group-heading]]:!p-3 [&_[cmdk-group-heading]]:!pb-1"

const PAGES = [{ href: "/marketing-four", label: "Home" }]

const DOCS = [
  { href: "/docs", label: "Welcome" },
  { href: "/docs/installation", label: "Installation" },
  { href: "/docs/customization", label: "Customization" },
  { href: "/docs/faq", label: "FAQ" },
]

export function CommandMenu() {
  const router = useRouter()
  const isMac = useIsMac()
  const [open, setOpen] = useState(false)

  const runCommand = useCallback((command: () => unknown) => {
    setOpen(false)
    void playClick()
    triggerHaptic("selection")
    command()
  }, [])

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          onClick={() => setOpen(true)}
          className={cn(
            "relative h-8 w-full justify-start bg-muted/40 pl-2.5 font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-56 xl:w-64",
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
        className="rounded-xl border-none bg-clip-padding p-2 pb-11 shadow-2xl ring-4 ring-neutral-200/80 dark:bg-neutral-900 dark:ring-neutral-800"
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
              {PAGES.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`Navigation ${item.label}`}
                  onSelect={() => runCommand(() => router.push(item.href))}
                >
                  <ArrowRightIcon />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Docs" className={GROUP_HEADING_CLS}>
              {DOCS.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`Docs ${item.label}`}
                  onSelect={() => runCommand(() => router.push(item.href))}
                >
                  <ArrowRightIcon />
                  {item.label}
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
