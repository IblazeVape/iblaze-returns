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
