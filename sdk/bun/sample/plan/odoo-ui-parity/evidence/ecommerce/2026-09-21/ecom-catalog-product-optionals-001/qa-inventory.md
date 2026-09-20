# QA inventory

| Claim/control | Functional check | Visual state/evidence |
| --- | --- | --- |
| Odoo relation/configurator mapping | Source assertions cover the relation, both configurator routes, and recommendation field | Source comparison document |
| Published optional read | Deterministic ordered query and Other Company isolation | Product Detail desktop/mobile capture blocked by unavailable Core3 runtime |
| Permissioned assignment | API declares `ecommerce.read` source and `ecommerce.write` mutations | Authenticated actor capture blocked |
| Target validation | Company, self-target, publication, duplicate, and cart ownership guards reject without partial writes | Error states are service-tested; browser blocked |
| Idempotent cart action | Repeat optional add updates one deterministic line quantity | Service-tested; browser blocked |
| Concurrency/removal | Current relation version removes; stale version returns 409 | Service-tested; browser blocked |
| Restart durability | File-backed DuckDB preserves fixture and created relation | Restart assertion in focused test |

No module sign-off is claimed. Broader actor/browser coverage and paired Odoo
rendering remain open.
