# events QA ledger

## Bounded QA - Event Template Tickets relation (2026-09-22)

- Source contract: **PASS by local source**. Odoo `action_event_type` renders
  the Event Template Tickets x2many; `event_type_ticket_view_tree_from_type`
  exposes sequence, name, description, `seats_max`, and the derived
  `seats_limited` field, while the form exposes name, description, and seat
  limit.
- YAML ownership and permissions: **PASS**. The new
  `event-template-tickets` page is layout-only and its matching API owns both
  datasources and `events.write` add/edit/delete actions.
- Durable data and guards: **PASS**. Migration 038 is idempotent and seeds
  stable Exhibition ticket rows. Parent and line versions reject stale
  mutations; duplicate, blank, negative-seat, empty, missing, and transport
  contracts are declared.
- Focused tests: **PASS**, page/API discovery plus CRUD/replay/restart and
  validation guards in `events_template_tickets.integration.test.ts`.
- Odoo browser evidence: **BLOCKED**. BrowserSkill daemon and shared browser
  `245ea108` were healthy, but borrow of user tab `1770662590` timed out after
  120 seconds without extension confirmation. No Odoo desktop/mobile capture
  was produced, and no independent login/backend was used.
- Core3 browser evidence: **NOT CLAIMED**. This bounded checkpoint does not
  claim rendered parity without the paired authenticated Odoo action capture.
- Full module sign-off: **OPEN**. Actor matrix, paired visual evidence, and
  broader Events residuals remain outstanding.

## Bounded QA - Event chatter message and internal note (2026-09-22)

- Source contract: **PASS**. Local Odoo 19 source confirms `mail.thread` on
  `event.event` and `<chatter/>`; the authenticated reference exposes Send
  message, Log note, follower composer, and Event created at desktop/mobile.
- YAML ownership and permissions: **PASS**. `event-detail` owns the chatter
  presentation; matching `api/event-detail` owns `event_detail_chatter` and
  both `events.write` server-form mutations.
- Durable data and guards: **PASS**. Migration 037 adds `event_messages`,
  seeds the Event created notification, validates actor/content/cancelled
  state, uses required optimistic row versions, and advances the event only
  with a successful insert.
- Focused tests: **PASS**, 4 tests / 25 assertions, including restart/replay.
- Related regression: **PASS** for the 19-test / 138-assertion bounded set
  covering event form, activity, Notes & Documents, Questions relation, and
  chatter. Full Events corpus was run during finalization but its long output
  was not retained as a concise summary.
- Audit/build/diff: **PASS**. UI audit reports 807 pages, 816 routes, and
  1,671 datasources; Events Sass build and `git diff --check` pass.
- Odoo browser evidence: **PASS**, authenticated browser instance 245ea108,
  `http://localhost:8069`, database `core3_reference`; captures are committed
  in the feature evidence folder.
- Core3 browser evidence: **NOT CLAIMED**. The module runner reached
  `http://localhost:4026`, but the user requested browser sessions be closed
  before a new authenticated Core3 interaction pass. No Core3 screenshot is
  presented as captured.
- Full module sign-off: **OPEN**. Broader actor matrix and complete route-level
  paired visual coverage remain outstanding.

Evidence: `odoo-ui-parity/evidence/events/2026-09-22/event-chatter/`.

## Bounded QA - Event activity scheduling and completion (2026-09-22)

- Source contract: **PASS**. Odoo 19 `event.event` inherits
  `mail.activity.mixin`; `event_event_views.xml` renders `<chatter/>` and the
  authenticated dialog exposes activity type, summary, due date, assignee,
  Save, and Mark Done.
- YAML ownership and permissions: **PASS**. The `event-detail` page owns the
  chatter/activity presentation; matching `api/event-detail` owns the scoped
  datasource and schedule/complete mutations. Reads require `events.read` and
  mutations require `events.write`.
- Durable data and guards: **PASS**. Migration 036 creates and seeds
  `event_activities`; schedule and completion validate actor, content, type,
  due date, parent state, and expected parent/activity row versions.
- Focused tests: **PASS**, 3 tests / 20 assertions. The restart test reopens
  file-backed DuckDB and verifies the completed activity.
- Regression/audit: **PASS**. The related Events regression passes 15 tests /
  113 assertions; the UI audit passes 797 pages, 806 routes, and 1,644
  datasources.
