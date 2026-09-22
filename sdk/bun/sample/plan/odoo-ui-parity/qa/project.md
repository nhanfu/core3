# project QA ledger

## Conditional review handoff — exact candidate `35199401` (2026-09-13)

- Dashboard-to-Timesheets navigation contract: **PASS**. Project dashboard
  rows bind single- and double-click to `/timesheets/detail`, require
  `timesheets.read`, pass `view_scope: project_dashboard`, and retain the
  declared side-panel form page.
- Focused/regression suites, audit (659/668/1,136), Project CSS build, and
  diff-check passed.
- Blockers preserved: candidate backend readiness returned HTTP 503, so
  authenticated browser/reload/restart evidence was unavailable; Playwright/
  js_repl was unavailable; paired Odoo comparison remains pending.

Disposition: bounded Project navigation change integrated conditionally. Keep
broader Project CRUD, actor, restart, and Odoo gates open; no full module or
aggregate sign-off.

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/project-desktop.png and project-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable project assignment (pending wave dispatch)
Module owner: project module owner
Verification trigger: feature-complete
Candidate commit: c49d8cb6f19b9f9dfb96e8f99de3db1c7765c6bc

## Conditional review — PROJECT-TASK-RECURRENCE-001 (2026-09-22)

- Contract, persistence, guards, workflow, and restart coverage: **PASS** — 13
  tests and 111 assertions across recurrence and Project task relation suites.
- Build checks: Project CSS, full frontend build, and `git diff --check` pass.
- Odoo source/live reference: **PASS for bounded inspection**; authenticated
  desktop evidence is committed under the matching evidence directory.
- Core3 browser gate: **PENDING** — no Core3 desktop/mobile capture or mobile
  Odoo recurrence capture is claimed. Shared discovery is blocked by the
  unrelated Employees malformed action definition; Project-only task detail
  still requires the unregistered Timesheets service.

Disposition: conditionally accepted as a bounded recurrence workflow slice;
not full Project visual or module sign-off.

## Current regression evidence

- Repository suite: `bun test ./test --timeout 20000` — 1,045 passed, 0 failed.
- Project task, dashboard/update, grouped-stage, and permission contracts pass
  in focused reruns.
- Focused Project suite: `bun test ./test/project*.integration.test.ts --timeout 20000` — 44 passed, 0 failed, 506 assertions across 15 files.
- Authenticated module-scoped probes loaded the Project dashboard, milestone, activity, and portal surfaces with seeded IDs. Fleet user opening `/project/settings` received HTTP 403 with `Requires permission: project.settings`, with no browser errors.
- The module-scoped process namespaces routes under `/project` (for example `/project/projects`); using unprefixed `/projects` or `/project/project/settings` is invalid in that runner. Properly namespaced Project list, detail, dashboard, stages, roles, tags, activity types, and activity plans routes loaded cleanly. A dependency-aware process selecting `project,timesheets` also loaded `/project/tasks/detail?id=task-demo-002` with the timesheet datasource and no browser/request errors.
- Current dependency-aware runner `project,timesheets` on port 4039 passed all
  27 manifest routes at desktop/mobile: 54/54 with no page errors, failed
  requests, HTTP errors, blank states, or horizontal overflow.
- The detailed per-module checklist is approved at
  `qa/test-plans/project.md`; full browser CRUD, actor matrix, restart
  persistence, and paired Odoo comparison remain open.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| PROJECT-FUNC-001 | Focused functionality, dashboard, configuration, portal, task, and milestone contracts | 44 tests, 506 assertions; focused suite passed | pass |
| PROJECT-BROWSER-001 | Authenticated seeded Project route probes | 27 dependency-aware routes × desktop/mobile = 54/54; valid list/detail/dashboard/configuration states loaded | pass |
| PROJECT-CROSS-001 | Project task detail with Timesheets service dependency | `project,timesheets` process loaded `/project/tasks/detail?id=task-demo-002` with no browser/request errors | pass |
| PROJECT-PERM-001 | Non-manager cannot open Project settings | Fleet user received HTTP 403 with `Requires permission: project.settings`; browser errors 0 | pass |
| PROJECT-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Focused suite and complete dependency-aware route evidence present; full CRUD actor smoke and paired Odoo comparison remain open | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| PROJECT-RUNTIME-001 | Initial single-module task probe lacked the declared `yaml.service.timesheets` dependency | — | Dependency-aware `project,timesheets` process passed task detail; unprefixed paths remain invalid by runner design | fixed |

