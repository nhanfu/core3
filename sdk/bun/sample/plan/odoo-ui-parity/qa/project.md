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
