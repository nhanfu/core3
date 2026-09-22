# recruitment parity progress

Module owner: recruitment module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: pending Recruitment Job Positions (Interviewer) commit

## Batch 18 current state

`RECRUITMENT-JOB-INTERVIEWER-001` implements Odoo's
`action_hr_job_interviewer`: durable interviewer assignments, a signed-in
interviewer/company-scoped Kanban page, and an assignment-guarded read-only
form. The focused suite passes 4 tests / 28 assertions; the Recruitment
regression passes 76 tests / 658 assertions and the UI audit passes.
BrowserSkill instance `245ea108` was connected, but tab `1770662590` was
borrowed by team session `cqvt`; the exact borrow blocker was recorded and the
session was stopped. No Odoo visual-parity claim is made.

## Batch 17 current state

`RECRUITMENT-JOB-TRACKERS-001` implements Odoo's job-position-scoped
`action_hr_job_sources` action. Core3 now has the durable Trackers list/API
pair at `/openings/trackers`, a Trackers stat action on job-position detail,
deterministic fixture rows, Recruitment writer CRUD, canonical opening/company
assignment, optimistic concurrency, and empty/error/duplicate/scope guards.
The focused suite passes 4 tests / 46 assertions. BrowserSkill connected to
instance `245ea108`, but the authenticated Odoo tab was already borrowed by
team session `ioxf`; the required borrow returned `tab is borrowed by another
session`. My BrowserSkill session was stopped and no independent login,
Playwright, credentials, or alternate browser was used. No Odoo visual-parity
claim is made.

## Batch 16 current state

`RECRUITMENT-JOB-NEW-APPLICATION-001` implements Odoo's
`action_hr_job_new_application` job-position-scoped applicant form. The new
opening detail route/API is joined by `page.id`; creation is company-scoped,
actor-checked, optimistic-version guarded, fixed-date, durable, and restart
verified. The focused suite passes 4 tests / 25 assertions and the full
Recruitment regression passes 68 tests / 584 assertions across 18 files.

BrowserSkill connected to browser `245ea108` and listed the authenticated Odoo
tab, but the required user-tab borrow did not complete and the session became
unregistered. No Odoo action was inspected and no desktop/mobile feature
capture was possible; the exact blocker command capture is under the Batch 16
evidence directory. No visual parity sign-off is claimed.

## Current state

Batch 15 implements `RECRUITMENT-APPLICANT-JOB-APPLICATIONS-001`, the Odoo
`job_add_applicants` action. Pool talent list and applicant detail now expose a
guarded multi-job wizard that durably clones one application per selected
talent/job pair, preserves source profile data, selects the first open stage,
and survives restart. Focused and module regression verification are recorded
in the feature evidence. Live Odoo desktop/mobile comparison remains blocked
because the authenticated tab on browser `245ea108` was already borrowed by
another team session; no visual parity sign-off is claimed.

Batch 14 implements the next uncovered Recruitment workflow, applicant
Add/Remove Followers wizard. Its focused suite passes 4 tests / 19 assertions
with durable multi-applicant subscriptions, notification audit, guards, and
file-backed restart coverage. The Recruitment regression passes 59 tests /
534 assertions across 16 files. Core3 browser evidence is pending runtime
availability. Authenticated Odoo desktop/mobile feature evidence is blocked
because the shared `core3_reference` launcher has no Recruitment entry and the
direct Recruitment URL returns Discuss. No paired visual parity sign-off is
claimed.

Batch 13 implements the next uncovered Recruitment workflow, applicant email
composer/send. Its focused suite passes 4 tests / 29 assertions with durable
multi-applicant rows, guard atomicity, and file-backed restart coverage. The
Recruitment regression passes 55 tests / 514 assertions across 15 files; audit,
targeted ESLint, frontend build, and diff-check are green. Core3 desktop
composer/send evidence is captured. Authenticated Odoo desktop/mobile feature
evidence is blocked because the shared `core3_reference` launcher has no
Recruitment entry and the direct Recruitment URL returns Discuss. No paired
visual parity sign-off is claimed.

The full Recruitment regression passes 51 tests / 485 assertions across 14
files. It also reconciled one stale Recruitment-owned Applicants view assertion
to include the already implemented Calendar view; this was a test-only repair,
not a new feature slice.

