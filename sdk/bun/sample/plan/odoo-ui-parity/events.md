# Events UI parity

Status: in-progress

This is an implementation gate for the Odoo 19 Community `event` addon. It is
plan-only: do not add or modify product code, migrations, fixtures, assets, or
tests in this worktree. `ready` is reserved for the point at which all six
register gates below have evidence, including installed-addon desktop/mobile
reference captures.

## Reference gate and live limitation

- Odoo source: `/home/nhanjs/projects/odoo`, revision `65975996` (`19.0`).
- Addon manifest: `/home/nhanjs/projects/odoo/addons/event/__manifest__.py`.
- Manifest identity: `Events Organization`, version `1.9`, category
  `Marketing/Events`, license `LGPL-3`, installable, and dependencies
  `barcodes`, `base_setup`, `mail`, `phone_validation`, `portal`, and `utm`.
- Official data includes stages, mail templates, event data, cron/tour,
  settings/report/template views, and partner/question data. Official demo
  files are `data/res_users_demo.xml`, `data/res_partner_demo.xml`,
  `data/event_demo_misc.xml`, `data/event_demo.xml`, and
  `data/event_registration_demo.xml`.
- The source demo uses relative `DateTime.today()`/`DateTime.now()` values and
  must be translated to a fixed Core3 seed date; source demo availability does
  not imply that the local reference database has demo records.
- The former Odoo app container and its `core3_demo` reference were stopped for
  this parity run; they are not used as installed-Events evidence.
- The current disposable installed reference is Compose project
  `/home/nhanjs/projects/odoo-core3-personal`, at `http://localhost:8069`,
  database `core3_personal`, created on 2026-09-10 with official demo data.
  Its local reference login is `codex@core3.local` / `Core3Odoo2026!`.
  The account was authenticated successfully and has administrator access.

## Truthful live screenshots

The following are authenticated fallback captures made with headless Chrome,
after login, with no failed requests observed. They are useful only to prove
the uninstalled limitation and must never be used as the installed Events
visual reference.

| Surface | Viewport | Screenshot |
| --- | --- | --- |
| Authenticated Discuss fallback; no Events app | 1440x900 | `/tmp/odoo-events-uninstalled-desktop.png` |
| Authenticated Discuss fallback; no Events app | 390x844, touch/mobile emulation | `/tmp/odoo-events-uninstalled-mobile.png` |

Installed-reference dashboard captures exist at
`/tmp/odoo-events-{desktop,mobile}-dashboard.png`, with no failed requests.
The current authenticated menu audit resolved Events to action 292, global
Event registrations to action 286, Reporting/Attendees to action 287,
Registration statistics to action 288, Registration Desk to action 285, Event
Templates to action 290, Event Stages to action 293, Settings to action 302,
Event Tags Categories to action 303, Event Questions to action 304, and Answer
Breakdown to action 305. The installed Attendees list pair is
`/tmp/odoo-events-attendees-desktop.png` and
`/tmp/odoo-events-attendees-mobile-final.png`; the first attendee form pair is
`/tmp/odoo-events-attendee-detail-desktop.png` and
`/tmp/odoo-events-attendee-detail-mobile-final.png`. These routes had empty
failed-request lists. Remaining action captures are retained under `/tmp` and
must be refreshed when their corresponding Core3 surfaces are implemented.
Each capture must record the
database, user/groups, demo flag, source revision, exact action route, viewport,
and failed-request list; navigate through the authenticated menu/action before
capturing and assert the expected title and records.

## Source menu, action, route, and view inventory

The source-defined menu tree is:

