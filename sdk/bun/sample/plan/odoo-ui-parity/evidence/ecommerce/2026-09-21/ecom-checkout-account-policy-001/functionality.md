# Functionality evidence

The deterministic fixture starts `My Company` in `optional` mode with
`auth_signup_uninvited = b2c`.

1. The policy datasource returns the company row and computed behavior label.
2. `ecommerce.write` updates the mode with an optimistic row version.
3. `mandatory` maps to B2C signup and rejects an anonymous cart with
   `ECOMMERCE_CHECKOUT_ACCOUNT_REQUIRED`.
4. `optional` maps to B2C signup and permits the same cart to complete guest
   checkout, preserving the existing order/cart/Sales handoff lifecycle.
5. `disabled` maps to B2B signup and is retained as a durable policy value.
6. Wrong-company, invalid-mode, and stale-row requests fail before changing
   the policy; migration replay and DuckDB restart retain the mode and signup
   mapping.

The Odoo account policy is a website configuration setting, so its bounded
CRUD-equivalent is read/update/reset-by-selection rather than deletion of a
transient settings record.
