"use client"

import { useHotkeys } from "react-hotkeys-hook"
import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useMarketingTwoTheme } from "@/components/marketing-two/theme-provider"
import { ThemeIcon } from "@/components/marketing-four/icons"
import { playToggle } from "@/lib/sound"
import { triggerHaptic } from "@/lib/haptics"

// Ported from shadcn-labs/startercn's ModeSwitcher (MIT — see NOTICE.md):
// same trigger + tooltip ("Toggle Mode" + Kbd "D") and same "D" hotkey, same
// ThemeIcon glyph. Their useThemeToggle hook (next-themes + custom feedback)
// is replaced with our own theme provider + sound/haptics helpers.
export function ModeSwitcher() {
  const { toggle } = useMarketingTwoTheme()

  const toggleTheme = () => {
    void playToggle(true)
    triggerHaptic("selection")
    toggle()
  }

  useHotkeys("d", toggleTheme, { preventDefault: true })

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggleTheme}
          title="Toggle theme"
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ThemeIcon className="size-4.5" strokeWidth={2} />
          <span className="sr-only">Toggle theme</span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="pl-3 pr-2">
        <div className="flex items-center gap-3">
          Toggle Mode
          <Kbd>D</Kbd>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
