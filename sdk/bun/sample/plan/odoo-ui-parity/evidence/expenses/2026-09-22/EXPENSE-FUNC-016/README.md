# EXPENSE-FUNC-016 evidence

This folder records the bounded Odoo Expenses Split Expense wizard parity
repair. The existing Core3 wizard already owned line CRUD and exact-total
validation; this slice closes the remaining source-backed behavior without
adding an Expenses-specific renderer or migration.

- Source comparison: `source-comparison.md`
- Odoo analysis: `odoo-analysis.md`
- Gap matrix: `gap-matrix.md`
- Acceptance checklist: `functionality-checklist.md`
- Test output: `test-results.md`
- Browser verification and blocker: `verification.md`

Functional verification passed. Authenticated visual verification is blocked
by BrowserSkill tab ownership; this feature makes no desktop/mobile parity
claim.
