# Feature checklist

| Case | Expected result | Result |
| --- | --- | --- |
| Contract | Detail API and layout share `page.id: invoice-detail`; Cancel is a write-guarded header action | pass |
| Draft transition | Unchanged Draft non-journal invoice becomes Cancelled and increments `row_version` | pass |
| Invalid states | Posted, Paid, already Cancelled, missing, and stale rows are rejected without a write | pass |
| Permission | Direct Accounting cancel action is denied without `accounting.write` | pass |
| Persistence | Cancelled state is retained after DuckDB close/reopen and migration replay | pass |
| Responsive/Odoo comparison | Authenticated Odoo/Core3 desktop and mobile Cancel states | blocked: tab borrow |
