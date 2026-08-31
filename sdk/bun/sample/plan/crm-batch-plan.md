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
| CRM-024 | Add real browser acceptance for the lead → detail → activity/chatter flow | Compatible headless harness | Authenticated browser interaction proves rendered controls, mutation result, and no console errors | in progress |

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
| CRM-030 | Run clean-install, restart, migration-upgrade, and browser regression gates | All prior batch items | Fresh and upgraded installs produce identical visible CRM behavior | in progress |

## Batch execution record

| Batch | BA scope decision | Dev result | BA acceptance | Next action |
|---|---|---|---|---|
| 1 | CRM-021, CRM-022, and CRM-023 accepted; CRM-024 partial browser pass | Chrome CDP authenticated as `admin@tms.local`, rendered `/crm/leads` and the lead detail with activity/chatter/follower controls; composer mutation did not yet produce visible persisted evidence | Accepted for rendered-control discovery only; mutation/no-console gate remains open | Capture successful chatter mutation and console-free browser evidence |
| 2 | CRM-025 and CRM-026 accepted; CRM-027 remains queued | Guarded bulk stage/owner updates and read-only duplicate preview with drill-down links | Accepted: 64 CRM integration tests, 169-page/171-route UI audit, and `git diff --check` pass | Define shared import primitive for CRM-027 |
| 2 | CRM-027 dependency review | Repository search found export utilities and attachment upload only; no reusable import/CSV preview primitive exists | Not started: CRM-specific parsing is intentionally not introduced | Define and implement a generic import primitive before CRM-027 |
| 3 | CRM-028 and CRM-029 accepted | Supported ListToolbar filter bar propagates date/team/salesperson parameters to all analysis datasources; all report tables provide explicit drill-down links into filtered `/leads` views | Pending final gate after global filter implementation | Run CRM-030 clean-install, restart, upgrade, and browser gates |
| 3 | CRM-030 hardening pass | Fresh and repeated CRM migration chains reach 0.0.18 safely; DuckDB memory topology starts backend, mediator, and Vite frontend successfully; assignment action conflict was repaired; 65 tests, 169-page/171-route audit, and diff check pass | Accepted for clean-install, migration-upgrade, and restart smoke; browser gate remains queued because Playwright runtime is unavailable | Provide real browser regression evidence, then close CRM-030 |
| 3 | Pending Batch 2 | — | — | — |