## Candidate slice evidence — 2026-09-13

- Scope: Project Dashboard Timesheets integration; Project consumes the
  declared Timesheets `by_project` and `project_summary` operations through
  `yaml.service.timesheets` with `timesheets.read`.
- Focused checks: `bun test ./test/project_dashboard_updates.integration.test.ts
  ./test/project_timesheets_dashboard.integration.test.ts
  ./test/project.integration.test.ts --timeout 20000` — 8 passed, 0 failed,
  100 assertions.
- Audit: `bun run audit` — 659 pages, 668 routes, 1,136 datasources; passed.
- Hygiene: `git diff --check` — passed.
- Typecheck: `bunx tsc -p tsconfig.typecheck.json --noEmit` — blocked by
  pre-existing errors in `../med`, `../packages/client`,
  `../packages/server`, and unrelated service files; no lint script is
  defined in `package.json`.
- Browser/restart evidence: not run for this contract slice; authenticated
  visual parity, restart persistence, and full actor CRUD remain pending.

## Sign-off

- Functional: pending
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off

## QA execution — candidate c49d8cb6 (2026-09-13)

- Candidate integrity: `HEAD` was exactly
  `c49d8cb6f19b9f9dfb96e8f99de3db1c7765c6bc`; worktree was clean before and
  after testing. No product files were changed.
- Dashboard/Timesheets focused checks:
  `bun test ./test/project_timesheets_dashboard.integration.test.ts
  ./test/project_dashboard_updates.integration.test.ts ./test/project.integration.test.ts
  ./test/timesheets_project.integration.test.ts ./test/timesheets_task.integration.test.ts
  --timeout 20000` — 14 passed, 0 failed, 144 assertions.
- Project/Timesheets regression corpus:
  `bun test ./test/project*.integration.test.ts ./test/timesheets*.integration.test.ts
  --timeout 20000` — 73 passed, 0 failed, 793 assertions across 24 files.
  This covered project scoping, empty/not-found/transport-error contracts,
  permission guards, CRUD validation, stale-row rejection, and migration or
  reload-equivalent persistence assertions in the relevant suites.
- Audit/hygiene: `bun run audit` passed (659 pages, 668 routes, 1,136
  datasources); `git diff --check` passed.
- Build: `bun run css:build:project` passed; `bun run frontend:build` passed
  (Vite: 183 modules transformed). No lint script is defined in
  `package.json`.
- Typecheck: `bunx tsc -p tsconfig.typecheck.json --noEmit` failed on existing
  errors in `../med`, `../packages/client`, `../packages/server`, and
  unrelated services; no error referenced the candidate Project/Timesheets
  files.
- Authenticated desktop/mobile browser proof was not executable in this
  session: the required persistent `js_repl` runner was unavailable and the
  worktree had no `playwright` package. Therefore no captures were produced
  and no visual, responsive, authenticated, restart, or paired-Odoo claim is
  made.

### QA decision

No defect was reproduced in the candidate contract/runtime checks. The
candidate slice is functionally green for the tested Project dashboard
Timesheets integration, but remains not signed off because authenticated
desktop/mobile proof, actor-matrix browser checks, restart persistence, and
paired Odoo comparison are still open.
## 2026-09-13 coordinator dispatch — bounded attachment wave

- Existing owner `agent/project-timesheets-dashboard-20260913` is assigned on
  `/home/nhanjs/projects/core3-worktrees/project-timesheets-dashboard-20260913`,
  based at `35199401`. Development event:
  `DEV-PROJECT-WAVE-20260913-R2`; QA event:
  `QA-PROJECT-WAVE-20260913-R2`; handoff commit: `b5c6cf36`.
- Scope is one Project task/project attachment contract slice: permissioned
  upload/list/download or currently exposed subset, ownership checks, safe
  missing/invalid handling, and reload-equivalent persistence with focused
  tests. Candidate pending; aggregate progress untouched. Existing owner-ledger
  edits are preserved.

