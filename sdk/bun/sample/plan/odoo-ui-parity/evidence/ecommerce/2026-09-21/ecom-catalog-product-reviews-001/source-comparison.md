# Source comparison

## Odoo

- `addons/website_sale/models/product_template.py` inherits `rating.mixin`.
- `addons/website_sale/models/product_product.py` uses the computed
  `rating_avg` and `rating_count` values in product markup aggregate ratings.
- `addons/website_sale/views/templates.xml` displays the static star summary
  and the `product_comment` Customer Reviews portal message thread after the
  Website Sale product description.

## Core3 mapping

- Migrations `090/091` add `ecommerce_product_reviews` and the deterministic
  published Mug review.
- Product Detail API exposes published `review_count` and `rating_average`
  plus a company-scoped review datasource; the page remains a separate
  `page.id: ecommerce-product-detail` YAML contract with a review ListView.
- Review creation starts in `pending`; edit returns it to pending, while
  publish/reject/delete are explicit Ecommerce-write actions. Active product
  ownership, current-company scope, rating/text limits, row versions, and
  restart persistence are enforced.

The bounded implementation does not claim Odoo portal chatter, public visitor
composer, translations, structured-data browser rendering, or paired Odoo
screen sign-off.
