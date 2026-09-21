# Source comparison

## Odoo source

- `addons/website_sale/models/website.py` defines the stored
  `show_line_subtotals_tax_selection` selection with `tax_excluded` and
  `tax_included`, and `_compute_show_line_subtotals_tax_selection` defaults it
  to `tax_excluded`.
- `addons/website_sale/models/res_config_settings.py` relates the setting to
  `website_id.show_line_subtotals_tax_selection`.
- `addons/website_sale/views/res_config_settings_views.xml` renders the field
  in the Display Product Prices setting.
- `addons/website_sale/views/templates.xml` branches on the selected value to
  render the tax-excluded indication.

## Core3 comparison

Core3 now has a durable `ecommerce_tax_display_policies` table with one
company-scoped row, row-version concurrency, a deterministic My Company
fixture, and validation for the two source-backed values. The API contract
exposes the setting and options; the page contract binds the form by the same
`page.id`; cart and checkout projections expose `tax_display_mode` and
`subtotal_label`; the public anonymous-cart operation exposes the same
contract. This is the bounded display-policy equivalent; tax calculation and
rendered tax amounts remain outside this slice.
