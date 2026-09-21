# Verification

- Focused integration: `bun test test/employees_employee_type.integration.test.ts` — **4 tests, 25 assertions passed**.
- The suite covers Odoo source mapping, employee create/read, Employee Type update, active Payroll-version persistence, actor/company/stale/invalid/missing-version guards, migration replay, and file-backed restart.
- Authenticated Odoo desktop/mobile capture: **pass**. Both captures show the Payroll Employee Type field; viewport metadata and extracted text are in `browser.json`.
- Global UI audit: **blocked by unrelated concurrent work**. `bun run audit` reached page discovery but failed on `components[1].title is not allowed`; the Employees source-mapping test and YAML parsing passed.
- Core3 authenticated desktop/mobile capture: **blocked conditionally**. A bounded `timeout 25s bun dev --db=ddb --memory` attempt reached Vite readiness, but backend discovery failed before port 3001 bound with the unrelated page-schema error `components[1].title is not allowed`; no Core3 browser capture was claimed.
- No aggregate Employees sign-off is claimed.
