# recruitment parity progress

Module owner: recruitment module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: current working tree

## Current state

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

Run an authenticated applicant/opening CRUD and workflow smoke, complete the
role-specific permission matrix, and capture paired Odoo desktop/mobile
screens. Update this file only with evidence from the matching module owner.

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

## Reviewer hold: `45a30a12` (2026-09-13)

QA passed the intended refusal/reopen behavior, but the submitted three-file
candidate is incompatible with the active schema: migration 014 references
`recruitment_applicants.company_name`, which does not exist on the active
branch, and all four focused tests fail during migration startup. The
provisional integration was reverted as `092d831a`. Same owner must rebase the
company-scope schema/fixture dependency and numeric reopen repair into a
self-contained candidate before QA retest. Restart, Odoo, and package-lint
gates remain open.
