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
