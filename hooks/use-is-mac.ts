"use client"

import { useEffect, useState } from "react"

// Mirrors startercn's use-is-mac hook: platform detection for showing the
// right modifier key (⌘ vs Ctrl) in keyboard hints.
export function useIsMac() {
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().includes("MAC"))
  }, [])

  return isMac
}
