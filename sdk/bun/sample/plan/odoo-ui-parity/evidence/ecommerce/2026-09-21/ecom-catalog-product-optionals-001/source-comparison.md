# Source comparison

## Odoo

The supplied `sale/models/product_template.py` defines the
`optional_product_ids` many-to-many relation and describes optional products
as suggestions when a product is added to the cart. The Sale
`product_configurator.py` route `/sale/product_configurator/get_optional_products`
returns `optional_products`; Website Sale supplies the corresponding
`/website_sale/product_configurator/get_optional_products` route. The supplied
`sale/views/product_template_views.xml` exposes the editor field with the
“Recommend when 'Adding to Cart' or quotation” placeholder.

## Core3

Core3 migrations 072/073 add `ecommerce_product_optionals` with stable source
and target IDs, sequence, company, active state, timestamps, row version, a
unique assignment key, and deterministic fixtures. The Product Detail API
lists only active published same-company targets and provides `ecommerce.write`
assignment/removal actions plus an optional-to-cart mutation. Assignment
rejects wrong-company sources, self/unpublished/inactive/cross-company targets,
and duplicates; removal requires the current row version; cart addition
requires a valid open cart and increments the deterministic line on replay.
The Product Detail page renders the list and controls from the separate API
datasource.
