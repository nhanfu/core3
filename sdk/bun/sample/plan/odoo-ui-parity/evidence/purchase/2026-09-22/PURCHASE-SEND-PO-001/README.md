# Purchase Send PO composer evidence

Date: 2026-09-22

Feature: confirmed/received Purchase Order `Send PO` composer.

## Scope

This bounded slice covers Odoo's confirmed-order reuse of
`purchase.order.action_rfq_send` with `send_rfq=False`: a page/API-bound mail
composer with a Purchase Order template and PDF attachment. It records a
durable email history row without changing an already confirmed order state.

## Artifacts

- `odoo-analysis.md` - local Odoo 19 source and authenticated reference audit.
- `functionality-checklist.md` - bounded acceptance cases and results.
- `source-comparison.md` - Odoo/Core3 contract mapping and known gaps.
- `gap-matrix.md` - implemented behavior versus exact open limitations.
- `test-results.md` - focused, regression, audit, build, and diff results.
- `verification.md` - authenticated browser trace, screenshots, and blocker.
- `odoo-desktop-compose.png`, `odoo-mobile-compose.png` - authenticated Odoo
  composer captures at desktop and emulated iPhone 14 sizes.
- `core3-desktop-detail.png`, `core3-mobile-detail.png` - authenticated
  Core3 detail captures; the composer did not open after the button click.

The Core3 modal is not claimed as visually verified because the shared
`server_form` action dispatch produced no request or modal in the runtime.
