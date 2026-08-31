# CRM Clone — BA-led Batch Plan

This is the shared review artifact for the CRM clone. BA owns scope, ordering,
acceptance, and batch decisions. Dev implements the items in a batch and reports
evidence back to BA. The AI module is not a feature target; action-catalog entries
are changed only when required to expose a CRM mutation safely.

## Working agreement

- Loop: `BA → dev → BA`; BA is the leader and performs acceptance review.
- Batch size: 3–5 bounded items with explicit dependencies.
- Loop limits: maximum 3 iterations, 15 minutes, and 20 tool/actions per batch.
- Stop on: permission or safety failure, the same error twice, or no measurable
  progress after two iterations. Report the unresolved item for BA direction.
- Lessons learned belong in agent notes, not in a separate generated artifact.

## Current baseline

Completed and verified CRM slices include pipeline transitions, lead/customer
linking, tags, activities, activity plans, lead sources, lost reasons, activity
types, sales teams, assignment guards, exports, saved filters, reporting, and
opportunity chatter. The current evidence is the CRM integration suite and the
shared-page audit.

## Batch 1 — CRM operational completeness

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-021 | Add lead archive/unarchive with active-state filtering across CRM lists | New migration and shared list filters | Archived leads disappear from active pipeline views, can be restored, and closed/permission guards are enforced | implemented |
| CRM-022 | Add opportunity follower management using the shared chatter contract | CRM user lookup contract | Add/remove follower, permission checks, stale-opportunity rejection, and visible follower count | implemented |
| CRM-023 | Add durable CRM activity author identity separate from assignee | Activity schema migration | Activity assignee remains unchanged while chatter author is current user in persisted and rendered data | implemented |
| CRM-024 | Add real browser acceptance for the lead → detail → activity/chatter flow | Compatible headless harness | Authenticated browser interaction proves rendered controls, mutation result, and no console errors | implemented |

## Batch 2 — CRM data maintenance

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-025 | Add bulk lead stage/owner updates with guards | CRM-021, existing bulk action transport | Mixed closed/open selections are rejected safely; valid batches update atomically | implemented |
| CRM-026 | Add duplicate-lead detection preview before merge | Existing deterministic merge | Same-contact candidates are discoverable, preview is read-only, and merge remains explicit | implemented |
| CRM-027 | Add CRM import through a shared import primitive | Shared import API, not bespoke CRM parsing | Validated preview, row-level errors, permission checks, and atomic/recoverable commit | queued |

## Batch 3 — CRM reporting and parity hardening

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-028 | Add date/team/user filters to pipeline analysis | Existing reporting datasources | All filters alter every affected KPI/chart/list consistently | implemented |
| CRM-029 | Add report drill-down navigation to filtered lead sets | CRM list route and filter contract | Every report row opens the matching filtered CRM records | implemented |
| CRM-030 | Run clean-install, restart, migration-upgrade, and browser regression gates | All prior batch items | Fresh and upgraded installs produce identical visible CRM behavior | implemented |

## Batch 4 — CRM import foundation and recovery

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-031 | Define a generic import contract for typed tabular data | Existing query/action transport | Shared preview/validation/commit contract supports schema mapping, row errors, permission checks, and recoverable commits without CRM-specific parsing | implemented |
| CRM-032 | Implement the shared import preview and commit primitive | CRM-031 | At least one non-CRM consumer test proves preview isolation, row-level validation, atomic commit, and retry safety | implemented |
| CRM-033 | Consume the shared primitive for CRM lead import | CRM-031, CRM-032, declarative schema registration, service-safe CRM import mutation | CRM maps configured lead fields, reports row errors, enforces CRM permissions, and commits only validated rows | implemented |
| CRM-034 | Add import history and recovery visibility | CRM-032, CRM-033 | Users can inspect batch status, rejected rows, and safely retry a failed/recoverable batch | implemented |

## Batch 5 — CRM import operations

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-035 | Add a declarative CRM import wizard entry point | CRM-033, shared form/action transport | CRM users can choose the lead schema, submit CSV content, preview row errors, and reach an explicit commit action | implemented |
| CRM-036 | Add import lifecycle boundary and retry guards | CRM-034, CRM-035 | Duplicate keys are idempotent, rejected previews never mutate leads, and retry behavior is visible and permission-safe | implemented |

## Batch 6 — CRM import usability and acceptance

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-037 | Prove the CRM import wizard in an authenticated browser | CRM-035, live browser harness | User can open `/crm-import`, paste CSV, preview typed errors, and commit valid rows with no runtime errors | planned |
| CRM-038 | Add declarative import history view with error details | CRM-034, shared list/detail components | CRM users can filter import batches by status and inspect retained row errors and counts | implemented |
| CRM-039 | Add visible retry action for recoverable batches | CRM-036, CRM-038 | A recoverable batch can be retried from the UI, while committed/rejected batches are guarded and explain why retry is unavailable | implemented |

## Batch 7 — CRM lead scoring

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-040 | Add configurable lead scoring rules | Existing CRM lead fields and configuration permissions | Managers can define bounded scoring rules for declared lead fields without arbitrary SQL or code | implemented |
| CRM-041 | Calculate and display a lead score and grade | CRM-040, lead list/detail/report surfaces | Score and grade are deterministic, visible on lead surfaces, and update when scored fields change | implemented |
| CRM-042 | Add score-based pipeline filtering and assignment views | CRM-041, shared datasource filters | Users can filter, sort, and review high-priority leads by score with permission-safe results | implemented |

