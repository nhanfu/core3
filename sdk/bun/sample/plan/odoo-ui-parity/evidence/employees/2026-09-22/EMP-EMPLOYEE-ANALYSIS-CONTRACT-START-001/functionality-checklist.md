# Functionality checklist

| Case | Result | Assertion |
| --- | --- | --- |
| Source mapping | pass | Odoo graph/pivot XML and Core3 page/API bindings match the selected contract-start behavior. |
| Persistence | pass | Core3 returns the seeded persisted contract dates for `employee-demo-001`, `employee-demo-002`, and `employee-demo-003`; each row has `employee_count = 1`. |
| Company scope | pass | `Core3 Vietnam` returns the scoped rows; `Other Company` returns an empty result. |
| Migration replay | pass | The analysis lookup index is present once after repeated migration. |
| Restart | pass | Contract-start values remain available after closing and reopening file-backed DuckDB. |
| Visual desktop/mobile | blocked | Required Odoo tab was owned by another BrowserSkill session; no visual claim is made. |
