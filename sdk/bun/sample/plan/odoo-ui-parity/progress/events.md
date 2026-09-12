# events parity progress

Module owner: events module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: `f7a38e86`

## Current state

The focused Events suite passes 82 tests across 29 files with 608 assertions.
Authenticated Core3 browser smoke also created and persisted `QA Browser Event
20260912` from `/events`. The first browser attempt found an optional empty
`end_at` timestamp conversion defect; the event form now declares `start_at` and
`end_at` as Core3 `datetime` text fields, and the exact flow was retested clean.
The authenticated registered-menu route matrix passed 28/28 checks (14 routes
at desktop and mobile) without blank pages, browser errors, HTTP failures, or
horizontal overflow. The Fleet user permission probe correctly denied
`events.read` with a 403 permission page.
An authenticated mutation probe also completed the event lifecycle from Draft to
Published to In Progress to Completed, with successful 200 responses and row
versions advancing from 1 through 4.
The registration probe accepted one attendee on a capacity-1 published event,
returned a persisted registration record, and rejected the second attendee with
the expected 409 capacity guard.
The authenticated edit probe updated the event and cleared nullable `end_at`,
then confirmed the optimistic-concurrency boundary by receiving 409
`STALE_RECORD` for a replayed row version.
Event deletion is now exposed from the event detail screen and was verified in
the authenticated runtime: an eligible Draft event deleted successfully, while
a Published event was rejected with `EVENT_NOT_DRAFT`.
Fresh module-scoped browser verification on port 4025 also passed all 14
registered menu routes at desktop and mobile (28/28), with no page/request
errors or horizontal overflow.
Full menu-tree coverage, permissions, complete browser CRUD/workflow coverage,
and paired Odoo desktop/mobile comparison remain open. No full parity claim is
made here.

## Next bounded task

Run the authenticated registration/attendee CRUD workflow and paired Odoo
desktop/mobile captures for the remaining Events screens; then update this file
only with evidence from the matching module owner.
