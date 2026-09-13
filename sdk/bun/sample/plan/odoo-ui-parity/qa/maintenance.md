# maintenance QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/maintenance-desktop.png and maintenance-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: QA-1 (single-module assignment)
Module owner: maintenance module owner
Verification trigger: feature-complete
Candidate commit: b09df475 (request-create validation)

## QA wave execution (2026-09-13)

- Candidate under test: `02bb85ec` (permissioned Maintenance Request detail
  edit slice). No product files were changed by QA.
- Focused verification: `bun test ./test/maintenance*.integration.test.ts
  --timeout 20000` — **33 passed, 322 assertions, 0 failed**, across 13
  files. This validates the declarative contracts, migration idempotency,
  request/equipment/team/category/stage/activity-type mutations, workflow
  guards, and repository-level persistence checks.
- Stable authenticated browser retry used one isolated memory runner:
  backend `http://127.0.0.1:4335`, frontend `http://localhost:3035`,
  `admin@tms.local`, Chromium via `/usr/bin/google-chrome`.
  `/maintenance/maintenance-requests` and
  `/maintenance/maintenance-requests/detail?id=maintenance-demo-001` both
  rendered at 1440x900 and 390x844 with zero console errors, page errors, or
  failed requests, and no horizontal overflow. Screenshots:
  `/tmp/core3-odoo-parity/maintenance-qa-desktop-retry.png` and
  `/tmp/core3-odoo-parity/maintenance-qa-mobile-retry.png`.
- Direct authenticated boundary checks on the same runner: unauthenticated
  request list `401 UNAUTHORIZED`; admin request list/detail `200`; ordinary
  Fleet user request list/detail `403`; Fleet request update `403` with no
  mutation. Admin invalid edit values returned `422
  MAINTENANCE_REQUEST_REQUIRED`.
- Concurrency check: a changed stale replay returned `409 STALE_RECORD` and
  did not overwrite the record. An identical stale replay returned `200`
  without changing data because the generic mutation runtime short-circuits
  unchanged updates before evaluating `expected_row_version`. This is an open
  finding against the detailed plan’s requirement that any stale update return
  `409`; QA did not modify product code.
- Browser coverage is limited to the request list/detail slice. Full menu
  traversal, browser edit/create controls, all actor/company scopes, settings,
  activities, recurrence, paired Odoo comparison, and the remaining 16-route
  matrix are not signed off.

QA decision: **conditional fail / return to developer** for the stale no-op
concurrency finding; all executed focused checks pass otherwise.

## Current regression evidence (2026-09-12)

- Focused Maintenance suite: `bun test ./test/maintenance*.integration.test.ts --timeout 20000` — 32 passed, 316 assertions, 0 failed across 12 files.
- Fresh authenticated module runner on port 4032 checked 16 registered routes
  at desktop/mobile: 32/32 passed with no page errors, failed requests,
  redirect/blank states, or horizontal overflow.
- Administrator browser workflow on `maintenance-demo-001`: clicked Cancel,
  `/api/mutate` returned 200, the action changed to Reopen Request, and the
  cancelled state remained after reload.
- Paired Odoo comparison, full browser CRUD, settings, and ordinary-user
  browser permission evidence remain open.

## Current bounded slice (2026-09-13)

- Added the permissioned `edit_maintenance_request_detail` server form and
  `maintenance.requests.update` mutation. It edits the request identity,
  description/instructions, priority, assignment, schedule, and recurrence.
- The mutation requires `maintenance.write`, rejects archived or missing
  requests, validates required fields and duplicate names, and requires the
  current `row_version`.
- `maintenance_request_edit.integration.test.ts`: 1 passed, 6 assertions;
  the update persisted `maintenance-demo-001` at row version 2 and a stale
  replay returned 409 without overwriting it.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| MAINTENANCE-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Detailed plan approved; focused contracts, route matrix, and request cancel persistence are recorded, but full CRUD and paired Odoo gates remain open | pending |
