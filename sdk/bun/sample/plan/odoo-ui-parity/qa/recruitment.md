# recruitment QA ledger

## Bounded QA finalization — 2026-09-13

- Candidate under test: `d1b2cb6615b421ac3235943e2389f366690b2ff1`
  (`feat(recruitment): restore refused applicants`). The supplied path with an
  `agent/` segment does not exist; the exact matching linked worktree was
  `/home/nhanjs/projects/core3-worktrees/odoo-recruitment-reopen-20260913`.
- Focused regression: `bun test ./test/recruitment*.integration.test.ts
  --timeout 20000` — 37 passed, 0 failed, 346 assertions, 11 files.
- Reopen/refusal evidence on this HEAD: refusal persists `Rejected`, archived,
  refusal reason, and incremented row version; reopen persists `New`, active,
  clears `refuse_reason_id` and `refused_date`, increments the version, survives
  reload, and stale replay returns 409 (`RECRUITMENT_APPLICANT_REOPEN_STALE`).
  Invalid refusal reason returns 422 (`RECRUITMENT_REFUSE_REASON_INVALID`).
  The reopen action is declared for `recruitment.write`.
- Static gates: `bun run audit` passed (659 pages, 668 routes, 1139
  datasources); `bunx eslint test/recruitment*.integration.test.ts` passed;
  `git diff --check` passed.
- Mock-data audit: failed globally (659 pages); the Recruitment datasources
  `recruitment_*` have no `mock_data` declarations. This is the known
  service-backed datasource audit blocker and was not changed by this slice.
- Full regression: `bun test ./test --timeout 20000` was intentionally stopped
  at the user's finalization request with exit 130. It had emitted passing
  tests through `test/manufacturing_workcenter_operations.integration.test.ts`
  (the next test had not completed); no full-suite total is claimed.
- Browser/Odoo: no new probe was started in this finalization window; no new
  authenticated desktop/mobile captures or paired Odoo evidence are claimed.
  Existing ledger evidence remains route/render smoke only and does not satisfy
  the plan's CRUD, full permission, persistence, or paired visual exit gates.
- QA decision: not signed off. Remaining gates are authenticated applicant
  CRUD/refuse/reopen browser evidence at 1440x900 and 390x844, full actor and
  wrong-company/unauthenticated boundaries, restart persistence, paired Odoo
  comparison, and an unblocked full regression.

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/recruitment-desktop.png and recruitment-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable recruitment assignment (pending wave dispatch)
Module owner: recruitment module owner
Verification trigger: feature-complete
Candidate commit: pending commit for refusal workflow repair

## Current regression evidence

- Repository suite: `bun test ./test --timeout 20000` — 1,045 passed, 0 failed.
- Applicant view navigation and analysis contracts pass in focused reruns.
- Focused Recruitment suite: `bun test ./test/recruitment*.integration.test.ts --timeout 20000` — 37 passed, 0 failed, 346 assertions across 11 files.
- Authenticated module-scoped route matrix: 15 routes × desktop/mobile; 29/30 completed cleanly on the first pass, and the `/openings` route passed an isolated retest at both the declared alias and normalized `/recruitment/openings` route. No persistent page, request, or overflow defect remains in this matrix.
- Fleet user permission boundary: `/recruitment/settings` returned HTTP 403 with `Requires permission: recruitment.settings`, with no browser errors.
- Authenticated applicant workflow on the module-scoped process: created an applicant for `JOB/2026/0001`, then advanced New → Screening → Interview → Offer → Hired; all responses returned 200 and the applicant row version advanced `1 → 5`.
- Refusal workflow integration test: an open applicant records the selected refusal reason, becomes archived/rejected, increments `row_version`, rejects an inactive/missing reason with 422, and rejects stale replay with 409.
- Reopen workflow integration test: a refused applicant restores to `New` and active, clears refusal reason/date, increments `row_version`, remains correct after a persisted reload, and rejects stale replay with 409; the detail action is declared for `recruitment.write` (ordinary Recruitment User boundary).
- Recruitment mock-data audit remains blocked by the existing service-backed datasource rule: all 15 Recruitment service datasources lack `mock_data`; this feature adds no datasource.
- Detailed executable coverage is maintained in [`test-plans/recruitment.md`](test-plans/recruitment.md), including applicant/job-position/talent-pool CRUD, lifecycle, actor boundaries, persistence, Temporal boundaries, and paired Odoo visual gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| RECRUITMENT-FUNC-001 | Focused functionality, CRUD, workflow, catalogs, settings, and activity contracts | 35 tests, 336 assertions; focused suite passed | pass |
| RECRUITMENT-BROWSER-001 | Authenticated registered-menu route matrix | 15 routes × desktop/mobile; 30/30 after isolated `/openings` retest | pass |
| RECRUITMENT-PERM-001 | Non-manager cannot open Recruitment settings | Fleet user received HTTP 403 with `Requires permission: recruitment.settings`; browser errors 0 | pass |
| RECRUITMENT-WORKFLOW-001 | Applicant create and hiring workflow | Authenticated create plus New → Screening → Interview → Offer → Hired returned 200; row version 1 → 5 | pass |
| RECRUITMENT-WORKFLOW-002 | Applicant refusal, restore, and concurrency guards | `recruitment_refuse_workflow.integration.test.ts` persists Rejected/archived/reason/version, restores to New/active while clearing refusal metadata, and verifies invalid reason plus stale replay guards | pass |
| RECRUITMENT-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Functional, route, and one manager permission boundary pass; authenticated CRUD mutation smoke and paired Odoo comparison remain open | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| RECRUITMENT-BROWSER-001 | Initial matrix observed a late applicant-detail request while leaving `/applicants`; `/openings` isolated retest was clean and normalized to `/recruitment/openings` | — | Isolated route retest passed with no errors | fixed |

