# SALES-ORDER-PREVIEW-001

Bounded Sales/order feature: Odoo `sale.order.action_preview_sale_order`.

Core3 adds the `Preview` action to the dedicated Sales order form and routes it
to the read-only `/order/sale-order/preview` page. Page and API YAML are
separate and joined by `page.id: sale-order-preview`. The preview reads the
current branch-scoped order and lines, renders totals, and supports `Back to
edit mode`.

## Evidence status

- Focused contract: `bun test test/sales_order_preview.integration.test.ts` — 2
  tests, 18 assertions, pass.
- Discovery audit: `bun run scripts/audit-order-ui.ts` — 813 pages, 822 routes,
  1,694 datasources, pass.
- Odoo source: `/home/nhanjs/projects/odoo/addons/sale/models/sale_order.py`
  lines 1336-1343 and `addons/sale/views/sale_order_views.xml` Preview button.
- BrowserSkill daemon/extension: connected on browser instance `245ea108`.
- Exact blocker: signed-in Odoo tab `1770662590` was already borrowed by
  session `krcu`; the required borrow command returned `tab is borrowed by
  another session`. No screenshot was possible before the borrow step.
- Captures: none. No desktop/mobile visual parity claim is made.