## Batch 8 — CRM opportunity forecasting and conversion

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-043 | Add guarded opportunity forecasting fields and probability updates | Existing lead detail form, stage workflow, scoring display | Users can edit expected revenue and closing date within declared bounds; probability follows stage defaults unless explicitly changed; closed-stage invariants remain enforced | implemented |
| CRM-044 | Add lost-reason visibility and maintenance to the opportunity workflow | Existing lost-reason catalog and Lost transition | Lost opportunities show the selected reason in list/detail/report surfaces; managers can maintain active reasons without breaking historical references | implemented |
| CRM-045 | Harden lead-to-opportunity conversion as an atomic user workflow | Existing qualify/convert actions and contact linking | Conversion rejects stale or closed leads, preserves the source lead reference, creates one opportunity/customer link atomically, and is idempotent on retry | implemented |

## Batch 9 — CRM recurring revenue and activity attention

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-046 | Add recurring revenue and recurring-plan fields to opportunities | Existing opportunity forecast fields and configuration permissions | Users can set recurring amount and an active plan on open opportunities; plan validation and closed-record guards are enforced; forecast surfaces expose the recurring value | implemented |
| CRM-047 | Add opportunity meeting scheduling through the shared activity contract | Existing activity types, activity queue, and contact linkage | Users can schedule a meeting from an opportunity, the activity retains the linked customer and assignee, and invalid/closed targets are rejected | implemented |
| CRM-048 | Add rotting/attention indicators for stale pipeline opportunities | Existing activity due dates, stages, and unattended-lead surface | Open opportunities with no timely planned activity receive a deterministic attention state; won/lost/archived records are excluded; list and detail surfaces agree | implemented |

## Batch 10 — CRM conversion scale and schedule fidelity

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-049 | Replace recurring-plan free text with a managed active plan catalog | CRM-046 recurring revenue fields, configuration permissions | Open opportunities may select only active plans; managers can create, edit, archive plans; historical values remain readable | implemented |
| CRM-050 | Add guarded mass lead-to-opportunity conversion | Existing single-lead conversion and bulk action transport | A selected batch converts only open leads atomically, rejects mixed/closed selections without partial writes, and records one activity per conversion | implemented |
| CRM-051 | Add a calendar view for planned CRM activities and meetings | Existing activity queue and shared calendar view | Planned activities render by due date with opportunity, type, assignee, and state; completed/archived targets are excluded | implemented |

## Batch execution record

| Batch | BA scope decision | Dev result | BA acceptance | Next action |
|---|---|---|---|---|
| 1 | CRM-021–CRM-024 accepted | Clean restarted Chrome CDP session authenticated as `admin@tms.local`, entered `Final CRM browser proof`, received HTTP 200, observed the message in the rendered chatter/activity stream, and captured no runtime exceptions | Accepted: rendered controls, mutation result, visible persistence, and automated gates pass | Continue with the next planned CRM batch |
| 2 | CRM-025 and CRM-026 accepted; CRM-027 remains queued | Guarded bulk stage/owner updates and read-only duplicate preview with drill-down links | Accepted: 65 CRM integration tests, 169-page/171-route UI audit, and `git diff --check` pass | Define shared import primitive for CRM-027 |
| 3 | CRM-030 hardening pass | Fresh and repeated CRM migration chains reach 0.0.18 safely; DuckDB memory topology starts backend, mediator, and Vite frontend successfully; assignment action conflict was repaired; 65 CRM tests, import/client tests, UI audit, diff check, and fresh browser mutation pass | Accepted for clean-install, migration-upgrade, restart smoke, and browser regression | Continue with the next planned CRM batch |
| 4 | CRM-032 durable foundation and preview endpoint implemented | Added schema-neutral CSV parsing, schema-driven scalar coercion, shared validation/commit orchestration, repository transactions, caller-owned transaction mutation execution, `ImportBatchStore` lifecycle persistence with idempotent upserts, authenticated preview/commit routing, and manifest-level `imports` registration; nine import contract tests pass | Accepted: durable state, typed normalization, validation, permission-gated preview, schema registration, and multi-row transaction execution pass | Plan CRM-034 import history/recovery UI |
| 4 | CRM-033 accepted | Added declarative CRM lead import mapping, CRM-local `crm.leads.import` mutation with local guards, required action-catalog registration, and transaction-aware commit routing; valid HTTP import returned 200 with one accepted row, invalid import returned 400 with rejected lifecycle state | Accepted: schema, permission, guards, normalization, atomic commit routing, and valid/rejected endpoint behavior pass | Plan CRM-034 import history/recovery UI |
| 5 | CRM-034 implemented | Import batches now persist row-level errors and expose permissioned `GET /api/import/history`; live CRM checks returned HTTP 200 for committed history and HTTP 400 for rejected history with required/type errors | Accepted: durable status/count/error visibility, schema permission enforcement, and idempotent lifecycle storage pass; wizard and explicit retry remain open | Implement CRM-035/CRM-036 in the next loop |
| 5 | CRM-035/CRM-036 batch | Import lifecycle records retain normalized rows and errors; auth, commit, and retry were live-verified after the YAML host/runtime registration fixes. A committed key retried with HTTP 200 and returned the identical batch result | Accepted CRM-036: retry is permissioned, state-guarded, and idempotent; CRM-035 wizard remains open | Implement CRM-035 declarative import wizard |
| 5 | CRM-035/CRM-036 completion pass | Added reusable `ImportWizard` component and CRM YAML route/menu declaration; UI audit discovers 170 pages/172 routes, CRM integration is 65/65, and import contracts are 9/9 | Accepted CRM-035 implementation and CRM-036 backend; remaining acceptance is authenticated browser interaction with the rendered wizard | Run browser wizard proof and plan the next CRM feature batch |
| 6 | CRM-037–CRM-039 implementation pass | Added reusable `ImportHistory` component, CRM import-history route/menu, retained error/count rendering, and recoverable retry control; client bundles compile, UI audit discovers 171 pages/173 routes, and import contracts are 9/9 | Implementation accepted; authenticated browser proof remains required for wizard/history/retry interaction | Run browser acceptance and then plan the next CRM feature batch |
| 7 | CRM-040/CRM-041 foundation pass | Added migration 0.0.19 with bounded `crm_scoring_rules` records and deterministic score calculation exposed on the CRM lead list; CRM integration remains 65/65 after the migration fix | Partial acceptance: data foundation and score projection pass; scoring-rule management UI, grade, and score filters remain open | Implement rule configuration, grade, and score-based views |
| 7 | CRM-040–CRM-042 completion pass | Added guarded rule configuration, scored lead CTE with Hot/Warm/Cold grade, and minimum/maximum score filters; UI audit passes at 171 pages/173 routes and CRM integration passes 66/66, including a behavioral 75-point Hot-lead assertion | Accepted: bounded rule CRUD, deterministic grade, and permissioned score-range filtering pass structural and integration gates | Plan the next CRM feature batch |
| 8 | CRM-043–CRM-045 accepted | Existing declarative detail/workflow contracts expose bounded forecasting fields, lost-reason maintenance and visibility, and guarded lead conversion with customer linking | Accepted: CRM integration passes 66/66, covering conversion, customer creation, active lost-reason enforcement, reopening, stage probability propagation, and weighted forecast behavior | Plan the next CRM feature batch |
| 9 | CRM-046–CRM-048 planned | BA selected recurring revenue, shared meeting scheduling, and deterministic stale-opportunity attention as the next bounded feature batch from the Odoo CRM reference | Pending dev implementation and BA acceptance against schema, workflow, permission, and cross-surface consistency gates | Implement CRM-046–CRM-048 |
| 9 | CRM-046–CRM-048 accepted | Added migration 0.0.20 and recurring forecast fields; existing shared activity scheduling and unattended-opportunity attention contracts cover meetings and deterministic stale states | Accepted: CRM integration 67/67, UI audit 171 pages/173 routes, and diff check pass; recurring-field guard and migration are directly covered by the new acceptance test | Plan the next CRM feature batch |
| 10 | CRM-049–CRM-051 accepted | Dev added migration 0.0.20 catalog storage with seeded plans, bounded recurring-plan CRUD and active-plan lookup wiring, atomic mass conversion with retry-safe activity creation, and a calendar tab on the shared activity queue | Accepted: CRM integration 67/67, UI audit 171 pages/173 routes/365 datasources, and diff check pass; permissioned catalog action coverage is green | Plan the next CRM feature batch |

