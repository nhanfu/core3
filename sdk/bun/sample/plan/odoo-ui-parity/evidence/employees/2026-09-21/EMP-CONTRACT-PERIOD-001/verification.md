# Verification

- Focused integration: `bun test test/employees_contract_period.integration.test.ts` — **4 tests, 23 assertions passed**.
- The suite covers Odoo source mapping, employee create/read, Contract Dates update, active Payroll-version persistence, actor/company/stale/date-order/date-format/missing-version guards, migration replay, and file-backed restart.
- Authenticated Odoo desktop/mobile capture: **conditional pass**. Both captures show the Payroll Contract date range as `Contract Aug 1 to Nov 10`; the source labels are compacted by the Odoo UI, as recorded in `browser.json`.
- Global UI audit: **blocked by unrelated concurrent Inventory work**. `bun run audit` failed during discovery on `actions[10].title`, `actions[10].success_message`, `actions[11].title`, and `actions[11].success_message` being disallowed fields.
- Global UI/Core3 browser verification: **blocked by unrelated concurrent work**. A bounded `timeout 25s bun dev --db=ddb --memory` reached Vite readiness, but discovery failed before backend port 3001 bound because Inventory referenced unknown actions `print_inventory_transfer_operations` and `print_inventory_transfer_delivery_slip`.
- No aggregate Employees sign-off is claimed.