- `Events` (`event_main_menu`, Registration Desk group)
  - `Events` (`menu_event_event`) -> `action_event_view`
  - `Registration Desk` (`menu_event_registration_desk`) -> client action
    `event_barcode_action_main_view`
  - `Reporting` (`menu_reporting_events`, Event User group)
    - `Attendees` (`menu_action_registration`) -> `action_registration`
  - `Configuration` (`menu_event_configuration`, Event User group)
    - `Event Templates` (`menu_event_type`) -> `action_event_type`
    - `Event Stages` (`event_stage_menu`) -> `event_stage_action`
    - `Event Tags Categories` (`menu_event_category`) ->
      `event_tag_category_action_tree`
    - `Event Questions` (`event_question_menu`) -> `event_question_action`
    - `Settings` (`menu_event_global_settings`, `base.group_system`) ->
      `action_event_configuration`
    - `Mail Schedulers` (`menu_event_mail_schedulers`, `base.group_no_one`) ->
      `action_event_mail`; technical-only but must remain documented and hidden
      from ordinary users.

Source actions and their exact models/view modes are:

| Source action | Model/client | Source path or alias | View modes and contract |
| --- | --- | --- | --- |
| `action_event_view` | `event.event` | `/odoo/events` (`path=events`) | `kanban,calendar,list,form,pivot,graph,activity`; event search view; create-event help |
| `event_barcode_action_main_view` | client `event.event_barcode_scan_view` | `/odoo/registration-desk` (`path=registration-desk`, fullscreen) | barcode scan/registration desk client action |
| `action_registration` | `event.registration` | generated action route; planned `/odoo/attendees` | `graph,pivot,kanban,list,form`; last-month/taken/status/group-by-day defaults |
| `act_event_registration_from_event` | `event.registration` | `/odoo/attendees` (`path=attendees`) | `list,kanban,form,calendar,graph`; `event_id=active_id`, taken default |
| `event_registration_action_kanban` | `event.registration` | generated event-scoped alias | `kanban,list,form`; registration-desk context |
| `event_registration_action` | `event.registration` | generated registration-desk alias | `kanban,list,form`; ongoing default |
| `event_registration_action_tree` | `event.registration` | generated alias | `list,kanban,form,calendar,graph` |
| `event_registration_action_stats_from_event` | `event.registration` | generated event-scoped alias | `graph,pivot,kanban,list,form`; event domain and date grouping |
| `action_event_type` | `event.type` | generated alias; planned `/odoo/event-templates` | source default list/form/search views; template help |
| `event_stage_action` | `event.stage` | generated alias; planned `/odoo/event-stages` | `list,form`; stage help |
| `event_tag_category_action_tree` | `event.tag.category` | generated alias; planned `/odoo/event-tag-categories` | `list,form`; category help |
| `event_question_action` | `event.question` | generated alias; planned `/odoo/event-questions` | `list,form`; question search and no-question help |
| `action_event_mail` | `event.mail` | generated technical alias | source default list/form, create disabled; scheduler empty help |
| `event_slot_action_from_event` | `event.slot` | embedded event action; planned `/odoo/events/<id>/slots` | `calendar,list,form`; `mobile_view_mode=list`, event domain/default |
| `action_event_registration_report` | `event.registration.answer` | embedded/report alias; planned `/odoo/event-answer-breakdown` | `list,graph,pivot`; answer empty help |
| `action_event_configuration` | `res.config.settings` | generated alias; planned `/odoo/event-settings` | `form`; module context `event`, system-only |

Also include source-defined event ticket list/form/kanban embedded in event type
and event forms, question-answer list additions, and the inherited partner
event fields. These are record/embedded surfaces, not extra top-level menus.
The source event form has the stage statusbar, Registration Desk button,
Registration and Attendees stat buttons, archived ribbon, daterange/timezone,
multiple slots, template, tags, organizer/user/company/address or online URL,
tickets, questions, automated mail, seats/capacity, website publication,
description, notes, chatter, activities, followers, and attachments.

## Source contracts and behavior inventory

Models requiring user-visible contracts are `event.event`, `event.type`,
`event.event.ticket`, `event.registration`, `event.registration.answer`,
`event.slot`, `event.stage`, `event.tag.category`, `event.tag`, `event.question`,
`event.question.answer`, `event.mail`, `event.mail.registration`, and
`event.mail.slot`, plus the `res.partner` event extension and
`res.config.settings`. Preserve many2one/many2many relations and computed
seat/sale/schedule states rather than flattening them into display strings.

