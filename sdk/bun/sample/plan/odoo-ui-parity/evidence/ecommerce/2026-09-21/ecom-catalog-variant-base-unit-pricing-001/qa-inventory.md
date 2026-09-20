# QA inventory

| Claim/control | Functional check | Visual state/evidence |
| --- | --- | --- |
| Odoo base-unit mapping | Source assertions cover fields, derived calculation, combination response, and variant form controls | Source comparison document |
| Unit-price projection | Fixture and updated variant resolve count/name/derived price; zero count returns null | Desktop/mobile capture blocked by unavailable Core3 runtime |
| Permissioned configuration | Variant detail action declares `ecommerce.write`; reads declare `ecommerce.read` | Authenticated actor capture blocked |
| Validation/company boundary | Wrong company, negative count, and overlong name reject without partial writes | Error states are service-tested; browser blocked |
| Concurrency | Stale row version returns a conflict and preserves current metadata | Service-tested; browser blocked |
| Restart durability | File-backed DuckDB preserves metadata and calculation inputs | Restart assertion in focused test |

Exploratory negative checks include zero-count hiding and stale replay. No
module sign-off is claimed; currency/UoM integration, broader actor/browser
coverage, and paired Odoo rendering remain open.
