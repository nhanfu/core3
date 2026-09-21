# Source comparison

Odoo Website Sale source inspected:

- `addons/website_sale/models/res_config_settings.py`: defines
  `account_on_checkout` as Optional, Disabled, or Mandatory, computes it from
  `website_id.account_on_checkout`, and inverses it onto the website. The
  inverse sets `auth_signup_uninvited` to `b2c` for Optional/Mandatory and
  `b2b` for Disabled.
- `addons/website_sale/models/website.py`: stores the website-backed selection
  with Optional as the default and labels Disabled as buy-as-guest and
  Mandatory as no-guest-checkout.
- `addons/website_sale/views/res_config_settings_views.xml`: the
  `checkout_registration_setting` setting renders the
  `account_on_checkout` radio field under “Sign in/up at checkout”.
- `addons/website_sale/views/templates.xml`: checkout navigation suppresses
  express checkout for an anonymous mandatory checkout and the address form
  shows the sign-in affordance unless account registration is Disabled.

Core3 pairing:

- `services/ecommerce/pages/checkout-account-policy.yaml` is page/UI YAML and
  joins `page.id: ecommerce-checkout-account-policy`.
- `services/ecommerce/api/checkout-account-policy.yaml` is API/action YAML;
  it exposes the company-scoped datasource, mode catalog, and optimistic
  `ecommerce.checkout.account_policy.update` action.
- `services/ecommerce/migrations/20260921190000-102...yaml` and
  `20260921191000-103...yaml` durably store and seed the company policy.
- `services/ecommerce/api/checkout.yaml` applies the policy at both
  authenticated and anonymous checkout boundaries.

Parity boundary: Core3 models the durable website setting per company and its
checkout guard; Odoo's transient `res.config.settings` form/delete lifecycle
is intentionally not represented as record deletion.