Cover these states and controls:

- Events: New/Booked/Announced/Ended stages, draft/published/ongoing/done and
  archived states, kanban/list/calendar/activity/pivot/graph, search by event,
  filters/grouping, optional columns, favorites, pagination, create/edit,
  duplicate/archive/delete, stage changes, publish/website URL, date/timezone,
  company scope, organizer/user/address, tags, capacity and seat counters.
- Event detail: tickets with price/availability/registration windows and seat
  limits; reusable questions (name/email/phone/simple choice), answers and
  mandatory/once-per-order flags; slots with date/start/end and sold-out state;
  attendee/stat buttons; registration desk; mail schedule and templates;
  chatter/activity/followers/attachments; validation and unsaved/conflict
  states.
- Attendees: registration list, kanban, form, calendar, graph, pivot; event,
  ticket, partner/name/email/phone/company, state, sale/order, seat/slot,
  answers, check-in/attendance, badge/ticket actions, search facets, date
  grouping and event-scoped empty state.
- Reporting: registration graph/pivot and Answer Breakdown list/graph/pivot;
  deterministic measures, grouping, no-data and denied states.
- Configuration: template list/form with default tickets/questions/mails;
  stage sequence/fold/end-stage; tag categories and tags/colors; question
  list/form/answer editing; scheduler read-only list/form; event settings
  controls and save/validation feedback.
- Registration Desk: fullscreen barcode scan, event initialization, attendee
  lookup, valid/invalid/already-used badge, manual registration fallback,
  capacity and permission errors. This requires a generic fullscreen scanner
  contract; do not silently omit it because it is client-action based.

Source HTTP/controller contracts are separate from web-client action paths:
public ICS `/event/<event>/ics`; public ticket PDF/HTML/badge
`/event/<int:event_id>/my_tickets` with registration IDs and access hash; and
authenticated JSON-RPC `/event/init_barcode_interface`. Portal/public event
website pages, registration flows, ticket links, and reports must be recorded
as a separately permissioned surface if included; do not expose an unscoped
Core3 endpoint.

## Existing Core3 surface and gap

`services/events` currently contains `manifest.yaml`, `storage.yaml`,
`permissions.yaml`, styles, two migrations, and four pages:

- `/events` (`events`): one Odoo ListView with status filter and simplified
  Draft/Published/In Progress/Completed/Cancelled workflow;
- `/events-analysis` (`events-analysis`): four totals and a status bar chart;
- `/event-detail` (`event-detail`): simplified event form plus attendee grid;
- `event-workflow`: transition definitions using the generic
  `order_transition` handler.

The schema only has `events` and `event_registrations`; the demo migration uses
`CURRENT_TIMESTAMP + INTERVAL 14 DAY`; page YAML owns datasource SQL; there is
no `services/events/api/` directory; and the manifest exposes only Events and
Event Analysis. Missing are the full model graph, menus/actions, all view modes,
registration desk, tickets/questions/slots/stages/tags/templates/mails,
reports/settings, portal/ICS/tickets, activities/chatter/attachments,
company/user visibility, Odoo stage semantics, and deterministic demo data.
The existing `order_transition` handler must not be treated as an adequate
Events API boundary without a verified generic workflow contract.

## Required shared primitives

Reuse and verify generic contracts before adding any Events-specific renderer:

- Odoo `ListView`, responsive card/kanban, `FormView`/`OdooFormView`,
  `CalendarView`, `ActivityView`, `PivotView`, `GraphView`/`Chart`, search,
  filter/group-by, saved views, optional columns, favorites, pager, and bulk
  actions;
- statusbar/status chip, stage drag/change, stat buttons, daterange/timezone,
  many2one/many2many tag and avatar fields, notebook/tabs, embedded action
  panels, seat/capacity counters, color selection, answer editor, ticket/slot
  rows, attachment/chatter/follower/activity panels, and report/download result;
