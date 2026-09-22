# Events detailed QA test plan

Module: events  
QA owner: events-qa  
Developer owner: events module owner  
Reference addon/version: event, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-22

## Latest bounded cases — event tag category tag_ids editor (2026-09-22)

Stable feature ID: EVENTS-TAGS-001.

| Case ID | Class | Route/action | Expected result and evidence | Status |
| --- | --- | --- | --- | --- |
| EVENTS-FUNC-016 | functional/data | Events > Configuration > Event Tags Categories > category detail | Durable tag rows render through the page/API pair; add, edit, delete, category summary projection, replay, and restart persist correctly | pass: events_tag_lines.integration.test.ts |
| EVENTS-WF-011 | workflow/security | Tag child mutations | events.write, required-name, color range, duplicate, missing, parent/line stale guards reject invalid writes without partial persistence | pass: events_tag_lines.integration.test.ts |
| EVENTS-UI-009 | visual/responsive | Event tag category form | Authenticated Odoo desktop/mobile source captures and paired Core3 captures at 1440x900 and 390x844 | blocked: BrowserSkill tab already borrowed; no visual claim |

## Latest bounded cases — event chatter (2026-09-22)

| Case ID | Class | Route/action | Expected result and evidence | Status |
| --- | --- | --- | --- | --- |
| EVENTS-FUNC-015 | functional/data | Event detail Send message and Log note | Durable message/note rows appear in the unified event chatter timeline and parent version advances | pass: `events_chatter.integration.test.ts` |
| EVENTS-WF-010 | workflow/security | Event chatter actor/state/concurrency/restart | Anonymous, blank, cancelled, stale, and replayed writes are rejected without partial writes | pass: `events_chatter.integration.test.ts` |
| EVENTS-UI-008 | visual/responsive | Event detail chatter composer | Authenticated Odoo desktop/mobile captures; Core3 browser interaction is explicitly unclaimed after requested session closure | conditional: Odoo captures committed; Core3 capture blocker recorded |

This checklist follows the current 33-route inventory and the bounded batches
in [`events.md`](../../events.md). Executed evidence remains in
[`../events.md`](../events.md).

## Latest bounded cases — event activities (2026-09-22)

| Case ID | Class | Route/action | Expected result and evidence | Status |
| --- | --- | --- | --- | --- |
| EVENTS-FUNC-014 | functional | Event detail activity scheduling/completion | Schedule an activity with type, summary, due date, and assignee; Mark Done appends a durable completed activity | pass: `events_activity.integration.test.ts` and authenticated module-browser flow |
| EVENTS-WF-009 | workflow | Activity actor/state/concurrency/restart | Missing actor, invalid type, cancelled event, stale event/activity versions, and replay are guarded without partial writes | pass: `events_activity.integration.test.ts` |
| EVENTS-UI-007 | visual/responsive | Event detail activity dialog/chatter | Odoo desktop/mobile captures; Core3 desktop workflow and 390px mobile DOM check have no overflow | conditional: Core3 mobile screenshot blocked by bsk capture-size mismatch |

## Coverage inventory

| Menu/action family | Core3 routes | Required state coverage |
| --- | --- | --- |
| Events and dashboard | `/events`, `/events/event-detail` | List/kanban/calendar/form, create/edit, lifecycle and stats |
| Reporting | `/events/events-analysis`, `/events/attendees-analysis`, `/events/answer-breakdown`, `/events/revenues` | Graph/pivot/list, filters, empty/error and event scope |
| Attendees/registration | `/events/attendees`, `/events/attendees/detail`, `/events/attendee-list`, `/events/registration-desk`, `/events/registration-statistics` | List/form/kanban, register, confirm, capacity, statistics and badge/email actions |
| Event communications | `/events/mail-schedulers`, `/events/mail-schedulers/detail`, `/events/templates`, `/events/templates/detail` | List/form, schedule, send, template CRUD and audit behavior |
| Event configuration | `/events/questions`, `/events/questions/detail`, `/events/slots`, `/events/slots/detail`, `/events/stages`, `/events/stages/detail`, `/events/tags`, `/events/tags/detail`, `/events/settings` | CRUD, validation, ordering, manager settings and linked records |
| Sales/lead/stat actions | `/events/sales-orders`, `/events/leads`, `/events/lead-generation`, `/events/lead-generation/detail` | Event-scoped read actions, lead generation and no-CRUD boundaries |
| Tickets/badges | `/events/tickets/detail`, `/events/full-page-ticket`, `/events/attendees/full-page-ticket`, `/events/badge-example`, `/events/event/attendee/badge` | Render, download/print contract, attendee/event scope and responsive states |

