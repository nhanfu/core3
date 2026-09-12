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
