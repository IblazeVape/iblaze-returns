import { defineSound, ensureReady } from "@web-kits/audio"

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

export async function playClick() {
  await ensureReady()
  click()
}

export async function playOpen() {
  await ensureReady()
  open()
}