## QA disposition `38e7b078`: blocked; same-owner repair required (2026-09-13)

- Do **not** integrate `38e7b078`. Project/Timesheets coverage passed **75
  tests / 817 assertions**, with attachment guards, build, audit, lint, and
  diff-check green.
- Critical defect `PROJECT-ATTACH-001`: authenticated admin context is `Core3
  Demo Company`, while task `task-demo-002` is seeded with company `Core3`.
  Live upload returns **403** `PROJECT_TASK_COMPANY_SCOPE_REQUIRED`; no live
  attachment is created, so upload/list/download persistence cannot pass.
- Repair is routed to the existing owner/worktree
  `agent/project-timesheets-dashboard-20260913` at
  `/home/nhanjs/projects/core3-worktrees/project-timesheets-dashboard-20260913`:
  align the deterministic task fixture with authenticated company context or
  use a valid company-scoped seed, then rerun authenticated upload/download and
  reload QA.
- Preserve open mobile upload completion, live restart durability, and fresh
  authenticated Odoo comparison gates. Candidate remains blocked; no duplicate
owner or product merge was created.

## Coordinator routing `38e7b078`: `PROJECT-ATTACH-001` held (2026-09-13)

The candidate remains held pending the same-owner fixture/company-context
repair. The registered owner is
`agent/project-timesheets-dashboard-20260913` at
`/home/nhanjs/projects/core3-worktrees/project-timesheets-dashboard-20260913`;
the supplied `/home/nhanjs/projects/core3-worktrees/project-20260913` path is
not registered. Do not integrate until authenticated upload/list/download and
reload retest passes. Preserve lint, restart, and Odoo blockers.

## Coordinator routing `PROJECT-ATTACH-002` (2026-09-13)

- Hold `0a20ed86`; upload/download, guards, persistence, regressions, builds,
  audit, ESLint, and diff-check pass, but normal `/api/query` and task-detail
  prefetch omit active company context and show zero attachments after upload.
- Same-module takeover is routed to the existing registered owner/worktree
  `agent/project-timesheets-dashboard-20260913` at
  `/home/nhanjs/projects/core3-worktrees/project-timesheets-dashboard-20260913`.
  Do not touch the unregistered `project-20260913` path.
- Require root-cause request/session-context and cache/detail binding repair,
  focused normal-prefetch/list and isolation regressions, a self-contained
  commit, and QA retest before integration.

## Reviewer reconciliation `b79579a6`: conditionally integrated (2026-09-13)

- The complete ordered Project attachment history is active:
  `18605b41` (attachment base), `10e441c6` (company fixture), and `d32e5aa2`
  (normal query/prefetch company context). The requested `b79579a6` change was
  represented by the final commit; no duplicate implementation was created.
- Active Project verification passed **49 tests / 546 assertions** across 17
  files; the dedicated attachment suite passed **3 tests / 25 assertions**.
  Audit passed **661 pages / 670 routes / 1161 datasources**; Project CSS and
  diff-check passed.
- QA records 76 Project/Timesheets tests, Demo/Vietnam zero-row isolation,
  normal/cached prefetch, upload/list/download, file-backed reopen/restart,
  guards, and clean desktop/mobile browser behavior.
- The combined Project/Timesheets run has four unrelated pre-existing
  Timesheets contract failures; authenticated Odoo comparison remains open.
  No Project attachment defect remains in this bounded slice.

## QA execution — Project Task Sub-tasks — 2026-09-21

- Feature: `PROJECT-TASK-SUBTASKS-001`; evidence:
  `../evidence/project/2026-09-21/project-task-subtasks-001/`.
- `bun test ./test/project_task_subtasks.integration.test.ts --timeout 30000`
  — 3 passed, 0 failed, 27 assertions. Coverage includes page/API binding,
  migration/replay, search and company scope, create/edit/delete, state and
  row-version guards, descendant protection, and file-backed reopen persistence.
- Authenticated Odoo evidence: `odoo-subtasks-1440x833.png` and
  `odoo-subtasks-390x844.png`. Core3 authenticated Projects/task-table
  evidence: `core3-project-tasks-1440x833.png` and
  `core3-project-tasks-390x844.png`; seeded child rows are visible at both
  sizes without horizontal overflow.
