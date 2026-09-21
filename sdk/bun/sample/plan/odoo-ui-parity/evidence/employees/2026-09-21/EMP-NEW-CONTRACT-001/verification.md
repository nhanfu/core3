# Verification

## Focused tests

Command: `bun test test/employees_new_contract.integration.test.ts` from `sdk/bun/sample`.

Result: **3 passed, 0 failed, 26 expect() assertions**.

Coverage includes local Odoo source mapping and page/API separation, successful Payroll version copying, durable migration replay and file-backed restart persistence, authenticated actor and `employees.manage` boundary, current-company and optimistic row-version guards, ISO date validation, unfinished-current-contract guard, overlap guard, duplicate start-date guard, and atomic failure behavior.

## Browser evidence

- `odoo-desktop-payroll.png`: authenticated Odoo Payroll view, 1440x900.
- `odoo-desktop-new-contract-picker.png`: authenticated Odoo desktop date-picker state, 1916x833 as reported by the screenshot capture.
- `odoo-mobile-payroll.png`: authenticated Odoo Payroll view, 390x844.
- `odoo-mobile-new-contract-picker.png`: authenticated Odoo mobile date-picker state, 390x844.

## Core3 browser blocker

The Core3 dev frontend started, but the backend exited before serving `/api/auth/me` or `/api/pages/dashboard`. Direct backend startup reported DuckDB's internal WAL replay failure while opening the unrelated `sdk/bun/sample/coredb/accounting.duckdb.wal`: `Failure while replaying WAL file ... accounting.duckdb.wal ... Calling DatabaseManager::GetDefaultDatabase with no default database set`. No other module data or files were changed to work around this. Therefore no authenticated Core3 desktop/mobile screenshot is claimed for this feature.
