# Events UI parity

Status: in-progress

## Current batch: Event-scoped Registration statistics

The authenticated personal Odoo database `core3_personal` exposes the installed
event-scoped `Registration statistics` action as action `288` on
`event.registration`. It is reached from the `Registration` stat button on an
event form, for example `Events > Events > Design Fair Los Angeles >
Registration`, at `/odoo/events/1/action-288`. Odoo declares
`graph,pivot,kanban,list,form`, an active-event domain, default grouping by
registration date, and default `Registered`/taken filters. Desktop opens the
Graph view with one `Registered` bar for 3 registrations on `08 Sep 2026`;
mobile opens the date-grouped Kanban view with Ron Gibson, Samar Basra, and
Willie Burke.

This bounded slice adds `/events/registration-statistics`, joined to
`api/event-registration-statistics.yaml` through `page.id`, and changes the
existing event `Registration` stat button to pass `event_id` to that route.
The page owns the Graph, Pivot, Kanban, and List tabs; the API owns the
event-scoped registration query and explicit empty, missing-event, and
transport-error contracts. Migration
`20260911180000-021-event-registration-statistics.yaml` adds the fixed Design
Fair fixture with the three Odoo-matching attendees on `2026-09-08` and keeps
the event registration count deterministic and idempotent. Registration rows
open the existing attendee detail surface; no new CRUD or workflow control is
invented for this read/report action.

Authenticated Odoo evidence, captured in database `core3_personal` as
`codex@core3.local` at source revision `65975996`, is:

| Viewport | Route | Capture | SHA-256 |
| --- | --- | --- | --- |
| 1440x900 | `/odoo/events/1/action-288` | `/tmp/odoo-events-registration-statistics-desktop-1440x900.png` | `5a241452fba9d00d0b8e4a83563ccea2e9c2b9a9640fd57c90b9fe82b42acb25` |
| 390x844 | `/odoo/events/1/action-288?view_type=kanban` | `/tmp/odoo-events-registration-statistics-mobile-390x844.png` | `869b6d8a995efb4ad9cb23f36668a1951e63f037338769067fe75131930d8730` |

Authenticated Core3 evidence used `admin@tms.local` in the isolated worktree
runtime, route `/events/registration-statistics?event_id=event-demo-001`, and
the same seeded Design Fair fixture:

| Viewport | Capture | SHA-256 | Browser checks |
| --- | --- | --- | --- |
| 1440x900 | `/tmp/core3-events-registration-statistics-desktop-1440x900.png` | `ccd8bbeb8fd8594bb005064f5945cccbaf0ec871c52a4fb1a7bdcfb855f18cb4` | Graph active; 3 registered rows; no failed requests; no horizontal overflow |
| 390x844 | `/tmp/core3-events-registration-statistics-mobile-390x844.png` | `e45314cd3b6ba9bf61b401379b6a08877181eebf358dbfdcb12d6be04c37a402` | Date-grouped cards; 3 registered rows; no failed requests; no horizontal overflow |

The Core3 Graph now formats the x-axis as `08 Sep 2026`, matching Odoo. The
shared Core3 Fluent shell remains intentionally different from Odoo's purple
shell; the report geometry, visible labels, default status filter, chart
measure, date grouping, attendee names, ticket types, and responsive view
switch are the bounded parity contract. The Odoo browser pass emitted only
expected navigation-aborted asset requests during login/context replacement;
no application/data request failed and no HTTP error response was observed.

Focused validation is 3 registration-statistics tests and 18 assertions plus
the existing Events parity test (6 tests, 43 assertions). The shared UI audit
passes with 447 pages, 454 routes, and 779 datasources; `git diff --check` is
clean. Screenshots remain outside Git.

## Current batch: Event Mail Schedulers

The next uncovered visible Events action in the live personal Odoo database is
`Events > Configuration > Mail Schedulers`. The installed Odoo 19 source
revision is `65975996`; `event.menu_event_mail_schedulers` is restricted to
the `Technical Features` group (`base.group_no_one`) and opens
`event.action_event_mail` as `/odoo/action-282`. Its model is `event.mail`,
its exact action name is `Events Mail Schedulers`, its view order is
`list,form`, and its action context is `{'create': False}`. The list view is
`event.mail.list` (view 897) and shows `Event`, `Template`, `Schedule Date`,
`# Sent`, and the unlabeled communication-status icon. Its empty help is
`Nothing Scheduled yet!` followed by `Under this technical menu you will find
all scheduled communication related to your events.`

