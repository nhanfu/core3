# QA inventory

Feature: `TIMESHEET-TASK-ACTION-FORM-VIEW-001`

Claims under test:

- Odoo's task Timesheets action retains its Form view for internal users.
- Core3 exposes the durable task entry Form through the existing detail
  page/API pair, with task context preserved on the task action.
- Company, actor, permission, missing, empty, guarded CRUD, stale-write, and
  migration/restart behavior remain deterministic.

Control/state checks:

- Desktop task Timesheets route: List, Kanban, Calendar, Pivot, Form, and
  Graph tabs; Form opens the `timesheet-detail` side-panel contract.
- Mobile task Timesheets route: Form remains available through the responsive
  row action while Pivot/Graph remain desktop-only.
- Exploratory scenario 1: foreign-company, foreign-actor, missing-entry, and
  empty task fixtures fail closed.
- Exploratory scenario 2: create a task entry, open its Form detail, apply one
  valid edit, reject a stale edit, and reopen the database.

Evidence expected: source comparison, focused integration output, bounded
Core3/Odoo runtime probes, and explicit blockers when authenticated browser
capture cannot run.
