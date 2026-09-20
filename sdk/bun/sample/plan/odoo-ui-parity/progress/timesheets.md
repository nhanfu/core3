# timesheets parity progress

Module owner: timesheets module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: current working tree

## Current state

The focused Timesheets suite passes 49 tests across 14 files with 396
assertions. The initial authenticated matrix covered 13 routes at desktop and
mobile; an isolated fresh-page rerun now passes 26/26 route checks with valid
detail IDs and no page/request errors or horizontal overflow. Timesheet Analysis
exposed a missing API pivot declaration, which was fixed by adding `pivot.fields`
and reverified with authenticated Pivot/Graph/List rendering without failures. A fresh authenticated mutation smoke also completed
Draft -> Submitted -> Approved, with approval dispatching the Project-owned
hours mutation after assigning its cross-module inputs from the submitted row.
Role-boundary smoke also confirms that Fleet is denied personal, all-timesheets,
settings, and approval endpoints with the expected 403 permission errors.
Authenticated Admin create -> edit -> delete also passes, with a post-delete
edit rejected by the personal scope guard. Context-specific CRUD action names
were separated after a real global-action collision was found. The current
Odoo reference is available in `core3_reference`: paired authenticated captures
for My Timesheets, All Timesheets, and By Employee at desktop and mobile
completed 12/12 with no page/request failures. Full route and interaction
comparison remains open.

The 2026-09-20 bounded feature `TIMESHEET-CALENDAR-MULTI-CREATE` adds the
source-backed Odoo calendar multi-create lifecycle. It is covered by a durable
batch audit table, deterministic fixtures, YAML page/API separation,
`timesheets.write` and company/employee/relation guards, and file-backed
restart tests. Authenticated Core3 desktop/mobile and Odoo desktop/mobile
captures are committed under the feature evidence directory. This does not
change the module status to signed off.
Full parameterized route coverage, role-specific permissions, broader CRUD
persistence, and paired Odoo comparison remain open. No parity claim is made
here.

The current bounded feature `TIMESHEET-TASK-REPORT-BINDING` adds the
source-backed project.task report context. It owns the task page/API Print
contract, durable `timesheet_task_report_runs` persistence, deterministic
replay data, read/company/actor/stale/empty guards, and authenticated Core3
desktop/mobile evidence. The authenticated Odoo task route is reachable, but
its Actions menu has no Print item, so the paired report execution is recorded
as an exact reference blocker rather than a parity pass. This does not change
the module status to signed off.

The current bounded feature `TIMESHEET-PROJECT-REPORT-BINDING` extends the
existing project-context action from Project detail `Actions > Timesheets`.
It adds durable project report history, deterministic migration data,
read/company/actor/stale/empty guards, and authenticated Core3 desktop/mobile
evidence with HTTP 200 report actions. Authenticated Odoo project evidence is
paired at `/odoo/project/5`, where the project Actions menu has no Print item;
the source report execution is therefore an exact reference blocker. This
does not change the module status to signed off.

The current bounded feature `TIMESHEET-TASK-TIMESHEETS-REPORT` covers Odoo's
remaining `timesheet_report_task_timesheets` analytic-line renderer. It adds a
separate task-context `Print lines` page/API action, durable
`timesheet_task_lines_report_runs` persistence in migration `0.0.13`, fixed
fixtures, and read/task/empty/stale/actor/company guards with file-backed
restart coverage. The clean isolated Timesheets regression passes 53 tests /
416 expectations and the UI audit passes. Authenticated Core3 desktop/mobile
evidence is paired with authenticated Odoo task evidence; Odoo's Actions menu
has no Print action, so report execution is recorded as an exact blocker. This
does not change the module status to signed off.

## Next bounded task

Continue remaining report/context interaction and integration gates, including
the full authenticated route/action comparison, Odoo QWeb/PDF renderer parity,
and any remaining project-dashboard integration gaps.
Update this file only with evidence from the matching module owner.
