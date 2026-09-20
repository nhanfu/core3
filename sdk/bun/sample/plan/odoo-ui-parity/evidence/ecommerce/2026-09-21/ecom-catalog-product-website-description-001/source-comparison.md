# Source comparison

## Odoo

The supplied `website_sale/models/product_template.py` defines
`website_description` as an HTML field on `product.template`. The shop search
controller includes `website_description` when description search is enabled,
and `views/templates.xml` renders `product.website_description` in the full
product page after the product detail content. Odoo keeps the related eCommerce
description/rich editor seam in the product view.

## Core3

Migrations 080/081 add durable `website_description` content and seed the Mug
with deterministic HTML text. The Products, Shop, and Product Detail API
contracts select the description and include it in catalog/detail search; the
paired page YAML exposes the field in list/card/detail states, with Product
Detail using the declarative rich-text field. Product edits require
`ecommerce.write`, current-company scope, optimistic row versions, a 10,000
character limit, and a script-tag rejection guard.

Core3 keeps this slice bounded to persisted/searchable description content and
the form/page contract. Full Odoo rich HTML sanitization and rendered public
product-page parity remain open follow-up gates.