The authenticated `core3_personal` reference contains 21 schedulers across
the official demo events. The first record is the `Event: Registration
Confirmation` scheduler for `Design Fair Los Angeles`; its form is titled
`Event Mail Scheduler` and exposes `Event`, `Template`, `Global communication
Status`, `Interval`, `Trigger`, and `Schedule Date`, with `Mail` as the
notification type and `After each registration` as the trigger. The form's
technical `Registration Mails` notebook is source-defined but hidden unless
the technical group is granted in the current user context.

This bounded slice adds `/events/mail-schedulers` and
`/events/mail-schedulers/detail`, joined by `page.id`. The page YAML owns the
Odoo list/form presentation and navigation; `api/event-mail-schedulers.yaml`
owns the list/detail datasources. Migration
`20260911170000-020-event-mail-schedulers.yaml` seeds 21 fixed schedulers and
three registration-mail rows using `2026-01-15`-anchored timestamps. The
action is intentionally read-only: create is disabled in Odoo and computed
mail state/schedule fields expose no edit, delete, or workflow control, so no
Core3 CRUD mutation is declared. `events.settings` maps to the existing
system-only permission boundary for the technical Odoo menu; empty, missing,
transport-error, and forbidden contracts are explicit.

Reference evidence captured through the authenticated Odoo menu/action at
1440x900 and 390x844 is `/tmp/odoo-events-mail-schedulers-list-desktop-final.png`,
`/tmp/odoo-events-mail-schedulers-list-mobile-final.png`,
`/tmp/odoo-events-mail-scheduler-detail-desktop-final.png`, and
`/tmp/odoo-events-mail-scheduler-detail-mobile-final.png`. Both Odoo browser
passes reached `/odoo/action-282` and `/odoo/action-282/3` with no failed
application requests or HTTP errors. Authenticated Core3 evidence is
`/tmp/core3-events-mail-schedulers-list-desktop-final.png`,
`/tmp/core3-events-mail-schedulers-list-mobile-final.png`,
`/tmp/core3-events-mail-schedulers-search-desktop-final.png`,
`/tmp/core3-events-mail-schedulers-search-mobile-final.png`,
`/tmp/core3-events-mail-schedulers-empty-desktop-final.png`,
`/tmp/core3-events-mail-schedulers-empty-mobile-final.png`,
`/tmp/core3-events-mail-scheduler-detail-desktop-final.png`, and
`/tmp/core3-events-mail-scheduler-detail-mobile-final.png`. The desktop
Core3 pass navigated through `Events > Configuration > Mail Schedulers`; the
responsive menu is hidden at 390px, so the mobile pass opened the same
authenticated route directly. Core3 returned 21 rows, `OpenWood` returned 3,
the no-result state rendered the exact Odoo help copy, and the Design Fair
detail rendered all six fields. Both Core3 viewports measured
`scrollWidth === innerWidth` and had no unexpected application failures or
HTTP errors (navigation-aborted notification/page requests were excluded).

The deterministic Core3 dates intentionally differ from Odoo's moving demo
dates; Odoo renders its icon-only status widget and richer
reference/template widgets, while the bounded Core3 list uses readable status
text/cards and the form does not reproduce the hidden registration-mail
one-to-many grid. The Odoo source/action is read-only in this context, so
create/edit/delete/workflow controls are intentionally absent. Screenshots
remain outside Git. The requested `js_repl` browser runtime was unavailable;
the evidence used shell Playwright with headless Chromium instead.

## Current batch: Attendee registration confirmation

The authenticated personal Odoo reference is healthy at
`http://localhost:8069/core3_personal`, using `codex@core3.local` in the
`core3_personal` database with demo data and the newly installed addon set.
Through the Events menu, Reporting > Attendees resolves to
`/odoo/action-287`; Odoo's `event.registration` form exposes an `Unconfirmed`
state with a `Registered` transition, followed by `Attended` and
`Cancelled`. A disposable reference attendee, `Unconfirmed Guest`, was
created at `/odoo/action-287/32` for authenticated comparison evidence.

