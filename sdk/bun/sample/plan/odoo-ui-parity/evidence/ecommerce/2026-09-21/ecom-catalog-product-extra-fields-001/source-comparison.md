# Source comparison

- Odoo model: `website.shop_extra_field_ids` is a one-to-many relation to
  `website.sale.extra.field`.
- Odoo configuration view: `website_sale/views/website_views.xml` adds the
  “Product Page Extra Fields” settings page, a sequence handle, and
  `field_id` selection.
- Odoo model constraint: `field_id` is required and limited to product-template
  fields with type `char` or `binary`.
- Odoo rendering: `website_sale/views/templates.xml` iterates
  `website.shop_extra_field_ids` and renders each non-empty
  `product.sudo()[field.name]` value.
- Core3 mapping: migrations 146/147 persist ordered company-scoped field
  selections; `api/product-extra-fields.yaml` and
  `pages/product-extra-fields.yaml` join through
  `ecommerce-product-extra-fields`; Product Detail reads active values via
  `ecommerce_product_extra_field_values`.
- Core3 fixture mapping: `internal_reference` and `category` are durable
  Core3 product-template character fields corresponding to Odoo’s allowed
  `char` field domain.
