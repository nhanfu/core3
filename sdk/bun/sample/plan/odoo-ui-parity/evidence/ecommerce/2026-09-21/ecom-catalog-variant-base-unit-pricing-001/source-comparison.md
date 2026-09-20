# Source comparison

## Odoo

The supplied `website_sale/models/product_product.py` and
`product_template.py` define `base_unit_count`, `base_unit_id`,
`base_unit_price`, and `base_unit_name`. The base-unit price is derived from
the selected price divided by the count; a zero count returns no unit price.
The Website Sale combination response includes `base_unit_name` and
`base_unit_price`. The supplied `website_sale/views/product_views.xml` renders
the count and custom unit plus the “Price Per Unit” value in the product and
variant forms, gated by the Website Sale UoM-price group.

## Core3

Core3 migrations 076/077 add `base_unit_count` and `base_unit_name` to durable
product variants and seed Mug Blue with two pieces and a `piece` unit. Product
Detail’s variant datasource and the dedicated Product Variant detail datasource
expose the derived `base_unit_price`; Product Detail displays it in the variant
list, while Variant detail exposes a permissioned configuration form. The
mutation validates current-company ownership, non-negative count, unit-name
length, and row-version concurrency. Count zero is durable and returns a null
unit price.
