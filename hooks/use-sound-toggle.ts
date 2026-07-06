"use client"

import { useAtom } from "jotai"
import { atomWithStorage } from "jotai/utils"

const KEY = "marketing-four-sound-enabled"

const soundEnabledAtom = atomWithStorage(KEY, true)

// Matches shadcn-labs/startercn's useSoundEnabled hook shape, but keeps
// iblaze-returns' own storage key and default (true, not startercn's false)
// so already-deployed users' saved preference and current live behavior
// don't change.
export function useSoundEnabled(): [boolean, (v: boolean | ((p: boolean) => boolean)) => void] {
  return useAtom(soundEnabledAtom)
}

export function isSoundEnabled() {
  if (typeof window === "undefined") return true
  const stored = localStorage.getItem(KEY)
  return stored === null ? true : stored === "true"
}
