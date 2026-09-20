# Source comparison

The supplied Odoo sources were inspected at:

- `addons/website_sale/controllers/variant.py`: public
  `/website_sale/get_combination_info` resolves a selected combination and
  returns the concrete `product_id`; the legacy
  `/sale/create_product_variant` route creates a missing variant.
- `addons/website_sale/models/product_product.py`:
  `_get_combination_info_variant` delegates variant combination data to the
  template.
- `addons/website_sale/models/product_template.py`:
  `_get_possible_variants_sorted` and `_get_combination_info` provide the
  selected-combination resolution used by the website flow.

Core3's existing variant persistence and variant-specific price resolution did
not carry a selected variant through Add to Cart. This slice adds that
missing lifecycle with separate page/API YAML, durable cart-line variant
identity, company/active/published guards, and deterministic idempotent line
IDs. It intentionally does not claim Odoo's full attribute widget, media
carousel, dynamic variant creation, or currency behavior.
