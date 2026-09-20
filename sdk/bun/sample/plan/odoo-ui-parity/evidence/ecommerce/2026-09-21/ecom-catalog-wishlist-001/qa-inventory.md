# QA inventory

Claims and checks for this bounded slice:

| Claim/control | Functional check | Visual state/evidence |
| --- | --- | --- |
| Odoo wishlist source mapping | Source/menu/page/API assertions | Source comparison document |
| Customer wishlist list | Fixture query, customer/company ownership | Authenticated desktop/mobile list; blocked by unavailable Core3 runtime |
| Add/idempotent save | Durable add replay and unique product/variant key | Product/list saved state; blocked |
| Anonymous cookie wishlist | Public POST/GET/DELETE route contract | Mobile public wishlist; blocked |
| Remove/concurrency | Current row version succeeds; stale/wrong customer fails | Desktop remove action; blocked |
| Publication safety | Hidden product and invalid variant guards | Empty/error state; service-tested |

Exploratory cases included: wrong-company creation and replaying an add with a
different item ID. Both preserve the ownership/unique-key boundaries.