Actors: Administrator/Event Manager, Event User, ordinary Fleet user,
unauthenticated user, and Accounting/Sales writers for declared cross-module
actions. Stable fixtures include `event-demo-001`, seeded events/tickets,
`registration-demo-unconfirmed`, fixed questions/answers/slots/stages/tags,
and the linked confirmed order.

## Functional and data cases

| Case ID | Class | Route/action | Expected result and persistence assertion | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| EVENTS-FUNC-013 | functional | Event detail Notes & Documents | Edit badge dimension, ticket instructions, and internal note; reload retains values | `events_notes_documents.integration.test.ts` | pass |
| EVENTS-DATA-013 | data | Badge background attachment | Upload image, reopen database, download exact bytes, remove metadata | `events_notes_documents.integration.test.ts` | pass |
| EVENTS-FUNC-001 | functional | Events list/detail | Search/filter/sort/paginate/open and create/edit event; reload retains values | events integration suite/browser create | pass |
| EVENTS-FUNC-002 | functional | Event lifecycle | Draft → Published → In Progress → Completed; invalid/stale transitions are guarded | authenticated lifecycle probe | pass |
| EVENTS-FUNC-003 | functional | Tickets and attendees | Create/update ticket and attendee; required fields and event scope persist | attendee edit focused test; ticket contracts | partial: attendee update passes; create remains open |
| EVENTS-FUNC-004 | functional | Registration desk/statistics | Register, confirm, cancel and report registrations by event | registration/statistics tests | pass |
| EVENTS-FUNC-005 | functional | Questions/answers | CRUD questions, answer choices and attendee answers; ordering and required guards persist | question/answer/stat tests | partial: question/choice CRUD and question-scoped attendee-answer report pass; attendee answer-line editing remains open |
| EVENTS-FUNC-006 | functional | Slots/stages/tags | CRUD and validation with duplicate, missing and stale guards | slots/stages/tags tests | planned |
| EVENTS-FUNC-007 | functional | Templates/mail schedulers | CRUD template/schedule, send or queue action, and inspect deterministic audit state | template/scheduler tests | planned |
| EVENTS-FUNC-008 | functional | Settings | Update event settings and reload; manager-only fields are protected | settings tests | planned |
| EVENTS-FUNC-009 | functional | Leads/revenues/analysis | Event-scoped graph/pivot/list/report and lead/revenue actions return real service rows | focused report tests | planned |
| EVENTS-FUNC-010 | functional | Badge/ticket/email | Render full-page ticket, badge and email composer with deterministic attendee/event data | badge/ticket/email tests and captures | pass |
| EVENTS-FUNC-011 | data | Seeds/migrations | Reapply migrations on clean/existing dev DB | Stable IDs, dates, counts and no duplicate rows | focused suites | pass |
| EVENTS-FUNC-012 | data | Empty/not-found/error | Every list/detail/report/action has explicit empty, missing and transport-error behavior | focused suites | planned |

## Workflow and integration cases

