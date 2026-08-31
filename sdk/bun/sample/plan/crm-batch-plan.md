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

| 35 | CRM-124–CRM-126 in progress | Added migration 0.0.32 for message delivery status/attempt metadata, a permissioned Communications surface, failed-message retry guarded by active/open opportunity scope and email opt-in, and effectiveness aggregates by team, salesperson, and campaign; template-assisted messages persist initial sent metadata | CRM integration 94/94 with 521 expect calls; fresh/upgrade migration gates, UI audit 189 pages/191 routes/417 datasources, and diff check pass; rendered communication acceptance remains open | Run authenticated rendered acceptance for delivery status, retry, and effectiveness, then plan the next CRM batch |

## Batch 36 — CRM scoring transparency and governance

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-127 | Add lead-score explanation detail | Existing configurable scoring rules and calculated score/grade | Lead detail shows each active rule contribution and the resulting score/grade using the same deterministic calculation as pipeline lists | planned |
| CRM-128 | Add score recalculation audit | CRM-127, activity author/timestamp and immutable audit contracts | A score recalculation records rule-set version, prior/new score, actor, and timestamp without changing unrelated lead fields | planned |
| CRM-129 | Add score governance report | CRM-127/128, team and source reporting filters | Managers can compare score distribution, grade, rule contribution, and conversion outcomes by team/source with permission-safe drill-down | planned |

| 36 | CRM-127–CRM-129 in progress | Added a permissioned Scoring Governance surface with deterministic rule-contribution explanations, Hot/Warm/Cold governance aggregation, shared team/source filters, versioned score-audit history, and a cataloged recalculation action that does not mutate lead business fields | CRM integration 95/95 with 534 expect calls; fresh/upgrade migration gates, UI audit 190 pages/192 routes/422 datasources, and diff check pass; rendered scoring acceptance remains open | Run authenticated rendered acceptance for explanations and recalculation, then plan the next CRM batch |

## Batch 37 — CRM data quality and normalization

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-130 | Add contact-data quality view | Existing contact linkage, duplicate preview, qualification completeness, and lead search | Users can identify invalid/missing email, phone, and customer linkage on active CRM records without exposing unrelated contacts | planned |
| CRM-131 | Add guarded contact-data normalization | CRM-130, contact permissions, stale row-version and audit contracts | Authorized users can normalize declared email/phone formats or link an active contact; invalid values and stale records fail atomically with an audit event | planned |
| CRM-132 | Add data-quality remediation summary | CRM-130/131, team/source reporting and audit surfaces | Managers can compare quality issues, remediated records, and unresolved records by team/source with scoped drill-down and no closed-record mutation | planned |

| 37 | CRM-130–CRM-132 in progress | Added a permissioned active-record Data Quality surface classifying missing customer, invalid email/phone, inactive contact links, and complete records, plus team/source issue summaries and a format/contact/open-record guarded normalization form that records a `data_quality` activity with actor/timestamp | CRM integration 96/96 with 544 expect calls; UI audit 191 pages/193 routes/424 datasources and diff check pass; rendered quality acceptance remains open | Run authenticated rendered acceptance for quality review and normalization |

## Batch 38 — CRM forecast accuracy and learning

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-133 | Add forecast-versus-outcome comparison | Existing immutable forecast snapshots, Won/Lost outcomes, and date/team filters | Managers can compare captured weighted value with realized won value by snapshot period/team without mutating snapshots or live opportunities | planned |
| CRM-134 | Add forecast variance explanation | CRM-133, stage/probability history and opportunity audit | Each material variance identifies stage, probability, revenue, or close-date changes with actor/timestamp evidence scoped to the opportunity | planned |
| CRM-135 | Add forecast learning summary | CRM-133/134, source/campaign and salesperson reporting | Managers can review forecast accuracy, variance causes, and sample size by team/source/owner with low-sample labeling and safe drill-down | planned |

