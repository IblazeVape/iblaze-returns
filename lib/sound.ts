import { defineSound, ensureReady } from "@web-kits/audio"
import { isSoundEnabled } from "@/hooks/use-sound-toggle"

// Two short, synthesized UI sounds (no audio files involved — @web-kits/audio
// generates the waveform on the fly) for /marketing-four's nav interactions.
const click = defineSound({
  source: { type: "sine", frequency: { start: 1200, end: 300 } },
  envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.03 },
  gain: 0.25,
})

const open = defineSound({
  source: { type: "sine", frequency: { start: 400, end: 900 } },
  envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.04 },
  gain: 0.2,
})

// Rising/falling pair for the theme toggle, mirroring the toggleOn/toggleOff
// feedback pattern startercn's mode switcher uses.
const toggleOn = defineSound({
  source: { type: "sine", frequency: { start: 600, end: 900 } },
  envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.03 },
  gain: 0.2,
})

const toggleOff = defineSound({
  source: { type: "sine", frequency: { start: 900, end: 600 } },
  envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.03 },
  gain: 0.2,
})

export async function playClick() {
  if (!isSoundEnabled()) return
  await ensureReady()
  click()
}

export async function playOpen() {
  if (!isSoundEnabled()) return
  await ensureReady()
  open()
}

export async function playToggle(on: boolean) {
  if (!isSoundEnabled()) return
  await ensureReady()
  if (on) toggleOn()
  else toggleOff()
}
