# QA inventory

| Artifact | Result |
| --- | --- |
| Odoo source/model/view/template comparison | pass; source paths recorded |
| Page/API YAML separation and `page.id` pairing | pass |
| Durable schema/data migrations 102/103 | pass; replayed and restarted |
| Deterministic company fixture | pass; My Company optional/b2c |
| Read permission contract | pass; `ecommerce.read` |
| Update permission/concurrency contract | pass; `ecommerce.write`, row version |
| Invalid/company/stale validation | pass |
| Mandatory/optional checkout workflow | pass |
| Core3 authenticated desktop/mobile capture | blocked; no browser runtime or local Core3 ports |
| Odoo authenticated comparison | blocked; `/shop` exact HTTP 404 on 8069/8073 |
| Focused tests/regression/audit/lint/diff | pass; see `test-results.md` |
| Ecommerce module sign-off | open; this is one bounded slice |
