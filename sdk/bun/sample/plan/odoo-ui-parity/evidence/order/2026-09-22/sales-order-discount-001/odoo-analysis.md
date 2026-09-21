# Odoo analysis

Local Odoo 19 source inspected:

- `addons/sale/wizard/sale_order_discount.py`: transient discount wizard with
  `sol_discount` (all lines), `so_discount` (global), and `amount` (fixed)
  modes, validation, and atomic application.
- `addons/sale/wizard/sale_order_discount_views.xml`: Discount, Apply, and
  Discard modal contract and radio choices.
- `addons/sale/views/sale_order_views.xml`: editable order Discount action and
  locked-order disabled state.

Authenticated reference probe used browser instance `245ea108`, database
`core3_reference`, route `/odoo/sales/quotations`, and the existing QA login.
The new quotation form exposed Customer, Quotation Template, Order Lines,
Add a product, Add a section, Add a note, totals, Send/Print/Confirm/Preview,
and the chatter controls. A product-line editor was opened. The Discount
button is source-confirmed but was not visible on the unsaved blank form.

Reference captures:

- `/tmp/core3-odoo-parity/sales-discount-20260922/odoo-quotation-new-desktop-1440x900.png`
- `/tmp/core3-odoo-parity/sales-discount-20260922/odoo-quotation-new-mobile-390x844.png`

No password, cookie, or token was extracted.