| Case ID | Class | Workflow/integration | Expected transition/side effect | Failure/recovery assertion | Status |
| --- | --- | --- | --- | --- | --- |
| EVENTS-WF-008 | workflow | Notes/document optimistic concurrency | Stale event row rejects edit/upload/remove without a partial write | `events_notes_documents.integration.test.ts` | pass |
| EVENTS-WF-001 | workflow | Event lifecycle | State, published/completed metadata and row version update atomically | Forbidden transition/stale version returns 409 without partial write | pass |
| EVENTS-WF-002 | workflow | Registration capacity | First attendee registers; capacity-1 second attempt is rejected | 409 capacity guard; no second registration | pass |
| EVENTS-WF-003 | workflow | Attendee confirmation/cancellation | Registration state and event counts update; cancellation/reopen paths are guarded | Missing/cancelled/stale attendee returns stable error | pass: focused registration confirmation test verifies Unconfirmed → Registered → Attended, cancellation, stale replay, and missing-record guards |
| EVENTS-WF-004 | integration | Send attendee email | Composer submits registration identity and records sent audit row | Blank/cancelled recipient rejected; SMTP delivery remains explicit residual | pass |
| EVENTS-WF-005 | integration | Badge/ticket generation | Stable event/attendee content and attachment/report contract render | Missing record and retry produce no duplicate audit side effect | planned |
| EVENTS-WF-006 | integration | Linked Sales/CRM actions | Event-scoped confirmed orders/leads are read or created through declared service contract | Cross-module failure is visible and leaves source event unchanged | planned |
| EVENTS-WF-007 | integration | Durable mail/scheduled work | Any timer, retry, callback or third-party side effect is routed through Temporal contract | Worker restart/replay, retry, timeout and compensation tested before activation | planned |

## Permission and security cases

| Case ID | Actor/scope | Route/action | Expected result | Status |
| --- | --- | --- | --- | --- |
| EVENTS-PERM-007 | Event User | Notes/document read/write | Read is `events.read`; edit/upload/remove are `events.write`; direct action declarations remain permission-filtered | pass |
| EVENTS-SEC-003 | Event User | Rich text fields and image upload | Reject script tags, oversized/non-image files, and empty filenames | `events_notes_documents.integration.test.ts` | pass |
| EVENTS-PERM-001 | Administrator/Event Manager | All manager/settings/workflow actions | Allowed and persisted | planned |
| EVENTS-PERM-002 | Event User | Ordinary event/attendee CRUD | `events.read/write` actions allowed within scope | attendee edit action declares `events.write`; authenticated actor matrix remains open | partial |
| EVENTS-PERM-003 | Fleet ordinary user | Event route and direct API | 403 for missing `events.read/write`; no mutation | pass for read boundary; write probe planned |
| EVENTS-PERM-004 | Cross-company user | Event/detail/registration/stat actions | No cross-company data leakage or mutation | planned |
| EVENTS-PERM-005 | Unauthenticated/expired | All 33 routes and APIs | Redirect/401/403 without data leakage | planned |
| EVENTS-PERM-006 | Stale/missing identity | Any mutation | 409/404/422 with unchanged database state | pass in focused suites |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| EVENTS-UI-006 | Notes & Documents form | Odoo desktop 1916x833 and mobile 390x844 | Badge dimension, upload area, instructions, and note remain visible in authenticated reference | Odoo captures in feature evidence | pass |
| EVENTS-UI-001 | Event/list/detail normal | 1440x900 and 390x844 | Odoo menu order, tabs, fields, cards, actions, text, geometry and overflow | partial |
| EVENTS-UI-002 | Registration/attendee forms and modal | both | Composer, badge/ticket, registration desk, mobile sheet/footer and focus behavior | partial |
| EVENTS-UI-003 | Reports/stat actions | both | Graph/pivot/list controls, event scope, labels, empty/loading/error states | partial |
| EVENTS-UI-004 | Configuration and templates | both | Forms, dialogs, actions, permissions, ordering and responsive layout | planned |
| EVENTS-UI-005 | Full current route regression | all 33 routes | 66 authenticated desktop/mobile checks, no page/request errors, HTTP failures, redirect/blank states or overflow | pass |

## Exit criteria

- Every current Events route/action family has a planned case.
- Full sign-off requires database persistence, workflow, permission, browser,
  and paired Odoo evidence; the 66-route smoke is not visual parity sign-off.
