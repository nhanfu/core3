# EMP-NEW-CONTRACT-001 evidence

Bounded feature: Odoo HR Employee Payroll `New Contract`.

The authenticated Odoo reference was inspected at `http://localhost:8069/odoo/employees` in database `core3_reference` using the shared QA browser state. No Odoo records were mutated. Desktop and mobile captures show the Payroll contract area and the date picker opened by `New Contract`.

Core3 implementation evidence is the focused integration test and migration replay/restart test recorded in `verification.md`. A Core3 authenticated browser capture is blocked because the local dev backend exits while opening the unrelated persisted `coredb/accounting.duckdb.wal`; the exact error and scope are recorded in `verification.md`.