- permission-aware server forms/actions, row-version conflicts, validation
  dialogs, stable 401/403/404/409/422 errors, empty/loading/error states,
  fullscreen barcode/scanner, responsive action menus, and content-only mobile
  scrolling;
- `SettingsView` using the established full-width Odoo settings layout.

If a primitive is absent, record its generic API and test it in isolation before
creating an Events page-specific replacement.

## Deterministic Core3 datasource/API/mock contract

Frontend pages must become layout-only. Add convention-discovered,
service-owned `services/events/api/*.yaml` fragments keyed by `page.id`; do not
add API fragments to the frontend `pages:` manifest. Use declared service
operations for contacts/users/companies, mail/activity, portal, reports, and
attachments. Every list, form, kanban, calendar, graph, pivot, report, settings,
scanner, and empty state must declare stable `mock_data` until its real query
exists. No page-local records, random IDs, `CURRENT_DATE`/`CURRENT_TIMESTAMP`,
browser fixtures, remote assets, or live Odoo calls.

Use seed date `2026-01-15`, stable IDs and ordering, idempotent migrations, and
include:

- events named after the official demo semantics: Design Fair Los Angeles,
  Great Reno Ballon Race, Conference for Architects, Live Music Festival,
  Business workshops, Hockey Tournament, OpenWood Collection Online Reveal,
  and An unpublished event;
- stages New, Booked, Announced, Ended; templates Exhibition, Training, Sport;
  tag categories Age/Activity/Type and tags 5-10, 10-14, 15-18, 18+, Culture,
  Music, Sport, Online, Conference;
- events across draft/published/ongoing/done/archived, limited/unlimited and
  sold-out/not-sold-out capacities, timezones, companies, organizers,
  attendees, tickets Free/Standard/VIP/General Admission, slots, questions,
  answer choices, activities, chatter, attachments, mail schedules and errors;
- attendee states including registered/confirmed/attended/cancelled,
  checked-in and ticket/badge access examples, duplicate/invalid/capacity
  failures, and answer-breakdown records;
- ordinary Registration Desk user, Event User, Event Administrator, system
  settings user, multi-company user, denied user, and public/portal scenarios;
- empty datasets for every collection/report/configuration page plus loading,
  server-error, missing-record, stale-row-version, and dependency-disabled
  responses.

Required operations include event/template/ticket/registration/slot/stage/tag/
question/answer/mail CRUD; publish/unpublish/archive/duplicate; register,
confirm, cancel, attend, check-in, badge/ticket generation; stage and seat
updates; settings save; report/export/ICS; barcode initialization; chatter,
activity, follower, attachment and portal actions. Guards must enforce event
capacity, sale windows, ticket/slot ownership, required fields, answer rules,
company scope, group permissions, immutable/used registrations, uniqueness,
row versions, and stable 401/403/404/409/422 responses.

## Implementation route map

Use explicit Core3 routes, preserving existing aliases:

| Core3 route | Odoo counterpart | Required surface |
| --- | --- | --- |
| `/events` | `/odoo/events` | event kanban/calendar/list/form/pivot/graph/activity |
| `/events/:id` | event form | full event detail, tickets, questions, slots, chatter and actions |
| `/events/attendees` | `/odoo/attendees` | attendee list/kanban/form/calendar/graph/pivot |
| `/events/attendees/:id` | registration form | attendee state, answers, check-in/ticket actions |
| `/events/registration-desk` | `/odoo/registration-desk` | fullscreen scanner/manual registration |
| `/events/analysis` (preserve `/events-analysis`) | registration statistics | graph/pivot/list/form analysis |
| `/events/answer-breakdown` | Answer Breakdown | list/graph/pivot |
| `/events/templates` | Event Templates | list/form |
| `/events/stages` | Event Stages | list/form |
| `/events/tags` | Event Tags Categories | category/tag list/form |
| `/events/questions` | Event Questions | list/form/answers |
| `/events/settings` | Settings | settings form |