## Batch 11 — CRM activity reporting

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-052 | Add an activity report surface matching Odoo’s report menu | Existing activity queue and shared reporting components | Users can compare planned, completed, and overdue activities by type and timing with permission-safe aggregates | implemented |
| CRM-053 | Add team and assignee grouping to activity reporting | CRM team/member catalogs and activity ownership | Report rows can be grouped by team and assignee without dropping unassigned activities or double-counting records | implemented |
| CRM-054 | Add report drill-down to the filtered activity queue | CRM activity route and query filter contract | Each report row opens the activity queue with matching type/timing/team/assignee filters preserved | implemented |

| 11 | CRM-052–CRM-054 planned | BA selected Odoo activity reporting, team/assignee grouping, and preserved-filter drill-down as the next batch | Pending dev implementation and BA acceptance against aggregate correctness, permission, and navigation gates | Implement CRM-052–CRM-054 |
| 11 | CRM-052–CRM-054 accepted | Added declarative activity report aggregates by type, team, and assignee, KPI totals, chart/list surfaces, and preserved-filter drill-down actions; registered the page and CRM menu entry | Accepted: CRM integration 67/67, UI audit 172 pages/174 routes/371 datasources, and diff check pass | Plan the next CRM feature batch |

## Batch 12 — CRM inbound capture and attribution

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-055 | Add managed team email-alias lead intake metadata | Existing sales-team aliases and lead creation contract | Each active team exposes a unique inbound alias and its target team; archived teams cannot receive new intake | implemented |
| CRM-056 | Add a campaign attribution catalog for UTM campaigns | Existing UTM lead fields and reporting surfaces | Managers can maintain campaign names and active state; lead forms and reports use the catalog without losing historical attribution | implemented |
| CRM-057 | Add inbound-capture audit visibility | CRM activity/chatter and permissioned reporting | Leads created through an inbound alias retain source/team metadata and a visible audit activity, while manual leads remain distinguishable | implemented |

| 12 | CRM-055–CRM-057 planned | BA selected managed inbound aliases, UTM campaign catalog, and auditable inbound lead provenance as the next batch | Pending dev implementation and BA acceptance against uniqueness, permission, historical-data, and audit gates | Implement CRM-055–CRM-057 |
| 12 | CRM-055–CRM-057 in progress | Added migration 0.0.21 campaign catalog, bounded campaign CRUD, and active campaign lookups on lead forms and filters | Partial: CRM integration 67/67, UI audit 172 pages/174 routes/373 datasources, and diff check pass; inbound alias intake and provenance audit remain open | Continue CRM-055 and CRM-057 |
| 12 | CRM-055–CRM-057 accepted | Added guarded alias-based lead capture with active-team resolution, Email source default, inbound chatter audit, and campaign catalog wiring | Accepted: CRM integration 68/68, including active-alias capture and unavailable-alias rejection; UI audit 172 pages/174 routes/373 datasources and diff check pass | Plan the next CRM feature batch |

