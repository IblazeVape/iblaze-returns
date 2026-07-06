# Site Chrome Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/marketing-four`'s hand-adapted chrome (header, footer,
mode switcher, settings, command menu) with StarterCN's real components,
fixing the visual drift (extra header border, oversized icons) and wiring
search/mobile-nav to the real `/docs` content that already exists in this
repo.

**Architecture:** `components/marketing-four/nav.tsx` becomes a composed
header (matching StarterCN's `site-header.tsx`) built from new sibling
files `main-nav.tsx` and `mobile-nav.tsx`, plus a new `brand-context-menu.tsx`
wrapping the logo. `mobile-nav.tsx` and `command-menu.tsx` both read the same
flattened docs-page list from a new `lib/marketing-four-docs.ts` helper,
fed by the existing Fumadocs `source.pageTree`. Dark-mode toggling stays
scoped to `/marketing-four` via the existing `useMarketingTwoTheme()`
context — the already-ported (sub-project 1) `hooks/use-theme-toggle.ts`
and `hooks/use-meta-color.ts` are adapted in Task 2 to call that context
instead of real `next-themes`, so the rest of the app (forced light mode)
is unaffected.

**Tech Stack:** Next.js 15 / React 19 / TypeScript, `fumadocs-core` (already
installed, already wired via `lib/source.ts`), the sound/haptics engine from
sub-project 1 (`hooks/use-feedback.ts`, `components/animated-icons/*`).

## Global Constraints

- Source of truth for verbatim ports: `/Users/leejay/Downloads/StarterCN-main`
  (MIT-licensed, see `components/marketing-four/NOTICE.md`).
- GitHub-stars and Sponsor UI are **not** ported — no equivalent in this
  product. Do not add `nav-item-github.tsx`, `github-stars.tsx`,
  `sponsor-link.tsx`, or `lib/github.ts`.
- The shadcn-registry "copy install command" feature in StarterCN's
  `command-menu.tsx` (theme/component/template parsing, `SITE.REGISTRY`,
  `usePackageManager`, `trackEvent`/`@vercel/analytics`, the `blocks` prop)
  is **not** ported. This product has no component registry.
- `lib/docs.ts` and `lib/page-tree.ts` (StarterCN's folder-walking helpers)
  are **not** ported — `content/docs/meta.json` lists 4 pages with no
  subfolders, so the docs tree here is flat; a small custom helper replaces
  them (Task 4).
- Dark mode stays scoped to `/marketing-four` only. Do not modify
  `components/theme-provider.tsx` or `THEME_TOGGLE_ENABLED`. Do not make
  any ported file call real `next-themes` — route all theme reads/writes
  through `components/marketing-two/theme-provider.tsx`'s
  `useMarketingTwoTheme()`.
- StarterCN's `transitionTypes` prop (on `next/link`, part of their own
  View Transitions integration) is **not** ported — drop it from any copied
  JSX. Same for the `extend-touch-target` Tailwind utility (defined in
  StarterCN's `styles/globals.css`, not present in this repo) — drop that
  class name from copied JSX rather than adding the utility.
- No test framework is configured in this repo. Verification is
  `npx tsc --noEmit` + `npm run build` + manual browser checks, same bar as
  sub-project 1.
- iblaze-returns uses npm, not pnpm.

---

### Task 1: Extend `components/ui/toggle.tsx` with `ghost` variant, icon sizes, and sound

**Files:**
- Modify: `components/ui/toggle.tsx`

**Interfaces:**
- Produces: `Toggle` gains `variant="ghost"` and `size="icon"`/`size="icon-sm"`
  options (on top of existing `default`/`outline` variants and
  `default`/`sm`/`lg` sizes), plus automatic `toggleOn`/`toggleOff` sound
  feedback on every press change. Existing callers using `default`/`outline`
  variants and `default`/`sm`/`lg` sizes are unaffected — nothing existing
  passes `ghost` or `icon`/`icon-sm` today.
- Consumes: `useFeedback` from `@/hooks/use-feedback` (already exists from
  sub-project 1).

**Why this task exists:** StarterCN's real `SiteSettings` component (ported
in Task 6) uses `<Toggle variant="ghost" size="icon-sm">` — options the
current `components/ui/toggle.tsx` doesn't have. This was a gap in
sub-project 1's UI-primitive patching (only `button`/`popover`/`dialog`/
`drawer` were covered there); this task closes it before Task 6 needs it.

- [ ] **Step 1: Read the current file to confirm nothing has changed**

Run: `cat components/ui/toggle.tsx`
Expected: matches the version quoted below (a `function Toggle` using
`toggleVariants` with `default`/`outline` variants and `default`/`sm`/`lg`
sizes, no `useFeedback` import). If it differs, stop and reconcile before
applying the diff blindly.

- [ ] **Step 2: Replace the file contents**

