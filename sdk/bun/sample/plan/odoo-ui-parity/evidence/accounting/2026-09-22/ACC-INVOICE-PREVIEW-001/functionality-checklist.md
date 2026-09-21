# Functionality checklist

| Case | Class | Expected result | Result |
| --- | --- | --- | --- |
| ACC-PREVIEW-FUNC-001 | functional | Posted customer invoice/credit note opens the read-only Preview route; vendor/draft rows are filtered out | pass |
| ACC-PREVIEW-PERM-002 | permission | Datasource and actions require `accounting.read`; unauthorised query is denied | pass |
| ACC-PREVIEW-DATA-003 | data | Persisted invoice values are rendered and remain available after DuckDB close/reopen and migration replay | pass |
| ACC-PREVIEW-UI-004 | visual/responsive | Odoo desktop/mobile detail and preview states are captured; Core3 capture is required when authenticated runtime access exists | Odoo pass; Core3 blocked |