- Open blocker: Project-only task detail fails because the existing Timesheets
  datasource resolves `yaml.service.timesheets`, which is not registered in a
  Project-only topology. Shared all-module startup also remains blocked by the
  pre-existing Employees `employee-detail.yaml` validation error. No Project
  file was changed to conceal either blocker; task-detail browser CRUD/sign-off
  is pending a dependency/topology repair.

### QA decision

Contract, persistence, permission, workflow-guard, and Odoo reference checks
are green for this bounded slice. Browser evidence is partial and the slice
remains conditionally accepted, not full Project sign-off, until the exact
Timesheets dependency blocker is cleared and task-detail desktop/mobile CRUD
is rerun.

## QA execution — PROJECT-ALL-TASKS-001 — 2026-09-22

- Feature: missing Odoo Tasks > All Tasks action; evidence:
  `../evidence/project/2026-09-22/project-all-tasks-001/`.
- Source comparison: Odoo 19 menu `menu_project_management_all_tasks`, action
  `action_view_all_task`, path `/odoo/all-tasks`, and view order
  `list,kanban,form,calendar,activity,pivot,graph` verified in the local
  `project` addon source.
- Focused checks:
  `bun test ./test/project_all_tasks.integration.test.ts
  ./test/project.integration.test.ts ./test/project_task_detail.integration.test.ts
  ./test/project_task_subtasks.integration.test.ts
  ./test/project_task_recurrence.integration.test.ts --timeout 30000` — 15
  passed, 0 failed, 161 assertions.
- Audit/build hygiene: `bun run audit` passed with 808 pages, 817 routes, and
  1,673 datasources; `bun run css:build:project` passed; `bun run
  frontend:build` passed with 184 modules transformed; `git diff --check`
  passed.
- Browser/reference blocker: `bsk status --json` reported connected instance
  `245ea108`; `bsk tab list --scope user` showed the authenticated Odoo tab
  `1770662590` at `http://localhost:8069/odoo/contacts/9`; borrowing that tab
  timed out at the extension confirmation boundary. No authenticated Odoo or
  Core3 desktop/mobile screenshots were produced or claimed.
- Pending: authenticated menu navigation, 1440x900 and 390x844 captures,
  browser request/error checks, and runtime restart through the real route.

### QA decision

Contract, permission, deterministic query, and restart-equivalent persistence
checks pass. The slice is conditionally accepted only; visual and authenticated
runtime parity remain blocked by the unavailable borrowed tab and were not
represented as passes.

## QA execution — PROJECT-CONFIGURATION-001 — 2026-09-22

- Feature: Odoo Configuration > Projects action; evidence:
  `../evidence/project/2026-09-22/project-configuration-001/`.
- Source comparison: Odoo 19 `menu_projects_config`,
  `open_view_project_all_config`, `/odoo/project-configuration`, and
  `list,kanban,form` view order verified in the local Project addon source.
- Focused checks:
  `bun test ./test/project_configuration_action.integration.test.ts --timeout 30000`
  — 4 passed, 0 failed, 29 assertions.
- Project regression corpus:
  `bun test ./test/project*.integration.test.ts --timeout 30000` — 67 passed,
  0 failed, 690 assertions across 23 files.
- Audit/build hygiene: `bun run audit` passed with 819 pages, 828 routes, and
  1,707 datasources; `bun run css:build:project` passed; `bun run
  frontend:build` passed with 184 modules transformed; `git diff --check`
  passed.
- Browser/reference blocker: on connected instance `245ea108`, the first
  borrow of authenticated Odoo tab `1770662590` was refused because session
  `expk` already owned it. After that session disappeared, fresh session
  `ksja` waited 30 seconds for borrow confirmation and timed out. No
  credentials, cookies, tokens, or independent browser were used; no
  desktop/mobile captures were produced or claimed. Session `ksja` was
  stopped cleanly.

### QA decision

Contract, migration, CRUD, permission-boundary declarations, stale guards, and
regression checks pass. The feature is conditionally accepted only; live
authenticated desktop/mobile comparison, request-error checks, and browser
CRUD evidence remain blocked by the borrowed-tab ownership boundary.
