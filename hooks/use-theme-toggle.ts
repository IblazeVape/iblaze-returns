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
