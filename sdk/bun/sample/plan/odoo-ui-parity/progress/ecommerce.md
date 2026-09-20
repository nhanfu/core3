# ecommerce parity progress

Module owner: ecommerce module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Latest committed bounded slice before this wave: `11e777b73d47b200e1c79780205ec0e7253599a7` (Payment Provider Configuration).

## Current bounded task — `ECOM-CHECKOUT-PAYMENT-TOKENS-001`

The smallest remaining source-backed checkout configuration surface after
payment transactions/providers is Odoo's technical Payment Tokens action.
Core3 now persists masked, company/customer-scoped token records with a
provider-created registration boundary, deterministic fixture, idempotency-key
replay, provider/method/customer/company validation, customer ownership
filtering, and optimistic retirement. Page/API contracts are separate and
joined by `page.id: ecommerce-payment-tokens`.

Focused verification: `bun test ./test/ecommerce_payment_tokens.integration.test.ts`
— **4 passed, 27 assertions, 0 failures**. The adjacent payment/checkout suite
is rerun before commit. The UI audit passes at 688 pages, 697 routes, and 1282
datasources; scoped ESLint and `git diff --check` are commit gates. Core3
authenticated desktop/mobile capture is blocked because ports 3000, 4312, and
4313 were not listening. Odoo `/shop` returns exact HTTP 404 on ports 8069 and
8073. Evidence is under
`evidence/ecommerce/2026-09-20/ecom-checkout-payment-tokens-001/`.
Provider credentials/gateway execution, raw token creation, checkout token
selection, broader actor browser coverage, and paired Odoo comparison remain
open; no module sign-off is claimed.

## Current bounded task — `ECOM-CHECKOUT-PAYMENT-PROVIDERS-001`

The next smallest source-backed checkout configuration gap after transactions
is Odoo's `payment.provider` action. Core3 now persists company-scoped provider
configuration with deterministic Core3 Offline and Demo Gateway fixtures,
separate Payment Providers page/API contracts, `ecommerce.write` CRUD and
disable/restore actions, code/state/feature/amount validation, optimistic
row-version guards, and DuckDB restart persistence. Live credentials, module
installation, tokens, and external gateway calls remain outside this slice.

Focused verification: `bun test
./test/ecommerce_payment_providers.integration.test.ts
./test/ecommerce_payment_methods.integration.test.ts
./test/ecommerce_payment_transactions.integration.test.ts --timeout 20000` —
**10 passed, 65 assertions, 0 failures**. The UI audit passes at 687 pages,
696 routes, and 1278 datasources. Core3 desktop/mobile capture remains
blocked by the dev backend/runtime boundary documented in evidence; Odoo
`/shop` returns exact HTTP 404 on ports 8069 and 8073. Evidence is under
`evidence/ecommerce/2026-09-20/ecom-checkout-payment-providers-001/`.
Module sign-off remains open.

## Current bounded task — `ECOM-CHECKOUT-PAYMENT-TRANSACTIONS-001`

The smallest remaining source-backed checkout gap is Odoo's durable
`payment.transaction` lifecycle behind the already-completed payment-method
catalog. Core3 now persists one pending transaction per authenticated or guest
checkout using a unique order/idempotency key, exposes a separate
company-scoped Payment Transactions page/API, and guards state transitions
with `ecommerce.write`, allowed-state validation, provider-reference
validation, and row-version concurrency. Migrations 055/056 provide the
schema and deterministic confirmed fixture.

Focused verification: `bun test
./test/ecommerce_payment_transactions.integration.test.ts
./test/ecommerce_checkout.integration.test.ts
./test/ecommerce_payment_methods.integration.test.ts --timeout 20000` —
**19 passed, 114 assertions, 0 failures**. The UI audit passes at 686 pages,
695 routes, and 1272 datasources. Core3 desktop/mobile capture is blocked by
the dev backend refusing `/api/modules` while the frontend returns 502;
Odoo `/shop` returns exact HTTP 404 on ports 8069 and 8073. Evidence is under
`evidence/ecommerce/2026-09-20/ecom-checkout-payment-transactions-001/`.
Module sign-off remains open.

