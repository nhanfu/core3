# Functionality checklist

| Case | Check | Result |
| --- | --- | --- |
| INV-SETTINGS-001-FUNC-01 | Page/API separation, menu permission, and annual fields are declared | PASS |
| INV-SETTINGS-001-FUNC-02 | Migration seeds day 31/month 12 and is idempotent | PASS |
| INV-SETTINGS-001-FUNC-03 | Manager save changes day/month and increments row version | PASS |
| INV-SETTINGS-001-FUNC-04 | Stale row version returns 409; missing settings returns 404 | PASS |
| INV-SETTINGS-001-FUNC-05 | Read-only user receives 403 for page and mutation transport | PASS |
| INV-SETTINGS-001-FUNC-06 | File-backed DuckDB restart preserves annual settings | PASS |
| INV-SETTINGS-001-UI-01 | Authenticated Core3 desktop Save/reload at 1440x900 | PASS |
| INV-SETTINGS-001-UI-02 | Authenticated Core3 mobile Save/reload at 390x844 | PASS |
| INV-SETTINGS-001-UI-03 | Paired authenticated Odoo desktop/mobile comparison | BLOCKED by supplied Odoo action RPC error; exact evidence retained |
