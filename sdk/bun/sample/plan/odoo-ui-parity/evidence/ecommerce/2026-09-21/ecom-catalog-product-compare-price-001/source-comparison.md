# Source comparison

## Odoo

The supplied `website_sale/models/product_template.py` defines the monetary
`compare_list_price` field with help text describing a strikethrough price on
`/shop` and product pages. `controllers/product_configurator.py` checks this
value after pricelist-base pricing and returns it only when it is greater than
the actual price. `views/product_views.xml` renders the Compare to Price field
under `website_sale.group_product_price_comparison`; the inherited product
model makes the value available to product variants as well.

## Core3

Migrations 078/079 add durable `compare_list_price` columns and deterministic
Mug/Mug Blue values. The Products, Shop, Product Detail, and Product Variant
API contracts select both the stored value and a derived `compare_at_price`
that is null unless it exceeds `sales_price`. Their paired page YAML renders
that derived field in list, card, and detail states. Product edit and the
dedicated variant compare-price action require `ecommerce.write`, validate
company scope and non-negative values, and reject stale row versions.

Core3 keeps this slice bounded to the persisted comparison price and display
boundary; currency conversion and dynamic pricelist-base display remain open
follow-up parity work.