```typescript
"use client"

import * as React from "react"
import { Toggle as TogglePrimitive } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"

import { useFeedback } from "@/hooks/use-feedback"
import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium hover:bg-muted hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none transition-[color,box-shadow] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 data-[state=on]:bg-accent/80 data-[state=on]:text-accent-foreground",
      },
      size: {
        default: "h-9 px-2 min-w-9",
        sm: "h-8 px-1.5 min-w-8",
        lg: "h-10 px-2.5 min-w-10",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant,
  size,
  onPressedChange,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  const playOn = useFeedback({ sound: "toggleOn" })
  const playOff = useFeedback({ sound: "toggleOff" })

  const handlePressedChange = (pressed: boolean) => {
    if (pressed) {
      playOn()
    } else {
      playOff()
    }
    onPressedChange?.(pressed)
  }

  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      onPressedChange={handlePressedChange}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. Existing `<Toggle>` usages elsewhere in the
codebase (check with `grep -rln "<Toggle" --include="*.tsx" . | grep -v node_modules`)
continue to type-check since `default`/`outline` variants and
`default`/`sm`/`lg` sizes are unchanged.

- [ ] **Step 4: Commit**

```bash
git add components/ui/toggle.tsx
git commit -m "feat: add ghost variant, icon sizes, and sound feedback to Toggle"
```

---

### Task 2: Scope the ported theme hooks to `/marketing-four`'s theme context

**Files:**
- Modify: `hooks/use-meta-color.ts`
- Modify: `hooks/use-theme-toggle.ts`

**Interfaces:**
- Produces: `useMetaColor(): { metaColor: string; setMetaColor: (color: string) => void }`
  (same signature as before — only the internal theme source changes) from
  `@/hooks/use-meta-color`. `useThemeToggle(): { toggleTheme: () => void }`
  (same signature) from `@/hooks/use-theme-toggle`.
- Consumes: `useMarketingTwoTheme` from
  `@/components/marketing-two/theme-provider` — an existing hook returning
  `{ dark: boolean; toggle: () => void }`. Must be called from a component
  rendered inside `<MarketingTwoThemeProvider>` (already true for all of
  `/marketing-four`, including everything Task 5's `ModeSwitcher` renders
  under).

**Why this task exists:** These two hooks were ported verbatim in
sub-project 1, wired to real `next-themes`. Real `next-themes` toggles a
class on `<html>` — site-wide. This product's dark mode must stay scoped to
`/marketing-four` only (confirmed constraint), so before Task 5's
`ModeSwitcher` can use these hooks, they need to read/write the existing
scoped `useMarketingTwoTheme()` context instead.

- [ ] **Step 1: Replace `hooks/use-meta-color.ts` contents**

```typescript
import { useCallback, useMemo } from "react"

import { useMarketingTwoTheme } from "@/components/marketing-two/theme-provider"
import { META_THEME_COLORS } from "@/constants/site"

export const useMetaColor = () => {
  const { dark } = useMarketingTwoTheme()

  const metaColor = useMemo(
    () => (dark ? META_THEME_COLORS.dark : META_THEME_COLORS.light),
    [dark]
  )

  const setMetaColor = useCallback((color: string) => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", color)
  }, [])

  return {
    metaColor,
    setMetaColor,
  }
}
```

- [ ] **Step 2: Replace `hooks/use-theme-toggle.ts` contents**

```typescript
"use client"

import { useCallback, useEffect } from "react"
import { useHotkeys } from "react-hotkeys-hook"

import { useMarketingTwoTheme } from "@/components/marketing-two/theme-provider"
import { useFeedback } from "@/hooks/use-feedback"
import { useMetaColor } from "@/hooks/use-meta-color"