This bounded Core3 slice adds that previously uncovered confirmation state and
action. The attendee list and detail page YAML remain presentation-only; the
page-id-bound API fragments own their datasources and server actions. The
fixed migration `20260911160000-019-event-registration-confirmation.yaml`
adds `registration-demo-unconfirmed` for `An unpublished event`, with fixed
identity/contact/registration values and no current-time or random seed
values. Confirmation, check-in, and cancellation all require `events.write`,
validate the current state, and compare/increment `row_version`; missing,
invalid, stale, empty, and transport-error contracts are explicit.

Acceptance evidence for this batch:

- Focused registration-confirmation integration tests: 4 tests, 34
  assertions.
- Full Events integration tests: 44 tests, 378 assertions; lint and
  `git diff --check` are clean.
- Authenticated Odoo captures: `/tmp/odoo-events-registration-confirmation-
  desktop-final.png` and `mobile-final.png`.
- Authenticated Core3 captures: `/tmp/core3-events-registration-confirmation-
  list-desktop-final.png`, `detail-desktop-final.png`,
  `list-mobile-final.png`, and `detail-mobile-final.png`.
- Both authenticated browser passes used 1440x900 and 390x844, reported no
  failed same-origin requests, and measured no horizontal overflow. The
  exact limitation is that the requested `js_repl` browser skill runtime was
  unavailable, so shell Playwright with headless Chromium was used instead.
  Odoo includes its chatter/email-preview area; this bounded Core3 slice does
  not reproduce chatter, attachments, or the email composer.

## Current batch: Lead Generation Rules

The next uncovered visible Events action is Odoo `Configuration > Lead
Generation` from the auto-installed `event_crm` addon. The owned
`core3_owned` menu audit resolves `event_crm.event_lead_rule_menu` to action
783, model `event.lead.rule`, with `list,form` views. It is manager-only in
Odoo, so Core3 exposes `/events/lead-generation` and its detail alias behind
`events.manage`.

The page/API pair is joined by `page.id`: page YAML owns the list/form layout
and navigation while `api/event-lead-generation.yaml` and
`api/event-lead-generation-detail.yaml` own queries and mutations. The bounded
slice reproduces the visible rule list, responsive detail form, the
`Per Attendee`/`Per Order` and attendee-trigger radios, event filters,
attendee-condition summary, lead defaults, `Execute Rule`, archive/restore,
delete, and deterministic empty/transport/missing/stale/validation guards.
Executing a rule records a guarded event-owned run count; it deliberately does
not create CRM records or modify another module.

The fixed fixture is `event-lead-rule-example`, `Rule on @example.com`, linked
to `Hockey Tournament`, with 23 matching attendee records. Migration
`20260911140000-018-event-lead-generation.yaml` is idempotent and contains no
current-time, random, or generated seed values. Focused evidence is in
`events_lead_generation.integration.test.ts`; authenticated Odoo/Core3
desktop/mobile captures are recorded after the browser gate and remain in
`/tmp`, never in Git.

## Previous batch: Event Settings/configuration

The next uncovered user-visible Events action is now bounded to the Odoo
Configuration > Settings form (res.config.settings, action 633 in the
owned core3_owned reference). The Core3 page is layout-only and requires the
system-level events.settings permission; its API fragment is joined by
page.id: event-settings. It implements the Odoo Events, Registration, and
Attendance blocks, deterministic singleton settings, empty/missing/transport
error contracts, and a permissioned save mutation with required row-version
and barcode-nomenclature validation guards.

The fixed fixture is event-settings-demo for My Company (San Francisco).
The migration is idempotent and contains no current-time or generated values.
Focused integration evidence is 4 tests and 26 assertions; the full Events
integration set is 38 tests and 318 assertions. Authenticated Core3 browser
evidence reached the settled page at 1440x900 and 390x844, found all seven
controls, no horizontal overflow, and no failed requests; the Save click
returned HTTP 200 from events.settings.update. Temporary captures are
/tmp/core3-events-settings-browser-desktop.png and
/tmp/core3-events-settings-browser-mobile.png. The captures show the
generic SettingsView content without module-specific card styling because
the task restricts committed files to YAML/TS/docs/tests; screenshots are
never committed.

