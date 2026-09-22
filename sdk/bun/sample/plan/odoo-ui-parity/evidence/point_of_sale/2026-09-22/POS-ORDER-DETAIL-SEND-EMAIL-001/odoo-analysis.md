# Odoo analysis

Source: Odoo 19 `point_of_sale` under `/home/nhanjs/projects/odoo`.

- `views/pos_order_view.xml` places `action_send_mail` beside the order
  customer email in the `Extra Info` tab.
- The action is an object button titled `email` and is invisible when the
  order’s `email` field is empty.
- `models/pos_order.py` defines `action_send_mail()` and returns the POS order
  mail composer using the first POS order mail template.
- This is distinct from the list-level `model_pos_order_send_mail` action,
  which Core3 already implements as `send_pos_order_email` on `/point-of-sale/orders`.

The live-browser inspection was attempted through BrowserSkill instance
`245ea108` using the existing Odoo user tab. The required borrow did not
complete; details and the exact blocker are recorded in `verification.md`.
The source comparison therefore relies on the checked-in Odoo addon source,
not an invented live visual observation.
