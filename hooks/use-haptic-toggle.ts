"use client"

import { useAtom } from "jotai"
import { atomWithStorage } from "jotai/utils"

const KEY = "marketing-four-haptics-enabled"

const hapticsEnabledAtom = atomWithStorage(KEY, true)

// Matches shadcn-labs/startercn's useHapticsEnabled hook shape, but keeps
// iblaze-returns' own storage key and default (true, not startercn's false)
// so already-deployed users' saved preference and current live behavior
// don't change.
export function useHapticsEnabled(): [boolean, (v: boolean | ((p: boolean) => boolean)) => void] {
  return useAtom(hapticsEnabledAtom)
}

export function isHapticsEnabled() {
  if (typeof window === "undefined") return true
  const stored = localStorage.getItem(KEY)
  return stored === null ? true : stored === "true"
}
