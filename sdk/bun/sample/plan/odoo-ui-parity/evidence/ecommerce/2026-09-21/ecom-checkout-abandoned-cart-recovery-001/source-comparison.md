# Source comparison

## Odoo source

- `addons/website_sale/models/website.py` defines the recovery template,
  `cart_abandoned_delay`, `send_abandoned_cart_email`, activation timing, and
  `_send_abandoned_cart_email()` scheduled workflow.
- `addons/website_sale/models/res_config_settings.py` relates the recovery
  template, delay, and enablement fields to the website.
- `addons/website_sale/views/res_config_settings_views.xml` exposes the
  `abandoned_carts_setting`, delay, and Customize Abandoned Email Template
  action.
- `addons/website_sale/views/website_sale_menus.xml` maps the Abandoned Carts
  menu to `action_view_abandoned_tree`.
- `addons/website_sale/models/sale_order.py` defines
  `cart_recovery_email_sent`, `action_recovery_email_send()`, and the automated
  `_cart_recovery_email_send()` path.

## Core3 comparison

Core3 now has an active sale-order recovery template fixture and one
company-scoped policy with row-version concurrency, delay bounds, and a
deterministic My Company default. The policy API/page exposes the settings;
the Abandoned Carts API/page exposes recovery state and a permissioned
one-shot send action. The send action is a durable deterministic ledger
boundary for the email side effect; real SMTP/provider delivery remains
outside this bounded slice.
