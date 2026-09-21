# ECOM-CHECKOUT-CONFIRMATION-EMAIL-TEMPLATE-001

Bounded Wave 25 evidence for Odoo Website Sale's website-scoped order
confirmation email template. Core3 implementation is company-scoped,
durable, YAML-first, and keeps the configuration page separate from its
API/action contract.

The slice is verified at the source, repository, migration, checkout snapshot,
and restart levels. It is not Ecommerce module sign-off: authenticated browser
capture is blocked by the local runtime and Odoo `/shop` is HTTP 404.

- Feature: `confirmation_email_template_id` restricted to `sale.order`
- Core3 page: `/ecommerce/confirmation-email-policy`
- Core3 API contract: `services/ecommerce/api/confirmation-email-policy.yaml`
- Core3 persistence: migrations `0.0.114` and `0.0.115`
- Focused test: `test/ecommerce_checkout_confirmation_email.integration.test.ts`