Portal/public ICS, ticket, barcode JSON-RPC, website registration and reports
must have explicit route and permission decisions before implementation.

## Six register gates and status

1. Addon/version/demo contract: evidenced above from manifest and source demo
   files.
2. Complete visible menu/action/view inventory: source inventory is recorded;
   the disposable installed database currently confirms the Events dashboard
   menu and seeded event records; the remaining actions still need auditing.
3. Authenticated desktop/mobile Odoo route/screenshot evidence: dashboard pairs
   exist, while installed captures for the remaining actions are missing.
4. Deterministic datasource/mock-data contract: specified above; no API/mock
   implementation exists yet.
5. Shared primitives: required generic contracts are recorded; reuse/focused
   primitive evidence is missing.
6. Visual, fixture, permission, empty/error/mobile acceptance: specified below;
   Core3 implementation and authenticated browser evidence are missing.

The sub-plan is now `ready` for implementation: the addon/version and demo
contract are recorded, the source menu inventory is complete, and the installed
disposable reference has authenticated desktop/mobile captures for every
currently visible top-level action. Implementation acceptance remains open for
the complete detail/report surface and the Core3 browser checks below.

The first implementation batch adds Core3 routes for Attendees, Event Templates,
Event Stages, Event Tags Categories, Event Questions, Events Settings, and the
Registration Desk. Authenticated desktop/mobile checks against deterministic
fixtures show seeded records or settings, zero unexpected failed requests, and
no page-level horizontal overflow. Captures are temporary under
`/tmp/core3-events-{desktop,mobile}-*.png` and are not committed.

The Events list now opens the existing OdooFormView detail page on row double
click. Authenticated desktop/mobile checks opened `EVT/2026/0004`, asserted the
completed status, schedule, attendance fields, empty-registration state, and
no horizontal overflow; captures are `/tmp/core3-events-{desktop,mobile}-detail.png`.

The reporting batch adds `/events/attendees-analysis` with registration totals,
status chart, and event aggregates. Authenticated desktop/mobile checks show
three seeded registrations across two events, no unexpected failures, and no
horizontal overflow; captures are `/tmp/core3-events-{desktop,mobile}-attendees-analysis.png`.

The configuration batch adds service-owned New forms for Event Templates, Event
Stages, Event Tags Categories, and Event Questions. A mobile authenticated
creation check created `QA Workshop` in Event Templates and refreshed the list
with no failed requests or horizontal overflow; the form capture is
`/tmp/core3-events-mobile-template-form.png`.

Events Settings now exposes the Odoo-style Save/Discard toolbar and its
service-owned settings fields. Authenticated desktop/mobile checks confirmed
the Save action remains on `/events/settings` with no failed requests or page
overflow; the mobile evidence is `/tmp/core3-events-mobile-settings-save.png`.

Registration Desk now includes a manual attendee form alongside the scanner
guidance and registration counters. An authenticated mobile check submitted
`QA Attendee` for `EVT/2026/0002`, refreshed the counters from 3 to 4, and
returned no failed requests or page overflow; the evidence is
`/tmp/core3-events-mobile-registration-desk-created.png`.

The installed Odoo event card interaction opens `/odoo/events/8`; desktop and
mobile detail captures show the event status, registration/ticket sections,
registration actions, and chatter with no failed requests or mobile overflow.
They are stored at `/tmp/odoo-events-detail-{desktop,mobile}.png`. Core3’s
double-click path opens the equivalent `/events/event-detail?id=event-demo-004`
form and has matching desktop/mobile evidence under `/tmp/core3-events-*-detail.png`.

The event detail form now supports permissioned inline Edit/Save/Discard for
event fields. An authenticated mobile check updated `EVT/2026/0004` to
`Design Fair QA`, confirmed the persisted value after save, and found no failed
requests or horizontal overflow; evidence is
`/tmp/core3-events-mobile-detail-edited.png`.