- Odoo browser evidence: **PASS**, authenticated desktop and mobile captures
  from `http://localhost:8069` / `core3_reference` using browser instance
  `245ea108` are recorded in the feature evidence folder.
- Core3 browser evidence: **CONDITIONAL PASS**. The module runner on port 4025
  passed authenticated schedule and Mark Done actions on desktop. Mobile DOM
  evaluation at 390px reported `innerWidth=390`, `clientWidth=390`,
  `scrollWidth=390`; no Core3 mobile screenshot is claimed because bsk returned
  1916px output while mobile emulation was active.
- Runtime blocker: the shared `bun run dev --db=ddb --memory` backend did not
  open port 3001 during the bounded readiness window; the initial Vite route
  returned 502 / `ECONNREFUSED 127.0.0.1:3001`. The module-scoped runner was
  available and was stopped after verification.
- Full module sign-off: **OPEN**. Broader Events actor coverage and complete
  route-level paired visual coverage remain outstanding.

Evidence: `odoo-ui-parity/evidence/events/2026-09-22/event-activities/`.

## Bounded QA - Event Questions relation editor (2026-09-22)

- Source contract: **PASS**. Odoo 19 \`event.event.question_ids\` renders the
  Questions notebook with reusable-question add, sequence, mandatory,
  once-per-order, type, answers, stats, and remove controls.
- YAML ownership and permissions: **PASS**. \`event-detail\` owns the list and
  action presentation; matching \`api/event-detail\` owns the lookup and
  mutations. Reads require \`events.read\`; attach/edit/detach require
  \`events.write\`.
- Durable data and guards: **PASS**. Migration 035 adds durable event links,
  seeds Design Fair's Name/Email/Phone links, filters already-linked options,
  rejects duplicate/invalid links and closed events, and uses parent/link
  optimistic row versions.
- Focused tests: **PASS**, 3 tests / 23 assertions. The restart test
  reopens DuckDB and verifies the attached row before detaching it.
- Odoo browser evidence: **PASS**, authenticated desktop and mobile captures
  from \`http://localhost:8069\` / \`core3_reference\` are recorded in the feature
  evidence folder using browser instance \`245ea108\`.
- Core3 visual evidence: **NOT CLAIMED**. This final bounded checkpoint did
  not restart the shared Core3 runtime for a new screenshot.
- Full module sign-off: **OPEN**. The broader Events actor matrix and complete
  authenticated route visual comparison remain outstanding.

Evidence: \`odoo-ui-parity/evidence/events/2026-09-22/event-question-links/\`.

## Bounded QA - Event Notes & Documents (2026-09-22)

- Source contract: **PASS**. Odoo 19 `event.event` and `event_event_views.xml`
  expose Badge Dimension, Badge Background, Ticket Instructions, and Note on
  the `Notes & Documents` form page.
- YAML ownership and permissions: **PASS**. The `event-detail` page owns the
  notebook and upload/remove controls; its API owns the datasource/actions.
  Reads require `events.read`; mutations require `events.write`.
- Durable data and guards: **PASS**. Migration 034 persists all note/instruction
  and badge metadata, with image type/size, HTML safety, valid-dimension,
  stale-row, and removal guards.
- Focused tests: **PASS**, 9 tests / 70 assertions with the Events form
  regression; the new test covers restart persistence and downloaded bytes.
- Runtime/diff checks: **PASS**. Core3 memory-mode startup reached backend,
  Vite, and the event mediator; no Events YAML discovery error was observed.
- Odoo browser evidence: **PASS**, authenticated desktop and mobile captures
  from `http://localhost:8069` / `core3_reference` are recorded in the feature
  evidence folder.
- Core3 visual evidence: **NOT CLAIMED**. No new Core3 screenshot was needed
  for the requested Odoo reference capture; broader Events visual and actor
  permission gates remain open. The direct badge download endpoint passes the
  restart test, but browser-click download remains open because the shared
  client attachment URL resolver has no Events-kind mapping; that shared path
  is outside this Events-only change.

Evidence: `odoo-ui-parity/evidence/events/2026-09-22/event-notes-documents/`.

## Bounded QA - attendee registration answer editor (2026-09-21)

- Source contract: **PASS**. Odoo's `event.registration.answer` model and
  `event_registration_views.xml` expose the Questions one-to-many editor with
  Question, Type, Suggested answer, Text answer, and Add a line.
