# Functionality checklist

| Check | Result | Evidence |
| --- | --- | --- |
| Page/API contracts join on `employee-detail` and page has no datasource SQL | pass | Focused source-mapping test |
| Odoo source method, view buttons, uniqueness and validation mapped | pass | Focused source-mapping test; `source-comparison.md` |
| `employees.write` action contract | pass | API/page YAML and focused test |
| Authenticated actor required | pass | Focused guard test: `EMPLOYEES_ACTOR_REQUIRED` |
| Current-company and active employee scope | pass | Focused guard test: `EMPLOYEES_BARCODE_EMPLOYEE_NOT_FOUND` |
| Optimistic concurrency and idempotent retry | pass | Focused guard test: `STALE_RECORD`, `EMPLOYEES_BADGE_ALREADY_ASSIGNED` |
| Durable mutation and deterministic fixture output | pass | Focused persistence test: `041000000003`, row version 2 |
| Migration replay / unique index / file-backed restart | pass | Focused restart test |
| Authenticated Odoo desktop/mobile Settings comparison | pass | Odoo screenshots and JSON observations |
| Authenticated Core3 desktop/mobile action exercise | blocked | Exact company/fixture mismatch in `core3-blocker.json` |
