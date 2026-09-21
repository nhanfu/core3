# QA inventory

Feature: `TIMESHEET-TASK-ACTION-CALENDAR-VIEW-001`

Claims under test:

- Odoo's task Timesheets action retains its Calendar view for internal users.
- Core3 exposes a task-scoped Calendar state with durable calendar labels,
  date placement, employee context, and time-spent display.
- The existing page/API separation, company and permission scope, guarded CRUD,
  stale-write protection, and restart persistence remain intact.

Control/state checks:

- Desktop task Timesheets route: List, Kanban, Calendar, and Graph tabs;
  Calendar cards use the work date and display task context.
- Mobile task Timesheets route: Calendar cards remain the responsive task
  entry state; Graph remains desktop-only.
- Exploratory scenario 1: foreign-company, missing-task, and empty fixtures
  return no calendar rows.
- Exploratory scenario 2: create a task entry, verify its calendar label/date,
  perform one valid edit, then reject a stale edit and reopen the database.

Evidence expected: source comparison, focused integration output, bounded
Core3/Odoo runtime probes, and explicit blockers when authenticated browser
capture cannot run.
