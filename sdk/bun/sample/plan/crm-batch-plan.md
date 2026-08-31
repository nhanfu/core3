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
| 7 | CRM-040–CRM-042 completion pass | Added guarded rule configuration, scored lead CTE with Hot/Warm/Cold grade, and minimum/maximum score filters; UI audit passes at 171 pages/173 routes and CRM integration passes 65/65 | Accepted: bounded rule CRUD, deterministic grade, and permissioned score-range filtering pass structural and integration gates | Plan the next CRM feature batch |