| 38 | CRM-133–CRM-135 in progress | Added a permissioned Forecast Accuracy surface comparing immutable snapshot weighted value with realized Won value, variance, snapshot sample size, and low-sample evidence under shared team/date filters, plus snapshot-to-current variance-cause detail for stage/probability/revenue/close timing changes | CRM integration 97/97 with 556 expect calls; UI audit 192 pages/194 routes/427 datasources and diff check pass; rendered forecast acceptance remains open | Run authenticated rendered acceptance for accuracy and variance causes, then plan the next CRM batch |

## Batch 39 — CRM search and saved-view governance

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-136 | Add advanced pipeline search facets | Existing lead search, stage/team/source/score filters, and shared datasource transport | Users can combine declared text, stage, owner, team, source, campaign, score, and activity-state facets with consistent results across list and Kanban views | planned |
| CRM-137 | Add permissioned saved CRM views | Existing favorites contract and user/team scope | Users can save, rename, apply, and remove personal or manager-shared views without exposing another team’s private filters | planned |
| CRM-138 | Add saved-view usage and stale-filter handling | CRM-136/137, archived fields and schema evolution conventions | Invalid or retired filter values are surfaced and safely cleared; managers can review view usage without mutating lead records | planned |

| 39 | CRM-136–CRM-138 in progress | Added an activity-state facet and local lookup to the shared CRM pipeline source, preserving the existing declared facets and saved favorites for list/Kanban consistency | CRM integration 98/98 with 560 expect calls; UI audit 192 pages/194 routes/428 datasources and diff check pass; permissioned saved-view persistence, stale-filter handling, and rendered search acceptance remain open | Add saved-view governance and stale-filter handling |

## Batch 40 — CRM saved-view persistence contract

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-139 | Add shared saved-view persistence contract | Existing static favorites renderer and generic YAML action/data contracts | A reusable, user/team-scoped saved-view record supports filters, grouping, label, owner, visibility, and version without CRM-specific storage | planned |
| CRM-140 | Consume saved-view persistence for CRM pipeline | CRM-139, existing pipeline facets and permissions | Users can create, rename, apply, and remove personal or manager-shared CRM views with ownership and team-scope enforcement | planned |
| CRM-141 | Add stale-view migration and usage visibility | CRM-140, schema evolution and audit conventions | Retired fields are reported and safely removed from applied filters; managers can inspect view usage and last-applied time without changing leads | planned |

| 40 | CRM-139–CRM-141 in progress | Added the generic base-service `ui_saved_views` persistence schema plus a reusable Saved Views page with scoped list/create/edit/delete declarations, owner/team visibility, versioned JSON filters, grouping, usage counts, timestamps, owner/shared edit-delete guards, authenticated owner defaults, and CRM shared/private-view loading | CRM integration 100/100 with 571 expect calls; UI audit 193 pages/195 routes/430 datasources and diff check pass; runtime ownership enforcement, stale-filter handling, and rendered acceptance remain open | Add version-aware filter metadata and run the configured client/browser harness |

## Batch 41 — CRM saved-view runtime binding

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-142 | Add shared ListView saved-view datasource binding | Batch 40 generic persistence and existing static favorites renderer | A ListView can load saved views by resource/user/team scope while retaining static YAML favorites as fallback | planned |
| CRM-143 | Bind CRM pipeline to persisted saved views | CRM-136 facets, Batch 40 scope guards, shared ListView binding | CRM users can save/apply/remove pipeline views and see only personal or authorized shared views | planned |
| CRM-144 | Add stale-filter reconciliation | CRM-143, datasource/filter metadata and versioning | Applying a view with retired fields reports the stale filters, removes only invalid predicates, and preserves valid filters with an auditable update | planned |

| 41 | CRM-142–CRM-144 in progress | Added generic `saved_views_source` ListView support that merges persisted views with static favorites, bound the CRM pipeline to shared persisted views filtered by resource/visibility, and reconciles unknown or older-version filter fields while visibly labeling stale views | CRM integration 100/100 with 572 expect calls; UI audit 193 pages/195 routes/430 datasources and diff check pass; standalone client test invocation lacks its DOM harness (`document is not defined`), while runtime ownership enforcement and rendered acceptance remain open | Run the configured client/browser harness |