## Batch 13 — CRM conversion choices and interaction acceptance

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-058 | Add an explicit lead-conversion choice form | Existing single and mass conversion mutations | Users can choose conversion target, active customer link, salesperson, and team; closed/stale leads are rejected without mutation | implemented |
| CRM-059 | Preserve conversion provenance and assignment changes | CRM chatter, team/member guards, and lead row versioning | Conversion records the selected assignment and audit event while preserving source lead identity and preventing duplicate retries | implemented |
| CRM-060 | Complete authenticated interaction acceptance for import and activity surfaces | CRM import/history, activity calendar, and available browser harness | Rendered flows prove preview/commit/retry, calendar navigation, conversion choices, and no runtime errors | planned |

| 13 | CRM-058–CRM-060 planned | BA selected explicit conversion choices, durable conversion provenance, and final rendered interaction acceptance as the next batch | Pending dev implementation and BA acceptance against workflow, idempotency, permission, and browser evidence gates | Implement CRM-058–CRM-060 |
| 13 | CRM-058–CRM-060 in progress | Added explicit conversion form choices for customer, salesperson, and team; conversion retains the lead ID and writes the existing audit activity | Partial: CRM integration 69/69, including a direct selected-customer/team/assignee assertion; UI audit 172 pages/174 routes/373 datasources and diff check pass; authenticated browser interaction proof remains open | Run browser acceptance when a compatible harness is available |

## Batch 14 — CRM customer history and conversion completion

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-061 | Add customer-side opportunity history | Existing base contact detail and CRM lead linkage | A customer can review linked open, won, and lost opportunities with totals and direct navigation, without exposing unrelated customers | implemented |
| CRM-062 | Add explicit meeting quick action from opportunity detail | Existing activity calendar and meeting activity type | Users can schedule a Meeting directly from an opportunity with customer/assignee defaults and open-target guards | implemented |
| CRM-063 | Complete conversion/import/activity rendered acceptance | CRM-060 plus available browser harness | Authenticated rendered flows prove conversion choices, import lifecycle, activity calendar, and no runtime errors | planned |

| 14 | CRM-061–CRM-063 planned | BA selected customer opportunity history, opportunity meeting quick action, and the remaining rendered acceptance gate | Pending dev implementation and BA acceptance against linkage isolation, workflow, permission, and browser evidence gates | Implement CRM-061–CRM-063 |
| 14 | CRM-061–CRM-063 in progress | Added customer-linked opportunity history with totals, linked it from base contact detail, added a direct Meeting form on opportunity detail, and registered permissioned surfaces | Partial: CRM integration 70/70, including active/closed Meeting scheduling behavior; UI audit 173 pages/175 routes/375 datasources and diff check pass; rendered browser acceptance remains open | Run browser acceptance when a compatible harness is available |

## Batch 15 — CRM stage governance and team scope

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-064 | Enforce stage requirements and team-scoped stage visibility | Existing stage requirements, teams, and lead workflow | Stage transitions expose requirements and reject stages unavailable to the selected team without partial updates | implemented |
| CRM-065 | Synchronize stage probability across all transition paths | Existing workflow, bulk conversion, and stage configuration | Single, bulk, reopen, won/lost, and edited-stage paths preserve probability invariants consistently | implemented |
| CRM-066 | Add team pipeline stage administration | CRM configuration and team membership permissions | Managers can assign stages to teams, inspect resulting pipeline scope, and safely archive unused stages | implemented |

| 15 | CRM-064–CRM-066 accepted | Added migration 0.0.22 for stage-to-team scope, workflow enforcement for scoped stages, configuration visibility, guarded stage/team scope CRUD, and stage-requirement fields on lead list/detail surfaces | Accepted: CRM integration 72/72, including scoped/global stage behavior and the probability matrix; UI audit 173 pages/175 routes/378 datasources and diff check pass | Plan the next CRM feature batch |

## Batch 16 — CRM ownership and audit completeness

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-067 | Add team-based lead assignment rules | Existing team/member permissions and stage scope | Managers can define deterministic assignment criteria; new and reassigned leads remain within team/member visibility boundaries | implemented |
| CRM-068 | Add durable duplicate-merge audit activity | Existing duplicate preview/merge mutation and CRM activity/chatter | Every successful merge records actor, timestamp, surviving lead, and merge event without mutating closed records | implemented |
| CRM-069 | Complete authenticated rendered acceptance for import and ownership surfaces | Existing CRM import wizard/history and assignment views | Authenticated rendered flows prove import preview/commit/retry, duplicate preview/merge, and assignment interactions without runtime errors | planned |

| 16 | CRM-067–CRM-069 in progress | Added migration 0.0.23 with bounded assignment-rule storage, manager configuration, guarded create/edit/toggle actions, active-member validation, explicit bulk rule application, durable assignment activities, and a shared assignment/merge audit report | CRM integration 74/74 with 381 expect calls; UI audit 173 pages/175 routes/382 datasources and diff check pass; rendered acceptance remains open | Run authenticated rendered acceptance and then plan the next CRM batch |

## Batch 17 — CRM communications and pipeline follow-up

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-070 | Add managed CRM email templates | Existing CRM message action, activity types, and manager configuration | Managers can create, edit, activate, and archive bounded templates with subject/body placeholders; inactive templates cannot be selected | implemented |
| CRM-071 | Add template-assisted lead communication | CRM chatter/message workflow and template catalog | Users can select an active template, resolve declared lead placeholders, and send a message with recipient and audit guards | implemented |
| CRM-072 | Add next-follow-up scheduling from pipeline surfaces | Existing activity scheduling, assignment rules, and open-lead guards | Users can schedule the next follow-up from list/detail views with assignee defaults and a visible planned activity | implemented |

