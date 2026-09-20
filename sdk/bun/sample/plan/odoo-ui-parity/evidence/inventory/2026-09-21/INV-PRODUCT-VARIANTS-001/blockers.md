# Product Variants blockers

- Odoo paired action blocker: with `codex@core3.local` authenticated,
  `http://127.0.0.1:8069/odoo/action-434` resolved to
  `http://127.0.0.1:8069/odoo/discuss` on both 1440x900 and 390x844 probes.
  The captures show Discuss, not the `product_product_menu` Product Variants
  action. No Odoo mutation was attempted.
- Core3 has one unrelated aborted notification poll:
  `/api/v1/notifications` returned `net::ERR_ABORTED` while the page remained
  rendered and all feature requests succeeded. It did not affect the list,
  detail, or create-form capture.

Full Inventory sign-off remains open pending broader paired Odoo coverage and
remaining module gaps.
