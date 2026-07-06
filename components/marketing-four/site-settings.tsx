"use client"

import { useState } from "react"
import { SettingsIcon, Vibrate, Volume2 } from "lucide-react"
import { useHotkeys } from "react-hotkeys-hook"
import { Kbd } from "@/components/ui/kbd"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Toggle } from "@/components/ui/toggle"
import { useIsMobile } from "@/hooks/use-mobile"
import { useSoundEnabled } from "@/hooks/use-sound-toggle"
import { useHapticsEnabled } from "@/hooks/use-haptic-toggle"

// Adapted from shadcn-labs/startercn's SiteSettings (MIT) — same settings
// gear -> popover with Toggle Sound (⌘/Ctrl+S) and Toggle Haptics (⌘/Ctrl+H).
// Simplified: plain lucide-react icons instead of their custom animated
// icon components, and a Popover on all sizes rather than a Drawer variant
// for mobile, since we don't have a mobile/desktop split for this menu.
export function SiteSettings() {
  const [open, setOpen] = useState(false)
  const isMobile = useIsMobile()
  const [soundEnabled, setSoundEnabled] = useSoundEnabled()
  const [hapticsEnabled, setHapticsEnabled] = useHapticsEnabled()

  useHotkeys("meta+s, ctrl+s", () => setSoundEnabled((prev) => !prev), { preventDefault: true })
  useHotkeys("meta+h, ctrl+h", () => setHapticsEnabled((prev) => !prev), { preventDefault: true })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Settings"
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <SettingsIcon className="size-4.5" strokeWidth={2} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-1">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 pl-1">
            <div className="flex items-center gap-2">
              <span className="text-sm">Toggle Sound</span>
              {!isMobile && <Kbd>⌘+S</Kbd>}
            </div>
            <Toggle
              pressed={soundEnabled}
              onPressedChange={setSoundEnabled}
              aria-label="Toggle sound"
              variant="default"
              size="sm"
            >
              <Volume2 className="size-4" />
            </Toggle>
          </div>
          <div className="flex items-center justify-between gap-2 pl-1">
            <div className="flex items-center gap-2">
              <span className="text-sm">Toggle Haptics</span>
              {!isMobile && <Kbd>⌘+H</Kbd>}
            </div>
            <Toggle
              pressed={hapticsEnabled}
              onPressedChange={setHapticsEnabled}
              aria-label="Toggle haptics"
              variant="default"
              size="sm"
            >
              <Vibrate className="size-4" />
            </Toggle>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
