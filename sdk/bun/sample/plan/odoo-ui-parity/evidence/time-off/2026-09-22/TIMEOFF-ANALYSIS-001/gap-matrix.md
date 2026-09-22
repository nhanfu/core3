# Gap matrix

| Gap | Root cause | Fix | Verification |
| --- | --- | --- | --- |
| Existing route only counted requests by status | Core3 analysis datasource was a dashboard approximation | Replace it with the persisted allocation/request report union | Focused signed-measure query test |
| No employee/type/month dimensions | Page exposed only status list/pivot | Add report fields, Graph/Pivot defaults, and filter options | Contract assertions and page schema validation |
| No department/company report context | Foundation records lacked durable report metadata | Migration `0.0.25` adds/populates columns and indexes idempotently | Migration replay/index assertions |
| No transport guard | Analysis datasource had no declared error state | Add deterministic `TIME_OFF_ANALYSIS_UNAVAILABLE` 503 contract | Focused error-state assertion |
| Live visual comparison unavailable | Odoo reference route loads Discuss; Core3 task-created tab has no auth session and returns 401 | Record exact desktop/mobile captures and blockers without storing credentials | `verification.md` and Odoo PNG captures |
