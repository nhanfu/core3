# timesheets parity progress

Module owner: timesheets module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: current working tree

## Current state

The focused Timesheets suite passes 45 tests across 13 files with 375
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

## Next bounded task

Continue remaining report/context interaction and integration gates, including
the project report binding and full authenticated route/action comparison.
Update this file only with evidence from the matching module owner.