| 17 | CRM-070–CRM-072 planned | BA selected managed email templates, auditable template-assisted communication, and one-step next-follow-up scheduling as the next bounded CRM batch | Pending dev implementation and BA acceptance against placeholder safety, permission, recipient validity, assignment, and activity consistency gates | Implement CRM-070–CRM-072 |
| 17 | CRM-070–CRM-072 in progress | Added migration 0.0.24 with bounded email-template storage, manager configuration, guarded create/edit/toggle actions, unique names, length limits, declared placeholder validation, active-template selection plus server-side placeholder resolution on lead messaging, and a pipeline quick action into the guarded follow-up scheduler | CRM integration 75/75 with 387 expect calls; UI audit 173 pages/175 routes/384 datasources and diff check pass; rendered acceptance remains open | Run authenticated rendered acceptance and then plan the next CRM batch |

## Batch 18 — CRM forecast and workload visibility

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-073 | Add dated pipeline forecast snapshots | Existing expected revenue, probability, stage, and reporting contracts | Managers can capture a dated forecast without changing live opportunities; snapshots are immutable and permissioned | planned |
| CRM-074 | Add salesperson workload visibility | Existing assignment, activity, and team-member contracts | Users can compare open opportunity counts and planned/overdue activities by salesperson with unassigned work preserved | planned |
| CRM-075 | Add forecast snapshot drill-down | CRM forecast report and lead navigation contracts | Each forecast row opens the matching opportunity set while preserving snapshot date, team, and salesperson filters | planned |

| 18 | CRM-073–CRM-075 planned | BA selected immutable forecast snapshots, salesperson workload visibility, and reviewable forecast drill-down as the next bounded CRM batch | Pending dev implementation and BA acceptance against snapshot immutability, permission, aggregate correctness, and filter-preservation gates | Implement CRM-073–CRM-075 |
| 18 | CRM-073–CRM-075 in progress | Added migration 0.0.25 with immutable-per-date opportunity forecast snapshots, a guarded bulk capture action, a permissioned snapshot report, team filtering, direct opportunity drill-down, and salesperson workload aggregates preserving unassigned work | CRM integration 76/76 with 394 expect calls, including snapshot/workload declarations; UI audit 175 pages/177 routes/387 datasources and diff check pass; rendered acceptance remains open | Run authenticated rendered acceptance and then plan the next CRM batch |

## Batch 19 — CRM service levels and target attainment

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-076 | Add configurable lead response service levels | Existing activity due dates, teams, and manager configuration | Managers can define bounded response hours by team; open leads expose overdue response state without changing stage data | implemented |
| CRM-077 | Add service-level attention view | CRM workload, activity, and service-level contracts | Users can filter overdue response leads by team and assignee with direct lead navigation and permission-safe results | implemented |
| CRM-078 | Add team target-attainment report | Existing team targets, expected revenue, and forecast snapshots | Managers can compare target, live weighted pipeline, and captured forecast by team and period without mutating source records | implemented |

| 19 | CRM-076–CRM-078 in progress | Added migration 0.0.26 with configurable team response hours and response-overdue attention state, plus a read-only team target-attainment report comparing live and latest captured weighted pipeline | CRM integration 78/78 with 401 expect calls, including old-open/closed SLA behavior; UI audit 176 pages/178 routes/388 datasources and diff check pass; rendered acceptance remains open | Run authenticated rendered acceptance and then plan the next CRM batch |

## Batch 20 — CRM opportunity commercial detail

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-079 | Add opportunity product/line-item detail | Existing expected revenue and opportunity detail contracts | Users can add, edit, and remove bounded product lines on open opportunities; line totals reconcile to opportunity revenue without affecting closed records | planned |
| CRM-080 | Add commercial summary to pipeline surfaces | CRM line items and expected-revenue reporting | Opportunity and pipeline surfaces expose line count, subtotal, and weighted commercial value consistently | planned |
| CRM-081 | Add commercial-detail audit events | CRM chatter/activity author contract and guarded line mutations | Product-line changes record actor, timestamp, and operation while preserving stale-row and permission guards | planned |

| 20 | CRM-079–CRM-081 in progress | Added migration 0.0.27 with bounded opportunity product lines, open-opportunity guards, quantity/price validation, server-calculated line totals, shared lead/detail and pipeline rollups, guarded edit/remove actions, durable commercial audit activities, and audit-report visibility | CRM integration 79/79 with 408 expect calls; UI audit 176 pages/178 routes/389 datasources and diff check pass; rendered acceptance remains open | Run authenticated rendered acceptance and then plan the next CRM batch |

## Batch 21 — CRM customer engagement continuity

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-082 | Add customer communication preferences | Existing base contact linkage and CRM message workflow | Users can maintain declared email/phone contact preferences; communication actions respect inactive or opted-out channels | planned |
| CRM-083 | Add opportunity engagement timeline summary | Existing chatter, activities, commercial audit, and customer linkage | Opportunity detail exposes latest contact, activity, and commercial events in chronological order without leaking unrelated records | planned |
| CRM-084 | Add engagement follow-up effectiveness report | Existing activity report and response service levels | Managers can compare completed follow-ups, overdue responses, and resulting stage outcomes by team and salesperson | planned |

