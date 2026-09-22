# EXPENSE-FUNC-017 evidence

This folder records the bounded department approval action Form-mode parity
slice. Odoo defines `list,kanban,form,pivot,graph` for the department-scoped
`Expense to Approve` action; Core3 now declares that same order and binds the
Form mode to the existing expense detail page through the shared form contract.

- Source comparison: `source-comparison.md`
- Odoo action/menu analysis: `odoo-analysis.md`
- Gap matrix: `gap-matrix.md`
- Acceptance checklist: `functionality-checklist.md`
- Test output: `test-results.md`
- Verification and browser blocker: `verification.md`

Functional verification is complete. Authenticated desktop/mobile comparison is
blocked by BrowserSkill tab ownership; no visual-parity claim is made.
