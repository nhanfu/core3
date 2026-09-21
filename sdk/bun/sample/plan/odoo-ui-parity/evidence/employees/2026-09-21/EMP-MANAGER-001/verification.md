# Verification

- Focused integration: `bun test test/employees_manager_assignment.integration.test.ts` — **4 tests, 24 assertions passed**.
- The suite covers source mapping, manager options, durable employee and active Payroll-version update, actor/company/active/self/cycle/stale guards, migration replay, and file-backed restart.
- Authenticated Odoo desktop/mobile capture: **pass**. Both captures show the Work tab's Manager field; viewport metadata and extracted text are in `browser.json`.
- Core3 authenticated desktop/mobile capture: **blocked conditionally**. A bounded `timeout 25s bun dev --db=ddb --memory` attempt printed Vite readiness but backend port 3001 did not bind. Startup failed while applying a DuckDB migration with `Parser Error: Adding columns with constraints not yet supported`; the bounded command ended with frontend timeout/exit 124 and no Core3 browser capture was claimed. The error is not raised by this slice's unconstrained manager columns; its focused DuckDB migration suite passes.
- No aggregate Employees sign-off is claimed.
