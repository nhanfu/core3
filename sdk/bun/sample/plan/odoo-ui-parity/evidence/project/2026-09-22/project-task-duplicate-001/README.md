# Project Task Duplicate — evidence

Feature: `PROJECT-TASK-DUPLICATE-001`.

This bounded slice implements Odoo Project's task-kanban `Duplicate` action as
a page-id-bound Core3 YAML mutation. It creates a durable active copy, resets
the copy to `Todo` with no deadline or spent time, recursively copies active
child tasks, and advances the source row version atomically.

- Source comparison: `source-comparison.md`
- Contract/test results: `test-results.md`
- Gap matrix: `gap-matrix.md`
- Verification decision: `verification.md`

The required BrowserSkill borrow was attempted once against the connected
Odoo browser at `http://localhost:8069` for the `core3_reference` tab. The
extension did not return confirmation before timeout; no authenticated visual
claim is made.
