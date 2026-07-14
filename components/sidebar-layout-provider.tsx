"use client"

import * as React from "react"
import {
  getSidebarLayoutCookie,
  hasSidebarLayoutCookie,
  setSidebarLayoutCookie,
  SIDEBAR_LAYOUT_DEFAULT,
  type SidebarLayout,
} from "@/lib/sidebar-layout"

type SidebarLayoutContextValue = {
  layout: SidebarLayout
  setLayout: (layout: SidebarLayout) => void
  switcherEnabled: boolean
  /** Called once the merchant's branding has loaded. If the switcher is
   * disabled, forces every visit to the merchant's chosen layout (ignoring
   * any previously stored customer preference). If enabled, only seeds the
   * merchant's default the first time a visitor arrives with no stored
   * preference yet — an existing customer preference always wins. */
  applyMerchantDefault: (defaultLayout: SidebarLayout, enabled: boolean) => void
}

const SidebarLayoutContext = React.createContext<SidebarLayoutContextValue | null>(null)

export function SidebarLayoutProvider({ children }: { children: React.ReactNode }) {
  const [layout, setLayoutState] = React.useState<SidebarLayout>(SIDEBAR_LAYOUT_DEFAULT)
  const [switcherEnabled, setSwitcherEnabled] = React.useState(true)

  React.useEffect(() => {
    setLayoutState(getSidebarLayoutCookie())
  }, [])

  const setLayout = React.useCallback((next: SidebarLayout) => {
    setLayoutState(next)
    setSidebarLayoutCookie(next)
  }, [])

  const applyMerchantDefault = React.useCallback((defaultLayout: SidebarLayout, enabled: boolean) => {
    setSwitcherEnabled(enabled)
    if (!enabled || !hasSidebarLayoutCookie()) {
      setLayoutState(defaultLayout)
      setSidebarLayoutCookie(defaultLayout)
    }
  }, [])

  const value = React.useMemo(
    () => ({ layout, setLayout, switcherEnabled, applyMerchantDefault }),
    [layout, setLayout, switcherEnabled, applyMerchantDefault]
  )

  return (
    <SidebarLayoutContext.Provider value={value}>
      {children}
    </SidebarLayoutContext.Provider>
  )
}

export function useSidebarLayout() {
  const context = React.useContext(SidebarLayoutContext)
  if (!context) {
    throw new Error("useSidebarLayout must be used within SidebarLayoutProvider.")
  }
  return context
}
