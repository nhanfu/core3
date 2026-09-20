# Source comparison

## Odoo

The supplied `website_sale/models/product_template.py` defines the
company-aware `alternative_product_ids` many-to-many relation and filters it
through `_get_website_alternative_product()`. The supplied
`website_sale/views/templates.xml` adds an Alternative Products dynamic
section after the product website description when recommendations exist.

## Core3

Core3 migrations 066/067 add `ecommerce_product_alternatives` with stable
source/destination IDs, sequence, company, active state, unique assignment,
and row version. The Product Detail API lists only active published targets
from the source company and has an options datasource plus guarded
`ecommerce.write` assign/remove actions. Assignment rejects self-targets,
unpublished/inactive/cross-company targets, and duplicates; removal requires
the current relation row version. The Product Detail page renders the
recommendation list and assignment form from the separate API datasource.