| MAINT-FUNC-003 | Request detail edit contract | `maintenance_request_edit.integration.test.ts`; authenticated admin detail render; direct update persistence and stale-write checks | API persistence and changed-value stale guard pass; browser edit control remains open |
| MAINT-PERM-003 | Ordinary Fleet user mutation boundary | Authenticated direct API on isolated runner; Fleet update returned `403` and admin record remained unchanged | pass for request update boundary; full Maintenance mutation matrix remains pending |
| MAINT-PERM-006 | Unauthenticated request boundary | Direct request-list API returned `401 UNAUTHORIZED`; authenticated admin browser request list/detail rendered | pass for tested request routes; all-route expiry/browser redirect coverage remains pending |
| MAINT-QA-001 | Identical stale update replay | Shared mutation runtime fix; Maintenance suite now verifies same payload with old `expected_row_version` returns `409 STALE_RECORD` | pass for the repaired runtime path; broader stale matrix remains pending |
| MAINT-QA-002 | Request create validation | `maintenance_request_create.integration.test.ts`; valid create persisted, duplicate/type/priority/date failures returned stable errors and created-row count stayed at one | pass in focused and full Maintenance corpus |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| MAINTENANCE-001 | Focused contracts and authenticated route/workflow smoke | 32 tests/316 assertions; 32/32 route checks; Cancel → Reopen action state persisted after reload | PASS |
| MAINT-QA-001 | Identical stale update replay bypasses row-version check | `YamlMutationRuntime` now checks concurrency before returning from an unchanged update | Maintenance retest returned `409 STALE_RECORD` for the same stale payload | FIXED |

## Sign-off

## 2026-09-13 QA verification: candidate `ab1ea2e5`

- Candidate verified at `ab1ea2e5aa7f73d59b5e45d33bd499c006e3075c` in the
  assigned worktree. QA made no product-code changes.
- Focused command `bun test ./test/maintenance*.integration.test.ts
  --timeout 20000` from `sdk/bun/sample`: **35 passed, 345 assertions, 0
  failed** across 15 files. Activity coverage proves request-detail binding,
  schedule and complete persistence, invalid type/blank summary, archived
  parent denial, and stale completion guards.
- Static checks: `bun run audit` passed (**659 pages, 668 routes, 1135
  datasources**); `git diff --check` passed; changed Maintenance test files
  linted clean. Repository `bun run lint` is **blocked by two pre-existing
  errors** at `test/website_public.integration.test.ts:31` and `:33`
  (`no-unsafe-optional-chaining`), outside this candidate diff.
- Full command `bun test ./test --timeout 20000`: **1113 passed, 1 failed**
  across 348 files / 10,514 assertions. The sole failure is unrelated:
  `Spreadsheet dashboard configuration parity > declares the dashboard Share
  action with deterministic active and revoked link fixtures`.
- Authenticated Core3 browser evidence used admin `admin@tms.local` and Chrome
  at 1440x900 and 390x844 against the isolated runtime `:3002`. Request detail
  `/maintenance/maintenance-requests/detail?id=maintenance-demo-001` rendered
  with `Activities`, the bound `Schedule activity` action, and the schedule
  modal. Both viewports had `scrollWidth === viewport width`, with zero page
  errors and zero failed requests. Captures:
  `/tmp/core3-odoo-parity/maintenance-candidate-desktop-final.png`,
  `maintenance-candidate-mobile-final.png`, and
  `maintenance-candidate-activity-modal.png`.
- Permission browser check: Fleet user `fleet@tms.local` received the
  `maintenance.read` denial page and saw no `Schedule activity` button;
  unauthenticated detail API returned `401`. Activity UI save was attempted
  but stalled, so no browser persistence claim is made; persistence is
  supported by the focused integration test only.
- Paired Odoo check: `http://127.0.0.1:8069/odoo/maintenance` was reachable but
  returned `303` to `/web/login`; no authenticated Odoo capture was available,
  so paired visual parity is not claimed.

QA decision: **conditional fail / evidence-only**. The candidate activity
slice passes focused contracts and authenticated rendering, but full
regression, repository lint, authenticated browser persistence, and paired
Odoo gates remain open. No module sign-off is issued.

## 2026-09-13 bounded DEV batch: Maintenance Request activities

- Added service-owned `maintenance_request_activities` persistence with a
  deterministic schema/index and a fixed migration fixture contract.
- Request detail now binds the activity message source and exposes the
  permissioned `Schedule activity` action. Scheduling validates active parent
  request, activity type, summary, and ISO due date; generated IDs are stable
  per request/count.
- Added permissioned activity completion with `row_version` concurrency,
  deterministic completion timestamp, and explicit not-found/stale behavior.
- Module test: `test/maintenance_request_activities.integration.test.ts` —
  schedule/complete persistence, validation, archived-parent denial, and stale
  replay coverage; **1 passed, 12 assertions**.
- Full Maintenance corpus after the slice — **35 tests, 345 assertions, 0
  failures** across 15 files.
- Browser screenshots were not claimed: the persistent Playwright surface is
  unavailable in this session. Runtime authenticated UI verification remains
  an existing blocker for the broader Maintenance matrix.

