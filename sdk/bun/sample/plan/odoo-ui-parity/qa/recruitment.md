# recruitment QA ledger

## Batch 20 QA — Applicant Add to Pool — 2026-09-22

- Stable ID: `RECRUITMENT-APPLICANT-ADD-TO-POOL-001`.
- Source boundary: Odoo 19 `hr_applicant.py::action_talent_pool_add_applicants`,
  `wizard/talent_pool_add_applicants.py`, its form view, and applicant header/
  kanban bindings, compared at source revision
  `659759969d535d286b656c96b675e4612b925ddd`.
- Focused tests: `bun test
  test/recruitment_applicant_add_to_pool.integration.test.ts
  test/recruitment_talent_pools.integration.test.ts --timeout 20000` — 8
  passed, 0 failed, 84 assertions. Recruitment regression: `bun test
  ./test/recruitment*.integration.test.ts --timeout 20000` — green.
- Functional coverage: separate page/API `page.id` contracts for applicant
  list and detail, list/kanban bulk action, detail action, active pool and tag
  choices, normal-applicant pool-profile creation, existing-pool membership,
  optional tag persistence, idempotent replay, actor/company/archived/missing/
  inactive-pool guards, and file-backed restart durability.
- Browser result: BrowserSkill daemon was connected. The existing authenticated
  Odoo tab was already borrowed by another session; the available PDF tab
  borrow timed out without ownership and the session was auto-unregistered.
  `bsk session list --json` then returned no active sessions. No credentials,
  cookies, independent login, Playwright, or alternate browser was used; no
  Odoo action or desktop/mobile capture was inspected.
- QA decision: bounded functional batch complete after local verification;
  live Odoo inspection and paired desktop/mobile evidence remain blocked.
  Recruitment is not signed off.

## Batch 19 QA — Applicant Create Employee — 2026-09-22

- Stable ID: `RECRUITMENT-APPLICANT-CREATE-EMPLOYEE-001`.
- Source boundary: Odoo 19 `hr_recruitment/views/hr_applicant_views.xml` and
  `models/hr_applicant.py::create_employee_from_applicant`, compared against
  source revision `659759969d535d286b656c96b675e4612b925ddd`.
- Focused test: `bun test
  test/recruitment_applicant_create_employee.integration.test.ts` — 4 passed,
  0 failed, 19 assertions.
- Functional coverage: page/API `page.id` separation, Hired-only action
  visibility, Employees-table creation, applicant employee linkage, employee
  detail navigation, actor/company/name/not-ready/duplicate/stale guards,
  atomic no-partial-write behavior, idempotent migration, and file-backed
  restart persistence.
- Browser blocker: BrowserSkill instance `245ea108` was connected. The
  authenticated Odoo tab `1770662590` was already borrowed by session `fqey`;
  `bsk tab borrow 1770662590 --session sisw --timeout 20s` returned
  `error: tab is borrowed by another session`. Session `sisw` was stopped. No
  tab was borrowed, no Odoo action was inspected, and no desktop/mobile
  captures were possible. No independent login, Playwright session,
  credentials, or alternate browser was used; no Odoo visual-parity claim is
  made.
- QA decision: bounded functional batch complete after local verification;
  live Odoo inspection and paired desktop/mobile evidence remain blocked.
  Recruitment is not signed off.

## Batch 18 QA — Job Positions (Interviewer) — 2026-09-22

- Stable ID: `RECRUITMENT-JOB-INTERVIEWER-001`.
- Source boundary: Odoo 19 `hr_recruitment/views/hr_job_views.xml` action
  `action_hr_job_interviewer`, the interviewer domain/context, and
  `security/ir.model.access.csv`, compared at source revision
  `659759969d535d286b656c96b675e4612b925ddd`.
- Focused test: `bun test test/recruitment_interviewer_openings.integration.test.ts`
  — 4 passed, 0 failed, 28 assertions. Recruitment regression: 76 passed,
  0 failed, 658 assertions across 20 files.
- Functional coverage: durable interviewer assignments, page/API `page.id`
  separation for list and detail, kanban-only `kanban,form` surface, create
  disabled, actor/company/search/status scope, empty and transport states,
  assignment-guarded direct detail access, and idempotent seeded persistence.
