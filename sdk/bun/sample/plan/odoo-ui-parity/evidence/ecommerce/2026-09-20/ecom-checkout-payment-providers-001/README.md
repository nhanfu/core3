# ECOM-CHECKOUT-PAYMENT-PROVIDERS-001

Bounded Ecommerce evidence for company-scoped payment-provider configuration.

- Odoo target: Website > Configuration > eCommerce > Payment Providers,
  `payment.action_payment_provider`, model `payment.provider`.
- Core3 target: deterministic provider catalog with state/publication/features,
  permissioned CRUD, disable/restore, and durable company boundaries.
- QA status: bounded implementation verified; Ecommerce module sign-off is
  intentionally open.
- Core3 desktop/mobile capture is blocked by the runtime boundary described in
  `browser-check.md`.
- Odoo paired capture is blocked because authenticated `/shop` is HTTP 404 on
  both supplied references.
