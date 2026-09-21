# Source comparison

## Odoo source

- `addons/website_sale/models/website.py` defines
  `confirmation_email_template_id` as a `mail.template` relation restricted
  to `sale.order`, with the default sale confirmation template.
- `addons/website_sale/models/res_config_settings.py` relates the field to
  `website_id.confirmation_email_template_id`.
- `addons/website_sale/views/res_config_settings_views.xml` exposes the field
  in the `order_confirmation_setting` control.
- `addons/website_sale/models/sale_order.py` overrides
  `_get_confirmation_template()` and returns the website template when set,
  otherwise delegating to Sales.

## Core3 comparison

Core3 now has an active sale-order template catalog and one company-scoped
policy with row-version concurrency, a deterministic My Company fixture, and
validation that selected templates are active and model-compatible. The API
contract exposes the template options and update action; the page contract
binds the form by the same `page.id`. Both authenticated and guest checkout
snapshot the selected template onto the durable order, and order list/detail
projections expose the selection. Actual mail rendering/delivery remains
outside this bounded configuration-and-snapshot slice.