- YAML ownership and permissions: **PASS**. `attendee-detail.yaml` owns only
  the `LineItemGrid`; `api/attendee-detail.yaml` owns the datasource, lookup
  datasources, and line mutations. All three mutations require `events.write`.
- Durable data and guards: **PASS**. Migration 033 adds row versions and the
  suggested-answer relation; create/edit/delete persist and reject duplicate,
  invalid-choice, missing-value, missing-registration, and stale-line cases.
- Focused tests: **PASS**, 2 tests / 15 assertions.
- Audit/lint/diff: **PASS**. UI audit 772 pages / 781 routes / 1,582
  datasources; targeted ESLint and `git diff --check` pass.
- Odoo browser evidence: **PASS**, authenticated desktop and mobile captures
  from the Events menu are recorded in the feature evidence folder and local
  `/tmp` paths.
- Core3 browser evidence: **NOT RUN IN THIS CHECKPOINT**. The previously
  reported CRM discovery issue is not reproducible: direct discovery binds one
  owner for `crm_lead_mining_request_detail`, Core3 startup reaches Vite, and
  the CRM focused test passes. No new Core3 screenshot or visual-parity claim
  is made.

Evidence: `odoo-ui-parity/evidence/events/2026-09-21/event-attendee-answer-editor/`.

## Bounded QA — event question attendee answers stat action (2026-09-20)

- Source contract: **PASS**. Odoo `event_question_views.xml` exposes
  `action_view_question_answers`, and
  `event_registration_answer_views.xml` defines the read-only Answer
  Breakdown list/graph/pivot action. Core3 now exposes the matching
  `Attendee answers` stat button on the question detail page and routes the
  active question to the existing report.
- YAML ownership and permissions: **PASS**. The page remains layout-only;
  the API owns `answer_count`, the navigation action, and the scoped report
  datasource. The action and datasource require `events.read`.
- Durable data and scope: **PASS**. Migration `032` adds `question_id`,
  seeds one fixed Dietary requirements answer, and is safe to replay. The
  report returns only the selected question, while global, empty, and
  transport-error contracts remain explicit.
- Focused stat suite: **PASS**, 2 tests / 14 assertions.
- Related question/answer/attendee suites: **PASS**, 15 tests / 122
  assertions. Full Events integration: **PASS**, 90 tests / 654 assertions.
- Shared UI audit: **PASS**, 665 pages / 674 routes / 1,176 datasources.
  Targeted ESLint and `git diff --check`: **PASS**.
- Browser/Odoo paired captures were not run for this bounded automated slice;
  no visual sign-off is claimed. Attendee answer-line editing remains a
  separate parity gap.

## Bounded QA — candidate `715568b9` (2026-09-13)

- Attendee creation API/page contract and server-derived fields: **PASS**.
  `New attendee` is page-owned at `/events/attendees`, requires `events.write`,
  derives the registration ID and event name, and persists `Registered` with
  row version 1.
- Persistence/capacity/validation: **PASS**. Event registration count and row
  version increment atomically; blank name, malformed email, and closed/full
  event guards return the declared 422/409 errors.
- Focused test: **PASS**, 2 tests / 10 assertions. Events regression: **PASS**,
  86 tests / 628 assertions across 31 files. Audit (659/668/1,141), frontend
  build, and diff-check passed.
- Permission boundary: **CONDITIONAL**. The `events.write` declaration passes,
  but no candidate-specific Event User/Fleet direct-write actor matrix ran.
- Blockers: no Core3 listener or persistent Playwright/js_repl was available,
  so authenticated desktop/mobile CRUD, refresh, and screenshots were not
  verified; paired authenticated Odoo comparison remains pending. Repository
  ESLint remains red only on unrelated Website errors at
  `sample/test/website_public.integration.test.ts:31` and `:33`.

Disposition: bounded automated change integrated; preserve the conditional
browser, permission, Odoo, and unrelated lint blockers. No full Events module
sign-off or aggregate progress claim.

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/events-desktop.png and events-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable events assignment (pending wave dispatch)
Module owner: events module owner
Verification trigger: feature-complete
Candidate commit: `650be026a2849075ea1e2a3d6fcdedc897f0e1af`

## Bounded QA — candidate 650be026 (2026-09-13)

