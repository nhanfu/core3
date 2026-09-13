# employees parity progress

Module owner: employees module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: current working tree

## QA-4 candidate verification (2026-09-13)

Exact candidate `3c28ad98` was tested in isolated worktree
`qa-employees-candidate-3c28ad98`. The focused Employees corpus passed with 52
tests and 634 assertions across 16 files. Authenticated desktop browser smoke
at 1440x900 loaded the Employees list/detail surface without page errors,
failed requests, HTTP errors, or overflow; the real New employee form created
`QA Browser Employee` and returned HTTP 200 with persisted-in-runtime card
visibility. Mobile mutation, edit/archive/restore, actor/company boundaries,
restart persistence, full empty/error matrix, and paired Odoo comparison were
not covered by this QA event and remain open.

## Current state

The focused Employees suite passes 52 tests across 16 files with 634
assertions. DEV-4 added and verified the primary employee create/edit/archive/
restore lifecycle: deterministic employee-number IDs, required and duplicate
guards, missing-record and stale-write protection, and active-state guards.
An authenticated module-scoped route smoke covered 27 routes at
desktop and mobile; valid-ID retests for the affected certification, departure
reason, work location, and working schedule detail states passed without
browser/request errors. Fleet was denied the manager-only settings route with
HTTP 403. Full parameterized route coverage and paired Odoo comparison remain
open. No parity claim is made here.

## Next bounded task

Run the complete parameterized route matrix, authenticated employee/catalog
CRUD smoke against the primary employee mutation, actor matrix, and paired
Odoo desktop/mobile captures. Update this file only with evidence from the
matching module owner.

## Bounded QA retest: candidate 6a4da038 (2026-09-13)

Focused Employees QA passed: 53 tests, 647 assertions, 0 failures across 16
files. The repaired Directory list query passed active and archived Core3
company scoping, archived Other Company filtering, and cross-company detail
denial. The company-scoped lifecycle test passed wrong-company restore denial
with `404 EMPLOYEES_RECORD_NOT_FOUND` and unchanged persistence, followed by
same-company restore to active=true at row version 4.

The full `bun test ./test --timeout 20000` run was stopped with SIGINT (exit
130) at finalization and is incomplete. UI audit passed at 659 pages, 669
routes, and 1,134 datasources; Employees test ESLint and diff-check passed. No
fresh authenticated desktop/mobile or paired Odoo captures were available;
prior captures are explicitly non-candidate evidence. Status remains
conditional/qa-in-progress, with full regression and fresh browser/Odoo
evidence blocked; no aggregate progress or sign-off claim is changed.

## Coordinator reconciliation: departure-reasons `382a3d30` (2026-09-13)

The active branch already contains the exact bounded repair, so no duplicate
merge was needed. It restores departure-reason Archive/Restore contracts and
page bindings, adds active/status projections, and maps edit/archive/restore
concurrency to `expected_row_version`. Active focused verification passed **12
tests / 167 assertions** and audit passed **661 pages / 670 routes / 1,154
datasources**. Status remains conditional; browser, broader actor/restart, and
paired Odoo gates remain open.

## Coordinator reconciliation: departure-reasons navigation `1dc77ba2` (2026-09-13)

The active branch already contains the exact bounded repair, so no duplicate
merge was needed. It adds the generated-ID collision 409 guard and disables
click-to-edit so row navigation reaches the detail route, with focused shared
renderer support. Departure Reasons passed **3 tests / 60 assertions**; full
Employees passed **12 / 167**; audit passed **661 / 670 / 1,154**. Status remains
conditional pending browser lifecycle, broader actor/restart, and paired Odoo
evidence.

## Reviewer reconciliation: final Departure Reasons browser PASS with blockers (2026-09-13)

Integrated commits `382a3d30`/`1dc77ba2` are active and ownership/diff/warning
checks are valid. Final browser evidence passes bounded desktop/mobile CRUD,
navigation, duplicate 409, archive/restore, stale 409, missing delete 404, and
manager/ordinary-user boundaries. QA is **3/60 focused**, full Employees
**12/167**, audit **661/670/1,154**. Company-switch and paired Odoo comparison
remain open.
