# Functionality checklist

| Case | Expected result | Result |
| --- | --- | --- |
| Source mapping | `My Team` and `My Department` match Odoo labels and domains | pass |
| Page/API contract | `pages/employees.yaml` and `api/employees.yaml` join on `page.id: employees` | pass |
| My Team | Same-company employees managed by the authenticated employee are returned | pass |
| My Department | Same-company employees in the authenticated employee's department are returned | pass |
| Unknown actor | No employee projection means empty result | pass |
| Company boundary | A foreign company cannot be returned by either filter | pass |
| Replay/restart | The lookup index and filter results survive migration replay and DuckDB reopen | pass |
| Desktop/mobile UI | Filter menu and filtered list are captured at 1440x900 and 390x844 | blocked by bsk tab ownership |
