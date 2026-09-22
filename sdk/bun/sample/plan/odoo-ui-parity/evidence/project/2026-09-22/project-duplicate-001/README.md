# Project Duplicate — evidence

Feature: `PROJECT-DUPLICATE-001`.

This bounded slice implements Odoo Project's kanban `Duplicate` action as a
page/API-bound Core3 YAML mutation. It creates a durable active
`Project (copy)`, copies milestones and active task trees, resets copied tasks
to `In Progress`, remaps internal dependencies, and survives close/reopen.

- Source comparison: `source-comparison.md`
- Functionality checklist: `functionality-checklist.md`
- Test results: `test-results.md`
- Gap matrix: `gap-matrix.md`
- Verification decision: `verification.md`

No screenshots are included: the required authenticated Odoo tab could not be
borrowed through BrowserSkill confirmation, so no visual-parity claim is made.