- Static gate: `bun run audit` passed with 839 pages, 847 routes, and 1,749
  datasources; frontend/CSS build and `git diff --check` are recorded in the
  feature evidence.
- Browser blocker: BrowserSkill instance `245ea108` was connected. Borrowing
  authenticated Odoo tab `1770662590` from session `rpmb` returned
  `error: tab is borrowed by another session` and identified owner session
  `cqvt`. The session was stopped; no tab was borrowed, no live Odoo action was
  inspected, and no desktop/mobile captures were possible. No independent
  login, Playwright session, credentials, or alternate browser was used; no
  Odoo visual-parity claim is made.
- QA decision: bounded functional batch complete after local verification;
  live Odoo inspection and paired desktop/mobile evidence remain blocked.
  Recruitment is not signed off.

## Batch 17 QA — Job Position Trackers — 2026-09-22

- Stable ID: `RECRUITMENT-JOB-TRACKERS-001`.
- Source boundary: Odoo 19 `hr_recruitment/views/hr_recruitment_source_views.xml`
  action `action_hr_job_sources`, `models/hr_recruitment_source.py`, and
  `security/ir.model.access.csv`, compared at source revision
  `659759969d535d286b656c96b675e4612b925ddd`.
- Focused test: `bun test test/recruitment_job_trackers.integration.test.ts`
  — 4 passed, 0 failed, 46 assertions.
- Functional coverage: source/page/API separation by `page.id`, job detail
  Trackers stat navigation, per-opening deterministic rows, source/campaign/
  medium/email query and search, empty and transport states, writer CRUD,
  canonical opening/company assignment, actor/company/duplicate/required/
  missing/stale guards, and file-backed restart persistence.
- Browser blocker: BrowserSkill status showed instance `245ea108`; tab list
  identified the authenticated Odoo tab, but
  `bsk tab borrow 1770662590 --session quzf --timeout 20s` returned
  `error: tab is borrowed by another session` with hint that session `ioxf`
  owns the tab. Session `quzf` was stopped. No independent login or alternate
  browser was used; no Odoo desktop/mobile visual-parity claim is made.
- QA decision: bounded functional batch complete after local verification;
  authenticated Odoo action inspection and paired desktop/mobile evidence
  remain blocked. Broader Recruitment sign-off remains pending.

## Batch 16 QA — Job Position New Application — 2026-09-22

- Stable ID: `RECRUITMENT-JOB-NEW-APPLICATION-001`.
- Source boundary: Odoo 19 `hr_recruitment/views/hr_job_views.xml` action
  `action_hr_job_new_application` and `hr_applicant_views.xml` applicant form,
  compared against source revision `659759969d535d286b656c96b675e4612b925ddd`.
- Focused test: `bun test test/recruitment_job_new_application.integration.test.ts`
  — 4 passed, 0 failed, 25 assertions. Recruitment regression: 68 passed,
  0 failed, 584 assertions across 18 files.
- Coverage: opening detail/API `page.id` join, company-scoped opening,
  New Application fields, durable applicant persistence, counter refresh,
  actor/opening state/company/stale/name/email/detail guards, atomic failures,
  and file-backed restart.
- Browser blocker: BrowserSkill connected to instance `245ea108` and listed
  the authenticated Odoo tab, but borrowing it did not complete and the
  session ended unregistered. No independent login, Playwright session,
  credentials, or alternate browser was used; no Odoo desktop/mobile visual
  parity claim is made. The exact command capture is in the Batch 16 evidence.
- QA decision: bounded functional batch complete after local verification;
  live Odoo comparison and broader Recruitment sign-off remain open.

## Batch 15 QA — Applicant Create Applications — 2026-09-22

- Candidate scope: Odoo `job_add_applicants` from talent-pool members and
  pool-applicant detail; followers and email remain prior bounded batches.
- Stable ID: `RECRUITMENT-APPLICANT-JOB-APPLICATIONS-001`.
- Source boundary: Odoo 19 `wizard/job_add_applicants.py`,
  `wizard/job_add_applicants_views.xml`, `models/hr_applicant.py`, and
  `views/hr_applicant_views.xml`, compared at source revision
  `659759969d535d286b656c96b675e4612b925ddd`.
