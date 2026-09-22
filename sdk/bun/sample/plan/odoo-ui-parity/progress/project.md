# project parity progress

Module owner: project module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: pending

## Current bounded task — Project Task Share (2026-09-22)

Implemented stable ID `PROJECT-TASK-SHARE-001`: the Odoo `portal_share_action`
task form/kanban action is now a page-id-bound Core3 server form using the
`project.task.publish` permission. A durable `project_task_shares` projection
stores normalized recipient, note, invitation intent, active state, row
version, and a fixed-date portal task link. Missing/restricted, company-scope,
stale, invalid-recipient, and duplicate guards pass, and task row versions are
advanced atomically. The focused test passes 3 tests and 22 assertions; the
full Project corpus passes 84 tests and 833 assertions.

The single required BrowserSkill borrow attempt was denied at the confirmation
boundary. No authenticated screenshot or visual-parity claim is made. Mail
delivery, portal provisioning/token side effects, collaborator removal, and
follower/chatter behavior remain open.

## Current bounded task — Project Task Duplicate (2026-09-22)

Implemented stable ID `PROJECT-TASK-DUPLICATE-001`: the Odoo task-kanban
`type="object" name="copy"` action is now a page-id-bound Core3 task-detail
action using `project.write`. It creates a durable active `Task (copy)`, resets
workflow state/deadline/spent time, recursively copies active child tasks with
remapped parents, refreshes subtask summaries, and advances the source row
version atomically. Active-record, company-scope, stale-version, and
file-backed persistence checks pass in `test/project_task_duplicate.integration.test.ts`
(3 tests, 20 expectations).

The full Project corpus passes 87 tests with 853 expectations; audit, Project
CSS, frontend build, and diff-check pass. BrowserSkill borrow confirmation
timed out for the existing Odoo tab in session `urpe`; that session was stopped
cleanly. No authenticated visual-parity claim is made. Evidence is under
`evidence/project/2026-09-22/project-task-duplicate-001/`.

## Prior bounded task — Project form Convert to Template (2026-09-22)

Implemented stable ID `PROJECT-TEMPLATE-CONVERSION-001`: the manager-bound
Project detail action now creates a durable template copy with top-level task
templates, archives the source project atomically, and exposes the action only
for active non-template records. Migration replay, file-backed reopen, missing/
invalid/unconfirmed/stale/replay guards, and page/API separation pass in
`test/project_template_conversion.integration.test.ts` (4 tests, 27
assertions).

BrowserSkill instance `245ea108` was connected, but authenticated Odoo tab
`1770662590` was already borrowed by session `ssyn`; this worker's borrow was
denied with `reason=borrow_conflict`. Own session `owvj` was stopped cleanly.
No desktop/mobile captures or visual-parity claim is made. Odoo undo conversion,
template-to-project creation, and full task-template/subtask mapping remain
separate follow-up scope.

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

## Current bounded task — Project form Share Project (2026-09-22)

Implemented stable ID PROJECT-SHARE-PROJECT-001: the Project detail page/API
now exposes a manager-only Share Project server form backed by durable
project_shares rows and migration 20260922140000-021-project-share-project.yaml.
Focused coverage passes 3 tests with 17 assertions, including normalized
recipient persistence, fixed-date replay data, project row-version increment,
and missing/restricted/stale/duplicate/invalid guards.

Authenticated Odoo/Core3 desktop/mobile evidence is blocked by the shared
BrowserSkill tab ownership/confirmation boundary. No visual-parity claim is
made; email delivery, portal-user provisioning, collaborator removal, and full
portal-sharing behavior remain outside this bounded slice.

## Next bounded task

Select the next source-backed Project form or embedded workflow action after
Task Share, preserving the open authenticated browser and dependency topology
gates.

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
