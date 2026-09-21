# QA inventory

Feature: `TIMESHEET-TASK-ACTION-PIVOT-VIEW-001`

Claims under test:

- Odoo's task Timesheets action retains its Pivot view for internal users.
- Core3 exposes task-scoped employee/date Pivot rows with durable Time Spent
  and Timesheet Costs measures.
- Page/API separation, permission/company scope, guarded CRUD, stale-write
  protection, and migration/restart persistence remain intact.

Control/state checks:

- Desktop task Timesheets route: List, Kanban, Calendar, Pivot, and Graph;
  Pivot defaults to employee rows, work-date columns, and two measures.
- Mobile task Timesheets route: Pivot is explicitly desktop-only and the
  responsive List/Calendar states remain available.
- Exploratory scenario 1: foreign-company, missing-task, and empty fixtures
  return no Pivot rows.
- Exploratory scenario 2: create a task entry, verify its cost measure, apply
  one valid edit, reject a stale edit, and reopen the database.

Evidence expected: source comparison, focused integration output, bounded
Core3/Odoo runtime probes, and explicit blockers when authenticated browser
capture cannot run.
