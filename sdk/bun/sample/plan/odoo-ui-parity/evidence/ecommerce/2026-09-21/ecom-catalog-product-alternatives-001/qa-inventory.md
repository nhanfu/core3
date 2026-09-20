# QA inventory

| Claim/control | Functional check | Visual state/evidence |
| --- | --- | --- |
| Odoo relation/template mapping | Source assertions cover relation, filtering method, and recommended section | Source comparison document |
| Published recommendation read | Deterministic ordered query and Other Company isolation | Product Detail desktop/mobile capture blocked by unavailable Core3 runtime |
| Permissioned assignment | API declares `ecommerce.read` source and `ecommerce.write` mutations | Authenticated actor capture blocked |
| Target validation | Self/duplicate/unpublished/company guards reject without partial writes | Error states are service-tested; browser blocked |
| Concurrency/removal | Current relation version removes; stale version returns 409 | Service-tested; browser blocked |
| Restart durability | File-backed DuckDB preserves fixture and created relation | Restart assertion in focused test |

No module sign-off is claimed. Broader actor/browser coverage and paired Odoo
rendering remain open.