export const useThemeToggle = () => {
  const { dark, toggle } = useMarketingTwoTheme()
  const { setMetaColor, metaColor } = useMetaColor()
  const feedbackOn = useFeedback({ sound: "toggleOn" })
  const feedbackOff = useFeedback({ sound: "toggleOff" })

  useEffect(() => {
    setMetaColor(metaColor)
  }, [metaColor, setMetaColor])

  const toggleTheme = useCallback(() => {
    const nextDark = !dark
    if (nextDark) {
      feedbackOff()
    } else {
      feedbackOn()
    }
    toggle()
  }, [dark, toggle, feedbackOn, feedbackOff])

  useHotkeys("d", () => toggleTheme(), { preventDefault: true })

  return { toggleTheme }
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. Nothing calls either hook yet (Task 5 is the first
consumer), so this is a safe, non-breaking change.

- [ ] **Step 4: Commit**

```bash
git add hooks/use-meta-color.ts hooks/use-theme-toggle.ts
git commit -m "refactor: scope ported theme hooks to marketing-four's theme context"
```

---

### Task 3: Brand context menu (copy/download logo as SVG)

**Files:**
- Modify: `components/marketing-four/logo.tsx`
- Create: `hooks/use-copy-to-clipboard.ts`
- Create: `components/marketing-four/brand-context-menu.tsx`

**Interfaces:**
- Produces: `getLogoMarkSVG(color: string): string` added to
  `@/components/marketing-four/logo` (alongside the existing `LogoMark`
  export, unchanged). `useCopyToClipboard(options?: { timeout?: number; onCopy?: () => void }): { copyToClipboard: (value: string) => Promise<boolean>; isCopied: boolean }`
  from `@/hooks/use-copy-to-clipboard`. `BrandContextMenu({ children }: { children: React.ReactNode })`
  from `@/components/marketing-four/brand-context-menu` — Task 10 wraps the
  header's logo `Link` with this.
- Consumes: `useMarketingTwoTheme` (for light/dark SVG color, replacing
  StarterCN's `next-themes` `useTheme`), `ContextMenu`/`ContextMenuContent`/
  `ContextMenuItem`/`ContextMenuTrigger` from `@/components/ui/context-menu`
  (already exists), `toast` from `sonner` (already installed, `<Toaster>`
  already mounted in `app/layout.tsx`).

- [ ] **Step 1: Add `getLogoMarkSVG` to `components/marketing-four/logo.tsx`**

Read the current file first — it already has `LogoMark` matching
StarterCN's exactly (confirmed identical path data). Add this export at the
end of the file, after the existing `LogoMark` export:

```typescript
export const getLogoMarkSVG = (color: string) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/>
    <path d="M12 22V12"/>
    <polyline points="3.29 7 12 12 20.71 7"/>
    <path d="m7.5 4.27 9 5.15"/>
  </svg>
`
```

- [ ] **Step 2: Create `hooks/use-copy-to-clipboard.ts`**

```typescript
"use client"

import { useState } from "react"

const legacyCopyToClipboard = (value: string) => {
  const textArea = document.createElement("textarea")
  textArea.value = value
  textArea.setAttribute("readonly", "")
  textArea.style.position = "fixed"
  textArea.style.opacity = "0"
  textArea.style.pointerEvents = "none"

  document.body.append(textArea)
  textArea.focus()
  textArea.select()
  textArea.setSelectionRange(0, value.length)

  let hasCopied = false
  try {
    hasCopied = document.execCommand("copy")
  } catch {
    hasCopied = false
  }

  textArea.remove()
  return hasCopied
}

export const useCopyToClipboard = ({
  timeout = 2000,
  onCopy,
}: {
  timeout?: number
  onCopy?: () => void
} = {}) => {
  const [isCopied, setIsCopied] = useState(false)

  const copyToClipboard = async (value: string) => {
    if (typeof window === "undefined") {
      return false
    }

    if (!value) {
      return false
    }

    let hasCopied = false

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value)
        hasCopied = true
      } catch {
        hasCopied = legacyCopyToClipboard(value)
      }
    } else {
      hasCopied = legacyCopyToClipboard(value)
    }

    if (!hasCopied) {
      return false
    }

    setIsCopied(true)

    if (onCopy) {
      onCopy()
    }

    if (timeout !== 0) {
      setTimeout(() => {
        setIsCopied(false)
      }, timeout)
    }

    return true
  }

  return { copyToClipboard, isCopied }
}
```

- [ ] **Step 3: Create `components/marketing-four/brand-context-menu.tsx`**

```typescript
"use client"

import { DownloadIcon } from "lucide-react"
import { useCallback } from "react"
import { toast } from "sonner"

import { useMarketingTwoTheme } from "@/components/marketing-two/theme-provider"
import { getLogoMarkSVG, LogoMark } from "@/components/marketing-four/logo"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"

