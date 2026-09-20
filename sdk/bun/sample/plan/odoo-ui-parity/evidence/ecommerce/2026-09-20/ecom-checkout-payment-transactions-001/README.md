# ECOM-CHECKOUT-PAYMENT-TRANSACTIONS-001

Bounded Ecommerce evidence for the durable checkout payment-transaction
lifecycle.

- Odoo target: Website > Configuration > eCommerce > Payment Transactions,
  `payment.action_payment_transaction`, model `payment.transaction`.
- Core3 target: checkout -> one pending transaction -> guarded status update.
- QA status: bounded implementation verified; Ecommerce module sign-off is
  intentionally open.
- Core3 desktop/mobile capture was attempted but blocked by backend startup;
  details and exact HTTP responses are in `browser-check.md`.
- Odoo paired capture is blocked because authenticated `/shop` is HTTP 404 on
  both supplied references.
