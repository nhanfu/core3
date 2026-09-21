# Functionality checklist

| Case | Setup/action | Expected result |
| --- | --- | --- |
| F-012-01 | Manager edits Mileage from 0.70 to 1.25 | Draft mileage amount changes to rounded unit cost times existing quantity; non-draft rows do not change amount |
| F-012-02 | Manager renames Meals and changes cost | Linked category/product labels follow the rename; approved/paid amounts remain stable |
| F-012-03 | Manager resets cost to zero | Draft quantity becomes one and current amount is preserved |
| F-012-04 | Non-manager access | Action metadata requires `expenses.manage`; no ordinary-user mutation is exposed |
| F-012-05 | Negative cost | 422 `EXPENSE_CATEGORY_COST_INVALID`; rows remain unchanged |
| F-012-06 | Stale category version | 409 `STALE_RECORD`; linked rows and totals remain unchanged |
| F-012-07 | Migration replay/restart | Fourteen migrations replay idempotently and preserve seeded counts/checksum |
| F-012-08 | Odoo reference | Authenticated desktop/mobile Expenses captures show the live module exists |