- Functional: pass for executed repository contracts and request edit/lifecycle checks; browser edit control remains unverified
- Permissions: pass for tested request read/write denial boundary; full actor/company matrix remains open
- Persistence/data integrity: pass for changed-value updates and lifecycle; identical stale no-op replay is fixed and covered
- Desktop/mobile visual parity: authenticated request list/detail smoke pass; paired Odoo comparison pending
- Tester decision: conditional; request-create validation is verified, while full CRUD, actor, integration, browser, and paired Odoo gates remain open

## 2026-09-13 bounded QA: candidate `f8e3219a`

- Candidate: `f8e3219a2e535c4732249750572a0029907a4e8d`; QA made no product-code changes.
- Focused Maintenance corpus: `bun test ./test/maintenance*.integration.test.ts --timeout 20000` — **35 passed, 345 assertions, 0 failed** across 15 files. Schedule/complete persistence, `{row.id}` request interpolation, validation, archived-parent denial, permission metadata, and stale completion guards passed.
- Browser-shaped client transport: `bunx vitest run --config ../packages/client/vitest.config.ts test/cases/maintenance-request-activities.test.ts` — **1 test passed**. It proves the schedule modal sends `request_id: request-1`, and chatter Mark done sends `id: activity-1` with `expected_row_version: 1`. An initial direct Bun invocation failed only because it omitted the jsdom/Vitest harness (`window`/`document` undefined); rerun with the repository config passed.
- `bun run audit` passed: **659 pages, 668 routes, 1140 datasources**. `git diff --check` and targeted ESLint over candidate-touched files passed clean.
- Full `bun test ./test --timeout 20000` was started but did not yield a terminal result in the bounded QA window; no full-regression pass is claimed.
- Authenticated browser blocker: distributed runtime startup exposed no backend listener at its announced port. The in-process retry exposed gateway `:4360`, but `/api/modules` returned **503** because service host `:4361` was unavailable. A `:4370` retry was stopped before login/capture. No authenticated desktop/mobile screenshot, reload-persistence, console/request, permission, or stale-guard claim is made.
- Odoo: no authenticated comparison was available; no paired Odoo evidence or visual parity claim.

QA decision: **conditional fail / evidence-only**. Repository and browser-shaped transport checks pass, but live authenticated desktop/mobile, full-regression terminal evidence, and Odoo gates remain open. No module sign-off.

## 2026-09-13 coordinator review: candidate `d858d9d2`

- Integrated only the bounded Equipment create contract and focused test as
  `409665d0` on the active branch. The ownership boundary is clean: two
  Maintenance-owned files, no migration or shared-runtime changes, and no
  unrelated worktree changes were imported.
- Post-merge focused Maintenance suite: **36 passed, 355 assertions, 0
  failures** across 16 files. `bun run audit` passed (**661 pages, 670 routes,
  1153 datasources**); `bun run css:build:maintenance` and `git diff --check`
  passed. Targeted ESLint reported 0 errors and the expected ignored-YAML
  warning; repository lint remains blocked by the two unrelated Website
  `no-unsafe-optional-chaining` errors.
- The API contract validates trimmed required names, case-insensitive
  duplicates, ISO preventive/warranty dates, non-negative interval and cost,
  and exposes the extended Equipment fields. Focused persistence and
  no-partial-insert evidence passed. The warranty-date rejection was not
  directly executed and remains a follow-up if required by the plan.
- QA remains **conditional fail / evidence-only**. Browser `js_repl`/Playwright,
  authenticated Core3 desktop/mobile create and permission evidence, and
  authenticated Odoo comparison remain unavailable. The full repository suite
  was hanging during QA and has no terminal result here. Maintenance is not
  signed off.
## 2026-09-13 coordinator dispatch — bounded Equipment repair wave

- Existing owner `agent/maintenance-request-create-wave` is assigned on
  `/home/nhanjs/projects/core3-worktrees/maintenance-request-create-wave`,
  based at `d858d9d2`. Development event:
  `DEV-MAINTENANCE-WAVE-20260913-R2`; QA event:
  `QA-MAINTENANCE-WAVE-20260913-R2`; handoff commit: `73c74bb2`.
- Scope is permissioned Equipment extended-field update persistence and the
  explicit invalid warranty-date mutation guard, with focused validation,
  scope, stale, and no-partial-update tests. Candidate pending; all existing
  ledger edits and aggregate progress are preserved.
## DEV/QA reconciliation — `DEV-MAINTENANCE-WAVE-20260913-R2` / `QA-MAINTENANCE-WAVE-20260913-R2`

