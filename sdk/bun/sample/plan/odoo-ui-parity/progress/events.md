# events parity progress

Module owner: events module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: none

## Current state

The focused Events suite passes 82 tests across 29 files with 604 assertions.
Authenticated Core3 browser smoke also created and persisted `QA Browser Event
20260912` from `/events`. The first browser attempt found an optional empty
`end_at` timestamp conversion defect; the event form now declares `start_at` and
`end_at` as Core3 `datetime` text fields, and the exact flow was retested clean.
The authenticated registered-menu route matrix passed 28/28 checks (14 routes
at desktop and mobile) without blank pages, browser errors, HTTP failures, or
horizontal overflow. The Fleet user permission probe correctly denied
`events.read` with a 403 permission page.
Full menu-tree coverage, permissions, complete browser CRUD/workflow coverage,
and paired Odoo desktop/mobile comparison remain open. No full parity claim is
made here.

## Next bounded task

Run the authenticated Events route matrix, permission-boundary checks, state
transitions/registration workflow, and paired Odoo desktop/mobile captures;
then update this file only with evidence from the matching module owner.