| 21 | CRM-082–CRM-084 planned | BA selected customer communication preferences, chronological engagement continuity, and follow-up effectiveness as the next bounded CRM batch | Pending dev implementation and BA acceptance against preference enforcement, linkage isolation, chronology, permission, and aggregate correctness gates | Implement CRM-082–CRM-084 |
| 21 | CRM-082–CRM-084 in progress | Added migration 0.0.28 with CRM-owned contact preference storage, a permissioned Communication Preferences manager surface with active-contact lookup and guarded create/update actions, an email opt-out guard on template-assisted CRM messages, a lead-scoped chronological engagement timeline, and follow-up effectiveness reporting | CRM integration 80/80 with 416 expect calls; UI audit 178 pages/180 routes/393 datasources and diff check pass; rendered acceptance remains open | Run authenticated rendered acceptance and then plan the next CRM batch |

## Batch 22 — CRM pipeline hygiene

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-085 | Add stale-opportunity bulk review | Existing response SLA, attention views, and guarded bulk actions | Managers can review and select stale open opportunities without including won, lost, or archived records | planned |
| CRM-086 | Add bounded bulk archive workflow | Existing archive guards, stale review, and row-version contracts | Selected stale records archive atomically with closed-record protection and visible audit events | planned |
| CRM-087 | Add hygiene summary report | Existing workload, SLA, and archive audit surfaces | Teams can compare stale, unassigned, overdue, and archived counts with direct filtered pipeline navigation | planned |

| 22 | CRM-085–CRM-087 in progress | Added selectable stale-opportunity review, guarded bulk archive with active/open checks and audit activities, and a team-level pipeline hygiene summary for stale, unassigned, overdue, and archived records | CRM integration 81/81 with 421 expect calls; UI audit 179 pages/181 routes/394 datasources and diff check pass; focused archive behavior coverage and rendered acceptance remain open | Add archive behavior coverage and run authenticated rendered acceptance |

## Batch 23 — CRM retention and lifecycle controls

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-088 | Add configurable retention windows | Existing archive state, response SLA, and manager configuration | Managers can define bounded retention windows by team or record type without deleting source records | planned |
| CRM-089 | Add retention review queue | Retention configuration and archived lead surfaces | Users can review records approaching retention, filter by team and age, and preserve audit visibility | planned |
| CRM-090 | Add guarded permanent-delete workflow | Retention review, permissions, and immutable audit requirements | Permanent deletion requires explicit manager confirmation, excludes records under legal hold, and records an auditable deletion event | planned |

| 23 | CRM-088–CRM-090 in progress | Added migration 0.0.29 with bounded retention policies, CRM-owned legal holds, a permissioned archived-record review queue, guarded manager policy create/toggle controls, guarded place/remove legal-hold actions, and explicit confirmed permanent deletion with a separate deletion audit table | CRM integration 82/82 with 423 expect calls, including eligible deletion audit and legal-hold rejection; UI audit 181 pages/183 routes/396 datasources and diff check pass; rendered acceptance remains open | Run authenticated rendered acceptance and then plan the next CRM batch |

## Batch 24 — CRM customer 360 continuity

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-091 | Add customer CRM activity rollup | Existing contact linkage and engagement timeline | Customer detail shows linked CRM activity totals and latest engagement without exposing unrelated customers | planned |
| CRM-092 | Add customer pipeline health summary | Existing customer opportunity history, SLA, workload, and hygiene reports | Users can review open value, weighted value, stale count, and overdue activity count for one customer | planned |
| CRM-093 | Add customer-to-opportunity navigation filters | Existing customer detail and lead navigation contracts | Every customer summary opens the matching CRM opportunity/activity set with customer scope preserved | planned |

| 24 | CRM-091–CRM-093 in progress | Added customer-scoped CRM activity totals, planned/overdue counts, latest engagement, open value, weighted value, stale count, and overdue activity count to the existing Customer Opportunities surface while preserving partner linkage isolation | CRM integration 83/83 with 431 expect calls, including customer-to-opportunity navigation; UI audit 181 pages/183 routes/398 datasources and diff check pass; rendered acceptance remains open | Run authenticated rendered acceptance and then plan the next CRM batch |

## Batch 25 — CRM conversion operations

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-094 | Add conversion operation history | Existing lead conversion provenance and engagement timeline | Users can review conversion attempts, outcomes, actor, and source lead without duplicate history rows | planned |
| CRM-095 | Add conversion exception queue | Existing stale/closed guards and audit events | Managers can review failed or blocked conversions with actionable reason and direct lead navigation | planned |
| CRM-096 | Add conversion operations summary | Conversion history, exception queue, and CRM reporting contracts | Managers can compare converted, blocked, and retried records by team and period with permission-safe aggregates | planned |

| 25 | CRM-094–CRM-096 in progress | Added permissioned Conversion Operations history, an exception queue over blocked/failed conversion events, operation totals, and source-lead navigation | CRM integration 84/84 with 440 expect calls; UI audit 182 pages/184 routes/401 datasources and diff check pass; rendered acceptance remains open | Run authenticated rendered acceptance and then plan the next CRM batch |

## Batch 26 — CRM pipeline movement analytics

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-097 | Add stage-change history surface | Existing stage transition activities and engagement timeline | Users can review each opportunity’s stage transitions with actor, timestamp, prior/next stage, and no duplicate events | planned |
| CRM-098 | Add stage-duration analytics | Stage history and opportunity timestamps | Managers can compare average and overdue time in stage by team and salesperson without changing live pipeline data | planned |
| CRM-099 | Add probability-change audit visibility | Existing stage probability invariants and audit activities | Probability changes show source, actor, timestamp, and resulting value while preserving closed-stage rules | planned |