- Exact candidate verified in `/home/nhanjs/projects/core3`; QA changed no product files.
- `bun test ./test/events_attendee_edit.integration.test.ts --timeout 20000`: 2 passed, 0 failed, 10 assertions. Covers editable form/API ownership, persisted update and reload-source data, blank-name 422 `EVENT_ATTENDEE_NAME_REQUIRED`, missing-record 404 `EVENT_ATTENDEE_NOT_FOUND`, and stale-write 409 `STALE_RECORD`.
- `bun test ./test/events*.integration.test.ts --timeout 20000`: 84 passed, 0 failed, 618 assertions across 30 files.
- `bun test ./test --timeout 20000` was started but stopped while still running; no final result or pass count is claimed. The hanging test process was terminated by QA.
- `bun run audit`: passed — 659 pages, 668 routes, 1,139 datasources; all discovered pages use supported shared components and routes.
- `git diff 650be026^ 650be026 --check`: passed.
- `bun run lint` from `sdk/bun`: failed on two non-Events errors in `sample/test/website_public.integration.test.ts` lines 31 and 33 (`no-unsafe-optional-chaining`); no Events lint error was reported.
- No candidate-specific authenticated desktop/mobile browser captures or paired Odoo captures were generated in this bounded run. Existing 2026-09-12 artifacts belong to prior candidate `f7a38e86` and are not reattributed.
- Decision: attendee edit and Events automated regression pass; QA remains not signed off due to incomplete full regression, red repository lint, and absent candidate-specific browser/Odoo evidence.

## Current regression evidence

- Prior repository suite result predates candidate `650be026`; the candidate-specific rerun was interrupted and is recorded above.
- Focused Events suite: `bun test ./test/events*.integration.test.ts --timeout 20000` — 82 passed, 0 failed, 608 assertions across 29 files.
- Authenticated Core3 browser create flow: admin opened `/events`, created `QA Browser Event 20260912` with required name/start time, received a successful mutation, and saw the persisted row after refresh; no page errors, failed requests, or HTTP errors.
- Artifact: `/tmp/core3-odoo-parity/events-create-desktop-20260912.png`.
- Authenticated Events route matrix: 14 registered menu routes at desktop and mobile — 28/28 passed with no blank/redirect result, page error, failed request, HTTP error, or horizontal overflow; raw result: `/tmp/core3-odoo-parity/events-matrix-20260912.json`.
- Permission boundary: `fleet@tms.local` reached `/events` but received `Requires permission: events.read` with the expected 403 page-data response; no browser errors.
- Authenticated lifecycle mutation probe: created `QA Lifecycle Event 20260912`, then advanced Draft → Published → In Progress → Completed with 200 responses and row versions 1 → 2 → 3 → 4.
- Authenticated registration probe: created and published a capacity-1 event, registered the first attendee successfully (200, `Registered`), and the second attendee was rejected with the declared 409 capacity guard; the registration response included a persisted registration id and timestamp.
- Authenticated edit probe: updated an event name/start time and explicitly cleared nullable `end_at` successfully (200, row version 1 → 2); replaying the old version was rejected with 409 `STALE_RECORD`.
- Authenticated delete probe: deleted an eligible Draft event successfully (200), while deletion of a Published event was rejected with the declared 409 `EVENT_NOT_DRAFT` guard.
- The first browser attempt exposed an empty optional `end_at` timestamp defect; the form contract was corrected by declaring both event date fields as `datetime`, preserving Core3's text-based ISO date/time input convention.
- Authenticated route matrix and paired Odoo comparison remain pending for full module sign-off.
- Fresh module-scoped rerun on port 4025 passed the registered-menu matrix 28/28 (14 routes × desktop/mobile) with no page errors, failed requests, HTTP errors, or horizontal overflow; raw result: `/tmp/events-matrix-fresh.json`.
- Current module-scoped rerun on port 4033 checked all 33 registered Events
  routes at desktop/mobile: 66/66 passed with no page errors, failed requests,
  HTTP errors, redirect/blank states, or horizontal overflow.
- The detailed per-module plan is approved at
  `qa/test-plans/events.md`; paired Odoo and full browser interaction gates
  remain separate from this route smoke.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| EVENTS-FUNC-001 | Focused functional/contract suite for event lifecycle, reports, CRUD, and guards | 82 tests, 608 assertions; `bun test ./test/events*.integration.test.ts --timeout 20000` | pass |
