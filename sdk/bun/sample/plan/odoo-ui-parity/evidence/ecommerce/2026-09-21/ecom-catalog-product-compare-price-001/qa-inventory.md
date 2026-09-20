# QA inventory

| Claim/control | Functional check | Visual state/evidence |
| --- | --- | --- |
| Odoo compare-price mapping | Source assertions cover the field, strikethrough rule, and form group | Source comparison document |
| Product projection | Product fixture and edit expose raw/derived compare prices; zero boundary returns null | Core3 desktop/mobile capture blocked by unavailable runtime |
| Variant projection | Variant fixture and dedicated action expose raw/derived compare prices | Core3 desktop/mobile capture blocked |
| Permission/company boundary | Page/API permissions are declared; wrong-company writes reject | Service-tested; browser blocked |
| Validation/concurrency | Negative values and stale row versions reject without overwrite | Service-tested; browser blocked |
| Restart durability | File-backed DuckDB preserves both product and variant values | Restart assertion in focused test |

Exploratory negative checks include zero-price hiding, wrong-company replay,
and stale action replay. Currency/pricelist display integration, authenticated
browser capture, and paired Odoo rendering remain blockers.