## Current bounded task — `ECOM-CATALOG-VARIANT-CONFIGURATOR-001`

The remaining source-backed variant gap was the Odoo website configurator's
selected-combination-to-cart resolution, not another variant CRUD surface.
Core3 now exposes a separate Product Detail API/page variant add action,
validates active/published/current-company ownership, persists variant name
and variant price on cart lines, and carries the selected variant through the
anonymous cart route. Migration 054 makes cart-line identity
`(cart, product, variant)` and preserves earlier rows; deterministic line IDs
make repeated authenticated or anonymous adds idempotent while row versions
record quantity increments.

Focused verification: `bun test
./test/ecommerce_variant_configurator.integration.test.ts
./test/ecommerce_cart.integration.test.ts
./test/ecommerce_product_variants.integration.test.ts --timeout 20000` —
3 + 2 + 4 tests, 14 + 14 + 29 assertions, 0 failures (the combined run
reports 9 tests and 57 assertions). Core3 desktop/mobile evidence is blocked
by the unrelated shared Inventory discovery error
`actions[0].title is not allowed`; no shared Inventory files were staged.
Authenticated Odoo `/shop` returned exact HTTP 404 on ports 8069 and 8073.
Evidence is under
`evidence/ecommerce/2026-09-20/ecom-catalog-variant-configurator-001/`.
The bounded feature is not module sign-off.

## Current state

The current wave has a committed Ecommerce implementation and authenticated
Core3 browser evidence. DEV-4 adds an eCommerce-owned, retry-safe outbox
contract for handing checkout orders to the separate Sales service. Functional
and ownership gates are still incomplete; no full parity claim is made here.

## Completed bounded task — `ECOM-CATALOG-PRODUCT-EXPORT-001`

The smallest remaining concrete catalog action was the Odoo Website Products
list Export affordance. Core3 now has an `ecommerce.read` client CSV export
joined by the Products `page.id`, with stable columns, JSON escaping, current
company scope, durable product source rows, replay/restart coverage, and no
mutation side effects. Focused tests are in
`test/ecommerce_product_export.integration.test.ts`.

Authenticated Core3 desktop/mobile capture is blocked by the unrelated shared
Inventory discovery error `actions[0].title is not allowed`; the temporary
runtime was removed. Odoo `/shop` returns exact HTTP 404 on both supplied
references, so paired comparison is blocked. The bounded commit is recorded
in the handoff; module sign-off remains open.

## Completed bounded task — `ECOM-CATALOG-PRODUCT-TAG-IMAGE-001`

The smallest remaining explicit Product Tags gap is Odoo's optional
`product.tag.image` field. The source-backed implementation adds migration
052 durable image metadata/storage and migration 053 deterministic fixture
stability, a separate tag-detail page/API contract, attachment upload/download
actions, image validation, write/read permissions, replacement and stale
row-version guards, and restart persistence. Product Tags list rows now open
the image-capable detail form. Focused tests are in
`test/ecommerce_product_tag_image.integration.test.ts`; authenticated Core3
desktop/mobile and Odoo `/shop` blocker evidence is recorded at
`plan/odoo-ui-parity/evidence/ecommerce/2026-09-20/ecom-catalog-product-tag-image-001/`.
The bounded feature commit is `c7cfd29a8d4540d18d95d1b7a4ac29a5490a7a86`
(local only, not pushed); module sign-off remains open.

## Completed bounded task — `ECOM-CATALOG-PRODUCT-VARIANTS-001`

The next source-backed catalog gap is the missing `product.product` variant
resolution surface. The supplied Odoo product and website_sale views/models
define variant list/form records, combination-derived website behavior, and
variant price resolution. Core3 now has migrations 048/049 for durable variant
records, deterministic Mug and Chair fixtures, variant-aware pricelist rules
and cart lines; separated product detail page/API YAML; permissioned CRUD;
combination/reference/price/company validation; and row-version concurrency.