## Previous batch: Question answer-choice editor

The bounded follow-up for the Event Questions list/detail surface is now
implemented. A reusable selection question has a page-owned
`event_question_answers` datasource and an Odoo-style x2many answer grid with
permissioned add, edit, and delete actions. Choices are ordered, normalized,
validated, and projected back into the parent question's denormalized answer
summary. Parent/child row versions protect stale edits and deletes; missing
parents/children, duplicate choices, invalid names/sequences, and datasource
transport failures have explicit stable error contracts.

The fixed fixture is `Dietary requirements` with `Vegetarian`, `Vegan`, and
`No preference`. The page and API remain joined by `page.id`, and the new
migration is idempotent and free of current-time/random seed values.

Acceptance evidence for this batch:

- Focused Events integration tests: 7 passed, 72 assertions.
- Authenticated Core3 desktop detail capture:
  `/tmp/core3-events-question-answers-detail-desktop.png`.
- Core3 desktop audit measured `scrollWidth === innerWidth` at 1440px and
  observed no same-origin application API failures. The authenticated Odoo
  desktop/mobile comparison is pending because the clean `core3_owned` init is
  still running and has not opened port 8069.

## Previous batch: Revenues graph and pivot

The installed Odoo 19 reference was authenticated as `codex@core3.local` in
database `core3_owned` and reached the Revenues action through action 750. Its
visible contract is a graph/pivot report with the active `Non-free tickets` and
`Event Start Date: 2026` filters, a Revenues measure, and a line/area graph.
Core3 implements that report at `/events/revenues` with a page-id-bound
`event_revenues` API datasource, deterministic priced ticket fixtures, Graph,
Pivot, and List modes, and an Event Status filter.

Reference captures: `/tmp/odoo-events-revenues-desktop.png`,
`/tmp/odoo-events-revenues-mobile.png`. Core3 captures are produced during the
authenticated browser gate and are intentionally kept outside Git.

This is an implementation gate for the Odoo 19 Community `event` addon.
`ready` is reserved for the point at which all six register gates below have
evidence, including installed-addon desktop/mobile reference captures.

## Reference gate and live limitation

- Odoo source: `/home/nhanjs/projects/odoo`, revision `65975996` (`19.0`).
- Addon manifest: `/home/nhanjs/projects/odoo/addons/event/__manifest__.py`.
- Manifest identity: `Events Organization`, version `1.9`, category
  `Marketing/Events`, license `LGPL-3`, installable, and dependencies
  `barcodes`, `base_setup`, `mail`, `phone_validation`, `portal`, and `utm`.
- The installed `event_crm` addon is Odoo source revision `65975996`, version
  `1.0`, auto-installed with dependencies `event` and `crm`; its official demo
  seeds `Rule on @example.com` and the manager-only `Lead Generation` menu.
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
  `/home/nhanjs/projects/odoo-core3-reference`, at `http://localhost:8069`,
  database `core3_reference`, created on 2026-09-10 with official demo data.
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
Event Tags Categories to action 303, Event Questions to planned action 304, and Answer
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
    - `Lead Generation` (`event_crm.event_lead_rule_menu`, Event Manager group) ->
      `event_crm.event_lead_rule_action`
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
| `event_registration_action_stats_from_event` / action 288 | `event.registration` | event-scoped `/odoo/events/<id>/action-288`; Core3 `/events/registration-statistics?event_id=<id>` | `graph,pivot,kanban,list,form`; active-event domain, registration-date grouping, registered/taken defaults |
| `act_event_registration_from_event` | `event.registration` | `/odoo/attendees` (`path=attendees`) | `list,kanban,form,calendar,graph`; `event_id=active_id`, taken default |
| `event_registration_action_kanban` | `event.registration` | generated event-scoped alias | `kanban,list,form`; registration-desk context |
| `event_registration_action` | `event.registration` | generated registration-desk alias | `kanban,list,form`; ongoing default |
| `event_registration_action_tree` | `event.registration` | generated alias | `list,kanban,form,calendar,graph` |
| `event_registration_action_stats_from_event` | `event.registration` | generated event-scoped alias | `graph,pivot,kanban,list,form`; event domain and date grouping |
| `action_event_type` | `event.type` | generated alias; planned `/odoo/event-templates` | source default list/form/search views; template help |
| `event_lead_rule_action` | `event.lead.rule` | `/odoo/action-783` in the owned reference | `list,form`; manager-only; rule help and `Execute Rule` form action |
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
`event.lead.rule`,
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

