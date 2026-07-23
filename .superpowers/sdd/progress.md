# Not-Returnable Status Split — Progress Ledger

Plan: docs/superpowers/plans/2026-07-20-not-returnable-status-split-plan.md
Mode: direct-to-main (no worktree, no feature branch) per established session convention.
Parent epic (already shipped): docs/superpowers/plans/2026-07-19-return-status-simplification-plan.md, commits adef0ce..1233b18.

## Tasks
(none complete yet)
- Task 1: tenant-defaults.ts types/defaults split — complete (commit 94b606a, tsc clean for this file, review clean). BASE for Task 2 = 94b606a.
- Task 2: tenant.ts re-export rename — complete (commit 16654be, review clean). BASE for Task 3 = 16654be.
- Task 3: branding-validation.ts mirror — complete (commit 099e227, review clean, branding/route.ts independently confirmed to need zero changes). BASE for Task 4 = 099e227.
- Task 4: get-orders eligibility split — complete (commit 4f7ece2, tsc clean for both files, review clean, no leaked changes to unrelated logic). BASE for Task 5 = 4f7ece2.
- Task 5: buildIneligibleDisplayItems split — complete (commit 34bd80a, review clean; noted harmless "7 values" plan-text imprecision, not a code issue). BASE for Task 6 = 34bd80a.
- Task 6: label/message/grouping functions split — complete (commit 4355cc7, dashboard-client.tsx fully tsc-clean, review clean, zero leftover notReturnable refs). BASE for Task 7 = 4355cc7.
- Task 7: settings-form.tsx reshape — complete (commit d173d4e, fully tsc-clean, review clean). Interdependent chain (Tasks 4-7) now DONE. BASE for Task 8 = d173d4e.
- Task 8: demo-orders fixture split — complete (commit a5d5537, tsc clean for file, smoke test 200 OK, review clean). BASE for Task 9 = a5d5537.
- Task 9: test fixture updates (3 files) — complete (commit b83803a, tsc clean project-wide, 113/113 vitest passing, review clean). All 9 implementation tasks done. Next: final whole-branch review, then Task 10 (verify/deploy/push).
- Final whole-branch review (8feb0d8..b83803a): clean, no Critical/Important findings, ready to deploy.
- Task 10: reconciled with concurrent origin/main work (Cursor-side guest-lookup/Branding-settings/return-status-table refactor, diverged since 1233b18). Two merges required:
  1. 29dcac9: origin 4cf4414 merged cleanly (guestLookup* fields, disjoint from status-split regions).
  2. 757ee74: origin 4b6edb0 merged with real conflicts in settings-form.tsx (origin built a new ReturnStatusTable/SettingsEditRow-modal UI unaware of the awaitingDelivery/returnWindowClosed split) and lib/__tests__/tenant.test.ts (duplicate assertion block). Resolved by splitting return-status-table.tsx's RETURN_STATUS_ROWS and the settings-form.tsx "Not returnable" modal into two (Awaiting delivery / Return window closed), preserving both origin's new UI architecture and the status-split data model. npm install picked up new @dnd-kit/* deps origin added.
  Full verify cycle green after each merge (tsc clean, 116/116 vitest passing, build clean). Deployed as iblaze-returns-97 (before 2nd merge) then iblaze-returns-98 (final, after 2nd merge). Pushed to origin main (757ee74). PLAN COMPLETE.
