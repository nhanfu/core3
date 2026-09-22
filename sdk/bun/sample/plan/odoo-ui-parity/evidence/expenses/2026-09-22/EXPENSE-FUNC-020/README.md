# EXPENSE-FUNC-020 evidence

## Result

Bounded functional implementation passed. Odoo dashboard DOM was read through
BrowserSkill on the shared authenticated service. Mobile and Core3 authenticated
visual comparison are blocked and are not claimed.

## Scope

Odoo `hr.expense.get_expense_dashboard` -> Core3 `expense_dashboard` aggregate
and shared `StatRow` on `/expenses`.

## Evidence files

- `odoo-analysis.md` — source and authenticated Odoo observation.
- `source-comparison.md` — Core3 gap and implementation mapping.
- `functionality-checklist.md` — stable-ID acceptance cases.
- `gap-matrix.md` — implementation and verification matrix.
- `test-results.md` — focused and regression test results.
- `verification.md` — BrowserSkill result and blockers.

## Browser boundary

BrowserSkill session `xvvl` borrowed the existing authenticated Odoo tab and
observed `/odoo/expenses` at 1916x833, showing `To Submit`, `Waiting Approval`,
`Waiting Reimbursement`, and List/Kanban/Graph/Pivot/Activity controls. The
session stopped before screenshot capture. A replacement session's borrow
remained pending and was stopped/cleaned up as far as the daemon allowed. No
mobile capture or Core3 authenticated capture was obtained.