## Sign-off

- Functional: pending
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off

## Reviewer disposition — candidate `9b61dfa`

- Integrated on the active branch as `082a558f`; scope is limited to the
  applicant-list refusal form, active-reason lookup, required reason guard,
  stale-row protection, and its focused regression test.
- Post-merge verification passed: Recruitment suite 38 tests / 353 assertions,
  UI audit (659 pages / 668 routes / 1150 datasources), targeted ESLint, CSS
  compilation, and `git diff --check`.
- Authenticated browser CRUD/refusal/reopen and paired Odoo comparison remain
  blocked by unavailable `js_repl`. Recruitment remains conditional and
  unsigned-off; broader module gates remain open.

## 2026-09-13 coordinator dispatch: next bounded wave

- Existing owner: `agent/odoo-recruitment-reopen-20260913`, worktree
  `/home/nhanjs/projects/core3-worktrees/odoo-recruitment-reopen-20260913`,
  base `9b61dfa`. Development event: `DEV-RECRUITMENT-WAVE-20260913`; QA
  event: `QA-RECRUITMENT-WAVE-20260913`; handoff commit `1721f4e3`.
- Candidate is pending. Target is one bounded authenticated CRUD/actor gap
  around refusal/reopen. Focused tests, audit, CSS/frontend build, scoped
  ESLint, and diff-check are required before triggering existing QA.
  Aggregate progress remains untouched.
## 2026-09-13 coordinator reactivation

- Existing owner `agent/odoo-recruitment-reopen-20260913` is reactivated on
  the same worktree for one concrete CRUD/refusal/reopen gap with focused
  regression coverage.
- Existing development event `DEV-RECRUITMENT-WAVE-20260913` and QA event
  `QA-RECRUITMENT-WAVE-20260913` remain assigned. Candidate is pending; no
  aggregate progress change.
## 2026-09-13 owner checkpoint

- `81882de6` and `1d43601f` are dispatch/checkpoint commits only; no product
  candidate has been submitted. QA remains untriggered pending a self-contained
  implementation commit and evidence.
## 2026-09-13 poll after `1d43601f`

- No product diff exists after the checkpoint; owner was re-prompted. QA event
  remains untriggered pending implementation and focused tests.

## 2026-09-13 R2 coordinator dispatch

| Event | Owner/worktree | Bounded scope | Status |
| --- | --- | --- | --- |
| `DEV-RECRUITMENT-WAVE-20260913-R2` → `QA-RECRUITMENT-WAVE-20260913-R2` | existing `agent/odoo-recruitment-reopen-20260913` in `/home/nhanjs/projects/core3-worktrees/odoo-recruitment-reopen-20260913` | Applicant close/reopen persistence, required reasons, permissions, stale/duplicate guards, and focused no-partial-write tests | dispatched in `bba9ff02`; awaiting self-contained product commit before QA |

## QA disposition `e9a19a8f`: blocked; same-owner repair required (2026-09-13)

- Hold and do **not** integrate `e9a19a8f`. Recruitment QA passed **39 tests /
  367 assertions**, with refusal/reopen contracts, validation, stale/replay,
  actor/company/unauthenticated guards, atomicity, build, audit, CSS, lint, and
  diff-check green.
- Critical defect `RECRUITMENT-REFUSE-001`: authenticated admin context is
  `Core3 Demo Company`, while the seeded applicant is `My Company (San
  Francisco)`. Live refusal is rejected by the company-scope guard before
  persistence.
- Repair is routed to the existing owner/worktree
  `agent/odoo-recruitment-reopen-20260913` at
  `/home/nhanjs/projects/core3-worktrees/odoo-recruitment-reopen-20260913`:
  align the deterministic applicant fixture/company context, then rerun
  authenticated refuse/reopen and reload QA.
- Preserve restart and fresh authenticated Odoo comparison gates. Candidate
  remains blocked; no replacement owner or product merge was created.