## Batch 42 — CRM saved-view application governance

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-145 | Add an explicit saved-view apply contract | Batch 41 runtime binding and shared mutation transport | Applying a persisted view is a declared, permissioned operation that records `last_applied_at` and increments `usage_count` without changing lead data | planned |
| CRM-146 | Enforce shared-view team scope | CRM-145, authenticated user/team context and saved-view ownership | Private views remain owner-only; shared views are visible only to the owner’s authorized team scope; cross-team rows are excluded at the datasource boundary | planned |
| CRM-147 | Expose usage governance with safe ordering | CRM-145/146, Saved Views page | Managers can order and inspect usage/last-applied metadata while edit/delete ownership guards remain unchanged | planned |

| 42 | CRM-145/CRM-146 implemented; CRM-147 pending rendered acceptance | Added the generic permissioned `ui.saved_views.apply` mutation with owner/shared guards, atomic usage-count increment, and `last_applied_at` recording; CRM pipeline saved-view loading now excludes team-scoped shared views unless the authenticated user is an active member of that team, and persisted favorite selection invokes the apply mutation while Base remains service-neutral | CRM integration 100/100 with 576 expect calls; UI audit 193 pages/195 routes/430 datasources, client TypeScript check, and diff check pass; rendered apply/usage interaction remains open | Run authenticated rendered acceptance for apply, usage ordering, and cross-team exclusion |

## Batch 43 — CRM saved-view lifecycle versioning

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-148 | Increment filter version on saved-view edits | Batch 41 stale-filter binding and shared mutation runtime | Editing filters advances the persisted version atomically; unchanged edits do not create false version changes; stale labels remain deterministic | planned |
| CRM-149 | Preserve version concurrency during edits | CRM-148, existing row/version mutation conventions | Concurrent edits fail with the standard stale-record response and cannot overwrite a newer filter definition | planned |
| CRM-150 | Add lifecycle evidence to Saved Views governance | CRM-148/149, usage metadata and Saved Views page | Managers can distinguish the current filter version from usage metadata without changing view ownership or visibility rules | planned |

| 43 | CRM-148–CRM-150 implementation pass | Added generic `increment_fields` support to YAML update mutations, applied it to advance saved-view `filter_version` only when fields change, added DuckDB-compatible migration 0.0.5 plus `row_version` projection/concurrency wiring for stale-edit protection, and exposed filter version in Saved Views governance | CRM integration 102/102 with 584 expect calls, including executable changed/unchanged/stale-edit behavior and fresh/replay Base migration coverage; UI audit 193 pages/195 routes/430 datasources and diff check pass; rendered edit/concurrency acceptance remains open | Run authenticated rendered acceptance for version increments and stale concurrent edits |

## Batch 44 — CRM lead acquisition and nurture

Odoo CRM reference gap: the official CRM overview includes lead generation/nurturing, lead enrichment, and lead distribution alongside pipeline, activities, and scoring. These are the next feature targets; AI remains out of scope.

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-151 | Add bounded lead-nurture sequences | Existing activity plans, activity types, due-date rules, and open-record guards | Managers can define an ordered, active nurture sequence; applying it creates only declared future activities, preserves assignee/team scope, and rejects closed or stale leads atomically | planned |
| CRM-152 | Add lead-enrichment review and guarded update | Existing contact linkage, data-quality normalization, and audit activity contract | Users can review declared enrichment fields for an active lead, apply only validated values, and see actor/timestamp evidence without overwriting unrelated fields | planned |
| CRM-153 | Add permissioned lead-distribution report | Existing assignment rules, team membership, assignment activities, and workload reports | Managers can compare assigned, unassigned, rule-matched, manually assigned, and aged leads by team/owner with safe drill-down and closed-record exclusion | planned |

| 44 | CRM-151–CRM-153 implementation pass | Added explicit nurture classification to activity plans and a guarded, idempotent ordered nurture-application workflow with audit activity; exposed nurture classification in CRM configuration; added permissioned Lead Enrichment with server-authoritative contact-name synchronization and Lead Distribution pages; extended external alias intake with `intake_channel`, `received_at`, and `origin_team` provenance; registered routes/menus, cataloged CRM mutations, and added executable nurture ordering/retry plus enrichment/intake persistence coverage | CRM integration 107/107 with 607 expect calls; UI audit 195 pages/197 routes/434 datasources and diff check pass; rendered nurture, enrichment, distribution, and intake interaction remains open | Run authenticated rendered acceptance for nurture, enrichment, distribution, and intake |

