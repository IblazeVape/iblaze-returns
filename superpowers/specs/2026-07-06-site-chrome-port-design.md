# Site Chrome Port (sub-project 3 of 4)

## Context

Continuing the effort to make `/marketing-four` match `shadcn-labs/startercn`'s
real design (MIT-licensed). Sub-project 1 (sound/haptics engine) is complete
and merged (commits `683bd06..7c4c137`). This doc covers sub-project 3: the
actual navigation, footer, settings, command menu, and icon chrome — the
visible part of the page that prompted this whole effort (the current chrome
has an extra header border and oversized icons that don't match StarterCN's
real design, because it was hand-adapted rather than ported).

Original sub-project 2 (Fumadocs + real docs content) turned out to already
exist in this repo — `content/docs/{index,installation,customization,faq}.mdx`
and `lib/source.ts` were built in an earlier, unrelated session. So this
sub-project folds in the one piece of sub-project 2 that was still missing:
wiring the chrome's search/mobile-menu to that real content instead of a
hardcoded list.

Sub-project 4 (final wiring into the live `/marketing-four` page) follows
this one.

## Goal

Replace the current hand-adapted chrome components under
`components/marketing-four/` with StarterCN's real components — fixing the
visual drift (no border on the header, correct icon sizing) — while:
- dropping GitHub-stars and Sponsor (no equivalent in this product, per
  earlier decision)
- keeping dark-mode toggling scoped to `/marketing-four` only, not
  site-wide
- wiring the command menu and mobile nav to the real doc tree that already
  exists (`lib/source.ts`), instead of the current hardcoded `PAGES`/`DOCS`
  arrays

## Current state (what's being replaced)

