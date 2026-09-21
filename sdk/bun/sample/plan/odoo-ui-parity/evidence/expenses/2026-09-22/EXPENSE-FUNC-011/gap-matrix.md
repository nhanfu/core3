# Gap matrix

| ID | Gap | Contract | Evidence |
| --- | --- | --- | --- |
| EXPENSE-FUNC-011-A | No durable planned expense activity | `expense_scheduled_activities`, seeded fixture, read source | focused persistence/restart test |
| EXPENSE-FUNC-011-B | No schedule action | `schedule_expense_activity`, `expenses.write`, actor/company/version/type/date guards | focused contract and guard tests |
| EXPENSE-FUNC-011-C | No completion action | `complete_expense_activity`, Planned + row-version guard, Done/audit writes | focused completion/stale tests |
| EXPENSE-FUNC-011-D | No Odoo-shaped detail control | Shared `OdooChatter` activity composer and Mark done control | page contract + Odoo desktop/mobile captures |