## Batch 45 — CRM lead acquisition channels

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-154 | Add bounded lead-mining intake | Existing CRM lead schema, contact lookup, source catalog, and import validation | Authorized users can submit a declared lead-mining request with source/industry/location criteria, receive a reviewable candidate set, and cannot create leads before explicit selection | planned |
| CRM-155 | Add referral/reseller attribution | Existing partner linkage, source/campaign fields, and audit activity contract | An opportunity can record a validated referring partner, and pipeline/report surfaces retain referral attribution without changing ownership or exposing unrelated contacts | planned |
| CRM-156 | Harden external lead-intake provenance | Existing team email alias capture and import lifecycle | Email/form-origin leads retain channel, source, campaign, received timestamp, and originating team; inactive channels fail without partial lead creation | planned |

| 45 | CRM-154–CRM-156 implementation pass | Added a review-only Lead Mining request/candidate surface over active contacts, with explicit criteria, candidate review, guarded explicit lead creation, linked provenance, and duplicate-active-lead rejection; added referral attribution fields and migration 0.0.36 with guarded referring-contact audit; extended external alias intake with durable channel/received/origin-team provenance and cataloged the CRM mutations | CRM integration 110/110 with 623 expect calls; UI audit 196 pages/198 routes/436 datasources and diff check pass; rendered mining, referral, and intake interaction remains open | Run authenticated rendered acceptance for request review, candidate conversion, referral attribution, and external intake |

## Batch 46 — CRM customer and account relationships

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-157 | Add customer-account relationship surface | Existing base contacts, customer opportunities, and CRM read permissions | Authorized users can review active companies and related people/opportunities with company-scoped counts and no cross-customer leakage | planned |
| CRM-158 | Add guarded contact relationship assignment | CRM-157, active contact linkage, stale-safe mutation and audit activity contracts | Authorized users can assign or revise a declared contact-to-company relationship only for active records, with duplicate/self-link rejection and actor/timestamp evidence | planned |
| CRM-159 | Add account opportunity rollup | CRM-157/158, opportunity totals and team filters | Managers can compare account open, weighted, won, and overdue-activity totals and drill into only that account’s opportunities without mutating pipeline records | planned |

| 46 | CRM-157–CRM-159 implementation pass | Added CRM Customer Accounts and Account Detail surfaces, active company/contact relationship storage with guarded duplicate/self-link validation, account-scoped opportunity rollups, and guarded relationship create/edit/remove actions; registered the CRM mutation and datasource declarations, surfaced the previously unregistered CRM pages in the manifest, and added declaration coverage | CRM integration 112/112 with 652 expect calls; discovery audit 199 pages/201 routes/446 datasources, catalog consistency, migration, and diff checks pass; rendered account/relationship acceptance remains open | Run authenticated rendered acceptance for account rollups, relationship creation/edit/removal, duplicate/self-link rejection, and scoped opportunity drill-down |

## Batch 47 — CRM funnel and conversion performance

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-160 | Add stage funnel analysis | Existing active pipeline stages, probability, and team/date filters | Managers can compare lead count, expected value, and weighted value by stage with closed/archived exclusion and consistent team/date scope | planned |
| CRM-161 | Add source conversion cohorts | Existing source/campaign attribution and Won/Lost outcome history | Managers can compare source cohorts by created, qualified, won, conversion rate, and realized value while retaining unattributed records | planned |
| CRM-162 | Add salesperson conversion velocity | Existing owner assignment, stage history, and activity completion contracts | Managers can compare owner throughput, average days to win/loss, open workload, and overdue follow-up counts with safe owner/team filtering | planned |

