# Marketing Site Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship StarterCN as the public marketing/docs site at `/home` in the same Next.js build as the returns portal, by first upgrading the portal to StarterCN's stack (Next 16) so StarterCN's code runs unmodified.

**Architecture:** Two phases. Phase 1 upgrades the root app's core dependencies (Next 15→16, lucide, tailwind-merge, zod) and verifies the portal is unchanged. Phase 2 copies StarterCN's code into the root app under a `/home` route group with its tokens + dark mode scoped to that subtree, reconciles the two fumadocs docs sources into one, and deletes the dead Reflow/marketing experiments.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, fumadocs (core 16.8.4 / mdx 14.3.1), next-themes, shadcn/ui, Geist fonts.

## Global Constraints

- Single Next.js build; one `node_modules`, one dependency set. No second app/deployment.
- Portal (`/`) behavior and appearance must stay identical throughout. Verify via the `/demo` route (renders the portal fully populated without a Shopify session).
- StarterCN code is copied in **unmodified** wherever possible; adapting it is a last resort, not the default.
- `middleware.ts` protects `PROTECTED_PATHS = ["/"]` — the marketing routes under `/home` must remain public (never login-gated).
- Marketing site keeps StarterCN's exact look + placeholder demo content this pass (no rebrand yet).
- Every phase merges to `main` only after a green Vercel preview + visual check. Revert net: tag `pre-tailwind4-backup-20260707`, branch `backup/pre-tailwind4`, zip backup.
- Work happens on branch `feat/next16-marketing-site`.

---

## Phase 1 — Upgrade the portal to Next 16 + deps

### Task 1: Next.js 15 → 16 codemod upgrade

**Files:**
- Modify: `package.json` (next, eslint-config-next, related)
- Modify: `next.config.mjs`, `middleware.ts`, and any files the codemod touches
- Verify: `app/**`, `middleware.ts`

**Interfaces:**
- Produces: root app running on Next 16 with a green production build.

- [ ] **Step 1: Confirm clean tree and current version**

Run: `cd ~/iblaze-returns && git status --short && npx next --version`
Expected: on branch `feat/next16-marketing-site`, working tree clean, Next 15.5.x.

- [ ] **Step 2: Run the official Next.js upgrade codemod**

Run: `npx @next/codemod@canary upgrade latest`
When prompted, accept the Next 16 upgrade and the recommended codemods. This bumps `next`, `eslint-config-next`, and applies breaking-change codemods.

- [ ] **Step 3: Check fumadocs compatibility with Next 16**

Run: `npm ls fumadocs-core fumadocs-mdx next`
If fumadocs errors on Next 16 at build (Step 5), bump to the latest fumadocs that supports Next 16: `npm i fumadocs-core@latest fumadocs-mdx@latest` and re-run the build.

- [ ] **Step 4: Reinstall and regenerate fumadocs source**

Run: `npm install && npx fumadocs-mdx`
Expected: install succeeds; `.source/` regenerated with no errors.

- [ ] **Step 5: Production build (the gate)**