| 26 | CRM-097–CRM-099 in progress | Added permissioned Stage Movement history, current-stage duration analytics grouped by stage/team/salesperson, and probability-change audit visibility with source, actor, timestamp, and resulting probability | CRM integration 85/85 with 449 expect calls; UI audit 183 pages/185 routes/404 datasources and diff check pass; rendered acceptance remains open | Run authenticated rendered acceptance, then plan the next CRM batch |

## Batch 27 — CRM pipeline execution surface

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-100 | Add stage-grouped pipeline board surface | Existing lead list, stage workflow, team scope, and lead navigation contracts | Users can review open opportunities grouped by stage with count/value summaries and open the matching opportunity without exposing closed or archived records | planned |
| CRM-101 | Add next-activity visibility to pipeline records | Existing planned-activity contract, assignment, and stale/attention rules | Each open opportunity exposes its nearest planned activity, assignee, due date, and overdue state; records with no activity remain distinguishable | planned |
| CRM-102 | Add pipeline board filters and bounded stage movement entry points | CRM-100, CRM-101, existing permissioned workflow transitions | Team, salesperson, and stage filters remain consistent across board columns; permitted users can initiate a declared stage transition while closed/archived records are guarded | planned |

| 27 | CRM-100–CRM-102 in progress | Confirmed the existing shared Kanban pipeline grouped by active stage, added next planned activity type/summary/due date/assignee/overdue projection, and covered stage/team/salesperson filters plus declared workflow wiring | CRM integration 86/86 with 456 expect calls; UI audit 183 pages/185 routes/404 datasources and diff check pass; authenticated rendered board interaction remains open | Run authenticated rendered acceptance, then plan the next CRM batch |

## Batch 28 — CRM activity execution controls

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-103 | Add activity reschedule and reassignment workflow | Existing planned-activity edit mutation and assignee lookup | Users can change due date or assignee only for planned activities, with active-assignee validation and no mutation of completed history | planned |
| CRM-104 | Add activity completion with outcome note | Existing single and bulk completion actions, chatter/activity author contract | Completing an activity records an optional outcome note, preserves actor and completion time, and creates at most one chained next activity | planned |
| CRM-105 | Add activity execution summary and filters | Existing activity queue, timing projection, and follow-up reporting | Managers can compare planned, overdue, completed, and chained activities by type, team, and assignee with direct opportunity navigation | planned |

| 28 | CRM-103–CRM-105 in progress | Added migration 0.0.30 for durable activity outcome notes, exposed completed outcomes and chained/planned/overdue aggregates through a permissioned Activity Execution report with opportunity navigation, and added outcome-note forms to queue and opportunity-detail completion actions | CRM integration 87/87 with 465 expect calls; fresh/upgrade migration gates, UI audit 184 pages/186 routes/406 datasources, and diff check pass; rendered activity completion remains open | Add rendered acceptance for activity completion/rescheduling, then plan the next CRM batch |

## Batch 29 — CRM attribution and outcome analysis

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-106 | Add lead-source performance report | Existing lead-source catalog, pipeline analysis, and conversion activities | Managers can compare lead count, open value, won value, and conversion count by source with null/unknown sources retained and permission-safe aggregates | planned |
| CRM-107 | Add campaign attribution drill-down | Existing UTM campaign catalog, source fields, and opportunity navigation | Users can filter campaign results by period/team and open the matching lead set without losing campaign scope | planned |
| CRM-108 | Add win/loss outcome analysis | Existing Won/Lost workflow, lost-reason catalog, expected revenue, and stage history | Managers can compare won/lost counts, value, probability-weighted value, and loss reasons by team and salesperson without mutating pipeline records | planned |

| 29 | CRM-106–CRM-108 in progress | Confirmed the existing permissioned analysis surface provides null-safe lead-source performance, UTM campaign attribution, and Won/Lost outcome analysis with shared date/team/salesperson filters and lead drill-down actions | CRM integration 88/88 with 471 expect calls; UI audit 184 pages/186 routes/406 datasources and diff check pass; rendered report interaction remains open | Run authenticated rendered acceptance for attribution and outcome reports, then plan the next CRM batch |

## Batch 30 — CRM qualification quality controls

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-109 | Add qualification completeness view | Existing lead fields, scoring, source, and contact-link contracts | Users can identify open leads missing declared contact, source, owner, or revenue data without including closed or archived records | planned |
| CRM-110 | Add guarded qualification checklist | CRM-109, stage requirements, and stage-transition guards | Before qualification, required stage-specific fields are checked with actionable validation; failed checks do not mutate stage or probability | planned |
| CRM-111 | Add qualification conversion summary | CRM-109, conversion operations, source attribution, and stage history | Managers can compare qualified, unqualified, and rejected leads by team/source with direct lead navigation and permission-safe aggregates | planned |

| 30 | CRM-109–CRM-111 in progress | Added a permissioned Qualification Quality surface for incomplete open leads and qualification outcomes, plus a stage-aware qualification guard requiring contact, source, owner, and positive expected revenue before mutation | CRM integration 89/89 with 479 expect calls; UI audit 185 pages/187 routes/408 datasources and diff check pass; rendered validation/error and report interaction remain open | Run authenticated rendered acceptance for qualification validation and reports, then plan the next CRM batch |

## Batch 31 — CRM opportunity-to-quotation handoff

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-112 | Add quotation handoff from open opportunities | Existing opportunity detail, customer linkage, and sales quotation contract | Users can create one declared quotation draft from an open opportunity with customer and source opportunity references preserved; closed/archived opportunities are rejected | planned |
| CRM-113 | Add opportunity quotation summary | CRM-112, existing quotation/order state and amount fields | Opportunity detail exposes linked quotation count, draft/sent/confirmed state, and total value without leaking quotations from other opportunities | planned |
| CRM-114 | Add quotation-to-opportunity navigation and guards | CRM-112, shared navigation and permission contracts | Users can open the source opportunity from a quotation; quotation creation is permissioned, stale-safe, and does not change CRM stage until an explicit workflow action | planned |