The Attendees list now matches the Odoo row-menu workflow with permissioned
Mark attended and Cancel registration actions. An authenticated desktop check
marked `Taylor Kim` as Attended through the row menu, confirmed the refreshed
state, and found no unexpected failed requests; the desktop evidence is
`/tmp/core3-events-desktop-attendee-attended.png`. A 390x844 mobile check
rendered all three rows with no horizontal overflow or unexpected failures;
the evidence is `/tmp/core3-events-mobile-attendees.png`.

The attendee-detail batch adds the explicit `/events/attendees/detail?id=<id>`
route alias for the planned `/events/attendees/:id` registration form, with
service-owned detail and answer datasources, Attendee/Event Information groups,
question-answer rows, statusbar, and guarded Attended/Cancel Registration
actions. The deterministic fixture now includes the official event names and
registration contact fields. Authenticated desktop/mobile checks opened Edwin
Hansen for `OpenWood Collection Online Reveal` at 1440x900 and 390x844,
asserted both form sections, question state, action availability, zero failed
requests, and no horizontal overflow. Captures are
`/tmp/core3-events-desktop-attendee-detail.png` and
`/tmp/core3-events-mobile-attendee-detail.png`.

The shared form primitive now reevaluates `show_if` against the current record
on every redraw, and the expression sandbox exposes the documented `record`
alias alongside `row` and `state`. The authenticated lifecycle probe returned
HTTP 200 for both mutations and observed Attended/Cancel Registration visible
before transition, only cancellation visible after attendance, and both
hidden after cancellation. The focused Events suite passes 3 tests and 19
expectations; `bun run audit` passes with 293 pages, 297 routes, and 521
datasources. The existing Events mock-data audit remains an open plan gate for
the older query-backed pages.

The event-form batch adds Odoo-style Registration Desk and state-gated
Publish/Start/Complete/Cancel controls, plus service-owned Registration and
Attendees stat buttons backed by the event detail query. The shared YAML schema
now validates `OdooFormView.stat_buttons`. An authenticated isolated-worktree
check at 1440x900 and 390x844 found the expected counters and Draft controls,
zero failed requests, and no page-level overflow. Captures are
`/tmp/core3-events-{desktop,mobile}-event-form.png`; the isolated branch was
committed as `f95df20e` and integrated as `a5023d3d`.

## Acceptance

- Source and installed-reference inventories map every visible menu/action and
  embedded action to a Core3 route or an explicit scoped redirect; the technical
  Mail Schedulers menu remains hidden for ordinary users.
- Authenticated Playwright checks navigate through the Core3 Events menu and
  cover every route and view mode at 1440x900 and 390x844; mobile has no
  horizontal page overflow and retains usable action menus/forms.
- Odoo reference checks, when the addon is installed in a disposable database,
  navigate through the Odoo menu, assert title/records/no failed requests, and
  save the required `/tmp` desktop/mobile pairs. No image is committed.
- Lists cover search, filters, group-by, optional columns, favorites, bulk
  actions, pagination, row opening, and empty/loading/error/denied states.
- Forms cover create/edit/archive/delete, status/stage transitions, relations,
  tickets/questions/slots, attendee registration/check-in/cancel, chatter,
  activities, attachments, reports, scanner errors, settings save, and
  stale/conflict validation.
- Permission checks prove Registration Desk read/write limits, Event User and
  Administrator mutations, system-only settings, multi-company isolation,
  portal/public boundaries, and stable 401/403/404/409/422 responses.
- Datasource checks prove convention API discovery by `page.id`, deterministic
  seeded dates/IDs/order, idempotent fresh install and upgrade, no page-local
  data, and replacement-ready service queries.
- Focused YAML/schema/API validation, authenticated browser smoke and visual
  checks, `bun run audit` where applicable, and `git diff --check` pass. The
  implementation commit may contain YAML/TS/docs only; screenshots remain in
  `/tmp`.