Run: `npm run build`
Expected: build completes, all routes compile, no type errors. If it fails, fix the specific error (commonly: async request APIs, middleware signature, caching flags) and re-run. Do not proceed until green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: upgrade Next.js 15 -> 16 via codemod"
```

### Task 2: Bump lucide-react, tailwind-merge, zod

**Files:**
- Modify: `package.json`
- Modify: any file importing a renamed lucide icon or affected `cn()`/zod usage
- Modify: `.npmrc` (remove `legacy-peer-deps` if zod 4 resolves the fumadocs peer)

**Interfaces:**
- Consumes: Next 16 app from Task 1.
- Produces: portal on lucide 1.x / tailwind-merge 3 / zod 4, green build.

- [ ] **Step 1: Bump the three packages**

Run: `npm i lucide-react@^1 tailwind-merge@^3 zod@^4`

- [ ] **Step 2: Build and collect breakages**

Run: `npm run build 2>&1 | tee /tmp/build.log`
Expected: likely a few "X is not exported from lucide-react" errors from renamed icons.

- [ ] **Step 3: Fix renamed lucide icons**

For each "not exported" icon error, find the new name at https://lucide.dev/icons and update the import. Search usage: `grep -rn "<OldIconName" app components`. Apply the rename everywhere.

- [ ] **Step 4: Verify tailwind-merge + zod**

Run: `npx tsc --noEmit`
Expected: clean. (zod has 0 portal importers, so no zod errors expected; tailwind-merge v3 `cn()` is API-compatible for the class-merge usage here.)

- [ ] **Step 5: Try dropping the legacy-peer-deps hack**

Edit `.npmrc`: remove `legacy-peer-deps=true`. Run: `rm -rf node_modules package-lock.json && npm install`
Expected: install succeeds without peer conflicts (zod 4 now satisfies fumadocs). If it still conflicts, restore the line and note it.

- [ ] **Step 6: Build + commit**

Run: `npm run build`
Expected: green.
```bash
git add -A
git commit -m "chore: bump lucide-react v1, tailwind-merge v3, zod v4"
```

### Task 3: Verify the portal is unchanged, then preview-deploy

**Files:** none (verification only)

**Interfaces:**
- Consumes: upgraded app from Tasks 1–2.
- Produces: confidence gate + a preview URL for sign-off before merge.

- [ ] **Step 1: Start dev server and load the portal demo**

Run: `npm run dev` (background), then open `http://localhost:3000/demo`.
Expected: portal renders fully populated (orders list, order detail toolbar, sidebar) — visually identical to production. Toggle the sidebar collapse and confirm the logo, and confirm form controls are flat.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Push branch for a Vercel preview**

```bash
git push -u origin feat/next16-marketing-site
```
Wait for the Vercel preview to reach READY. Open `<preview-url>/demo` and confirm the portal is identical.

- [ ] **Step 4: STOP — human gate**

