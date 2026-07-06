"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import { BookOpen, HelpCircle, LayoutGrid, LogIn, Search, SlidersHorizontal } from "lucide-react"
import { playClick, playOpen } from "@/lib/sound"

const ITEMS = [
  { icon: LayoutGrid, label: "Home", href: "/marketing-four" },
  { icon: BookOpen, label: "Docs — Welcome", href: "/docs" },
  { icon: SlidersHorizontal, label: "Docs — Customization", href: "/docs/customization" },
  { icon: HelpCircle, label: "Docs — FAQ", href: "/docs/faq" },
  { icon: LogIn, label: "Login", href: "/auth/sign-in" },
]

export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => {
          if (!o) void playOpen()
          return !o
        })
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  const go = (href: string) => {
    void playClick()
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { void playOpen(); setOpen(true) }}
        className="hidden h-8 w-48 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted lg:flex"
      >
        <Search className="size-3.5" />
        Search
        <kbd className="ml-auto rounded border bg-background px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 pt-[15vh]" onClick={() => setOpen(false)}>
          <Command
            className="w-full max-w-md overflow-hidden rounded-xl border bg-popover shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Command.Input
              autoFocus
              placeholder="Search pages..."
              className="w-full border-b bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            <Command.List className="max-h-80 overflow-y-auto p-2">
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                No results found.
              </Command.Empty>
              {ITEMS.map((item) => (
                <Command.Item
                  key={item.href}
                  onSelect={() => go(item.href)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm data-[selected=true]:bg-muted"
                >
                  <item.icon className="size-4 text-muted-foreground" />
                  {item.label}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </div>
      )}
    </>
  )
}