| 47 | CRM-160–CRM-162 implementation pass | Added Funnel Analysis with stage funnel, source conversion cohorts, and salesperson conversion velocity reports using shared team/date/owner scope; registered the CRM route/menu and added declaration coverage | CRM integration 112/112 with 647 expect calls; discovery audit 199 pages/201 routes/446 datasources and migration, catalog-consistency, and diff checks pass; rendered funnel/report acceptance remains open | Run authenticated rendered acceptance for shared filters, unattributed cohorts, and report drill-down |

## Batch 48 — CRM activity execution readiness

Odoo CRM reference: activities are follow-up tasks tied to leads and opportunities, visible in the activity view/calendar, and completing an activity keeps the pipeline current by enabling the next activity. AI work remains out of scope.

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-163 | Add activity outcome classification | Existing planned/done activity lifecycle and outcome-note storage | Users can classify a completed activity outcome from the declared catalog, retain the note and actor/timestamp, and reject invalid outcomes without changing the opportunity | planned |
| CRM-164 | Add follow-up readiness queue | CRM-163, next-activity chaining and overdue rules | Users can identify completed interactions with no next activity, overdue follow-ups, and ready-to-schedule records with direct opportunity navigation and closed-record exclusion | planned |
| CRM-165 | Add activity execution drill-down | CRM-163/164, team/owner reporting filters and calendar view | Managers can compare outcome, completion, overdue, and chained-follow-up rates by activity type/team/owner with the same scope as the activity queue | planned |

| 48 | CRM-163–CRM-165 implementation pass | Added durable activity outcome classification to the edit contract, a closed-record-safe Follow-up Readiness queue for missing/overdue next activities, and scoped activity outcome/chaining aggregates; registered the route/menu and added declaration coverage | CRM integration 113/113 with 660 expect calls; discovery audit 200 pages/202 routes/448 datasources and migration, catalog-consistency, and diff checks pass; rendered activity/readiness/calendar acceptance remains open | Run authenticated rendered acceptance for outcome completion, readiness filtering, and activity/report drill-down |

## Batch 49 — CRM reseller and partner operations

Odoo CRM reference: reseller workflows and partner autocomplete support partner-led opportunity acquisition and partner-linked pipeline management. Existing Core3 records a referring contact but lacks the operating and performance surfaces; AI work remains out of scope.

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-166 | Add reseller/partner directory | Existing active contacts, account relationships, referral attribution, and CRM permissions | Authorized users can review active partner contacts/companies, referral counts, open pipeline value, and latest referral activity without exposing inactive contacts | planned |
| CRM-167 | Add referral performance analysis | CRM-166, source/cohort reporting and Won/Lost outcomes | Managers can compare referrals by partner, source, team, and period using created, open, won, conversion-rate, and realized-value measures with unattributed records retained | planned |
| CRM-168 | Add partner-scoped opportunity drill-down | CRM-166/167, customer opportunity scope and lead navigation | Users can open only opportunities attributed to the selected partner, preserve partner context, and exclude closed/archived records according to the selected view | planned |

| 49 | CRM-166–CRM-168 implementation pass | Added a permissioned partner directory with referral/open-pipeline rollups, referral performance cohorts by partner/source/team/period, and partner-scoped opportunity navigation; registered the CRM route/menu and added declaration coverage | CRM integration 114/114 with 670 expect calls; discovery audit 201 pages/203 routes/452 datasources and migration, catalog-consistency, and diff checks pass; rendered partner acceptance remains open | Run authenticated rendered acceptance for partner search, performance filters, and scoped opportunity drill-down |

## Batch 50 — CRM salesperson achievement

Odoo CRM reference: CRM includes gamification alongside pipeline, activities, and forecasts. Existing Core3 has targets and workload reports but no transparent achievement view; AI work remains out of scope.

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-169 | Add salesperson achievement leaderboard | Existing won/lost outcomes, completed activities, and team membership | Authorized users can compare transparent points, won value, wins, completed activities, and overdue follow-ups by active salesperson with team scope | planned |
| CRM-170 | Add achievement period/team filters | CRM-169, shared report filter conventions and target periods | Leaderboard metrics use one explicit period/team scope, retain zero-activity members, and do not mutate CRM records | planned |
| CRM-171 | Add achievement explanation detail | CRM-169/170, activity and opportunity navigation | Each score exposes its component counts/value and direct scoped navigation so users can understand and verify the ranking | planned |

