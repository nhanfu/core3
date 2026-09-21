# ORDER-DISCOUNT-001 — Sales order discount wizard

Bounded parity slice for the Odoo Sales order Discount action. The feature is
implemented only in the Order module and is source-backed by the local Odoo 19
sale addon. The paired YAML page/API contracts share `page.id`:
`sale-order-detail`.

- Product: `services/order/pages/sale-order-detail.yaml`
- API: `services/order/api/sale-order-detail.yaml`
- Seed migration: `services/order/migrations/20260922130000-023-sales-order-discount.yaml`
- Focused test: `test/sales_order_discount.integration.test.ts`
- QA ledger: `plan/odoo-ui-parity/qa/order.md`

See [source comparison](source-comparison.md), [checklist](functionality-checklist.md),
and [verification](verification.md). The live Odoo reference was captured, but
Core3 rendered captures were blocked by unavailable local UI listeners; this
evidence does not claim visual parity.
