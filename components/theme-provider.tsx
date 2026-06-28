"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

/** Set to true when re-enabling dark mode in the UI */
export const THEME_TOGGLE_ENABLED = false

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme={THEME_TOGGLE_ENABLED ? undefined : "light"}
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