| 50 | CRM-169–CRM-171 implementation pass | Added a permissioned, read-only salesperson achievement leaderboard with explicit points from wins, won value, and completed activities, active-member/team/period filters, and activity-type explanation detail; registered the CRM route/menu and declaration coverage | CRM integration 115/115 with 678 expect calls; discovery audit 202 pages/204 routes/455 datasources and migration, catalog-consistency, and diff checks pass; rendered achievement acceptance remains open | Run authenticated rendered acceptance for period/team filters and score explanation review |

## Batch 51 — CRM partner autocomplete and contact review

Odoo CRM reference: partner autocomplete supports selecting an existing customer while creating or editing CRM records, and CRM links opportunities back to the selected partner. Existing Core3 has lookup sources and customer opportunity pages but lacks a dedicated search/review surface and duplicate-safe contact selection contract.

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-172 | Add scoped partner search surface | Existing active base contacts, customer accounts, and CRM read permissions | Sales users can search active people/companies by name, email, phone, and location, with company/person type visible and inactive contacts excluded | planned |
| CRM-173 | Add duplicate-safe partner selection | CRM-172, lead customer linkage and active-contact guards | Authorized users can select an existing active partner for an open lead, reject inactive/invalid contacts, and preserve the server-authoritative partner name | planned |
| CRM-174 | Add partner contact opportunity review | CRM-172/173, customer opportunities and relationship scope | Users can open opportunities for the selected partner/contact with customer scope preserved and no unrelated records exposed | planned |

| 51 | CRM-172–CRM-174 implementation pass | Added a permissioned active-partner search surface covering name/email/phone/location, active-opportunity counts, and partner-scoped customer-opportunity navigation; existing guarded lead-linking and authoritative partner-name contracts remain the selection path | CRM integration 116/116 with 684 expect calls; discovery audit 203 pages/205 routes/456 datasources and migration, catalog-consistency, and diff checks pass; rendered partner search/selection acceptance remains open | Run authenticated rendered acceptance for partner search, guarded lead linking, inactive-contact rejection, and opportunity scope |

## Batch 52 — CRM duplicate resolution governance

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-175 | Add duplicate conflict review | Existing duplicate detection and duplicate preview contracts | Authorized users can review grouped duplicate candidates with match reason, record state, owner, customer, and safe lead navigation while excluding unrelated records | planned |
| CRM-176 | Add explicit merge field resolution | CRM-175, deterministic merge survivor and stale/open-record guards | Users can choose the survivor and declared field values before merge; closed/archived or stale selections fail atomically and no unrelated fields are overwritten | planned |
| CRM-177 | Add merge governance evidence | CRM-176, merge audit activity and conversion operations | Each completed merge exposes survivor, merged records, actor, timestamp, and retained field provenance for later review | planned |

| 52 | CRM-175–CRM-177 implementation slice | Extended duplicate review with survivor/candidate names, stages, and owners, and added migration 0.0.40 plus durable merge-audit rows recording survivor, merged record, actor, timestamp, and retained-field provenance before deterministic merge deletion; added declaration and executable audit coverage | CRM integration 117/117 with 691 expect calls; discovery audit 203 pages/205 routes/456 datasources, migration, catalog-consistency, and diff checks remain green; explicit survivor/field selection and rendered duplicate-resolution acceptance remain open | Add explicit survivor/field selection, then run authenticated rendered review |

## Batch 53 — CRM explicit merge selection

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-178 | Add pairwise merge review form | Batch 52 conflict fields and merge audit | Users can choose a specific survivor and duplicate from a reviewed pair, inspect all declared merge fields, and receive a scoped preview before mutation | planned |
| CRM-179 | Add explicit field-value resolution | CRM-178, existing first-non-empty merge behavior and lead field contracts | Users can choose survivor/duplicate values for declared customer, contact, attribution, owner, team, tags, and revenue fields; unselected values are never overwritten | planned |
| CRM-180 | Add merge provenance detail | CRM-179, `crm_merge_audit` storage and opportunity audit surfaces | Completed merges show chosen survivor, duplicate, each retained field/value source, actor, timestamp, and linked opportunity navigation | planned |

