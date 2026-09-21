# QA inventory

| Artifact | Result |
| --- | --- |
| Odoo source/settings/product/cart/template comparison | pass; source paths recorded |
| Page/API YAML separation and `page.id` pairing | pass |
| Durable schema/data migrations 106/107 | pass; replayed and restarted |
| Deterministic My Company policy fixture | pass; disabled and `/contactus` |
| Read permission contract | pass; `ecommerce.read` |
| Update permission/concurrency contract | pass; `ecommerce.write`, row version |
| Invalid URL/company/stale validation | pass |
| Authenticated/anonymous zero-price cart boundary | pass |
| Core3 authenticated desktop/mobile capture | blocked; no browser runtime or local Core3 ports |
| Odoo authenticated comparison | blocked; `/shop` exact HTTP 404 on 8069/8073 |
| Scoped YAML audit/lint/diff | pass |
| Full repository audit | blocked by unrelated Inventory undefined action references |
| Ecommerce module sign-off | open; this is one bounded slice |
