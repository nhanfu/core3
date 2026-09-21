# project parity progress

Module owner: project module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: c49d8cb6f19b9f9dfb96e8f99de3db1c7765c6bc

## Current state

The focused Project suite passes 44 tests across 15 files with 506 assertions.
Authenticated module-scoped probes loaded seeded dashboard, milestone,
activity, and portal screens; Fleet was denied `project.settings` with HTTP
403. The isolated runner namespaces routes under `/project`; properly
namespaced Project list, detail, dashboard, and configuration routes loaded
cleanly. A dependency-aware process selecting `project,timesheets` then loaded
`/project/tasks/detail?id=task-demo-002` and its timesheet source without
errors. Paired Odoo comparison and broader CRUD coverage remain open. No parity
claim is made here.

## Current bounded task — Project Task Recurrence / Recurring Tasks (2026-09-22)

Implemented the recurrence rule, task-form controls, Recurring Tasks action and
list, completion-generated next occurrence, guards, and file-backed replay.
Focused recurrence plus task-detail/sub-task/dependency regression coverage
passes 13 tests with 111 assertions. Odoo desktop evidence is committed under
`evidence/project/2026-09-22/project-task-recurrence-001/`.

Core3 authenticated browser evidence remains unavailable because shared startup
hits the unrelated Employees YAML validation error and Project-only task detail
requires the existing unregistered Timesheets service. No Core3 visual parity
claim is made.

## Next bounded task

Run authenticated CRUD/workflow checks and paired Odoo desktop/mobile captures;
use the dependency-aware process for Project task screens. Update this file
only with evidence from the matching module owner.

## QA checkpoint — c49d8cb6 (2026-09-13)

Candidate `c49d8cb6f19b9f9dfb96e8f99de3db1c7765c6bc` was tested in its isolated
worktree. The focused dashboard/Timesheets set passed 14/14 tests with 144
assertions. The expanded `project*.integration.test.ts` plus
`timesheets*.integration.test.ts` corpus passed 73/73 tests with 793
assertions across 24 files, including scope, permission, empty/error,
validation, stale-row, and persistence coverage. UI audit passed at 659 pages,
668 routes, and 1,136 datasources; Project CSS and the full frontend build
passed; `git diff --check` passed.

The repository typecheck remains blocked by pre-existing errors outside the
candidate files, and no lint script exists. Authenticated desktop/mobile
browser proof and captures were unavailable because this session exposed no
persistent `js_repl` runner and the worktree has no Playwright package. No
full sign-off is claimed; actor CRUD, restart persistence, and paired Odoo
comparison remain open.

## QA disposition `38e7b078` (2026-09-13)

Do not integrate the Project task-attachment candidate. QA found
`PROJECT-ATTACH-001`: admin context is `Core3 Demo Company`, but
`task-demo-002` is seeded as `Core3`, causing live upload to return 403
`PROJECT_TASK_COMPANY_SCOPE_REQUIRED` before persistence. Route fixture/company
context alignment to the existing owner `agent/project-timesheets-dashboard-20260913`
in `/home/nhanjs/projects/core3-worktrees/project-timesheets-dashboard-20260913`,
then rerun authenticated upload/download/reload QA. Mobile completion, restart,
and paired Odoo remain open; no replacement or merge was made.

## QA hold: `38e7b078` / `PROJECT-ATTACH-001` (2026-09-13)

Do not integrate: live admin company is `Core3 Demo Company`, while the seeded
task company is `Core3`, causing the attachment scope guard to reject upload.
Repair is routed to the existing owner at
`/home/nhanjs/projects/core3-worktrees/project-timesheets-dashboard-20260913`
(`agent/project-timesheets-dashboard-20260913`); the requested
`project-20260913` path is not registered. Retest upload/list/download and
reload before integration. Lint, restart, and Odoo gates remain open.

## Integrated conditional attachment repair: `b79579a6` (2026-09-13)

The complete Project attachment sequence is active as `18605b41`, `10e441c6`,
and `d32e5aa2`. Project-only verification passed 49/546 and attachment tests
passed 3/25; audit, CSS, and diff-check passed. Combined Timesheets had four
unrelated baseline failures. Odoo comparison remains open; no full Project
sign-off is claimed.

## QA hold: `0a20ed86` / `PROJECT-ATTACH-002` (2026-09-13)

Upload/download and persistence pass, but normal Project `/api/query` and task
detail prefetch omit active company context, so the browser shows zero
attachments after successful upload. Route same-module takeover to the
registered owner at
`/home/nhanjs/projects/core3-worktrees/project-timesheets-dashboard-20260913`;
do not touch unregistered `project-20260913`. Require root-cause context/cache
repair, focused prefetch/list tests, and QA retest before integration.
