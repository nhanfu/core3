# EXPENSE-FUNC-015 gap matrix

| Stable gap | Required behavior | Implementation | Evidence |
| --- | --- | --- | --- |
| `EXPENSE-FUNC-015-RELATION` | Persist the expense-to-accounting-document relation | Idempotent `expense_accounting_links` migration with stable IDs | Focused test and migration replay |
| `EXPENSE-FUNC-015-TYPE` | Choose move for employee-paid and payment for company-paid | `target_type`, target ID, label, reference, and route | Focused typed-link assertions |
| `EXPENSE-FUNC-015-NAV` | Open the correct Odoo form destination | Shared permissioned navigate actions for journal entry/payment detail | Page/API contract assertions |
| `EXPENSE-FUNC-015-SCOPE` | Hide links outside the current company | Company predicate in the service datasource | Wrong-company assertion |
| `EXPENSE-FUNC-015-STATES` | Handle missing, empty, and unavailable links | Empty query and `503 EXPENSE_ACCOUNTING_LINK_UNAVAILABLE` state | Focused datasource assertions |
| `EXPENSE-FUNC-015-VISUAL` | Authenticated desktop/mobile Odoo comparison | Blocked because tab `1770662590` was borrowed by `wbjh` | No visual claim |
