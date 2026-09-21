# QA inventory

Feature: `TIMESHEET-TASK-ACTION-PROJECT-CONTEXT-001`

Claims under test:

- Odoo's task subtask Timesheets action supplies the active task's project as
  the default project context.
- The Core3 task page/API pair is joined by `page.id`, derives defaults from
  durable task/project relations, and exposes a source-prefilled create form.
- Create canonicalizes task/project names and rejects stale project context,
  cross-project task selection, missing task, foreign company, and empty scope.
- Existing task active_ids scope and descendant expansion remain unchanged.

Control/state checks:

- Desktop task Timesheets route: project context StatRow, task list, and New
  form prefill when the runtime is available.
- Mobile task Timesheets route: responsive context/list/form state when the
  runtime is available.
- Off-happy-path probes: missing/empty task context and a task/project mismatch
  must return an empty read or guarded 403 without a partial write.
- Restart check: migration replay and file-backed reopen must preserve the
  durable task/project relation and defaults.

Evidence expected: source comparison, focused integration output, bounded
Core3/Odoo runtime probes, and explicit browser blockers if authentication or
the browser runtime is unavailable.