The schema now also includes the bounded `event_question_answers` relation for
the question detail editor. The Event Questions page owns only layout, while
`services/events/api/event-question-detail.yaml` owns its page-scoped query and
CRUD actions. The remaining full model graph, menus/actions, other view modes,
registration desk, tickets/slots/stages/tags/templates/mails, reports/settings,
portal/ICS/tickets, activities/chatter/attachments, company/user visibility,
and Odoo stage semantics remain outside this batch.
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
- event lead rule `Rule on @example.com` for `Hockey Tournament`, with fixed
  trigger/basis/default values and a 23-attendee condition count;
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
question/answer/mail/lead-rule CRUD; publish/unpublish/archive/duplicate;
execute lead rule; register,
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
| `/events/registration-statistics?event_id=<id>` | event-scoped Registration statistics action 288 | graph/pivot/kanban/list/form report with active-event scope |
| `/events/answer-breakdown` | Answer Breakdown | list/graph/pivot |
| `/events/templates` | Event Templates | list/form |
| `/events/stages` | Event Stages | list/form |
| `/events/tags` | Event Tags Categories | category/tag list/form |
| `/events/questions` | Event Questions | list/form/answers |
| `/events/settings` | Settings | settings form |
| `/events/lead-generation` | `/odoo/action-783` | Lead Generation Rule list/form |

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

The bounded Event Templates configuration follow-up adds the missing Odoo list/form
detail route at `/events/templates/detail`. Templates now support authenticated
row open/double-click navigation, edit, delete, duplicate-name rejection,
nonnegative seat validation, deterministic empty/detail fixtures, and optimistic
row-version conflict handling. The slice is service-owned under
`services/events` and does not change shared renderers or Surveys migrations.

Registration Desk now has an explicit `/events/registration-desk` client-action
surface with a fullscreen scan/manual-registration composition. The shared
`ScannerView` primitive is intentionally device-neutral: keyboard-wedge
barcode input submits the service-owned `scan_registration_badge` action, so a
camera or hardware adapter can be added later without changing the YAML
contract. The existing generic `Form` primitive is mounted for manual
registration by the scanner renderer.

`event_registration_desk` is owned by `services/events/api/registration-desk.yaml`
and exposes deterministic `ready`, `invalid`, `duplicate`, `capacity`, and
`empty` fixture states through `fixture_state`. Barcode scan and manual
registration mutations enforce events.write, badge existence/already-used,
event-open, capacity, and duplicate-attendee guards with stable 404/409
responses. The page requires events.read and displays a read-only permission
state when events.write is absent. Focused coverage is in
`events_registration_desk.integration.test.ts` plus the isolated generic
`ScannerView` test.

This bounded slice preserves Odoo's source distinction: the source
`event_barcode_action_main_view` is represented as a Core3 client-action
metadata field, while scan/registration transport uses named authenticated
actions through `/api/mutate`; no public `/event/*` or controller route is
introduced here. Authenticated desktop/mobile captures are retained under
`/tmp/core3-events-registration-desk-{desktop,mobile}.png` and are not
committed.

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

The event-detail catalog batch moves the event detail and registration queries
to `services/events/api/event-detail.yaml`, adds deterministic ticket,
registration-question, and slot tables, and mounts Odoo-style Tickets,
Communication, Questions, Notes & Documents, and Slots tabs inside the shared
form sheet. Authenticated desktop/mobile checks reached
`OpenWood Collection Online Reveal` by opening the row from `/events`, showed
the Standard/VIP tickets plus question and slot records, returned no failed
requests, and kept document width within the viewport. Captures are
`/tmp/core3-events-detail-catalog-{desktop,mobile}.png`; the branch remains
isolated until the main runtime verification completes.