Focused verification passes in
`test/ecommerce_product_variants.integration.test.ts`, including restart
persistence and variant-specific cart pricing. Authenticated Core3 desktop /
mobile captures and authenticated Odoo 404 blocker captures are recorded at
`plan/odoo-ui-parity/evidence/ecommerce/2026-09-20/ecom-catalog-product-variants-001/`.
Bounded commit: `2c2a356a5c79d6dff97fcd2a871d7bbb23984b8b` (local only, not
pushed); module sign-off remains open.

## Current bounded task — `ECOM-CATALOG-PRODUCT-TAG-VARIANT-ASSIGNMENT-001`

The smallest newly unblocked catalog gap is Odoo Product Tags' explicit
`product_product_ids` variant assignment. Core3 now has the source-backed
variant table, but the completed tag slice still persisted template relations
only. This wave adds migrations 050/051, deterministic variant assignments,
variant option/query data, separate permissioned assign/remove actions,
company/active/combination/duplicate/not-found validation, row-version
concurrency, and restart coverage. Core3 desktop/mobile and authenticated
Odoo `/shop` blocker captures are recorded at
`plan/odoo-ui-parity/evidence/ecommerce/2026-09-20/ecom-catalog-product-tag-variant-assignment-001/`.
Bounded commit: `fb8312242ee51535d35e2582dd906232e8e10cb4` (local only, not
pushed); module sign-off remains open.

## DEV-4 evidence (2026-09-13)

- Isolated branch/worktree: `agent/odoo-ecommerce-dev4-sales-handoff`.
- Checkout creates exactly one `ecommerce_sales_handoffs` row per order,
  including authenticated and anonymous checkout paths.
- Sales-facing operations expose the handoff envelope and copied order lines.
- Claim/acknowledge mutations enforce attempt limits and optimistic row-version
  concurrency, including stale duplicate rejection.
- Sales now owns a polling consumer that claims the envelope, reads the declared
  order/line operations, imports source-linked Sales records, and acknowledges
  success or failure. The source link and line IDs make retries idempotent.
- Focused suite: `bun test ./test/ecommerce_sales_handoff_consumer.integration.test.ts ./test/ecommerce_checkout.integration.test.ts` —
  14 passed, 69 assertions, 0 failures.
- QA rerun confirms the focused suite passes with `--timeout 20000`; the default 5-second timeout fails the real local import test because it takes about 12.6 seconds. Audit and `git diff --check` pass. Repository lint has two unchanged baseline errors in `test/website_public.integration.test.ts`; the full regression was stopped before completion after unrelated timeout/stale-record failures, so no full-regression pass is claimed.
- QA found no new authenticated browser or paired Odoo evidence for this Sales-only candidate. Existing Core3 checkout captures remain applicable; paired Odoo remains blocked by missing `website_sale` (`/shop` HTTP 404). QA remains bounded and unsigned off.
- Remaining gates: authenticated actor/company matrix, external payment/delivery
  certification, paired Odoo comparison, and central review/merge.

## Review integration

- Integrated commit: `40aee3ed`.
- Reviewer reran `ecommerce_checkout.integration.test.ts`: 11 tests, 59
  assertions, 0 failures, and the repository UI audit passed.
- The Sales-side consumer, external provider certification, actor/company
  browser matrix, and paired Odoo gates remain open; this is not module
  sign-off.

## Completed bounded task — `ECOM-CATALOG-PRODUCT-COMBO-CHOICES-001`

Product Tags and Product Attributes are complete bounded slices. The next
smallest missing catalog surface is Combo Choices: Odoo menu/action/model/list-
form analysis is complete, and Core3 now has durable combo/option migrations,
deterministic fixtures, page/API separation, active non-combo option
validation, company scope, permissioned CRUD, optimistic concurrency, and
restart coverage. Authenticated Core3 desktop/mobile evidence and an
authenticated Odoo desktop/mobile `/shop` 404 blocker capture are recorded at
`plan/odoo-ui-parity/evidence/ecommerce/2026-09-20/ecom-catalog-product-combo-choices-001/`.

