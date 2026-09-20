# Source comparison

## Odoo Website Sale

The supplied Odoo source was inspected at:

- `/home/nhanjs/projects/odoo/addons/website_sale/models/product_template.py`
  — `set_sequence_top`, `set_sequence_bottom`, `set_sequence_up`, and
  `set_sequence_down`.
- `/home/nhanjs/projects/odoo/addons/website_sale/views/product_views.xml`
  — `website_sequence` ordered list and `widget="handle"`, plus the
  `product_template_action_website` action.
- `/home/nhanjs/projects/odoo/addons/website_sale/views/website_sale_menus.xml`
  — Products menu action binding.

## Core3 implementation

- `sample/services/ecommerce/migrations/20260921170000-098-ecommerce-product-website-sequence-index.yaml`
  adds a company/published/active/sequence index.
- `sample/services/ecommerce/migrations/20260921171000-099-ecommerce-product-website-sequence-demo.yaml`
  seeds deterministic Mug, Chair, Setup, and Lamp sequence values.
- `sample/services/ecommerce/api/products.yaml` exposes four server-side
  mutations with `ecommerce.write`, company/active/stale/edge guards, and
  atomic neighbor swaps for up/down.
- `sample/services/ecommerce/pages/products.yaml` binds page-local Move Top,
  Move Up, Move Down, and Move to Bottom actions to the API actions.

The implementation is intentionally bounded to catalog ordering; it does not
claim the unavailable Odoo website route or rendered UI parity.
