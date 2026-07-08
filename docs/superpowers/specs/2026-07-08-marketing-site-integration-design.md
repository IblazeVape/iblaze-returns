# Marketing Site Integration — Design Spec

**Date:** 2026-07-08
**Status:** Approved (design), pending implementation plan
**Branch:** `feat/next16-marketing-site`

## Goal

Ship the public **marketing/docs site** for the iBlaze Returns product using the
existing StarterCN code **unmodified**, served from the **same Next.js build** as
the returns portal, on **one domain**. This is the first shippable sub-project of
the larger multi-tenant SaaS program (see "Wider context" below); it is
deliberately self-contained and does not depend on the tenancy work.

## Decision record

- **Distribution / billing (SaaS-wide):** the app will be listed on the **Shopify
  App Store** → subscription billing goes through the **Shopify Billing API**
  (Stripe is not permitted for App-Store-listed app charges). Merchant identity =
  their `shop.myshopify.com` domain; "sign up" = installing the app (Shopify
  OAuth), so there is no separate email/password auth to build.
- **Integration approach:** **Option B — single true build.** Upgrade the portal
  to StarterCN's stack (Next 16 etc.) so StarterCN's code runs unmodified in one
  build, rather than hand-adapting it (rejected: that is the failed `marketing-four`
  approach) or running two builds behind a rewrite (rejected: user wants one build;
  chosen against because there are **no live users yet**, so a framework upgrade is
  low-consequence now).
- **Route model:** marketing site mounts at a **subpath `/home`** for now; the
  returns portal stays at `/` (untouched). When multi-tenancy later moves the portal
  onto per-merchant custom domains, the marketing site graduates to the bare domain.
- **Content:** keep StarterCN's **exact look and placeholder demo content** for this
  pass; rebrand copy to iBlaze Returns afterward.

## Why the Tailwind v4 migration was necessary but not sufficient

The completed v4 migration removed the Tailwind version conflict. But StarterCN also
assumes newer core deps than the portal:

| Package | Portal (now) | StarterCN |
|---|---|---|
| next | 15.5 | 16.2 |
| zod | 3 (0 portal files import it) | 4 |
| lucide-react | 0.469 | 1.11 |
| tailwind-merge | 2 | 3 |

A single build = one dependency set, so these must be reconciled. Notably **zod is
imported by zero portal files** (it is only a fumadocs peer dep, currently forcing
`legacy-peer-deps`), so the zod 3→4 bump carries no portal-code risk.

## Phase 1 — Upgrade the portal to StarterCN's stack

- **Next 15 → 16** via `npx @next/codemod`. Risk areas to verify: auth
  **middleware**, caching behavior, and **fumadocs** version compatibility with
  Next 16.
- **lucide-react 0.469 → 1.x** (mechanical icon-name fixups),
  **tailwind-merge 2 → 3** (minor `cn()` behavior),
  **zod 3 → 4** (no portal code impact; likely lets us drop `legacy-peer-deps`).
- **Verify:** portal renders/behaves identically via the `/demo` route (populated,
  no Shopify session needed) plus a Vercel **preview deploy**, before anything
  merges to `main`.
- **Exit gate:** portal identical on Next 16, build + typecheck green. Otherwise fix
  or revert.

## Phase 2 — Merge StarterCN as the marketing site at `/home`

- **Bring the code in unmodified** from the existing `marketing-site/` folder
  (≈ StarterCN-main): its pages under a `/home` route group; its
  components/lib/hooks/content **namespaced** so they do not collide with the
  portal's `components/ui/*`, `lib/*`, etc.
- **Style isolation (the crux):** StarterCN and the portal both use the standard
  shadcn token names (`--background`, `--primary`, `--radius`, …) with **different
  values**. Scope StarterCN's tokens **and its next-themes dark mode** to the
  marketing subtree via a wrapper root (the existing `#marketing-root`-style
  pattern), so the marketing site looks exactly like StarterCN while the portal's
  look and light-only behavior are untouched.
- **Docs:** reconcile the two fumadocs setups (root's current `/docs` vs
  StarterCN's) into **one** MDX/fumadocs pipeline; StarterCN's docs become the
  site's docs.
- **Cleanup:** delete the dead Reflow `marketing-four` and the old
  `marketing` / `marketing-two` / `marketing-three` experiments.
- **Verify:** `/home` looks pixel-identical to StarterCN (side-by-side in the
  browser); portal `/demo` still clean; on a preview before merge.

## Verification & rollback

- Each phase: feature branch → Vercel preview deploy → visual + build/typecheck
  checks → merge to `main` only on approval.
- Existing revert net remains valid: tag `pre-tailwind4-backup-20260707`, branch
  `backup/pre-tailwind4`, and the zip backup.
- Portal visual verification uses `/demo` (renders the portal fully populated
  without a Shopify session).

## Out of scope (deferred SaaS sub-projects)

Multi-tenancy foundation, Shopify Billing integration, merchant admin panel,
per-tenant returns portal, and custom-domain routing are **separate sub-projects**
to be designed and built after the marketing site ships. This spec covers only the
marketing site + the Next 16 upgrade that unblocks it.
