# Source comparison

The supplied Odoo sources were inspected at:

- `addons/website_sale/views/website_sale_menus.xml`: the
  `menu_ecommerce_payment_providers` entry opens
  `payment.action_payment_provider`.
- `addons/payment/models/payment_provider.py`: `payment.provider` is
  company-scoped and persists name, technical code, sequence, disabled/test/
  enabled state, publication, supported payment methods, tokenization,
  manual capture, express checkout, refund, amount/country/currency
  availability, and payment messages.
- `addons/payment/views/payment_provider_views.xml`: kanban/list/form/search
  action; the list disables direct create, while the form exposes
  status-dependent provider configuration and publication controls.

Core3 adds the bounded durable configuration surface with deterministic
fixtures and explicit write guards. Credentials, provider module installation,
payment tokens, and external gateway execution remain separate boundaries.