The event-list view-mode batch moves the Events list queries to
`services/events/api/events.yaml` and adds the Odoo action's List, Kanban,
Calendar, Pivot, and Graph presentations with visible tab navigation, status
grouping, event scheduling, registration measures, and mobile-safe controls.
Authenticated desktop/mobile checks cover every implemented mode and retain
the Odoo reference pair at `/tmp/odoo-events-list-modes-{desktop,mobile}.png`;
Core3 evidence is captured per mode at
`/tmp/core3-events-list-modes-{desktop,mobile}-{list,kanban,calendar,pivot,graph}.png`.
Odoo also exposes Activity for this action. The shared ActivityView batch now
provides the Odoo-style activity matrix with visible type columns, state
counters, colored activity cells, record date ranges, empty-cell scheduling,
and a Schedule activity footer. Events declares To-Do, Email, Call, Meeting,
and Document columns from deterministic API activity slots. An authenticated
Core3 check at 1440x900 opened Activity through the visible tab with no failed
requests and document width 1440; the matching Odoo capture is
`/tmp/odoo-events-activity-desktop.png` and Core3 evidence is
`/tmp/core3-events-activity-desktop-final.png`. At 390x844 both Odoo and
Core3 follow the responsive fallback (Odoo kanban and Core3 list) without
page overflow; captures are `/tmp/odoo-events-activity-mobile.png` and
`/tmp/core3-events-activity-mobile-final.png`. The shared implementation was
committed as `5327ecbf`/`d9aa4d8e` and integrated into `odoo-pos` as
`712820a5`/`7aeecab3`.

The next bounded state-coverage batch moves the legacy `/events-analysis`
aggregates out of `pages/analysis.yaml` into the convention-discovered
`services/events/api/analysis.yaml` fragment keyed by `events-analysis`. The
Events list, event detail, and analysis read sources now accept the existing
`fixture_state` query contract for deterministic empty and missing-record
responses, while `:q` produces stable search/no-result states against the
fixed 2026 fixtures. The list and analysis surfaces expose Odoo-style empty
copy; detail tabs retain their existing ticket/question/slot/registration
empty states. All read sources and page guards retain `events.read`, and the
focused state suite checks stable seeded records, search results, empty and
missing responses, API ownership/discovery, permission declarations, and the
existing 409/required-field mutation error boundaries. No new shared renderer
or screenshot asset was added.

The remaining Events mock-data contract is still open for the broader future
model graph and transport-level loading/error fixtures; this batch is limited
to the currently implemented list, detail, and analysis surfaces.

The mobile visual follow-up closes a concrete responsive mismatch found during
fresh comparison: Odoo switches the Events action to record cards at 390x844,
whereas the prior Core3 table clipped Organizer and later columns behind the
content viewport. The Events page now declares a shared CardView with the
Odoo-visible event title, type, organizer, venue, registration count, and
status, while the desktop List/Kanban/Calendar/Pivot/Graph/Activity modes stay
available. Fresh authenticated checks show eight mobile cards, no table,
document width 390, and no failed responses. Evidence is
`/tmp/core3-events-desktop-cards-fix.png` and
`/tmp/core3-events-mobile-cards-fix.png`; the matching installed Odoo
reference remains `/tmp/odoo-events-list-modes-{desktop,mobile}.png`.

The Answer Breakdown batch adds the Odoo Reporting / Answer Breakdown action at
`/events/answer-breakdown` with the source view order List, Graph, Pivot. Its
page is layout-only and reads the existing service-owned registration-answer
catalog through `api/answer-breakdown.yaml`, including Odoo list labels,
answer-count graph/pivot fields, the exact no-answers copy, and deterministic
empty/transport-error/permission boundaries. Authenticated desktop/mobile
checks and local Odoo captures are kept under `/tmp`; no screenshots are
repository assets.
The next bounded ticket-catalog batch adds the Odoo event-ticket one-to-many
surface to the existing event detail Tickets tab. Tickets now open a
service-owned `event-ticket-detail` form by `page.id`, support permissioned
create/update/delete, expose deterministic sale-window, seat-limit,
availability, and registration fields, and reject invalid windows, impossible
order limits, missing records, stale row versions, and deletion of tickets
with registrations. The existing event detail tab retains its empty state and
now has a create action plus row navigation; a fixed General Admission fixture
completes the official OpenWood ticket examples. Focused coverage proves API
discovery, stable default/empty/missing reads, mutation guards, and the
409/422 boundaries. Broader template-ticket inheritance, ticket PDFs/public
sales, and slot-specific availability remain deferred.

