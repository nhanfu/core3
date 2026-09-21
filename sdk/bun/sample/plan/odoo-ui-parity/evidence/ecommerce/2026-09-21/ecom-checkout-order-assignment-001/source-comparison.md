# Source comparison

The supplied Odoo 19 Website Sale source was inspected at
`/home/nhanjs/projects/odoo/addons/website_sale`.

- `models/website.py` defines `salesteam_id` (`crm.team`) with the default
  `sales_team.salesteam_website_sales` and `salesperson_id` (`res.users`).
- `models/res_config_settings.py` exposes both fields as website settings.
- `views/res_config_settings_views.xml` places them in the `Orders Assignment`
  setting with Sales Team and Salesperson fields.
- `models/website.py::_prepare_sale_order_values` copies `team_id` into the
  online order.
- `models/sale_order.py` uses the website salesperson when the order is
  confirmed and preserves the website team as the default team.

Core3 comparison: Ecommerce migrations 118/119 add durable company policy and
deterministic team/person fixtures; `pages/order-assignment-policy.yaml` and
`api/order-assignment-policy.yaml` remain separate and join on
`ecommerce-order-assignment-policy`. Checkout order creation snapshots the
selected IDs and names for both actors, and the existing Ecommerce-to-Sales
outbox receives the same immutable assignment.