- Focused coverage: page/API `page.id` join, manager permission mapping,
  multi-job form, 2×2 durable clone creation, profile/stage/source linkage,
  empty/missing/archived/cross-company/actor/invalid-position guards, stale
  detail replay, source counter, and file-backed restart.
- Browser blocker: BrowserSkill status confirmed instance `245ea108`, but
  borrowing the existing authenticated Odoo tab returned `tab is borrowed by
  another session`. No independent login or alternate browser was used; no
  desktop/mobile visual-parity claim is made.
- QA decision: functional batch complete after final local gates; live Odoo
  reference and authenticated desktop/mobile captures remain blocked. Broader
  Recruitment sign-off remains pending.

## Batch 14 QA — Applicant Add/Remove Followers — 2026-09-22

- Candidate scope: applicant list/kanban follower wizard, durable
  subscriptions, notification-intent audit, and applicant detail summary;
  Activity Types/Plans and Send Email remain separate prior batches.
- Source boundary: Odoo 19 `mail_followers_edit_action_from_hr_recruitment`,
  `mail.followers.edit`, and `mail_followers_edit_views.xml` were compared
  against local source revision `659759969d535d286b656c96b675e4612b925ddd`.
- Focused test: `bun test test/recruitment_applicant_followers.integration.test.ts`
  — 4 passed, 0 failed, 19 assertions. Recruitment regression: `bun test
  ./test/recruitment*.integration.test.ts --timeout 20000` — 59 passed, 0
  failed, 534 assertions across 16 files.
- Functional coverage: page/API `page.id` join, list/kanban bulk action,
  Add/Remove radio, active contact selector, notify/comments controls,
  multi-applicant idempotent add/remove, notification audit, actor/company/
  contact/operation/notify/message guards, detail summary, and restart
  persistence.
- Odoo blocker: browser instance `245ea108`, database `core3_reference`, and
  direct `/odoo/recruitment?db=core3_reference` exposed Discuss/OdooBot rather
  than Recruitment on desktop and mobile. Blocker captures and hashes are in
  `evidence/recruitment/2026-09-22/RECRUITMENT-APPLICANT-FOLLOWERS-001/`;
  no paired visual comparison or visual parity claim is made.
- Core3 browser capture: attempted only if an isolated runtime is available;
  no evidence is claimed without an authenticated rendered surface.
- QA decision: bounded functional batch complete; live-reference visual and
  runtime/browser gates remain blocked or pending, so Recruitment is not
  signed off.

## Batch 13 QA — Applicant Send Email — 2026-09-22

- Candidate scope: Recruitment applicant mass-email composer and durable sent
  message audit only; Activity Types/Plans are separate prior batches.
- Source boundary: Odoo 19 `hr_applicant_views.xml` list/kanban `Send Email`
  action, `hr_applicant.py::action_send_email`, and
  `wizard/applicant_send_mail.py` / composer view were compared against local
  source revision `659759969d535d286b656c96b675e4612b925ddd`.
- Focused test: `bun test test/recruitment_applicant_email.integration.test.ts`
  — 4 passed, 0 failed, 29 assertions. Recruitment regression: `bun test
  ./test/recruitment*.integration.test.ts --timeout 20000` — 55 passed, 0
  failed, 514 assertions across 15 files.
- Static gates: `bun run audit` passed (797 pages, 806 routes, 1644
  datasources); targeted ESLint, frontend build, and `git diff --check` passed.
- Functional coverage: page/API `page.id` join, bulk selection/action,
  composer fields, active template lookup, multi-applicant durable rows,
  restart persistence, company/actor/selection/recipient/content/template
  guards, and atomic no-partial-write failures.
- Core3 browser evidence: authenticated desktop composer rendered at 1440x900;
  the first real submission exposed empty template serialization, which was
  corrected by normalizing blank template IDs before the active-template guard.
  The exact desktop capture and network/result notes are in the batch
  evidence directory. No mobile Core3 composer capture is claimed in this
  finalization.
- Odoo blocker: browser instance `245ea108`, database `core3_reference`, and
  direct `/odoo/recruitment?db=core3_reference` exposed Discuss/OdooBot rather
  than Recruitment on both desktop and mobile. Blocker captures and hashes
  are recorded in the batch evidence directory. No paired visual comparison
  or full Recruitment parity sign-off is claimed.
