"use client"

import * as React from "react"
import {
  getSidebarLayoutCookie,
  setSidebarLayoutCookie,
  SIDEBAR_LAYOUT_DEFAULT,
  type SidebarLayout,
} from "@/lib/sidebar-layout"

type SidebarLayoutContextValue = {
  layout: SidebarLayout
  setLayout: (layout: SidebarLayout) => void
}

const SidebarLayoutContext = React.createContext<SidebarLayoutContextValue | null>(null)

export function SidebarLayoutProvider({ children }: { children: React.ReactNode }) {
  const [layout, setLayoutState] = React.useState<SidebarLayout>(SIDEBAR_LAYOUT_DEFAULT)

  React.useEffect(() => {
    setLayoutState(getSidebarLayoutCookie())
  }, [])

  const setLayout = React.useCallback((next: SidebarLayout) => {
    setLayoutState(next)
    setSidebarLayoutCookie(next)
  }, [])

  const value = React.useMemo(() => ({ layout, setLayout }), [layout, setLayout])

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