| 53 | CRM-178–CRM-180 implementation pass | Added a pairwise duplicate-resolution form requiring explicit survivor/duplicate IDs and declared customer, contact, attribution, owner/team, tags, revenue, and retained-provenance values; added open/distinct guards, activity transfer, explicit merge audit, safe duplicate deletion, and numeric input casting | CRM integration 118/118 with 699 expect calls, including executable pairwise survivor selection, field resolution, activity transfer, audit provenance, and deletion; discovery audit 203 pages/205 routes/456 datasources, migration, catalog-consistency, and diff checks pass; rendered duplicate-resolution acceptance remains open | Run authenticated rendered review for preview, field choices, stale guards, and provenance detail |

## Batch 54 — CRM campaign and source governance

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-181 | Add campaign lifecycle workspace | Existing campaign/source catalogs and attribution reports | Authorized users can review active campaigns with source/medium, date window, owner, active state, and attributed lead counts without changing lead records | planned |
| CRM-182 | Add guarded campaign status controls | CRM-181, configuration permissions and attribution integrity | Managers can activate/deactivate a campaign only with valid bounded dates and cannot deactivate a campaign referenced by protected reporting history without an explicit reason | planned |
| CRM-183 | Add campaign attribution quality review | CRM-181/182, null-safe source/cohort reporting and data-quality contracts | Managers can identify unattributed, malformed, expired, and valid campaign attribution with scoped lead navigation and no closed-record mutation | planned |

| 54 | CRM-181–CRM-183 implementation pass | Reused the existing guarded campaign configuration controls, added migration 0.0.41 for campaign status reasons and required a reason on campaign status changes, and added a permissioned campaign workspace with attributed/won/value rollups plus active/inactive/unknown/incomplete/unattributed attribution-quality review; registered the CRM route/menu and declaration coverage | CRM integration 120/120 with 712 expect calls, including campaign status-reason persistence and blank-reason rejection; discovery audit 204 pages/206 routes/459 datasources and migration, catalog-consistency, and diff checks pass; rendered campaign governance acceptance remains open | Run authenticated rendered campaign review |

## Batch 55 — CRM team visibility governance

| ID | Feature item | Dependency | Acceptance evidence | Status |
|---|---|---|---|---|
| CRM-184 | Add reusable CRM team-scope contract | Existing active team membership, authenticated user context, and report datasource conventions | CRM pages can declare user-team scope once and consistently distinguish own-team, manager-all-team, and unassigned records without duplicating ad hoc predicates | planned |
| CRM-185 | Enforce team scope on CRM reads | CRM-184, lead/activity/customer/report surfaces and manager permissions | Non-manager users cannot read another team’s CRM records through lists, reports, drill-downs, or saved views; managers retain declared all-team access | planned |
| CRM-186 | Add visibility exception audit | CRM-184/185, existing audit activity and governance surfaces | Scope overrides and manager access are reviewable with actor, team, reason, timestamp, and affected route/resource without exposing record contents beyond permission | planned |

| 55 | CRM-184–CRM-186 implementation slice | Added a permission-derived `can_manage_crm` query parameter to page/source loading, reusable `team_scope` datasource metadata/runtime filtering for team-bearing reports, and manager-aware team-membership predicates on primary leads, planned activities, customer opportunities, archived/detail reads, activity readiness/reporting, referral performance, pipeline hygiene, qualification, stage movement, achievement, target attainment, Pipeline Analysis, distribution, forecast, team operations, activity execution, escalations, communications, follow-up, scoring, quality, expected revenue, and lead-distribution reports; preserved unassigned visibility and manager all-team access | CRM integration 121/121 with 738 expect calls; discovery audit 204 pages/206 routes/459 datasources and migration, catalog-consistency, and diff checks pass; remaining non-team-shaped report exceptions and exception audit remain open | Add the team-visibility exception audit and verify every intentional global/admin report |