- QA decision: bounded functional batch complete; live-reference and broader
  module actor/mobile gates remain blocked or pending.

## Batch 12 QA — Activity Plans — 2026-09-22

- Candidate scope: Recruitment Activity Plans only.
- Source boundary: Odoo 19 `mail_activity_plan_action_config_hr_applicant`,
  fixed `hr.applicant` domain/context, manager CRUD access, and nested
  Activities To Create templates were compared in local Odoo source revision
  `659759969d535d286b656c96b675e4612b925ddd`.
- Focused test: `bun test test/recruitment_activity_plans.integration.test.ts` —
  4 passed, 0 failed, 49 assertions.
- Static gates: `bun run audit` passed (789 pages, 798 routes, 1626
  datasources); targeted ESLint passed; `git diff --check` passed.
- Recruitment regression: `bun test ./test/recruitment*.integration.test.ts
  --timeout 20000` — 51 passed, 0 failed, 485 assertions across 14 files.
  The run corrected one stale Recruitment-owned Applicants view assertion that
  omitted the already implemented Calendar view; no product failure remained.
- Functional coverage: page/API `page.id` join, List/Kanban/form contract,
  deterministic migration and idempotent rerun, search, active/archived
  filtering, empty results, durable ordered activity steps, create/update/delete,
  duplicate/name/model/step validation, archive/restore state guards, missing
  and stale row conflicts, manager permission declarations, and file-backed
  restart persistence.
- Odoo blocker: the authenticated `core3_reference` BrowserSkill session on
  browser instance `245ea108` had no Recruitment launcher entry; direct
  `/odoo/recruitment?db=core3_reference` returned Discuss. Desktop and mobile
  blocker captures are recorded in the batch evidence directory. No paired Odoo
  visual comparison or Activity Plans parity sign-off is claimed.
- QA decision: functional batch complete; live-reference visual and actor gates
  blocked by the environment. Broader Recruitment sign-off remains pending.

## Batch 11 QA — Activity Types — 2026-09-22

- Candidate scope: Recruitment Activity Types only.
- Focused test: `bun test test/recruitment_activity_types.integration.test.ts` —
  4 passed, 0 failed, 45 assertions.
- Static gates: `bun run audit` passed (782 pages, 791 routes, 1604
  datasources); targeted ESLint passed; `git diff --check` passed.
- Functional coverage: page/API `page.id` join, List/Kanban contract, deterministic
  migration and idempotent rerun, search, active/archived filtering, empty
  results, create/update/delete, duplicate/required/option/delay/chaining
  validation, archive/restore state guards, in-use delete protection, missing
  and stale row conflicts, permission declarations, and file-backed restart
  persistence.
- Odoo blocker: the authenticated `core3_reference` BrowserSkill session had no
  Recruitment launcher entry; direct `/odoo/recruitment?db=core3_reference`
  returned Discuss. Desktop and mobile blocker captures are recorded in the
  batch evidence directory; no paired Odoo visual comparison or parity sign-off
  is claimed.
- Core3 browser blocker: the isolated runtime stopped during YAML startup on
  the unrelated duplicate named action `time_off.requests.refuse`; no
  authenticated Core3 screenshot is claimed for this batch.
- QA decision: functional batch complete; visual/reference gate blocked by the
  live environment. Broader Recruitment sign-off remains pending.

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

## QA retest disposition `ad1c528f`: blocked; same-owner numeric row-version repair (2026-09-13)

- Live refusal now passes under `Core3 Demo Company`; the 39-test / 367-assertion
  suite, guards, desktop/mobile rendering, build, audit, lint, and diff-check
  remain green.
- Critical defect `RECRUITMENT-REOPEN-001`: Restore sends
  `expected_row_version` as VARCHAR, and DuckDB fails on `VARCHAR + INTEGER`.
  The applicant remains Rejected/archived after the failed restore and reload.
- Candidate `ad1c528f` remains held and must not be integrated. Repair is routed
  to the existing owner/worktree
  `agent/odoo-recruitment-reopen-20260913` at
  `/home/nhanjs/projects/core3-worktrees/odoo-recruitment-reopen-20260913`:
  trace the action/runtime binding, serialize or cast the value numerically,
  add refuse -> restore -> reload plus stale regression coverage, and return a
  self-contained product commit before QA retest.
