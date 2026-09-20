# ecommerce parity progress

Module owner: ecommerce module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Latest committed bounded slice: `3e9a938bfc28` (Combo Choices); previous bounded slice: `d6485833` (Product Attributes).

## Current state

The current wave has a committed Ecommerce implementation and authenticated
Core3 browser evidence. DEV-4 adds an eCommerce-owned, retry-safe outbox
contract for handing checkout orders to the separate Sales service. Functional
and ownership gates are still incomplete; no full parity claim is made here.

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
Bounded commit: `3e9a938bfc28` (local only, not pushed).