Do not merge Phase 1 to `main` yet. Get explicit approval that the portal looks/behaves identical on Next 16. (Phase 1 may be merged to `main` now, or held until Phase 2 is also green — implementer's choice with the user.)

---

## Phase 2 — Merge StarterCN as the marketing site at `/home`

> Phase 2 assumes Phase 1 is green. StarterCN's code lives in `marketing-site/` (its own app). We copy the parts we need into the root app, namespaced, and mount its homepage + docs under `/home`.

### Task 4: Copy StarterCN source into namespaced locations

**Files:**
- Create: `app/home/**` (from `marketing-site/app/(app)/**` — homepage, docs routes)
- Create: `components/site/**` (from `marketing-site/components/**`)
- Create: `lib/site/**`, `hooks/site/**`, `constants/site/**` (from the corresponding `marketing-site/` dirs)
- Create: `content/site-docs/**` (from `marketing-site/content/docs/**`)
- Create: `styles/site.css` (from `marketing-site/styles/globals.css` + `themes.css`, merged)

**Interfaces:**
- Produces: StarterCN's files present in the root tree under `site`/`home` namespaces, imports not yet rewired.

- [ ] **Step 1: Copy component/lib/hook/constant trees**

```bash
cd ~/iblaze-returns
cp -R marketing-site/components components/site
cp -R marketing-site/lib lib/site
cp -R marketing-site/hooks hooks/site
cp -R marketing-site/constants constants/site
cp -R marketing-site/content/docs content/site-docs
```

- [ ] **Step 2: Copy the homepage + docs routes into an app/home group**

```bash
mkdir -p app/home
cp -R "marketing-site/app/(app)/." app/home/
```
Expected: `app/home/(root)/page.tsx`, `app/home/docs/...`, `app/home/layout.tsx` exist.

- [ ] **Step 3: Commit the raw copy (no rewrites yet)**

```bash
git add -A && git commit -m "chore: copy StarterCN source into namespaced site/home locations"
```

### Task 5: Rewire StarterCN imports to the namespaced paths

**Files:**
- Modify: everything under `app/home/**`, `components/site/**`, `lib/site/**`, `hooks/site/**`

**Interfaces:**
- Consumes: copied files from Task 4.
- Produces: StarterCN files that resolve their imports within the `site` namespace instead of colliding with the portal's `@/components/ui`, `@/lib`, etc.

- [ ] **Step 1: Rewrite internal alias imports**

In the copied trees, StarterCN imports use `@/components/...`, `@/lib/...`, `@/hooks/...`, `@/constants/...`. Repoint them to the namespaced copies:
```bash
cd ~/iblaze-returns
grep -rl "@/components\|@/lib\|@/hooks\|@/constants" app/home components/site lib/site hooks/site \
 | xargs sed -i '' \
   -e 's#@/components/#@/components/site/#g' \
   -e 's#@/lib/#@/lib/site/#g' \
   -e 's#@/hooks/#@/hooks/site/#g' \
   -e 's#@/constants/#@/constants/site/#g'
```

- [ ] **Step 2: Fix docs source import**

StarterCN's docs read from its `source.config.ts` / `lib/source.ts`. Point `lib/site/source.ts` (or equivalent) at the new `content/site-docs` content. (See Task 7 for the single fumadocs config; for now just make the path resolve.)

- [ ] **Step 3: Typecheck the site subtree only (expect known gaps)**

Run: `npx tsc --noEmit 2>&1 | grep -E 'app/home|components/site' | head -40`
Note remaining unresolved imports; fix obvious path mistakes. Deeper wiring (fumadocs, styles) is Tasks 6–7.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: rewire StarterCN imports to site namespace"
```

### Task 6: Scope StarterCN styling + dark mode to the `/home` subtree

**Files:**
- Modify: `app/globals.css` (import `styles/site.css` scoped, or add scoped token block)
- Create/Modify: `app/home/layout.tsx` (wrap children in a `#site-root` element; mount StarterCN's ThemeProvider scoped)
- Modify: `styles/site.css` (scope StarterCN's `:root`/`.dark` token blocks under `#site-root`)

**Interfaces:**
- Consumes: namespaced files from Task 5.
- Produces: `/home` renders with StarterCN's tokens + dark mode; `/` (portal) tokens and light-only behavior unchanged.

- [ ] **Step 1: Wrap the marketing subtree in a scoping root**

In `app/home/layout.tsx`, wrap children in `<div id="site-root">...</div>` and render StarterCN's `ThemeProvider` (from `components/site/theme-provider`) inside this layout only — not the root layout.

- [ ] **Step 2: Scope StarterCN's CSS variables**

In `styles/site.css`, change StarterCN's `:root { --background: ... }` to `#site-root { --background: ... }` and its `.dark { ... }` to `#site-root.dark, .dark #site-root { ... }`. This confines StarterCN's palette to the marketing subtree. Import this file once from `app/globals.css`.

- [ ] **Step 3: Confine next-themes to `#site-root`**

Configure StarterCN's ThemeProvider so the theme class is applied to `#site-root` (or a nested element), not `<html>`, so toggling dark mode on the marketing site never darkens the portal. (next-themes supports a custom attribute/selector; if it must target `html`, gate the portal's own styles to `html:not(:has(#site-root))` as a fallback.)

- [ ] **Step 4: Verify isolation in the browser**

Run dev server; open `http://localhost:3000/home` and `http://localhost:3000/demo`. Toggle dark mode on `/home`; confirm `/demo` stays light and unchanged. Confirm `/home` matches StarterCN's look.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: scope StarterCN tokens + dark mode to /home subtree"
```

### Task 7: Reconcile the two fumadocs sources into one

**Files:**
- Modify: `source.config.ts` (define the site docs collection pointing at `content/site-docs`)
- Modify: `lib/source.ts` and/or `lib/site/source.ts`
- Modify: `mdx-components.tsx` if the two differ

**Interfaces:**
- Consumes: `content/site-docs` from Task 4.
- Produces: one fumadocs pipeline; StarterCN's docs served under `/home/docs`.

- [ ] **Step 1: Point the single source.config at site docs**

Merge StarterCN's `marketing-site/source.config.ts` collection definition into the root `source.config.ts` so `content/site-docs` is a recognized collection. Keep the existing portal docs collection only if still used; otherwise plan its removal in Task 8.

- [ ] **Step 2: Regenerate and build docs**

Run: `npx fumadocs-mdx && npm run build`
Expected: `/home/docs/...` routes generate from `content/site-docs`. Fix any collection/path mismatch.

- [ ] **Step 3: Verify docs render**

Open `http://localhost:3000/home/docs` — StarterCN docs render with search/nav.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: serve StarterCN docs via single fumadocs source at /home/docs"
```

### Task 8: Delete dead Reflow/marketing experiments; keep /home public

**Files:**
- Delete: `app/marketing-four/`, `app/marketing/`, `app/marketing-two/`, `app/marketing-three/`, and their exclusive components (`components/marketing-four/**`, `components/marketing/**`, etc.)
- Delete: `marketing-site/` (its code now lives in the root app)
- Verify: `middleware.ts` does not gate `/home`

**Interfaces:**
- Consumes: working `/home` from Tasks 4–7.
- Produces: clean tree, only the portal + `/home` marketing site remain.

- [ ] **Step 1: Confirm nothing links to the old marketing routes**

Run: `grep -rn "marketing-four\|/marketing\b\|marketing-two\|marketing-three" app components lib --include=*.tsx --include=*.ts | grep -v "app/home\|components/site"`
Resolve any references (delete or repoint to `/home`).

- [ ] **Step 2: Delete the dead routes/components and the now-redundant marketing-site app**

```bash
git rm -r app/marketing app/marketing-two app/marketing-three app/marketing-four
git rm -r components/marketing components/marketing-four 2>/dev/null || true
git rm -r marketing-site
```
(Adjust to actual component dirs found in Step 1.)

- [ ] **Step 3: Confirm /home is public in middleware**

Open `middleware.ts`; confirm `PROTECTED_PATHS = ["/"]` matches only `/` (exact), not `/home`. If the matcher is prefix-based, add an explicit exclusion so `/home/**` is never redirected to Shopify login.

- [ ] **Step 4: Build + typecheck**

Run: `npm run build && npx tsc --noEmit`
Expected: green; route list shows `/`, `/home`, `/home/docs/...`, `/demo`, portal API routes; no `/marketing*`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: remove Reflow/marketing experiments and the separate marketing-site app"
```

### Task 9: Full verification + preview, then merge gate

**Files:** none (verification only)

- [ ] **Step 1: Local visual pass**

Dev server. Check: `/home` pixel-matches StarterCN (hero, nav, CTAs, footer, dark-mode toggle, command menu), `/home/docs` works, `/demo` portal unchanged (light, flat controls, inset gap, logo).

- [ ] **Step 2: Push and open a Vercel preview**

```bash
git push
```
On the preview URL, repeat the checks against the real StarterCN demo and against production `/demo`.

- [ ] **Step 3: STOP — human gate**

Get explicit approval on the preview before merging to `main`. On approval:
```bash
git checkout main && git merge --ff-only feat/next16-marketing-site && git push origin main
```

---

## Self-Review Notes

- **Spec coverage:** Phase 1 (Next 16 + lucide/tailwind-merge/zod) → Tasks 1–3. Phase 2 (copy unmodified → Task 4/5; scoped tokens+dark mode → Task 6; fumadocs reconcile → Task 7; cleanup → Task 8; verify → Task 9). Route `/home`, public middleware, `/demo` verification, rollback net all covered.
- **Known softness:** Tasks 6–7 (style scoping + fumadocs) are inherently integration work; steps give the strategy and verification gates rather than pre-scripted final code, because the exact edits depend on StarterCN's current theme-provider/source API. Each ends with a concrete browser/build verification.
- **Placeholders:** none intended; where code can't be pre-written (integration), a verification command defines "done."
