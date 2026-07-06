"use client"

import { MoonStar, SunMedium } from "lucide-react"
import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useMarketingTwoTheme } from "@/components/marketing-two/theme-provider"

// Adapted from shadcn-labs/startercn's ModeSwitcher (MIT) — same trigger +
// tooltip pattern ("Toggle Mode" label with a Kbd shortcut hint), wired to
// our own theme provider instead of their useThemeToggle hook.
export function ModeSwitcher() {
  const { dark, toggle } = useMarketingTwoTheme()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggle}
          title="Toggle theme"
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {dark ? <SunMedium className="size-4.5" strokeWidth={2} /> : <MoonStar className="size-4.5" strokeWidth={2} />}
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
