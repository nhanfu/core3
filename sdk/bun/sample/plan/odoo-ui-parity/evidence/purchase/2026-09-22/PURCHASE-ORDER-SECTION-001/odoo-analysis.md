# Odoo analysis — `PURCHASE-ORDER-SECTION-001`

Odoo 19 declares `Add a section` in the Purchase Order Products one2many
control as `add_section_control`, with `default_display_type: line_section`,
alongside Add a product, Add a note, and Catalog. The display line uses the
order-line name/description and has no product, quantity, unit price, taxes, or
amount. The form is read-only once the order is no longer editable or is locked.

The source action was traced in the local Odoo checkout. Live authenticated
inspection through BrowserSkill was attempted on instance `245ea108`, but the
signed-in tab could not be borrowed before the extension confirmation timed out.
This file therefore records source behavior only and does not claim current
live Odoo appearance.
