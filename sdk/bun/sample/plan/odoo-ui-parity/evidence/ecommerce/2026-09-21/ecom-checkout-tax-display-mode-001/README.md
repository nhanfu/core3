# ECOM-CHECKOUT-TAX-DISPLAY-MODE-001

Bounded Wave 24 evidence for Odoo Website Sale's line-subtotal tax display
setting. Core3 implementation is company-scoped, durable, YAML-first, and
keeps the configuration page separate from its API/action contract.

The slice is verified at the source, repository, migration, projection, and
restart levels. It is not Ecommerce module sign-off: authenticated browser
capture is blocked by the local runtime and Odoo `/shop` is HTTP 404.

- Feature: `show_line_subtotals_tax_selection` (`tax_excluded` / `tax_included`)
- Core3 page: `/ecommerce/tax-display-policy`
- Core3 API contract: `services/ecommerce/api/tax-display-policy.yaml`
- Core3 persistence: migrations `0.0.112` and `0.0.113`
- Focused test: `test/ecommerce_checkout_tax_display_mode.integration.test.ts`
