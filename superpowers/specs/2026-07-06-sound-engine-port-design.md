# Sound & Haptics Engine Port (sub-project 1 of 4)

## Context

We're porting `shadcn-labs/startercn`'s `/` site design into iblaze-returns as a
rebuilt `/marketing-four` page (MIT-licensed, see
`components/marketing-four/NOTICE.md`). The full port spans four sub-projects:

1. **Sound & haptics engine** (this doc)
2. Fumadocs + real iBlaze docs content
3. Site chrome (`site-header`, `main-nav`, `mobile-nav`, `mode-switcher`,
   `site-settings`, `site-footer`, `command-menu`, `logo`, `icons`,
   `brand-context-menu`), rebranded, GitHub-stars/Sponsor dropped
4. Wire the rebuilt chrome into `/marketing-four`

Sub-projects 3 and 4 depend on this one and on sub-project 2. This doc covers
sub-project 1 only.

## Goal

Bring StarterCN's actual sound/haptics engine — `useFeedback` +
`audio/core.ts` sound bank + jotai-backed enable/disable toggles — into
iblaze-returns, so the chrome components ported in sub-project 3 can use their
`sound` / `sounds` props exactly as StarterCN's code does, rather than
maintaining a second, simplified sound system alongside it.

## Current state

iblaze-returns already has a hand-rolled sound/haptics setup for
`/marketing-four`, used only by that page's current nav/mode-switcher:

- `lib/sound.ts`, `lib/haptics.ts` — plain functions (`playClick`,
  `playOpen`, `playToggle`, `triggerHaptic`) built on the same underlying
  packages StarterCN uses (`@web-kits/audio`, `web-haptics`), but a much
  smaller, independently-written implementation (4 sounds vs. StarterCN's ~60).
- `hooks/use-haptic-toggle.ts`, `hooks/use-sound-toggle.ts` — localStorage-backed
  `useState` hooks, keys `marketing-four-haptics-enabled` /
  `marketing-four-sound-enabled`, both **default `true`**.
- `hooks/use-is-mac.ts`, `hooks/use-mobile.ts` — already present, structurally
  equivalent to StarterCN's versions (confirmed by diff).

None of this is touched by sub-project 1. It keeps working untouched until
sub-project 3 rewires the actual nav/mode-switcher components to call the new
engine instead — at which point `lib/sound.ts`/`lib/haptics.ts` become dead
code and get deleted as part of that sub-project's cleanup, not this one.

## What gets ported

**New dependencies** (added to `package.json`): `jotai`, `motion`. Everything
else these files need (`@web-kits/audio`, `web-haptics`, `react-hotkeys-hook`,
`next-themes`) is already installed.

**Copied verbatim from StarterCN-main:**
- `audio/core.ts` — generated `SoundDefinition` data, ~60 named sounds (click,
  tap, toggleOn/Off, modalOpen/Close, dropdownOpen/Close, drawerOpen/Close,
  error, success, etc.)
- `audio/index.ts` — one-line re-export
- `hooks/use-feedback.ts` — the `useFeedback({ sound, soundDef, haptic })` hook
  and `FeedbackType` union type, mapping sound keys to haptic presets
- `hooks/use-meta-color.ts` — theme-color `<meta>` tag sync (needed by
  `use-theme-toggle`)
- `hooks/use-theme-toggle.ts` — `next-themes` wrapper that plays
  `toggleOn`/`toggleOff` feedback and binds the `d` hotkey; self-contained,
  not consumed by anything until sub-project 3's `mode-switcher.tsx` lands,
  but ported now since it has no other dependencies

**Modified in place (not replaced wholesale):**
- `hooks/use-haptic-toggle.ts`, `hooks/use-sound-toggle.ts` — internals swapped
  for jotai's `atomWithStorage`, matching StarterCN's implementation, but:
  - keep iblaze's existing localStorage keys
    (`marketing-four-haptics-enabled`, `marketing-four-sound-enabled`)
  - keep default `true` (not StarterCN's default `false`)
  - keep the plain-function exports `isHapticsEnabled()` / `isSoundEnabled()`
    that `lib/haptics.ts`/`lib/sound.ts` currently call

  Reasoning: this preserves already-deployed users' saved preferences and the
  current live default-on behavior. Only the storage mechanism changes
  (`useState` + manual localStorage read/write → jotai atom), the public
  shape (`[boolean, setter]` tuple + standalone getter) stays identical, so
  nothing else has to change to keep working.

- `components/ui/button.tsx`, `popover.tsx`, `dialog.tsx`, `drawer.tsx` — add
  the `sound?: FeedbackType` / `sounds?: boolean` props and `useFeedback` call
  from StarterCN's versions, on top of iblaze's existing implementation
  (structurally near-identical already: same variants, same `radix-ui` Slot
  import style). This is additive prop support, not a file replacement — keep
  iblaze's existing import conventions (e.g. `@radix-ui/react-dialog` where
  that's what's already there).

**Ported as new files** (needed by sub-project 3's `site-settings.tsx` and
`sponsor-link.tsx`, self-contained, no reason not to land them now):
- `components/animated-icons/vibrate.tsx`
- `components/animated-icons/volume-2.tsx`
- `components/animated-icons/heart-handshake.tsx`

All three use the `motion` package as-is (not translated to `framer-motion`,
even though iblaze-returns already has `framer-motion` installed) — `motion`
is being added specifically for these, per the earlier scoping decision to
port StarterCN's engine faithfully rather than adapt it.

## Explicitly out of scope for this sub-project

- Nothing currently rendered on `/marketing-four` (or anywhere else in
  iblaze-returns) is rewired to call any of this yet. `lib/sound.ts` /
  `lib/haptics.ts` and their consumers (current `nav.tsx`, `mode-switcher.tsx`,
  `command-menu.tsx`, `main-nav.tsx` under `components/marketing-four/`) are
  untouched.
- `hooks/use-package-manager.ts`, `hooks/use-copy-to-clipboard.ts`,
  `hooks/use-mutation-observer.ts`, `hooks/use-config.ts`,
  `hooks/use-mounted.ts` — needed by `command-menu.tsx` in sub-project 3, not
  by the sound engine itself.
- Any Fumadocs / docs-tree work (sub-project 2).
- `@vercel/analytics`, `sonner` event tracking — not part of the sound engine;
  `sonner` is already installed for other reasons, `@vercel/analytics` comes
  in with sub-project 3's `command-menu.tsx` if that route still calls
  `trackEvent`.

## Verification

This sub-project has no visible surface on its own — nothing calls the new
code path yet. Verification is:

1. `pnpm build` (or the project's typecheck script) passes with the new files
   and the two dependency additions.
2. A throwaway manual check: temporarily add `sound="click"` to one existing
   button somewhere reachable in dev, click it, confirm a sound and haptic
   fire, then remove the temporary prop. This is a smoke test of the wiring,
   not a permanent change — subproject 3 is what actually uses these props
   for real.

## Risks / notes

- Swapping `use-haptic-toggle.ts`/`use-sound-toggle.ts` internals to jotai
  means the app needs a `Provider`-free jotai setup (jotai atoms work without
  a wrapping `<Provider>` by default, using the default store) — confirm this
  doesn't conflict with anything already using a jotai provider elsewhere in
  the app (nothing currently does; iblaze-returns has no existing jotai
  dependency).
- `atomWithStorage` reads `localStorage` lazily/on mount like the current
  `useEffect`-based implementation, so SSR/hydration behavior should be
  equivalent, but worth a quick manual check for hydration warnings after the
  swap.
