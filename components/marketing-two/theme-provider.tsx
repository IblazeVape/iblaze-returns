"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { cn } from "@/lib/utils"

const ThemeContext = createContext<{ dark: boolean; toggle: () => void } | null>(null)

const STORAGE_KEY = "marketing-two-theme"

export function MarketingTwoThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "dark") setDark(true)
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light")
  }, [dark])

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>
      <div
        id="marketing-two-root"
        className={cn("min-h-[100dvh] scroll-smooth bg-background text-foreground antialiased", dark && "dark")}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

// Per-block wrapper for the Puck page builder: provides the same theme
// context the sections expect, without the full-page min-height root div.
export function MarketingTwoBlockShell({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false)
  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>
      <div className={cn("bg-background text-foreground antialiased", dark && "dark")}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export function useMarketingTwoTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useMarketingTwoTheme must be used within MarketingTwoThemeProvider")
  return ctx
}
