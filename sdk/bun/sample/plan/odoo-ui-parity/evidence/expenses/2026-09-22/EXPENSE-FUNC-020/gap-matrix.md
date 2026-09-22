# EXPENSE-FUNC-020 gap matrix

| Gap | Required behavior | Implementation | Evidence |
| --- | --- | --- | --- |
| EXPENSE-FUNC-020-DASHBOARD | My Expenses opens with three state totals above the list | `StatRow` and `expense_dashboard` | focused test |
| EXPENSE-FUNC-020-RULES | Waiting Reimbursement excludes company-paid and non-approved rows | aggregate CASE rules | focused test |
| EXPENSE-FUNC-020-SCOPE | Current company only | company predicate | focused test |
| EXPENSE-FUNC-020-STATES | Empty and unavailable states are explicit | fixture state and 503 error state | focused test |
| EXPENSE-FUNC-020-VISUAL | Authenticated desktop/mobile comparison | Odoo desktop DOM only; mobile/Core3 blocked | verification |