| Current file | Issue |
|---|---|
| `components/marketing-four/nav.tsx` | Hand-built, not a port. Has `border-b` (StarterCN's `site-header.tsx` has no border); custom hamburger built locally rather than reusing StarterCN's `MobileNav`. |
| `components/marketing-four/mode-switcher.tsx` | Icon forced to `size-4.5` explicitly; StarterCN's real version renders `<SettingsIcon />`/`<ThemeIcon />` bare and lets `Button`'s CSS default it to `size-4`. Also calls `lib/sound.ts`/`lib/haptics.ts` directly instead of the now-ported `useFeedback`. |
| `components/marketing-four/site-settings.tsx` | Same icon-sizing and sound-wiring drift as above. |
| `components/marketing-four/site-footer.tsx` | Structurally fine (own copy, not StarterCN's author/GitHub attribution) — needs only a lighter pass: match StarterCN's click-sound wiring via `useFeedback`. |
| `components/marketing-four/command-menu.tsx` | Hardcoded `PAGES`/`DOCS` arrays instead of reading `lib/source.ts`'s `source.pageTree`. Otherwise structurally close to StarterCN's. |
| `components/marketing-four/logo.tsx`, `icons.tsx` | Present, but not verified against StarterCN's originals file-by-file (this sub-project ports them verbatim to close any remaining gaps). |
| *(missing entirely)* | `brand-context-menu.tsx` — StarterCN's right-click-the-logo-to-copy/download-SVG feature has no equivalent in the current chrome. |

## What gets ported

**Verbatim from StarterCN, adapted only where noted:**

- `logo.tsx` — verbatim, including the placeholder box mark (per earlier
  decision: use StarterCN's mark as-is, not an iBlaze rebrand).
- `icons.tsx` — verbatim (`ThemeIcon` and friends).
- `brand-context-menu.tsx` — verbatim; new file, wraps the logo link in the
  header with a right-click context menu (copy/download SVG).
- `site-header.tsx` → replaces `components/marketing-four/nav.tsx`. File
  name and export stay `nav.tsx`/`MarketingFourNav`, matching this
  directory's existing naming convention (every other file here is
  `marketing-four`-prefixed or directory-scoped) — only the internals
  change to StarterCN's structure. No `border-b`. Drops
  `NavItemGithub`/`SponsorLink` from the composed header entirely (not
  ported at all, per earlier decision).
- `main-nav.tsx` — verbatim.
- `mobile-nav.tsx` — ported, with StarterCN's folder-walking logic
  **simplified**: `content/docs/meta.json` lists 4 pages with no
  subfolders, so `source.pageTree.children` in this repo is a flat list of
  `page` nodes, not `folder` nodes. StarterCN's `EXCLUDED_SECTIONS`/
  `isComponentsFolder`/`getAllPagesFromFolder`/`getPagesFromFolder` helpers
  (`lib/docs.ts`, `lib/page-tree.ts`) exist to group docs by folder
  (Components, Getting Started, etc.) — none of that applies here. The
  ported `MobileNav` renders one "Docs" group listing the flat page list
  directly; `lib/docs.ts` and `lib/page-tree.ts` are **not** ported.
- `command-menu.tsx` — ported, replacing the hardcoded `DOCS` array with
  the same flat `source.pageTree` read `mobile-nav.tsx` uses. StarterCN's
  shadcn-registry "copy install command" feature (`SITE.REGISTRY`,
  `${packageManager} dlx shadcn add ...`) is **not** ported — no
  registry in this product (already decided in sub-project 1's scoping).
  `lib/events.ts`'s `trackEvent`/`@vercel/analytics` call is also dropped
  with it, since it only existed to instrument that registry-copy feature.
- `mode-switcher.tsx`, `site-settings.tsx` — ported, using the real
  `useFeedback`/sound-prop plumbing from sub-project 1 instead of the
  current direct `lib/sound.ts`/`lib/haptics.ts` calls. Icon sizing follows
  StarterCN exactly (bare `<ThemeIcon />`/`<SettingsIcon />`, CSS default of
  `size-4`, not the current forced `size-4.5`).
- `site-footer.tsx` — lighter touch: keep the current custom copy
  ("©{year} Reflow. Built for Shopify merchants. Read the docs.") since
  it's already appropriate content, not StarterCN's author/GitHub
  attribution — but restructure the click handling to route the "Read the
  docs" link through `useFeedback({ sound: "click" })`, matching
  StarterCN's footer's sound wiring.

**Dropped entirely (no port):**
- `nav-item-github.tsx`, `github-stars.tsx`, `lib/github.ts` (GitHub star
  count — no equivalent repo/product fit)
- `sponsor-link.tsx` (no GitHub Sponsors flow for this product)
- The shadcn-registry "copy install command" portion of `command-menu.tsx`
  (`SITE.REGISTRY` usage, `/blocks/...` route)
- `lib/docs.ts`, `lib/page-tree.ts` (folder-walking helpers — unneeded,
  see `mobile-nav.tsx` above)
- `lib/events.ts` / `@vercel/analytics` (only existed for the dropped
  registry-copy feature)

## Dark mode stays scoped to `/marketing-four`

The ported `mode-switcher.tsx` normally calls StarterCN's `useThemeToggle`
(`hooks/use-theme-toggle.ts`, already ported in sub-project 1), which wraps
real `next-themes`. Real `next-themes` toggles a class on `<html>` —
site-wide, not scoped to one page tree. iblaze-returns' app-wide
`ThemeProvider` (`components/theme-provider.tsx`) deliberately forces light
mode everywhere (`THEME_TOGGLE_ENABLED = false`) because the rest of the app
(dashboard, etc.) isn't designed for dark mode.

Decision (confirmed): dark mode is only needed for `/marketing-four`, not
the rest of iblaze-returns. So this sub-project adapts the already-ported
`hooks/use-theme-toggle.ts` to call the existing
`components/marketing-two/theme-provider.tsx`'s `useMarketingTwoTheme()`
context instead of `next-themes`' `useTheme()`/`setTheme()` — same sound
feedback (`toggleOn`/`toggleOff` via `useFeedback`), same hotkey (`d`), same
visual behavior, but state stays scoped to the `#marketing-two-root` wrapper
div rather than `<html>`. `hooks/use-meta-color.ts` (which reads
`resolvedTheme` from `next-themes` to sync the browser's `<meta
name="theme-color">` tag) is adapted the same way: reads the `dark` boolean
from `useMarketingTwoTheme()` instead of `next-themes`' `resolvedTheme`, kept
in the port since it's a small, cheap adaptation and matches StarterCN's
behavior (the browser chrome color follows the page's actual theme even
though only `/marketing-four` can be dark).

`components/marketing-two/theme-provider.tsx` itself is not modified —
sub-project 3 only changes what calls it.

## Constants

- `constants/site.ts` (created in sub-project 1 with just
  `META_THEME_COLORS`) gains only what the ported chrome actually reads —
  no `SITE.AUTHOR`, `SITE.REGISTRY`, or other StarterCN-specific fields
  that have nothing to port to (those were already excluded from
  `command-menu.tsx`/`site-footer.tsx` per the drops above).
- `constants/routes.ts` — new, minimal: only `HOME` and `DOCS` (the two
  route constants the ported files actually reference: `ROUTES.HOME` in
  `mobile-nav.tsx`/`site-header.tsx`, `ROUTES.DOCS` for the docs group
  label/links). None of StarterCN's other route entries (`LLMS`, `MCP`,
  `OPENAPI`, `REGISTRY`, `RSS`, `SITEMAP`, `AGENT_SKILLS_*`, `SPONSOR`,
  etc.) apply — they describe surfaces (agent discoverability, registry,
  sponsor page) this product doesn't have.
- `constants/links.ts` — **not created.** Nothing in the ported scope needs
  it once GitHub-stars/Sponsor/author-attribution are dropped.

## Attribution

`components/marketing-four/NOTICE.md` currently scopes itself to "Several
files in this directory" and lists only the sub-project-1-era file set. This
sub-project adds several more ported files (`site-header`/`main-nav`
replacing `nav.tsx`, `mobile-nav.tsx`, `brand-context-menu.tsx`, and the
sound-bank/hook files already ported in sub-project 1 that live outside this
directory: `audio/core.ts`, `audio/index.ts`, `hooks/use-feedback.ts`,
`hooks/use-meta-color.ts`, `hooks/use-theme-toggle.ts`,
`components/animated-icons/*`). This sub-project updates `NOTICE.md`'s scope
wording to cover the full ported file set across sub-projects 1 and 3, and
adds the `@web-kits/audio` sound-bank credit (`"Core" patch, v3.1.0, author
Raphael Salaja`) that the current notice doesn't mention.

## Explicitly out of scope for this sub-project

- Any change to `app/marketing-four/page.tsx`'s hero/features/CTA content —
  that's sub-project 4.
- Any change to the app-wide `ThemeProvider`/`THEME_TOGGLE_ENABLED` —
  dark mode stays forced-light everywhere except `/marketing-four`.
- Adding new `/docs` content or restructuring `content/docs/` — the
  existing 4 pages are used as-is.
- `@vercel/analytics` integration for any other purpose — dropped here
  because it only existed for the registry-copy feature; if the product
  wants analytics later, that's a separate decision outside this port.

## Verification

- `npx tsc --noEmit` and `npm run build` clean, same bar as sub-project 1.
- Manual browser check on `/marketing-four`: header has no border, icons
  render at the same size as StarterCN's live site, Cmd+K search actually
  lists the 4 real `/docs` pages (not a hardcoded list), mobile menu (narrow
  viewport) shows the same real page list, dark-mode toggle only affects
  `/marketing-four` (verify by toggling it, then navigating to `/dashboard`
  or another page and confirming it's still light), GitHub-stars/Sponsor
  UI elements are absent, right-click on the logo shows the copy/download-SVG
  context menu.
- Confirm no regression to the sound/haptics behavior already verified in
  sub-project 1 (toggle persistence, click sounds, dialog open/close).