| EVENTS-FUNC-002 | Authenticated create and persistence smoke | `/events`; created `QA Browser Event 20260912`; persisted in 1-11/11 list; screenshot artifact recorded | pass |
| EVENTS-BROWSER-002 | Authenticated registered-menu route matrix | Fresh module-scoped process: 14 routes × desktop/mobile = 28/28; raw JSON result recorded | pass |
| EVENTS-PERM-001 | Read permission boundary | Fleet user denied `events.read` with expected 403/permission page | pass |
| EVENTS-WORKFLOW-001 | Event lifecycle transitions with optimistic row versions | Authenticated sequence completed Draft → Published → In Progress → Completed; each response 200 and incremented `row_version` | pass |
| EVENTS-WORKFLOW-002 | Registration persistence and capacity guard | Capacity-1 event accepted first registration (200) and rejected second registration (409) | pass |
| EVENTS-WORKFLOW-003 | Attendee confirmation/cancellation lifecycle | `bun test ./test/events_registration_confirmation.integration.test.ts` — 4 tests; persisted `Unconfirmed → Registered → Attended`, cancellation, stale replay, missing-record, and deterministic migration assertions pass | pass |
| EVENTS-FUNC-003 | Event edit, nullable datetime clear, and stale-row guard | Update returned 200 with row version increment; stale update returned 409 `STALE_RECORD` | pass |
| EVENTS-FUNC-004 | Event delete and lifecycle safety guard | Eligible Draft delete returned 200; Published delete returned 409 `EVENT_NOT_DRAFT` | pass |
| EVENTS-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Candidate attendee edit contracts pass; candidate-specific authenticated browser CRUD and paired Odoo evidence remain unavailable; full repository rerun was interrupted | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| EVENTS-BROWSER-001 | Optional empty `end_at` submitted as an invalid timestamp during create | Current change; event `start_at`/`end_at` fields declared `datetime` | Retested authenticated create successfully; no errors/failed requests | fixed |

## Sign-off

- Functional: partial pass (focused suite and create flow pass)
- Permissions: partial pass (route denial verified; mutation-specific boundaries remain)
- Persistence/data integrity: partial pass (event and registration persistence verified; broader CRUD reload coverage remains)
- Desktop/mobile visual parity: current route smoke pass; paired comparison pending
- Tester decision: not signed off

## Coordinator reconciliation — repair candidate `0a099a86`

- Candidate `0a099a864234867deb4680a17d6f0b869dbc1b1e` is self-contained to
  the Events page action and two focused regression assertions. The API-owned
  attendee create action remains `events.registrations.create` with
  `operation: create`; the event-list registration action is now the distinct
  `events.registrations.register` with `operation: register`.
- Focused retest: `bun test test/events_attendee_create.integration.test.ts
  test/events_states.integration.test.ts --timeout 20000` — **5 tests / 63
  assertions passed**. Candidate evidence also records Events regression
  **86 tests / 631 assertions**, audit **659 pages / 668 routes / 1,141
  datasources**, diff-check, and a clean owner worktree.
- Product/test files were integrated; the candidate's stale duplicate ledger
  text was not imported. Browser/permission/Odoo and unrelated Website lint
  blockers remain; this is not full Events sign-off.
## 2026-09-13 coordinator dispatch — bounded attendee-create wave

- Existing owner `agent/events-next-wave-20260913` is assigned on
  `/home/nhanjs/projects/core3-worktrees/events-next-wave`, based at `715568b9`.
  Development event: `DEV-EVENTS-WAVE-20260913-R2`; QA event:
  `QA-EVENTS-WAVE-20260913-R2`; handoff commit: `b407a867`.
- Scope is Event attendee creation with event/ticket relation, identity and
  count persistence, required/capacity/duplicate/scope/stale guards, and
  atomic no-partial-write focused tests. Candidate pending; existing ledgers
  and aggregate progress are preserved.

## Coordinator reconciliation — candidate `715568b9` (2026-09-13)

- Re-ran the bounded candidate checks from the Events owner worktree:
  `bun test ./test/events_attendee_create.integration.test.ts --timeout 20000`
  passed **2 tests / 10 assertions**; the Events corpus passed **86 tests / 628
  assertions** across 31 files.
- The candidate's self-contained Events product content is already represented
  in the active checkout; attempting to cherry-pick `715568b9` produced an
  empty cherry-pick, so no duplicate product commit was created.
- QA disposition: **bounded conditional pass** for attendee creation. Candidate
  browser CRUD/reload, mutation actor matrix, and paired authenticated Odoo
  comparison remain open; unrelated Website ESLint errors remain recorded.
  Events is not fully signed off.
