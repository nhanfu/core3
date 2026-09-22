# Project Task Share — evidence

Feature: `PROJECT-TASK-SHARE-001`.

This bounded slice implements Odoo's Project `Share Task` portal-share action
as a page-id-bound Core3 server form. It persists normalized recipient, note,
invitation intent, active state, row version, fixed-date metadata, and a
deterministic portal task link in `project_task_shares`.

- Source comparison: `source-comparison.md`
- Contract and test results: `test-results.md`
- Gap matrix: `gap-matrix.md`
- Verification decision: `verification.md`

The single BrowserSkill borrow attempt was denied at the authenticated-tab
confirmation boundary. No screenshots or visual-parity claim are made.