// Ported from shadcn-labs/startercn's BrandContextMenu (MIT — see
// NOTICE.md). Their version reads next-themes' resolvedTheme; this reads
// the scoped useMarketingTwoTheme() context instead, since dark mode here
// is scoped to /marketing-four only.
export function BrandContextMenu({ children }: { children: React.ReactNode }) {
  const { dark } = useMarketingTwoTheme()
  const { copyToClipboard } = useCopyToClipboard()

  const logoMarkSvgString = getLogoMarkSVG(dark ? "#fff" : "#000")

  const handleCopy = useCallback(() => {
    copyToClipboard(logoMarkSvgString)
    toast.success("Icon as SVG copied")
  }, [logoMarkSvgString, copyToClipboard])

  const handleDownload = useCallback(() => {
    const blob = new Blob([logoMarkSvgString], {
      type: "image/svg+xml;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "icon.svg"
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Icon as SVG downloaded")
  }, [logoMarkSvgString])

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={handleCopy}>
          <LogoMark />
          Copy as SVG
        </ContextMenuItem>

        <ContextMenuItem onClick={handleDownload}>
          <DownloadIcon /> Download as SVG
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Manual smoke check**

Run: `npm run dev`. Nothing renders `BrandContextMenu` yet (Task 10 wires it
in), so verify by temporarily wrapping any element on `/marketing-four` in
`<BrandContextMenu>...</BrandContextMenu>`, right-clicking it, and
confirming the "Copy as SVG"/"Download as SVG" menu appears and both
actions show a toast. Remove the temporary wrapping before committing.

- [ ] **Step 6: Commit**

```bash
git add components/marketing-four/logo.tsx hooks/use-copy-to-clipboard.ts components/marketing-four/brand-context-menu.tsx
git commit -m "feat: add brand context menu for copying/downloading the logo mark"
```

---

### Task 4: Route constants and a flat docs-nav helper

**Files:**
- Create: `constants/routes.ts`
- Create: `lib/marketing-four-docs.ts`

**Interfaces:**
- Produces: `ROUTES.HOME = "/marketing-four"`, `ROUTES.DOCS = "/docs"` from
  `@/constants/routes`. `DocsNavItem = { url: string; name: string }` and
  `getDocsNavItems(tree?: PageTreeRoot): DocsNavItem[]` from
  `@/lib/marketing-four-docs` — defaults to `source.pageTree` if no `tree`
  argument is given, but Tasks 8/9 pass `tree` explicitly as a prop (matching
  StarterCN's own pattern of passing `tree` into `MobileNav`/`CommandMenu`
  rather than importing `source` inside them).
- Consumes: `source` from `@/lib/source` (already exists — the Fumadocs
  loader wired to `content/docs/`).

- [ ] **Step 1: Create `constants/routes.ts`**

```typescript
export const ROUTES = {
  HOME: "/marketing-four",
  DOCS: "/docs",
} as const
```

- [ ] **Step 2: Create `lib/marketing-four-docs.ts`**

```typescript
import type { Node as PageTreeNode, Root as PageTreeRoot } from "fumadocs-core/page-tree"

import { source } from "@/lib/source"

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
export function getDocsNavItems(tree: PageTreeRoot = source.pageTree): DocsNavItem[] {
  return tree.children.filter(isPageNode).map((node) => ({
    url: node.url,
    name: typeof node.name === "string" ? node.name : String(node.name),
  }))
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Verify the flat-tree assumption against the real content**

Run: `cat content/docs/meta.json`
Expected: `{"title": "Docs", "pages": ["index", "installation", "customization", "faq"]}`
— confirms no folders are declared, so `source.pageTree.children` will be 4
`page`-type nodes, validating this task's flat-list assumption. If this
file has changed to include folders since the design spec was written, stop
and re-plan Task 4 (the folder case needs `lib/docs.ts`/`lib/page-tree.ts`
after all).

- [ ] **Step 5: Manual verification of the helper's actual output**

Since nothing consumes `getDocsNavItems` yet, verify it directly: run
`npm run dev`, then in a scratch server file or by temporarily logging from
`app/marketing-four/page.tsx` (`console.log(getDocsNavItems())` at the top
of the component body, removed before committing), confirm the console
output is an array of 4 objects shaped `{ url: string, name: string }`
matching `/docs`, `/docs/installation`, `/docs/customization`, `/docs/faq`
with names "Welcome"/"Installation"/"Customization"/"FAQ" (or whatever each
page's frontmatter title is — check `content/docs/*.mdx` frontmatter if the
names look unexpected). Remove the temporary log before committing.

- [ ] **Step 6: Commit**

```bash
git add constants/routes.ts lib/marketing-four-docs.ts
git commit -m "feat: add route constants and flat docs-nav helper"
```

---

### Task 5: Port `mode-switcher.tsx`

**Files:**
- Modify: `components/marketing-four/mode-switcher.tsx`

**Interfaces:**
- Produces: `ModeSwitcher()` — same export name and zero-prop signature as
  before, so Task 10's header composition doesn't change how it's used.
- Consumes: `useThemeToggle` from `@/hooks/use-theme-toggle` (adapted in
  Task 2), `ThemeIcon` from `@/components/marketing-four/icons` (already
  exists, unchanged).

- [ ] **Step 1: Replace the file contents**

```typescript
"use client"

import { useThemeToggle } from "@/hooks/use-theme-toggle"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ThemeIcon } from "@/components/marketing-four/icons"

// Ported from shadcn-labs/startercn's ModeSwitcher (MIT — see NOTICE.md).
// Their useThemeToggle (next-themes-backed) is now our own scoped version
// (see hooks/use-theme-toggle.ts) — same trigger, tooltip, hotkey, icon.
export function ModeSwitcher() {
  const { toggleTheme } = useThemeToggle()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={toggleTheme}
          title="Toggle theme"
        >
          <ThemeIcon className="size-4.5" strokeWidth={2} />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent className="pr-2 pl-3">
        <div className="flex items-center gap-3">
          Toggle Mode
          <Kbd>D</Kbd>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. Note: `components/marketing-four/nav.tsx` (the
current, not-yet-replaced file) still imports and renders the old
`ModeSwitcher` — since the export name and props are unchanged, it keeps
compiling and rendering against the new internals without modification
(Task 10 rewrites `nav.tsx` itself later).

- [ ] **Step 3: Manual smoke check**

Run: `npm run dev`, open `/marketing-four`, click the theme toggle icon in
the header. Confirm: the page's colors flip between light/dark (scoped to
the page, not the whole browser chrome), a toggle sound plays, and pressing
`d` on the keyboard (while not focused in a text input) also toggles it.
Reload and confirm the page opens in the theme you left it in.

- [ ] **Step 4: Commit**

```bash
git add components/marketing-four/mode-switcher.tsx
git commit -m "feat: port ModeSwitcher to use the scoped theme-toggle hook"
```

---

### Task 6: Port `site-settings.tsx`

**Files:**
- Modify: `components/marketing-four/site-settings.tsx`

**Interfaces:**
- Produces: `SiteSettings()` — same export name and zero-prop signature.
- Consumes: `VibrateIcon`/`VibrateIconHandle` from
  `@/components/animated-icons/vibrate`, `Volume2Icon`/`Volume2IconHandle`
  from `@/components/animated-icons/volume-2` (both already exist from
  sub-project 1), `Toggle` with `variant="ghost"`/`size="icon-sm"` (Task 1),
  `Drawer`/`Popover` with `sounds` (already patched in sub-project 1),
  `useIsMac` (already exists), `useIsMobile` (already exists),
  `useSoundEnabled`/`useHapticsEnabled` (already jotai-backed from
  sub-project 1 — same `[boolean, setter]` tuple shape, no change needed
  here).

- [ ] **Step 1: Replace the file contents**

```typescript
"use client"

import { useRef, useState } from "react"
import { SettingsIcon } from "lucide-react"
import { useHotkeys } from "react-hotkeys-hook"

import type { VibrateIconHandle } from "@/components/animated-icons/vibrate"
import { VibrateIcon } from "@/components/animated-icons/vibrate"
import type { Volume2IconHandle } from "@/components/animated-icons/volume-2"
import { Volume2Icon } from "@/components/animated-icons/volume-2"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Kbd } from "@/components/ui/kbd"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Toggle } from "@/components/ui/toggle"
import { useHapticsEnabled } from "@/hooks/use-haptic-toggle"
import { useIsMac } from "@/hooks/use-is-mac"
import { useIsMobile } from "@/hooks/use-mobile"
import { useSoundEnabled } from "@/hooks/use-sound-toggle"

// Ported from shadcn-labs/startercn's SiteSettings (MIT — see NOTICE.md):
// same Drawer-on-mobile / Popover-on-desktop split, same animated icons,
// same hotkeys.
export function SiteSettings() {
  const volumeIconRef = useRef<Volume2IconHandle>(null)
  const vibrateIconRef = useRef<VibrateIconHandle>(null)
  const [isOpen, setIsOpen] = useState(false)
  const isMobile = useIsMobile()
  const isMac = useIsMac()
  const [soundEnabled, setSoundEnabled] = useSoundEnabled()
  const [hapticsEnabled, setHapticsEnabled] = useHapticsEnabled()

  useHotkeys(
    "meta+s, ctrl+s",
    () => {
      setSoundEnabled((prev) => !prev)
    },
    { preventDefault: true }
  )

  useHotkeys(
    "meta+h, ctrl+h",
    () => {
      setHapticsEnabled((prev) => !prev)
    },
    { preventDefault: true }
  )

  const handleSoundMouseEnter = () => {
    volumeIconRef.current?.startAnimation()
  }

  const handleSoundMouseLeave = () => {
    volumeIconRef.current?.stopAnimation()
  }

  const handleHapticsMouseEnter = () => {
    vibrateIconRef.current?.startAnimation()
  }

  const handleHapticsMouseLeave = () => {
    vibrateIconRef.current?.stopAnimation()
  }

  const trigger = (
    <Button variant="ghost" size="icon" className="size-8" aria-label="Settings">
      <SettingsIcon />
    </Button>
  )

  const content = (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 pl-1">
        <div className="flex items-center gap-2">
          <span className="text-sm">Toggle Sound</span>
          {!isMobile && <Kbd>{isMac ? "⌘" : "Ctrl"}+S</Kbd>}
        </div>
        <Toggle
          pressed={soundEnabled}
          onPressedChange={setSoundEnabled}
          aria-label="Toggle sound"
          variant="ghost"
          size="icon-sm"
          onMouseEnter={handleSoundMouseEnter}
          onMouseLeave={handleSoundMouseLeave}
        >
          <Volume2Icon ref={volumeIconRef} />
        </Toggle>
      </div>
      <div className="flex items-center justify-between gap-2 pl-1">
        <div className="flex items-center gap-2">
          <span className="text-sm">Toggle Haptics</span>
          {!isMobile && <Kbd>{isMac ? "⌘" : "Ctrl"}+H</Kbd>}
        </div>
        <Toggle
          pressed={hapticsEnabled}
          onPressedChange={setHapticsEnabled}
          aria-label="Toggle haptics"
          variant="ghost"
          size="icon-sm"
          onMouseEnter={handleHapticsMouseEnter}
          onMouseLeave={handleHapticsMouseLeave}
        >
          <VibrateIcon ref={vibrateIconRef} />
        </Toggle>
      </div>
    </div>
  )

  return (
    <>
      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={setIsOpen} sounds>
          <DrawerTrigger asChild>{trigger}</DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Settings</DrawerTitle>
              <DrawerDescription>Manage site preferences</DrawerDescription>
            </DrawerHeader>
            <div className="px-4">{content}</div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button size="sm">Done</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Popover open={isOpen} onOpenChange={setIsOpen} sounds>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <PopoverContent className="w-fit p-1">{content}</PopoverContent>
        </Popover>
      )}
    </>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manual smoke check**

Run: `npm run dev`, open `/marketing-four` at a normal desktop width, click
the settings gear — confirm a Popover opens (not a Drawer), hover the
sound/haptics icons and confirm they animate (wiggle/wave), click each
Toggle and confirm the pressed state updates and a sound plays. Then use
the browser's device toolbar (or resize the window) to a narrow/mobile
width, reload, click the gear again — confirm a bottom Drawer opens
instead, with a "Done" button that closes it. Press `Cmd+S`/`Cmd+H` (or
`Ctrl+S`/`Ctrl+H`) and confirm both hotkeys toggle their respective
setting even with the panel closed.

- [ ] **Step 4: Commit**

```bash
git add components/marketing-four/site-settings.tsx
git commit -m "feat: port SiteSettings with animated icons and Drawer/Popover split"
```

---

### Task 7: `main-nav.tsx` (desktop nav links)

**Files:**
- Create: `components/marketing-four/main-nav.tsx`

**Interfaces:**
- Produces: `MainNav({ items, className }: { items: { href: string; label: string }[] } & React.ComponentProps<"nav">)`
  from `@/components/marketing-four/main-nav` — Task 10 renders
  `<MainNav items={navItems} className="hidden lg:flex" />`.
- Consumes: `Button` with `sound="click"` (already supports this prop from
  sub-project 1's Task 4), `cn` from `@/lib/utils`.

- [ ] **Step 1: Create the file**

```typescript
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Ported from shadcn-labs/startercn's MainNav (MIT — see NOTICE.md).
// Their `transitionTypes` prop on next/link is part of their own View
// Transitions setup and isn't ported (no equivalent infra here).
export function MainNav({
  items,
  className,
  ...props
}: React.ComponentProps<"nav"> & {
  items: { href: string; label: string }[]
}) {
  const pathname = usePathname()

  return (
    <nav className={cn("items-center gap-0.5", className)} {...props}>
      {items.map((item) => (
        <Button key={item.href} variant="ghost" asChild size="sm" sound="click">
          <Link href={item.href} className={cn(pathname === item.href && "text-primary")}>
            {item.label}
          </Link>
        </Button>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. Nothing renders `MainNav` yet (Task 10 wires it in).

- [ ] **Step 3: Commit**

```bash
git add components/marketing-four/main-nav.tsx
git commit -m "feat: add MainNav component for marketing-four desktop header"
```

---

### Task 8: `mobile-nav.tsx` (mobile menu, wired to the real docs list)

**Files:**
- Create: `components/marketing-four/mobile-nav.tsx`

**Interfaces:**
- Produces: `MobileNav({ items, tree, className }: { items: { href: string; label: string }[]; tree: PageTreeRoot } & React.ComponentProps<"div">)`
  (loosely — see code below for the exact prop type) from
  `@/components/marketing-four/mobile-nav` — Task 10 renders
  `<MobileNav items={navItems} tree={source.pageTree} className="flex lg:hidden" />`.
- Consumes: `getDocsNavItems` from `@/lib/marketing-four-docs` (Task 4),
  `ROUTES` from `@/constants/routes` (Task 4), `useFeedback` (sub-project
  1), `Popover`/`PopoverContent`/`PopoverTrigger` with `sounds` (sub-project
  1), `Button` (sub-project 1's sound-aware version, though this component
  doesn't pass `sound` directly — the hamburger trigger's click sound comes
  from `Popover`'s own `sounds` prop, matching StarterCN).

- [ ] **Step 1: Create the file**

```typescript
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. Nothing renders `MobileNav` yet (Task 10 wires it in).

- [ ] **Step 3: Commit**

```bash
git add components/marketing-four/mobile-nav.tsx
git commit -m "feat: add MobileNav component wired to the real docs tree"
```

---

### Task 9: Port `command-menu.tsx`, wired to the real docs list

**Files:**
- Modify: `components/marketing-four/command-menu.tsx`

**Interfaces:**
- Produces: `CommandMenu({ navItems, tree }: { navItems: { href: string; label: string }[]; tree: PageTreeRoot })`
  from `@/components/marketing-four/command-menu` — note the prop shape
  changes from the current zero-prop `CommandMenu()`; Task 10 updates the
  one call site accordingly.
- Consumes: `getDocsNavItems` from `@/lib/marketing-four-docs` (Task 4),
  `useFeedback` (sub-project 1), `Dialog`/`DialogContent`/etc. with
  `sounds` (sub-project 1).

- [ ] **Step 1: Replace the file contents**

```typescript
"use client"

import type { Root as PageTreeRoot } from "fumadocs-core/page-tree"
import { ArrowRightIcon, CornerDownLeftIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

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
  "!p-0 [&_[cmdk-group-heading]]:scroll-mt-16 [&_[cmdk-group-heading]]:!p-3 [&_[cmdk-group-heading]]:!pb-1"

export function CommandMenu({
  navItems,
  tree,
}: {
  navItems: { href: string; label: string }[]
  tree: PageTreeRoot
}) {
  const router = useRouter()
  const isMac = useIsMac()
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
            "relative h-8 w-full justify-start bg-muted/40 pl-2.5 font-normal text-muted-foreground shadow-none focus-visible:border-input focus-visible:ring-0 sm:pr-12 md:w-40 lg:w-56 xl:w-64"
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
              {navItems.map((item) => (
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
              {docsPages.map((page) => (
                <CommandItem
                  key={page.url}
                  value={`Docs ${page.name}`}
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors ARE expected here — Task 10 hasn't updated `nav.tsx`'s call
site yet, so the existing `<CommandMenu />` call (no props) will fail
against the new required `navItems`/`tree` props. Confirm the error is
specifically about `CommandMenu`'s props in `components/marketing-four/nav.tsx`
and nothing else — that's expected and gets fixed in Task 10, the very next
task.

- [ ] **Step 3: Commit**

```bash
git add components/marketing-four/command-menu.tsx
git commit -m "feat: port CommandMenu wired to the real docs tree"
```

Note: this commit temporarily breaks the build (Task 10 fixes the one call
site in the next commit) — that's expected and documented above, not an
error to chase down within this task.

---

### Task 10: Rebuild `nav.tsx` as the composed header

**Files:**
- Modify: `components/marketing-four/nav.tsx`

**Interfaces:**
- Produces: `MarketingFourNav()` — same export name and zero-prop signature
  as the current file, so `app/marketing-four/page.tsx`'s
  `<MarketingFourNav />` call needs no change.
- Consumes: `MainNav` (Task 7), `MobileNav` (Task 8), `CommandMenu` (Task 9,
  now taking `navItems`/`tree` props), `ModeSwitcher` (Task 5),
  `SiteSettings` (Task 6), `BrandContextMenu` (Task 3), `LogoMark` (existing,
  unchanged), `ROUTES` (Task 4), `source` from `@/lib/source` (existing).

- [ ] **Step 1: Replace the file contents**

```typescript
"use client"

import Link from "next/link"

import { BrandContextMenu } from "@/components/marketing-four/brand-context-menu"
import { CommandMenu } from "@/components/marketing-four/command-menu"
import { LogoMark } from "@/components/marketing-four/logo"
import { MainNav } from "@/components/marketing-four/main-nav"
import { MobileNav } from "@/components/marketing-four/mobile-nav"
import { ModeSwitcher } from "@/components/marketing-four/mode-switcher"
import { SiteSettings } from "@/components/marketing-four/site-settings"
import { ROUTES } from "@/constants/routes"
import { source } from "@/lib/source"

// Ported from shadcn-labs/startercn's SiteHeader (MIT — see NOTICE.md):
// no border, no backdrop blur — matches their real header treatment
// exactly (the previous version of this file had both, which was drift
// from a hand-adaptation rather than a real port). GitHub-stars and
// Sponsor nav items are not ported (no equivalent in this product).
const navItems = [{ href: ROUTES.DOCS, label: "Docs" }]

export function MarketingFourNav() {
  return (
    <header className="sticky top-0 z-50 w-full bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <MobileNav items={navItems} tree={source.pageTree} className="flex lg:hidden" />
        <BrandContextMenu>
          <Link href={ROUTES.HOME} className="hidden size-8 items-center justify-center lg:flex">
            <LogoMark className="size-5" />
            <span className="sr-only">Reflow</span>
          </Link>
        </BrandContextMenu>
        <MainNav items={navItems} className="hidden lg:flex" />
        <div className="ml-auto flex items-center gap-2 md:flex-1 md:justify-end">
          <div className="hidden w-full flex-1 md:flex md:w-auto md:flex-none">
            <CommandMenu navItems={navItems} tree={source.pageTree} />
          </div>
          <ModeSwitcher />
          <SiteSettings />
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean — this fixes the `CommandMenu` prop mismatch introduced in
Task 9.

- [ ] **Step 3: Full manual browser check**

Run: `npm run dev`, open `/marketing-four`. Confirm:
1. The header has **no visible border** below it and **no backdrop blur**
   (solid background).
2. The settings-gear and theme-toggle icons render at the same size as
   StarterCN's live reference (`https://iblaze-returns.vercel.app/marketing-four`
   isn't the reference anymore — compare visually against
   `/Users/leejay/Downloads/StarterCN-main` run locally if you want a
   side-by-side, or just confirm the icons look proportionate to the rest
   of the header, not oversized).
3. No GitHub star count or Sponsor link anywhere in the header.
4. Right-click the logo (desktop, `lg` breakpoint or wider) — the "Copy as
   SVG"/"Download as SVG" menu appears and works.
5. Press Cmd+K (or Ctrl+K) — the search dialog opens and the "Docs" group
   lists 4 real pages (Welcome/Installation/Customization/FAQ, or whatever
   their actual frontmatter titles are), each of which navigates correctly
   when clicked.
6. Narrow the viewport below the `lg` breakpoint — the hamburger menu
   appears, opens a full-height panel listing Home/Docs nav items plus a
   "Docs" section with the same 4 real pages.
7. Toggle dark mode, then navigate to `/dashboard` (or any other page) and
   confirm it's still light — dark mode did not leak outside
   `/marketing-four`.
8. Confirm sub-project 1's previously-verified behavior still works: sound
   toggle persists across reload, no console errors.

- [ ] **Step 4: Commit**

```bash
git add components/marketing-four/nav.tsx
git commit -m "feat: rebuild MarketingFourNav as StarterCN's composed header"
```

---

### Task 11: Wire the footer's link through `useFeedback`

**Files:**
- Modify: `components/marketing-four/site-footer.tsx`

**Interfaces:**
- Produces: `SiteFooter()` — same export name and zero-prop signature.
- Consumes: `useFeedback` from `@/hooks/use-feedback`.

**Why a lighter touch:** per the design spec, this footer's copy is already
appropriate to the product (not StarterCN's author/GitHub attribution), so
this task only adds the same click-sound wiring StarterCN's footer has —
it does not rewrite the copy or layout.

- [ ] **Step 1: Read the current file**

Run: `cat components/marketing-four/site-footer.tsx`
Expected: matches the version already shown in the design spec — a
`"use client"`-less server component rendering a `<footer>` with a
`<Link href="/docs">`.

- [ ] **Step 2: Replace the file contents**

```typescript
"use client"

import Link from "next/link"

import { useFeedback } from "@/hooks/use-feedback"

// Structural pattern adapted from shadcn-labs/startercn's SiteFooter (MIT)
// — same centered single-row footer layout and click-sound wiring via
// useFeedback. Content is entirely our own: their version credits their
// own author and links to their own GitHub repo, which doesn't apply here.
export function SiteFooter() {
  const playClick = useFeedback({ sound: "click" })

  return (
    <footer className="border-t">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-center px-4 sm:px-6">
        <p className="w-full px-1 text-center text-xs leading-loose text-muted-foreground sm:text-sm">
          &copy;{new Date().getFullYear()} Reflow. Built for Shopify merchants.{" "}
          <Link
            href="/docs"
            className="font-medium underline underline-offset-4"
            onClick={playClick}
          >
            Read the docs
          </Link>
          .
        </p>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manual smoke check**

Run: `npm run dev`, open `/marketing-four`, scroll to the footer, click
"Read the docs" — confirm it navigates to `/docs` and a click sound plays.

- [ ] **Step 4: Commit**

```bash
git add components/marketing-four/site-footer.tsx
git commit -m "feat: wire SiteFooter's docs link through useFeedback"
```

---

### Task 12: Broaden `NOTICE.md`'s attribution scope

**Files:**
- Modify: `components/marketing-four/NOTICE.md`

- [ ] **Step 1: Read the current file**

Run: `cat components/marketing-four/NOTICE.md`

- [ ] **Step 2: Replace the file contents**

```markdown
Several files in this project are adapted or directly ported from
[shadcn-labs/startercn](https://github.com/shadcn-labs/startercn), used
under the MIT License below:

- Within `components/marketing-four/`: `nav.tsx`, `main-nav.tsx`,
  `mobile-nav.tsx`, `mode-switcher.tsx`, `site-settings.tsx`,
  `site-footer.tsx`, `command-menu.tsx`, `logo.tsx`, `icons.tsx`
  (`ThemeIcon`), `brand-context-menu.tsx`.
- Elsewhere in the repo: `audio/core.ts`, `audio/index.ts` (the "Core"
  sound pack, v3.1.0, by Raphael Salaja, distributed via `@web-kits/audio`),
  `hooks/use-feedback.ts`, `hooks/use-meta-color.ts`,
  `hooks/use-theme-toggle.ts`, `components/animated-icons/vibrate.tsx`,
  `components/animated-icons/volume-2.tsx`,
  `components/animated-icons/heart-handshake.tsx`.

Routes, copy, hooks, data sources, and dependencies specific to that
project's own use case (component-registry publishing and browsing, its
own GitHub repo and star count, its own author credit, its own
donation/sponsor page, its own View Transitions integration) have been
replaced with this product's own or dropped entirely where nothing here
corresponds to them.

Note: `logo.tsx`'s `LogoMark` is their template's generic placeholder brand
mark, provided specifically for forks to replace with their own logo —
worth swapping for a distinct mark before this becomes a permanent brand
asset, independent of the license question above (which is settled: MIT
permits using it as-is).

---

MIT License

Copyright (c) 2026 Shadcn Labs

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
```

- [ ] **Step 3: Commit**

```bash
git add components/marketing-four/NOTICE.md
git commit -m "docs: broaden NOTICE.md attribution scope to the full ported file set"
```

---

## End-of-plan verification

- [ ] Run: `npx tsc --noEmit` — zero errors across the whole repo.
- [ ] Run: `npm run build` — production build succeeds.
- [ ] Repeat the full manual browser check from Task 10, Step 3, end to
  end, on a fresh `npm run dev` (not left over from an earlier task's
  server) to confirm nothing regressed across the later tasks (11, 12
  don't touch runtime behavior, but confirm anyway).
- [ ] Confirm `git log --oneline -12` shows all 12 commits from this plan
  in order.
- [ ] Confirm no leftover temporary debug code: `grep -rn "console.log" components/marketing-four/ lib/marketing-four-docs.ts`
  should return nothing (Task 4's Step 5 verification log must have been
  removed before its commit).
