"use client"

import { useEffect, useState } from "react"

const KEY = "marketing-four-sound-enabled"

// Matches shadcn-labs/startercn's useSoundEnabled hook shape — a persisted
// boolean tuple so SiteSettings and lib/sound.ts agree on whether sounds fire.
export function useSoundEnabled(): [boolean, (v: boolean | ((p: boolean) => boolean)) => void] {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(KEY)
    if (stored !== null) setEnabled(stored === "true")
  }, [])

  const set = (v: boolean | ((p: boolean) => boolean)) => {
    setEnabled((prev) => {
      const next = typeof v === "function" ? v(prev) : v
      localStorage.setItem(KEY, String(next))
      return next
    })
  }

  return [enabled, set]
}

export function isSoundEnabled() {
  if (typeof window === "undefined") return true
  const stored = localStorage.getItem(KEY)
  return stored === null ? true : stored === "true"
}