- Preserve the file-backed restart and authenticated paired Odoo comparison
  blockers. QA retest is not triggered until the repair candidate is submitted.

## Reviewer reconciliation `1553df22`: held for dependency repair (2026-09-13)

- QA evidence is accepted for the owner worktree: live refuse -> restore ->
  reload, numeric row version, stale 409
  `RECRUITMENT_APPLICANT_REOPEN_STALE`, actor 403/anonymous 401, desktop/mobile,
  39-test suite, audit/build/ESLint, and diff-check passed.
- The candidate is **not independently self-contained** on the active branch.
  Its regression requires the company-context schema/fixture migration and
  test changes from `ad1c528f`; cherry-picking `1553df22` alone caused the
  active focused test to fail with `Referenced update column company_name not
  found in table!` and the reload assertion could not find `company_name`.
- The provisional cherry-pick was reverted as `48727baa`; no Recruitment
  product change is integrated. Same owner must return an ordered,
  self-contained bundle or a rebased repair against active Recruitment
  contracts, then trigger QA retest.
- Preserve open gates: file-backed restart unavailable, Odoo routes redirect to
  login, and the sample package has no lint script.

## Reviewer reconciliation `45a30a12`: held for active-schema incompatibility (2026-09-13)

- QA evidence is recorded: live refuse -> restore -> reload, numeric version,
  stale 409, actor/company/anonymous 403/401, desktop/mobile/reload, 39 tests /
  370 assertions, audit/build/ESLint, and diff-check passed.
- The candidate's three-file product patch is not executable against the active
  branch as submitted. Migration 014 runs `UPDATE recruitment_applicants SET
  company_name ...`, but the active Recruitment schema has no `company_name`;
  all four focused tests fail at migration startup with DuckDB
  `Referenced column "company_name" not found in FROM clause`.
- Provisional cherry-pick was reverted as `092d831a`; no Recruitment product
  change is integrated. Same owner must rebase/repair the migration against the
  active schema, rerun the focused suite and required gates, and return a
  genuinely self-contained candidate before QA retest.
- Preserve open gates: file-backed restart unavailable, Odoo redirects to
  `/web/login`, and the sample package has no lint script.

## Reviewer reconciliation `e77fcef2`: held for active-contract dependencies (2026-09-13)

- Owner QA evidence passes: migration/startup, live refuse -> restore -> reload,
  numeric version, stale 409, actor/company/anonymous 403/401, desktop/mobile,
  39 tests / 370 assertions, builds, audit, targeted ESLint, and diff-check.
- Active-branch verification still fails after cherry-pick: the focused suite
  passes 2 tests but fails 2 because the active applicant detail query omits
  `company_name`, and the active applicant-list datasource lacks `error_states`.
  These are required company-scope contracts present in the owner lineage but
  absent from the active branch.
- Provisional cherry-pick was reverted as `6cebba05`; no Recruitment product
  change is integrated. Same owner must rebase the complete company-scope API
  contracts, schema/fixture migration, and reopen repair onto the current
  active branch, then rerun QA.
- Preserve open gates: unrelated Website full-lint errors, file-backed restart
  unavailable, and Odoo redirecting to `/web/login`.

## Reviewer reconciliation `ec35bb47`: conditionally integrated (2026-09-13)

- The corrected self-contained Recruitment bundle was cherry-picked as
  `8a77e514`. It includes the company-scope schema/data migrations, applicant
  list error contracts, scoped refusal/reopen API/workflow bindings, and focused
  regression coverage.
- Active verification passed the focused workflow suite **4/4, 34 assertions**;
  `bun run audit` passed (**661 pages / 670 routes / 1158 datasources**), the
  Recruitment CSS build passed, and `git diff --check` passed. The owner QA
  evidence additionally reports **39 tests / 370 assertions**, controlled
  restart, live refuse -> restore -> reload, numeric version, stale 409,
  actor/company/anonymous 403/401, and desktop/mobile/reload success.
- Conditional status is preserved. Full repository lint remains blocked by
  unrelated Website errors at `sample/test/website_public.integration.test.ts`
  lines 31 and 33; file-backed mutation restart is unavailable; authenticated
  Odoo routes redirect to `/web/login`.