Bounded QA finalization on candidate `d1b2cb6615b421ac3235943e2389f366690b2ff1`
completed on 2026-09-13. The focused suite passed 37 tests / 346 assertions
across 11 files. Rejected→New restore, refusal/archive metadata clearing,
reload persistence, invalid-reason 422, stale-replay 409, and the
`recruitment.write` action declaration all passed in the integration evidence.
The audit (659 pages / 668 routes / 1139 datasources), focused ESLint, and
diff-check passed. The mock-data audit remains blocked by the repository-wide
service-backed datasource rule: Recruitment `recruitment_*` datasources lack
`mock_data` declarations.

The full `bun test ./test --timeout 20000` regression was stopped at the user's
request (exit 130) after passing output reached
`test/manufacturing_workcenter_operations.integration.test.ts`; no total is
claimed. No new browser or Odoo probe was run in this finalization window, so
authenticated desktop/mobile CRUD and paired Odoo evidence remain open. QA is
not signed off.

The focused Recruitment suite passes 35 tests across 10 files with 336
assertions. The authenticated module-scoped matrix covers 15 routes at
desktop and mobile; 30/30 passed after an isolated `/openings` retest, which
also confirmed its normalized `/recruitment/openings` alias. Fleet was denied
the manager-only Recruitment settings route with HTTP 403 and no browser
errors. Authenticated CRUD mutation smoke, the full role matrix, and paired
Odoo comparison remain open. An authenticated applicant was also created and
advanced New → Screening → Interview → Offer → Hired with row versions 1 → 5.
No parity claim is made here.

## Next bounded task

Complete the remaining authenticated mobile composer proof and broader
Recruitment actor matrix when the runtime/reference gates are available. Do
not treat this bounded batch as full module sign-off.

## QA disposition `e9a19a8f` (2026-09-13)

Hold the Recruitment refusal candidate. QA found
`RECRUITMENT-REFUSE-001`: admin context is `Core3 Demo Company`, but the seeded
applicant is `My Company (San Francisco)`, so live refusal fails before
persistence. Route fixture/company-context alignment to the existing owner
`agent/odoo-recruitment-reopen-20260913` in
`/home/nhanjs/projects/core3-worktrees/odoo-recruitment-reopen-20260913`, then
rerun authenticated refusal/reopen and reload QA. Restart and paired Odoo
remain open; no replacement or merge was made.

## QA retest hold: `ad1c528f` (2026-09-13)

Live refusal is fixed and verified, but Restore is blocked by
`RECRUITMENT-REOPEN-001`: the UI/runtime binds `expected_row_version` as a
VARCHAR and the reopen SQL attempts numeric addition. The same existing owner
must submit a self-contained numeric serialization/cast repair with focused
restore/reload and stale tests before `QA-RECRUITMENT-WAVE-20260913-R2` is
triggered. Restart durability and authenticated Odoo comparison remain open.

## Reviewer hold: `1553df22` (2026-09-13)

QA passed the repair behavior, but the commit depends on `ad1c528f`'s
company-context migration/test changes and fails when cherry-picked alone onto
the active Recruitment history (`company_name` is absent in the active schema
path). Provisional integration was reverted as `48727baa`. Require the same
owner to return a self-contained ordered bundle or active-branch rebase before
another QA retest. File-backed restart, authenticated Odoo, and package-lint
gates remain open.

## Reviewer hold: `e77fcef2` (2026-09-13)

Owner QA passed, but active verification found missing company-scope contracts:
the applicant detail query lacks `company_name` and the applicant list lacks
`error_states`. Focused active tests therefore failed 2/4 after provisional
integration. The candidate was reverted as `6cebba05`; require the same owner
to rebase the full company-scope API/schema/fixture dependency plus reopen fix
against active contracts before retest. Website lint, restart, and Odoo gates
remain open.

## Integrated conditional repair: `ec35bb47` -> `8a77e514` (2026-09-13)

The corrected self-contained company-scope and numeric reopen bundle is
integrated. Active focused workflow verification passed 4/4 with 34 assertions;
audit, Recruitment CSS, and diff-check passed. QA reports 39/370 plus live
desktop/mobile and controlled restart evidence. Recruitment remains conditional
because full lint has unrelated Website errors, file-backed mutation restart is
unavailable, and authenticated Odoo comparison redirects to `/web/login`.

## Reviewer hold: `45a30a12` (2026-09-13)

QA passed the intended refusal/reopen behavior, but the submitted three-file
candidate is incompatible with the active schema: migration 014 references
`recruitment_applicants.company_name`, which does not exist on the active
branch, and all four focused tests fail during migration startup. The
provisional integration was reverted as `092d831a`. Same owner must rebase the
company-scope schema/fixture dependency and numeric reopen repair into a
self-contained candidate before QA retest. Restart, Odoo, and package-lint
gates remain open.
