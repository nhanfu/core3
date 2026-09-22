# Odoo analysis — `PURCHASE-ORDER-NOTE-001`

Odoo 19 declares `add_note_control` in the Purchase Order Products one2many
control with `default_display_type: line_note`, next to Add a product, Add a
section, and Catalog. `purchase.order.line.display_type` accepts `line_note`;
display lines retain their text in `name` and clear product, quantity, UoM,
price, and planned-delivery fields. Odoo's form is read-only for cancelled or
locked orders.

The local source was inspected directly. Authenticated live inspection was
attempted through BrowserSkill instance `245ea108`, but the signed-in user tab
could not be borrowed before confirmation completed. This records source
behavior only and does not claim current live Odoo appearance.