Focused Combo Choices plus affected catalog regression tests pass (18 tests,
141 assertions), the authenticated actor matrix passes (3 tests, 22
assertions), and the repository UI audit passes at 671 pages, 680 routes, and
1216 datasources. The paired Odoo comparison is blocked because both supplied
authenticated reference instances return 404 for `/shop`; this feature and the
full Ecommerce module remain unsigned off despite the bounded verification.
Bounded commit: `e32c84f95a9e` (local only, not pushed).

## Completed bounded task — `ECOM-CHECKOUT-PAYMENT-METHODS-001`

The next smallest source-backed gap was Odoo's global Configuration >
eCommerce > Payment Methods action: `menu_ecommerce_payment_methods` →
`payment.action_payment_method`, model `payment.method`. Core3 now has durable
payment-method schema/fixtures (migrations 042/043), a separate page/API YAML
contract, permissioned CRUD with code/feature validation, active/archive
workflow, optimistic concurrency, and checkout selection backed by active
primary rows.

Focused payment-method, checkout, and actor/restart coverage passes with 19
tests and 120 assertions. Authenticated Core3 desktop/mobile evidence, the
desktop create flow for `Browser Wallet`, and the authenticated Odoo `/shop`
404 blocker are recorded at
`plan/odoo-ui-parity/evidence/ecommerce/2026-09-20/ecom-checkout-payment-methods-001/`.
The full Ecommerce module remains unsigned off because paired Odoo, broader
actor/company browser, and external provider gates remain open. The bounded
implementation commit is reported in the handoff and is local only.

## Completed bounded task — `ECOM-CHECKOUT-DELIVERY-METHODS-001`

The next smallest source-backed checkout/company gap was Odoo's Website >
Global Configuration > eCommerce > Delivery action:
`menu_ecommerce_delivery` → `delivery.action_delivery_carrier_form`, model
`delivery.carrier`. Core3 now has durable delivery-method schema and fixtures
(migrations 044/045), a separate page/API YAML contract, company-scoped active
checkout options, Cash on Delivery compatibility validation, permissioned CRUD,
archive/restore/delete workflow, and optimistic row-version concurrency.

Focused delivery-method, checkout, and actor/restart coverage passes with 19
tests and 122 assertions. The full Ecommerce integration set passes with 71
tests and 485 assertions across 21 files. Authenticated Core3 desktop/mobile evidence and the
authenticated Odoo `/shop` 404 blocker are recorded at
`plan/odoo-ui-parity/evidence/ecommerce/2026-09-20/ecom-checkout-delivery-methods-001/`.
The paired Odoo surface, broader actor/company browser matrix, and external
carrier-rate/shipment gates remain open; this is a bounded implementation, not
full Ecommerce sign-off. The bounded commit is recorded in the handoff.

## Completed bounded task — `ECOM-CATALOG-PRICELIST-RULES-001`

The smallest remaining source-backed catalog gap was Odoo's
`product.pricelist.item` rule surface. Core3 now persists Odoo target and
pricing metadata through migrations 046/047, exposes separated page/API YAML,
provides deterministic rule option sources and `ecommerce.write` CRUD, and
guards target, date, value, company, duplicate, and stale-row failures. Cart
pricelist application consumes global/product/category rules with fixed,
percentage, and formula modes. Isolated restart coverage proves the rule and
cart price survive database reopen.

Focused verification and authenticated Core3 desktop/mobile evidence are
recorded at `plan/odoo-ui-parity/evidence/ecommerce/2026-09-20/ecom-catalog-pricelist-rules-001/`.
The browser company boundary is visible for the seeded `My Company` fixture;
the Odoo paired comparison is blocked by exact `/shop` 404 responses on ports
8069 and 8073. Variant-specific resolution remains open because the current
catalog has no separate variant table. This is a bounded implementation, not
full Ecommerce sign-off. The local commit is reported in the handoff.
