# QA inventory

| Artifact | Result |
| --- | --- |
| Odoo source/menu/controller/template/builder comparison | pass; source paths recorded |
| Page/API YAML separation and `page.id` pairing | pass |
| Durable schema/data migrations 104/105 | pass; replayed and restarted |
| Deterministic Featured fixture | pass; My Company / website sequence |
| Read permission contract | pass; `ecommerce.read` |
| Update permission/concurrency contract | pass; `ecommerce.write`, row version |
| Invalid/company/stale validation | pass |
| Authenticated/public Shop ordering | pass; configured price-desc order |
| Core3 authenticated desktop/mobile capture | blocked; no browser runtime or local Core3 ports |
| Odoo authenticated comparison | blocked; `/shop` exact HTTP 404 on 8069/8073 |
| Scoped YAML audit/lint/diff | pass |
| Full repository audit / adjacent Products regression | blocked by unrelated `pages/products.yaml` `components[1].title` schema error |
| Ecommerce module sign-off | open; this is one bounded slice |