| 31 | CRM-112–CRM-114 in progress | Confirmed the existing orders-permissioned quotation handoff and added an opportunity-scoped quotation summary grid with status, total, date, and reciprocal quotation navigation; source opportunity linkage and closed-stage visibility guards remain declarative | CRM integration 89/89 with 481 expect calls; UI audit 185 pages/187 routes/409 datasources and diff check pass; rendered cross-service interaction remains open | Add rendered acceptance for quotation creation and linked navigation, then plan the next CRM batch |

## Batch 32 — CRM team operating controls

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-115 | Add team pipeline operating dashboard | Existing team targets, workload, SLA, hygiene, and forecast reports | Team managers can review open value, weighted value, stale/overdue counts, workload, and target variance in one permission-scoped surface | planned |
| CRM-116 | Add team-member capacity allocation view | Existing team membership, assignment, workload, and unassigned-lead contracts | Managers can compare active-member opportunity/activity load and identify unassigned work without crossing team scope | planned |
| CRM-117 | Add guarded team operating-period filters | CRM-115, CRM-116, date-range and team filter contracts | Dashboard metrics use one explicit period and team scope, preserve unassigned buckets, and expose drill-down links with the same filters | planned |

| 32 | CRM-115–CRM-117 in progress | Added a permissioned Team Operations surface combining open/weighted value, overdue and unassigned work, wins, member capacity, and shared team/period filters with pipeline drill-down | CRM integration 90/90 with 491 expect calls; UI audit 186 pages/188 routes/412 datasources and diff check pass; rendered dashboard interaction remains open | Run authenticated rendered acceptance for team operations, then plan the next CRM batch |

## Batch 33 — CRM attention and escalation

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-118 | Add overdue-activity escalation queue | Existing activity timing, response SLA, team membership, and attention views | Managers can review overdue activities with opportunity, assignee, age, team, and escalation state; completed, closed, and archived records are excluded | planned |
| CRM-119 | Add guarded reminder/reschedule action | CRM-118, planned-activity edit contract, active assignee lookup | Authorized users can reschedule or reassign an overdue activity from the queue; stale/completed activities are rejected without partial writes | planned |
| CRM-120 | Add escalation summary by team and owner | CRM-118, team operations and activity execution aggregates | Managers can compare overdue, escalated, rescheduled, and cleared activity counts by team/owner with permission-safe drill-down | planned |

| 33 | CRM-118–CRM-120 in progress | Added migration 0.0.31 for activity escalation state/timestamp, a permissioned overdue queue excluding closed/archived opportunities, guarded planned-activity rescheduling/reassignment that marks the activity rescheduled, team/owner overdue-escalation summary aggregates, and direct opportunity navigation; registered the CRM mutation in the existing catalog | CRM integration 91/91 with 503 expect calls; fresh/upgrade migration gates, UI audit 187 pages/189 routes/414 datasources, and diff check pass; rendered escalation remediation remains open | Run authenticated rendered acceptance for escalation remediation, then plan the next CRM batch |

## Batch 34 — CRM record governance and auditability

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-121 | Add opportunity change summary | Existing stage/probability audit, activity author, commercial audit, and customer linkage | Opportunity detail shows a chronological, deduplicated summary of business-field changes with actor and timestamp, scoped to the selected opportunity | planned |
| CRM-122 | Add guarded field-change audit export | CRM-121, shared export contract, CRM read permissions | Authorized users can export the selected opportunity’s audit history; export cannot cross opportunity scope or expose unauthorized fields | planned |
| CRM-123 | Add audit retention visibility | Existing retention policies, legal holds, and deletion audit | Managers can see which opportunity audit events are retained, held, or eligible under the active policy without mutating source history | planned |

| 34 | CRM-121–CRM-123 in progress | Added a permissioned, selected-opportunity-scoped Audit Governance surface with chronological activity/change events, actor and timestamp visibility, retention/hold status, opportunity navigation, and the established dotted export action contract | CRM integration 92/92 with 509 expect calls; UI audit 188 pages/190 routes/415 datasources and diff check pass; rendered audit/export interaction remains open | Run authenticated rendered acceptance for audit scope and export, then plan the next CRM batch |

## Batch 35 — CRM communication traceability

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-124 | Add message delivery status visibility | Existing CRM chatter/message activities and template-assisted messaging | Opportunity detail distinguishes drafted, sent, failed, and replied messages with actor and timestamp; internal notes and activities are not misclassified | planned |
| CRM-125 | Add guarded message retry action | CRM-124, contact preferences, active opportunity and template contracts | Authorized users can retry only failed external messages to eligible contacts; opted-out, inactive, closed, or stale records are rejected without duplicate sends | planned |
| CRM-126 | Add communication effectiveness summary | CRM-124, activity execution, campaign attribution, and follow-up reporting | Managers can compare sent, failed, replied, and converted communications by team, salesperson, template, and campaign with scoped drill-down | planned |

| 35 | CRM-124–CRM-126 planned | BA selected message delivery traceability, safe retry, and communication effectiveness reporting as the next bounded CRM batch | Pending dev implementation and BA acceptance against message classification, contact preference enforcement, idempotency, stale safety, actor/audit integrity, aggregate scope, permissions, and rendered evidence | Implement CRM-124–CRM-126 |