- The owner handoff `73c74bb2` requested the Equipment repair, but the
  authoritative active branch already contains `409665d0` (`feat(maintenance):
  validate equipment creation`). No duplicate owner patch is required.
- Candidate scope is self-contained: `services/maintenance/api/equipment.yaml`
  and `test/maintenance_equipment_create.integration.test.ts`; current
  lifecycle coverage remains in the Maintenance-owned test set.
- QA event triggered/reconciled against the existing implementation. Active
  checkout command `bun test test/maintenance_equipment_create.integration.test.ts
  test/maintenance_equipment_lifecycle.integration.test.ts` passed **3 tests /
  26 assertions**, covering equipment fields, warranty validation, edit/
  archive/reopen behavior, concurrency, and linked-delete guards.
- Disposition: **bounded QA pass; conditionally accepted**. Broader Maintenance
  blockers remain preserved: authenticated Core3 browser evidence, authenticated
  Odoo comparison, full repository lint/type issues, full regression completion,
  broader actor/company matrix, and complete module sign-off gates.

## 2026-09-13 R2 coordinator dispatch

| Event | Owner/worktree | Bounded scope | Status |
| --- | --- | --- | --- |
| `DEV-MAINTENANCE-WAVE-20260913-R2` → `QA-MAINTENANCE-WAVE-20260913-R2` | existing `agent/maintenance-request-create-wave` in `/home/nhanjs/projects/core3-worktrees/maintenance-request-create-wave` | Maintenance Request create/edit persistence, validation, assignment relations, permissions, stale guards, and focused no-partial-write tests | dispatched in `d18abde4`; awaiting self-contained product commit before QA |

## QA disposition `b6592b87`: blocked; same-owner repair required (2026-09-13)

- Do **not** integrate `b6592b87`. Contracts and automated coverage passed
  (**37 tests / 371 assertions**), with audit/build/lint/diff-check and
  responsive rendering green.
- Critical defect `MAINT-UI-001`: authenticated admin context is `Core3 Demo
  Company`, but seeded Maintenance equipment rows use `My Company`; equipment
  edit therefore returns `Equipment belongs to another company.` Browser
  persistence cannot pass while those identities disagree.
- Repair is routed to the existing owner/worktree
  `agent/maintenance-request-create-wave` at
  `/home/nhanjs/projects/core3-worktrees/maintenance-request-create-wave`.
  Align deterministic fixtures with the authenticated company context or use a
  valid company-scoped seed, then rerun focused tests and authenticated edit/
  persistence/permission evidence before reactivating QA.
- No replacement owner was created. A direct agent lifecycle handle is not
  available in this session, so the request is recorded for the same owner and
  QA retest remains pending. Restart durability and paired authenticated Odoo
  comparison remain open.

## Reviewer reconciliation `fc5accff`: held for active-contract mismatch (2026-09-13)

- Owner QA evidence passes migration/startup and controlled restart, authenticated
  Equipment edit/reload, wrong-company/no-partial, stale 409, invalid 422,
  duplicate 409, missing 404, Fleet 403, desktop/mobile, 37 tests / 372
  assertions, builds, audit, targeted ESLint, and diff-check.
- Active verification after provisional cherry-pick passed 36/37 tests but
  failed the extended-edit contract: active `edit_maintenance_equipment`
  guards lack the expected invalid, stale, and company guard set.
- Provisional integration was reverted as `068a5db5`; no Maintenance product
  change is integrated. Same owner must rebase the complete guard contract and
  company-context fixture repair onto the active APIs, then rerun focused QA.
- Preserve open gates: unrelated Website lint errors, file-backed mutation
  restart unavailable, and Odoo redirects to `/web/login`.

## QA hold `ad654394`: activity action missing; owner-branch repair required (2026-09-13)

- QA found `MAINT-ACTIVITY-001`: `request-detail.yaml` lacks the required
  `activity_complete_action`; the focused activity check is **36 pass / 1 fail**.
- `ad654394` was tested from a detached/non-owner context and is not on the
  existing owner branch, which remains `fc5accff` in
  `/home/nhanjs/projects/core3-worktrees/maintenance-request-create-wave`.
- Same owner must bring the candidate changes onto its branch, restore/add the
  action, resolve active-contract conflicts, commit a self-contained candidate,
  and rerun full active Maintenance QA before retest. No product merge was made.
- Preserve unrelated Website lint errors, file-backed mutation restart, and
  authenticated Odoo comparison blockers.
