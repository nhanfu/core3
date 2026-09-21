# QA inventory

Feature: `TIMESHEET-TASK-ACTION-GRAPH-VIEW-001`

Claims under test:

- Odoo's task subtask Timesheets action replaces its graph view with the
  employee-oriented `view_hr_timesheet_line_graph_by_employee` view.
- The Core3 task page/API pair exposes a responsive-safe employee-by-task
  Graph tab backed by durable task Timesheet rows.
- Current-company, missing, empty, descendant-scope, guarded-create, and
  restart behavior remain deterministic.

Control/state checks:

- Desktop task Timesheets route: List and Graph tabs, with employee categories
  and Time Spent measure when the runtime is available.
- Mobile task Timesheets route: Graph is explicitly desktop-only and the list
  remains the responsive state.
- Off-happy-path scenarios: foreign company, missing task, and empty fixtures
  return no rows; a guarded create adds one durable graph-ready row.
- Restart scenario: migration replay and file-backed reopen preserve the same
  graph-ready task rows.

Evidence expected: source comparison, focused integration output, bounded
Core3/Odoo runtime probes, and explicit blockers if authenticated browser
capture cannot run.
