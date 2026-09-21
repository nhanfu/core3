# Functionality evidence

The deterministic fixture starts `My Company` with Featured ordering
(`website_sequence asc`).

1. The policy datasource returns the selected source key and display label.
2. `ecommerce.write` changes the default with an optimistic row version and
   validates all five Odoo source choices.
3. Authenticated Shop reads initially return Mug, Chair, Lamp by website
   sequence and return Chair, Lamp, Mug after Price - High to Low.
4. The public `ecommerce.public.shop` operation returns the same configured
   order, preserving the public catalog boundary.
5. Wrong-company, invalid-mode, and stale-row updates fail without mutating
   the policy; migration replay and DuckDB restart retain the selected sort.

The setting is website/company configuration, so this bounded lifecycle is
read/update/reset-by-selection rather than deletion of a transient Odoo
configuration form.
