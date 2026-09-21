# QA inventory

Feature: `TIMESHEET-TASK-ACTION-KANBAN-VIEW-001`

Claims under test:

- Odoo's `project.task.action_view_subtask_timesheet` preserves the Kanban
  view for the internal task action.
- The Core3 task Timesheets page exposes a responsive Kanban state backed by
  the durable task Timesheet API projection.
- Page/API separation, current-company and permission boundaries, guarded
  creation, empty/missing behavior, and restart persistence remain intact.

Control/state checks:

- Desktop task Timesheets route: List, Kanban, and Graph tabs; Kanban cards
  group by employee and show task, date, time spent, and status.
- Mobile task Timesheets route: Kanban is explicitly responsive and its cards
  remain usable without relying on the desktop graph.
- Exploratory scenario 1: query a foreign company, missing task, and empty
  fixture; each fails closed without leaking rows.
- Exploratory scenario 2: create a current-company task entry and verify the
  durable row is immediately Kanban-ready, then close/reopen the database.

Evidence expected: source comparison, focused integration output, bounded
Core3/Odoo runtime probes, and explicit blockers when authenticated browser
capture cannot run.
