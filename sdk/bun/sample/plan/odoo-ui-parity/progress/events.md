# events parity progress

Module owner: events module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: `650be026a2849075ea1e2a3d6fcdedc897f0e1af`

## Bounded QA result — 2026-09-13

Candidate `650be026` was tested in `/home/nhanjs/projects/core3` without product-code changes. The attendee edit test passed 2/2 with 10 assertions, covering editable page/API ownership, persisted update and reload-source data, blank-name 422 `EVENT_ATTENDEE_NAME_REQUIRED`, missing-record 404 `EVENT_ATTENDEE_NOT_FOUND`, and stale-write 409 `STALE_RECORD`. The complete Events suite passed 84/84 tests with 618 assertions across 30 files.

`bun run audit` passed (659 pages, 668 routes, 1,139 datasources), and `git diff 650be026^ 650be026 --check` passed. Repository lint is blocked by two non-Events `no-unsafe-optional-chaining` errors in `sample/test/website_public.integration.test.ts` lines 31 and 33. The candidate-specific full repository regression was stopped while still running and has no final result. No candidate-specific authenticated desktop/mobile browser captures or paired Odoo evidence were generated; prior 2026-09-12 artifacts are from candidate `f7a38e86` and remain un-attributed.

QA decision remains not signed off. Evidence supports the bounded attendee-edit change and Events automated suite only; full regression completion, lint cleanup, authenticated responsive evidence, and paired Odoo comparison remain blockers.

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

## Coordinator reconciliation — `0a099a86`

The bounded registration-action repair is integrated: page registration uses
`events.registrations.register`/`operation: register`, while API attendee
creation remains `events.registrations.create`/`operation: create`. Focused
verification passed 5 tests / 63 assertions; candidate regression and audit
evidence passed. Permission actor matrix, fresh browser CRUD, repository lint,
and paired Odoo gates remain open.
