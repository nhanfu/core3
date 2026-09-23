# events parity progress

## Bounded feature - event chatter followers (2026-09-23)

Stable feature ID: EVENTS-EVENT-FOLLOWERS-001. The event detail form now
exposes durable Odoo-style follower subscriptions through the existing
page/API pair. Migration 045 seeds the deterministic Marc Demo subscription
and follower catalog; add/remove actions require `events.write`, advance the
event version, record chatter audit rows, and reject actor, missing, duplicate,
cancelled, stale, and replayed writes. Focused coverage passes 4 tests / 30
assertions, with related Events inventory/state regressions passing 9 tests /
107 assertions. BrowserSkill captured authenticated Odoo desktop/mobile
follower controls; no Core3 paired capture was made, so module sign-off remains
open. Evidence is under the event-followers evidence folder.

## Bounded feature - Event Template Questions relation (2026-09-22)

Stable feature ID: EVENTS-TEMPLATE-QUESTIONS-001. The Event Template detail
form now exposes the source-backed reusable `question_ids` relation in its
Questions notebook. The page/API pair remains joined by `event-template-detail`;
the durable relation has stable Exhibition Name, Email, and Phone links, an
available-question datasource, permissioned Add a line/Remove actions, parent
and line stale guards, duplicate/invalid validation, and migration/restart
coverage. Focused validation passes 2 tests / 24 assertions; related template
regression passes 9 tests / 93 assertions. BrowserSkill instance 245ea108 was
healthy, but the authenticated Odoo tab borrow timed out waiting for extension
confirmation; no Odoo desktop/mobile captures or visual-parity claim were
made. Evidence is under the event-template-questions evidence folder.

## Bounded feature - reopen cancelled attendee registration (2026-09-22)

Stable feature ID: EVENTS-ATTENDEE-REOPEN-001. The attendee list and detail
form now expose the source-backed Odoo `action_set_draft` workflow as
`Reopen registration`, moving only a current cancelled registration to
Unconfirmed with an optimistic row-version increment. Both page/API pairs stay
separate, the mutation requires `events.write`, and missing, stale,
non-cancelled, replay, and file-backed restart cases are covered. Focused
validation passes 4 tests / 20 assertions. BrowserSkill instance 245ea108 was
healthy, but the authenticated Odoo tab was borrowed by another team session;
no Odoo desktop/mobile capture or visual-parity claim is made. Evidence is
under the event-attendee-reopen evidence folder.

## Bounded feature - event tag category tag_ids editor (2026-09-22)

Stable feature ID: EVENTS-TAGS-001. The Event Tags Categories detail form now
has a durable Odoo-style tag_ids x2many editor with sequence, tag name, numeric
color index, add/edit/delete actions, category-summary projection, permissions,
parent/line optimistic concurrency, deterministic seeds, and restart coverage.
Focused validation passes 2 tests / 23 assertions; the full Events corpus passes
109 tests / 813 assertions; the UI audit, Events Sass build, frontend build,
targeted ESLint, and diff-check pass. The required live Odoo comparison is
blocked because the authenticated user tab on shared BrowserSkill instance
245ea108 is already borrowed by session zfuv; no visual-parity claim is made.
Evidence is recorded under the event-tag-lines evidence folder.

## Bounded feature - event chatter message and internal note (2026-09-22)

The event detail form now exposes the source-backed Odoo Send message and Log
note workflow. Page/API YAML remains joined by `event-detail`; migration 037
persists the seeded Event created notification and new messages/notes. Both
actions require `events.write`, validate actor/content/cancelled state, use
optimistic event row versions, advance the parent atomically, and retain the
existing activity records in one chatter timeline. Focused validation passes
4 tests / 25 assertions; related Events checks, UI audit, Sass build, and
diff-check pass. Odoo desktop/mobile captures are recorded in the feature
evidence folder. Core3 authenticated interaction was not claimed because the
requested browser sessions were closed before a new pass; full Events sign-off
remains open.

Module owner: events module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: bounded batch implemented; QA conditional
Verification trigger: feature-complete
Candidate commit: pending Events activity scheduling commit

## Bounded feature - event activity scheduling and completion (2026-09-22)

The event detail form now supports a durable source-backed activity workflow:
schedule To-Do/Email/Call/Meeting/Document activities, assign an actor, set a
due date, and mark a planned activity done. Page/API YAML is joined by
`event-detail`; actions require `events.write`, validate actor/state/type/date,
and use event and activity optimistic row-version guards. Migration 036 seeds a
stable planned activity and the restart test verifies completion persistence.
Focused validation passes 3 tests / 20 assertions; the related Events regression
passes 15 tests / 113 assertions; the UI audit passes 797 pages, 806 routes,
and 1,644 datasources. Odoo desktop/mobile and Core3 authenticated desktop
captures are recorded. Core3 mobile CSS evaluation passed at 390px with no
overflow, but the bsk screenshot endpoint produced 1916px output under mobile
emulation, so no Core3 mobile screenshot or visual-parity claim is made.
Full Events sign-off remains open.

## Bounded feature - event Questions relation editor (2026-09-22)

The event detail Questions tab now supports durable reusable-question
attach/edit/detach behavior with scoped options, answer-stat navigation,
permission checks, closed-event guards, optimistic concurrency, and restart
coverage. Focused validation passes 3 tests / 23 assertions. Authenticated
Odoo desktop/mobile captures are recorded under the matching evidence folder.
Core3 visual capture was not rerun in this final checkpoint; broader Events
actor permissions and complete responsive parity remain open.

## Bounded feature - event Notes & Documents (2026-09-22)

The event form now has the source-backed Notes & Documents notebook fields,
durable badge background metadata, permissioned upload/download/remove actions,
safe rich-text validation, optimistic row-version guards, and restart coverage.
The focused Events form regression passes 9 tests / 70 assertions. Authenticated
Odoo desktop/mobile reference captures are recorded under the matching evidence
folder. Broader Events actor permissions and complete responsive visual parity
remain open; this batch is not module sign-off.

## Bounded feature - attendee registration answer editor (2026-09-21)

The attendee detail Questions surface now has page/API-separated line-item
CRUD for registration answers. Focused validation passes 2 tests / 15
assertions, the UI audit passes at 772/781/1,582, and authenticated Odoo
desktop/mobile source captures are recorded. The previously reported CRM
page-discovery error is not reproducible in the current tree; Core3
authenticated browser capture was not rerun in this checkpoint, so this
feature is not a full Events visual-parity sign-off.

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
