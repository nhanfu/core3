# Time Off QA ledger

Module owner: time-off module owner
QA event: bounded candidate review
Candidate: `6300ab0a`
Worktree: `/home/nhanjs/projects/core3-worktrees/time-off-draft-delete-20260913`
Date: 2026-09-13
Tester decision: conditional pass; reviewer sign-off required

## Evidence

- Deletion tests: **PASS**, 4 tests / 24 assertions; Draft, missing,
  non-Draft, stale, and repeated-delete guards pass.
- Role declaration: **PASS**; deletion requires `time_off.write` and actor
  `time_off.manage` tiers remain explicit.
- Restart persistence: **PASS** across file-backed DuckDB close/reopen and
  migration rerun.
- Full focused suite: **PASS**, 49 tests / 509 assertions across 18 files.
- Audit: **PASS**, 647 pages / 662 routes / 1,112 datasources.
- Frontend build and diff-check: **PASS**. Typecheck has pre-existing shared
  and unrelated service failures; no candidate file was implicated. No local
  lint command was available.

## Blockers

- Live Core3 failed to bind `127.0.0.1:3001`; live actor HTTP enforcement was
  not revalidated.
- Playwright/js_repl was unavailable; no authenticated Core3 desktop/mobile
  candidate captures were obtained.
- Paired authenticated Odoo desktop/mobile comparison remains pending.
- Pre-existing repository typecheck failures and unavailable local lint remain
  conditional quality blockers.

Disposition: conditional bounded pass only. Preserve blockers; no full Time Off
module sign-off or aggregate progress claim.

## 2026-09-13 coordinator review: candidate `691bb590`

- Integrated only the bounded refusal-reason migration/forms/guards/detail
  slice as `c6c209c1` on the active branch. The candidate is confined to
  Time Off API/page contracts, one migration, and focused tests; no shared
  runtime or unrelated work was imported.
- Post-merge refusal test passed: **2 tests, 20 assertions**. Candidate
  evidence remains **51 tests, 529 assertions**; audit (**647 pages, 662
  routes, 1112 datasources**), frontend build, and diff-check passed.
- Refusal reason persistence, manager-only forms, required-reason validation,
  stale/non-Submitted guards, and refused-detail display are accepted for this
  bounded slice. Typecheck and lint remain conditional blockers.
- Time Off remains **conditional / unsigned-off**. Core3 listener failure,
  unavailable `js_repl`/Playwright, role-matrix checks, authenticated
  desktop/mobile evidence, and paired Odoo comparison remain open.
## 2026-09-13 coordinator dispatch — bounded balance persistence wave

## QA-pending allocation-balance candidate `047cbd03` (2026-09-13)

- Existing owner/worktree: `agent/time-off-draft-delete-20260913` at
  `/home/nhanjs/projects/core3-worktrees/time-off-draft-delete-20260913`;
  candidate is not merged and awaits existing Time Off QA.
- Coordinator evidence: allocation/balance suite **2 tests / 19 assertions**
  and audit **647 pages / 662 routes / 1,112 datasources** pass. Candidate
  build, targeted lint, and diff-check confirmation remain with QA.
- Browser actor/restart, paired Odoo, typecheck/lint, Temporal, and broader
  workflow/CRUD gates remain open.

- Existing owner `agent/time-off-draft-delete-20260913` is assigned on
  `/home/nhanjs/projects/core3-worktrees/time-off-draft-delete-20260913`, based
  at `691bb590`. Development event: `DEV-TIME-OFF-WAVE-20260913-R2`; QA event:
  `QA-TIME-OFF-WAVE-20260913-R2`; handoff commit: `f8dab29a`.
- Scope is allocation/balance persistence across file-backed restart and
  migration replay, with recalculation, validation, scope, stale, and atomic
  guards plus focused tests. Candidate pending; existing ledger and aggregate
  progress are preserved.

## Reviewer reconciliation `047cbd03`: conditional bounded PASS (2026-09-13)

- Existing owner/worktree was valid: `agent/time-off-draft-delete-20260913` at
  `/home/nhanjs/projects/core3-worktrees/time-off-draft-delete-20260913`.
  The bounded allocation-balance candidate integrated as `c4250943`; its
  progress-ledger conflict was resolved by preserving the active ledger.
- Post-merge verification passed **53 tests / 550 assertions** across 20 files,
  including balance persistence/reopen **2 tests / 19 assertions**. Audit passed
  **661 pages / 670 routes / 1,158 datasources**; frontend build and diff-check
  passed. QA reports targeted ESLint also passed.
- Accepted evidence covers allocation balance application/idempotency,
  row-version and workflow recalculation, CRUD/permissions, authenticated
  desktop/mobile rendering, reload and file-backed reopen persistence.
- Temporal is **not applicable** to the synchronous local workflow; no durable
  external workflow boundary is configured.
- Disposition: **conditional bounded PASS; integrated**. Fresh authenticated
  paired Odoo comparison remains open. No full Time Off sign-off.

## 2026-09-22 bounded candidate: overview calendar event detail

- Focused test: **PASS**, 3 tests / 22 assertions in
  `test/time_off_overview_calendar_detail.integration.test.ts`.
- Persistence: **PASS**; migration/index replay is idempotent and approval
  remains persisted after DuckDB close/reopen.
- Contract: **PASS**; matching page/API ids, Overview row-open navigation,
  calendar-visible state filtering, and `time_off.manage` workflow guards.
- Source comparison: **PASS** against
  `/home/nhanjs/projects/odoo/addons/hr_holidays/report/hr_leave_report_calendar.xml`.
- Odoo browser gate: **BLOCKED**; `core3_reference` has no Time Off menu or
  `hr_holidays` action, and direct `/odoo/time-off` resolves to Discuss.
  Blocker captures are in the linked evidence README; no Odoo mutation was
  made.
- Disposition: **conditional bounded PASS**; no full module sign-off.

The full Time Off glob was also run after the focused pass: **52 passed, 9
failed, 449 assertions across 61 tests**. The nine failures are existing
discovery assertions reporting the shared page-schema error
`components[1].tabs[3].fields is not allowed`; the new overview calendar test
passes and no shared/schema or other module path was changed to mask this
blocker.
