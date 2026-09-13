# expenses QA ledger

## Conditional review handoff — exact candidate `887fa7fb` (2026-09-13)

- Bounded import/export/print contract: **conditional pass**. Expenses tests
  passed when reached; import persistence, deterministic IDs, sheet-total
  recalculation, replay safety, malformed-row and company-scope guards, plus
  permissioned export/print actions are covered.
- Candidate-local audit, Expenses Sass, frontend build, applicable ESLint, and
  `git diff --check` passed. No Expenses-specific TypeScript diagnostic was
  reported.
- Blocker `EXPENSES-HTTP-001`: the full repository run did not finish cleanly
  because Core3 startup encountered a port collision; candidate browser QA was
  unavailable and no candidate interaction/screenshot claim is made.
- Blockers retained: pre-existing Website ESLint errors, shared TypeScript
  diagnostics, authenticated browser/actor coverage, and paired Odoo desktop/
  mobile comparison remain open.

Disposition: bounded Expenses change integrated conditionally; preserve all
blockers and do not claim full module sign-off or aggregate progress.

## Candidate QA evidence (2026-09-13)

- Candidate under test: `1d9df642` (`feat(expenses): add import export and print actions`). This candidate adds the Expenses list import/export/print contracts, deterministic import persistence test, and module plan/QA updates.
- Focused command: `bun test ./test/*expense*.integration.test.ts --timeout 20000` from `sdk/bun/sample` — 33 passed, 198 assertions, 0 failed across 10 files.
- Migration upgrade/replay: `expenses_migrations.integration.test.ts` upgraded an in-memory database from `0.0.2` to latest, replayed the latest schema/data migration, and preserved 2 sheets, 9 expenses, 8 activities, 0 runtime attachments, 1 duplicate candidate, 2 split lines, 10 migration versions, and the `sha256:receipt-air-duplicate` checksum without duplicate seeded rows.
- Receipt/activity/split behavior: focused tests pass receipt-required approval, refusal reason plus activity persistence, duplicate approve/refuse activity and stale replay guards, and split-line CRUD, exact-total validation, matching application, relation, and activity persistence.
- Permissions/regressions: focused permission tests pass the manager action metadata/boundaries and Fleet ordinary-user 403; stale/missing/invalid mutations preserve rows. The full UI audit passes (659 pages, 668 routes, 1136 datasources). `git diff --check` passes.
- Import/export/print: `expenses_import_export.integration.test.ts` passes 3
  tests and 16 assertions. Import persistence, deterministic IDs, sheet-total
  recalculation, replay safety, malformed-row rejection, and company-scope
  denial are covered; export/print permissions and datasource binding are
  asserted. Relevant ESLint and `bun run css:build:expenses` pass.
- Static gates: `bun run lint` fails on two unrelated existing errors in `sdk/bun/sample/test/website_public.integration.test.ts:31` and `:33` (`no-unsafe-optional-chaining`); no warnings or Expenses diagnostics were reported. `bunx tsc --noEmit --pretty false` also fails on existing shared `packages/*`, `services/ai`, and server/client diagnostics; no Expenses-specific diagnostic appeared.

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/expenses-desktop.png and expenses-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable expenses assignment (pending wave dispatch)
Module owner: expenses module owner
Verification trigger: feature-complete
Candidate commit: `1d9df642`

Detailed execution matrix: [`test-plans/expenses.md`](test-plans/expenses.md). It is the module-level source for expense CRUD, workflows, actors, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| EXPENSES-001 | Focused Expenses contract corpus | 33 focused tests / 198 assertions across 10 files | PASS |
| EXPENSES-002 | Registered route responsive matrix | 10 routes × desktop/mobile = 20/20; no page/request errors, HTTP failures, or overflow | PASS |
| EXPENSES-003 | Expense lifecycle persistence | `expense-demo-draft` Draft → Submitted → Approved → Posted, versions 1 → 4; journal/date persisted | PASS |
| EXPENSES-004 | Manager permission boundary | Fleet approval returned 403 `expenses.manage` | PASS |
| EXPENSES-005 | Fresh paired Odoo visual and full interaction coverage | Not yet completed for the current candidate | pending |
| EXPENSES-006 | Migration upgrade/replay persistence | 0.0.2 → latest upgrade plus replay preserved 2 sheets, 9 expenses, 8 activities, 0 runtime attachments, 1 duplicate candidate, and 2 split lines | PASS |
| EXPENSES-007 | Candidate browser retest | Fresh authenticated interaction/actor retest remains unavailable; existing route-smoke PNGs are retained as prior evidence only | BLOCKED |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| EXPENSES-BROWSER-001 | No current-wave QA evidence | — | Replaced by EXPENSES-001 through 004 | closed |

## Sign-off

- Functional: pass for tested expense lifecycle and contracts
- Permissions: pass for tested manager boundary
- Persistence/data integrity: pass for tested lifecycle
- Migration/restart persistence: pass for upgrade and replay fixture invariants
- Desktop/mobile visual parity: route rendering pass; paired Odoo parity pending
- Tester decision: conditional; fresh browser interaction, authenticated actor matrix, paired Odoo comparison, and clean repository lint remain open
## 2026-09-13 coordinator dispatch — bounded receipt wave

- Existing owner `agent/odoo-expenses-dev-next-20260913` is assigned on
  `/home/nhanjs/projects/core3-worktrees/odoo-expenses-dev-next-20260913`,
  based at `887fa7fb`. Development event:
  `DEV-EXPENSES-WAVE-20260913-R2`; QA event:
  `QA-EXPENSES-WAVE-20260913-R2`; handoff commit: `be5afa3b`.
- Scope is a bounded receipt-processing attempt/result contract with persisted
  failure and retry/replay idempotency, ownership/permission guards, and
  focused no-duplicate/no-partial-write tests. Candidate pending; aggregate
  progress and unrelated edits are preserved.
