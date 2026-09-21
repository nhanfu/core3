# Functionality evidence

The deterministic migration fixture begins with `GMC 1`, a Google Merchant
Center feed for `My Company` with a stable access token. The focused lifecycle
test exercises:

1. Odoo model/controller/view/menu/security source tracing and paired
   page/API/public-operation validation.
2. Migration replay without duplicate feed fixtures.
3. Create validation for company scope, feed name, target/language, and
   category/pricelist selector references.
4. Category-filtered XML generation containing the published Mug and Chair
   assignment rows while excluding the unassigned Lamp.
5. Token-checked public feed reads and wrong-token rejection.
6. Optimistic stale generation rejection and cache invalidation after edit.
7. Durable deletion and DuckDB restart preservation of generated XML/cache.

Generated XML includes escaped title/description, product links, prices,
availability, and Google Merchant `g:` fields. The feed action increments the
row version and sets a one-day cache expiry.
