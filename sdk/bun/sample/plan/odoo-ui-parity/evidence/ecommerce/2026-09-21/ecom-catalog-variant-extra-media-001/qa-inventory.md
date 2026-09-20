# QA inventory

| Claim/control | Functional check | Visual state/evidence |
| --- | --- | --- |
| Odoo variant-media mapping | Source assertions cover `product.image`, the variant relation, form viewer, image ordering, and carousel response | Source comparison document |
| Variant detail read | Dedicated page/API pair resolves the active variant and media list | Desktop/mobile capture blocked by unavailable Core3 runtime |
| Permissioned upload | API declares `ecommerce.read` sources and `ecommerce.write` upload | Authenticated actor capture blocked |
| File/company validation | Wrong company, inactive/missing variant, non-image, empty/oversized, and duplicate paths reject without partial writes | Error states are service-tested; browser blocked |
| Concurrency/removal | Variant upload requires current variant version; image removal requires current image version | Service-tested; browser blocked |
| Restart durability | File-backed DuckDB preserves fixture, uploaded metadata, and variant version | Restart assertion in focused test |

Exploratory negative checks include a duplicate filename replay and a stale
upload/removal attempt. No module sign-off is claimed; broader actor/browser
coverage, video/external media, and paired Odoo rendering remain open.