The bounded Event Stages follow-up adds the missing row-to-form workflow at
`/events/stages/detail?id=<id>`. The list now opens and double-clicks into a
stage, while the service-owned detail form supports guarded edit and delete
operations for stage name, sequence, and folded state. Focused coverage proves
page/API ownership, seeded detail reads, duplicate-name and invalid-sequence
responses, and missing-record/delete boundaries. Authenticated Core3 desktop
and mobile captures are `/tmp/core3-events-stages-{list,detail}-{desktop,mobile}.png`.
The installed Odoo reference is `/tmp/odoo-events-stages-{desktop,mobile}-reference.png`;
its list has the same four seeded stages, while the Core3 detail remains a
bounded three-field form and does not yet reproduce Odoo's richer stage form
controls.

The bounded Event Tags Categories follow-up adds the missing list-to-form
workflow at `/events/tags/detail?id=<id>`. Categories now open on row click or
double-click and expose service-owned edit/delete actions for name, tags,
activity, and age, with duplicate-name and missing-record guards. Migration
`20260910231000-012-event-tag-category-detail.yaml` adds deterministic record
versions. Fresh authenticated Core3 list/detail captures are under
`/tmp/core3-events-tags-{list,detail}-{desktop,mobile}.png`; the installed Odoo
reference pair is `/tmp/odoo-events-{desktop,mobile}-event-tags.png`. The
detail is intentionally bounded and does not yet include Odoo's separate tag
color editor.

The bounded Event Questions follow-up adds the missing list-to-form workflow at
`/events/questions/detail?id=<id>`. The list now opens and double-clicks into a
question, and the service-owned detail form exposes Odoo-shaped Question and
Answers groups with permissioned edit/delete actions. Migration
`20260910230000-011-event-question-detail.yaml` adds optimistic record-version
data; duplicate-title, invalid-type, missing-record, list/detail empty, and
transport-error boundaries are declared and covered by focused tests. The live
owned Odoo menu audit resolved `event_question_action` to `/odoo/action-285`
(the plan's recorded action 304 is stale in this database) with three seeded
questions. Fresh authenticated list/detail captures are `/tmp/core3-events-questions-list-desktop-final-1440x900.png`,
`/tmp/core3-events-questions-list-mobile-final-390x844.png`,
`/tmp/core3-events-questions-detail-desktop-final-1440x900.png`, and
`/tmp/core3-events-questions-detail-mobile-final-390x844.png`; the matching
Odoo captures are `/tmp/odoo-events-questions-list-desktop-final-1440x900.png`,
`/tmp/odoo-events-questions-list-mobile-final-390x844.png`,
`/tmp/odoo-events-questions-detail-desktop-final-1440x900.png`, and
`/tmp/odoo-events-questions-detail-mobile-final-390x844.png`. The Core3 detail
remains a bounded form and does not yet reproduce Odoo's full answer-choice
editor, default-question/reusable flags, or event usage banner.

The next uncovered user-visible event action is now covered: the event-scoped
Slots action. Odoo 19 defines this embedded action as `calendar,list,form`
with the active event as its domain/default; the live `core3_owned` reference
has no multi-slot demo records, so its Slots control is not shown on the
currently seeded event forms. Core3 adds the visible Slots-tab create/open
workflow and `/events/slots/detail`, with page-id-owned
`api/event-slot-detail.yaml`, deterministic `Main session` data, permissioned
create/update/delete, event-range and seat validation, registration-protected
delete, and optimistic row-version handling. Focused coverage is
`events_slots.integration.test.ts`; the migration uses free version `0.0.14`
because the existing revenue fixture already owns `0.0.13`. Authenticated
Fresh authenticated Core3 captures are `/tmp/core3-events-slots-desktop-fresh.png`
and `/tmp/core3-events-slots-mobile-fresh.png`; the installed Odoo event-form
references are `/tmp/odoo-events-slots-desktop-fresh.png` and
`/tmp/odoo-events-slots-mobile-fresh.png`. The installed demo has no
multi-slot record, so the Odoo pair proves the event form/action context while
the Core3 pair proves the deterministic Slots tab. Images remain outside the
repository.

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
