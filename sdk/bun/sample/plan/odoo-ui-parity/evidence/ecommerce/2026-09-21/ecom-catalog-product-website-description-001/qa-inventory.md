# QA inventory

| Claim/control | Functional check | Visual state/evidence |
| --- | --- | --- |
| Odoo description mapping | Source assertions cover HTML field, description search, and product-page rendering | Source comparison document |
| Product description projection | Deterministic content is returned and searchable in Products/Shop/Detail | Core3 desktop/mobile capture blocked by unavailable runtime |
| Rich-text edit workflow | Product Detail edit action declares `ecommerce.write` and persists content | Authenticated capture blocked |
| Validation/company boundary | Empty content, script tag, length, and wrong-company cases are exercised | Service-tested; browser blocked |
| Concurrency | Stale row version returns a conflict without overwrite | Service-tested; browser blocked |
| Restart durability | File-backed DuckDB preserves description content and version | Restart assertion in focused test |

Exploratory negative checks include empty-description clearing, script-tag
rejection, overlong content, wrong-company replay, and stale replay. Rich HTML
sanitization/rendering, authenticated browser capture, and paired Odoo remain
blockers.
