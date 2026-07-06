import { WebHaptics } from "web-haptics"
import { isHapticsEnabled } from "@/hooks/use-haptic-toggle"

// Module-level instance (vanilla API, not the React hook) so nav helpers like
// tap() in components/marketing-four/nav.tsx can call this from a plain
// function rather than needing to be inside a component.
let instance: WebHaptics | null = null

export function triggerHaptic(pattern: Parameters<WebHaptics["trigger"]>[0] = "light") {
  if (typeof window === "undefined") return
  if (!isHapticsEnabled()) return
  if (!instance) instance = new WebHaptics()
  void instance.trigger(pattern)
}
